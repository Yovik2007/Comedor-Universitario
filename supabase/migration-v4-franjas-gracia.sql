-- =====================================================================
-- MIGRACIÓN v4 · FRANJAS DE 30 MIN + VENTANA DE GRACIA + LIBERACIÓN
--                 AUTOMÁTICA DE CUPOS DE BECARIOS
-- =====================================================================
--
--  ¿Qué cambia?
--
--  1. Franjas de llegada de 30 minutos. Cada servicio se divide en
--     tramos (desayuno 4, almuerzo 5, cena 4) y cada reserva guarda la
--     franja elegida en `slot_start`.
--
--  2. Ventana de gracia. Una reserva Activa vence a los 30 minutos del
--     inicio de su franja. A partir de ahí pasa a 'Vencida' (sin cron:
--     se calcula al vuelo en la vista).
--
--  3. Liberación automática. El cupo de un becario vencido NO se
--     pierde: pasa al pool de estudiantes libres. Así ninguna ración se
--     desperdicia.
--
--  Idempotente: se puede ejecutar más de una vez.
--
--  EJECUTAR EN: SQL Editor de Supabase
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Nuevo estado de reserva
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'reservation_status' and e.enumlabel = 'Vencida'
  ) then
    alter type reservation_status add value 'Vencida';
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 2. Columnas de franja
--    · slot_start  → "12:00" (inicio del tramo de 30 min elegido)
--    · expires_at  → instante límite de presentación (franja + 30 min)
-- ---------------------------------------------------------------------
alter table reservations
  add column if not exists slot_start time,
  add column if not exists expires_at timestamptz;


-- ---------------------------------------------------------------------
-- 3. vw_reservations: expone las columnas nuevas y muestra la franja
--    en el campo `time` (si no hay franja, sigue mostrando el horario
--    completo del servicio, igual que antes).
-- ---------------------------------------------------------------------
create or replace view vw_reservations
with (security_invoker = true) as
select r.id,
       r.student_id                       as "studentId",
       s.nombre                           as "studentName",
       s.tipo::text                       as "studentType",
       r.meal_id                          as "mealId",
       m.nombre                           as "mealName",
       r.fecha                            as "date",
       case
         when r.slot_start is not null
           then to_char(r.slot_start, 'HH24:MI') || ' – ' ||
                to_char(r.slot_start + interval '30 minutes', 'HH24:MI')
         else m.horario
       end                                as "time",
       r.status::text                     as "status",
       r.qr_code                          as "qrCode",
       r.created_at                       as "createdAt",
       r.used_at                          as "usedAt",
       -- Nuevas columnas SIEMPRE al final: CREATE OR REPLACE VIEW no
       -- permite reordenar ni renombrar columnas existentes.
       case when r.slot_start is null then null
            else to_char(r.slot_start, 'HH24:MI')
       end                                as "slotStart",
       r.expires_at                       as "expiresAt"
from reservations r
join students s on s.id = r.student_id
join meals    m on m.id = r.meal_id;


-- ---------------------------------------------------------------------
-- 4. vw_meal_stats: contabilidad con vencidas y liberación
--
--    ESTADO EFECTIVO = si está Activa y ya pasó expires_at → 'Vencida'
--
--    · Solo Activa y Utilizada consumen cupo.
--    · El cupo de un becario vencido se transfiere a los libres.
--
--    Ejemplo con almuerzo (total 3000, becarios 1637):
--      1100 becarios usaron · 537 vencieron · 800 libres activos
--      → dispBecarios = 1637 − 1100 − 537 = 0
--      → dispLibres   = 1363 −  800 + 537 = 1100
--      → dispTotal    = 0 + 1100 = 1100  (correcto: 3000 − 1100 − 800)
-- ---------------------------------------------------------------------
create or replace view vw_meal_stats
with (security_invoker = false) as
with fechas as (
  select distinct fecha from reservations
  union
  select current_date
),
efectivo as (
  select r.id,
         r.meal_id,
         r.fecha,
         case
           when r.status = 'Activa'
            and r.expires_at is not null
            and r.expires_at < now()
             then 'Vencida'
           else r.status::text
         end as estado
  from reservations r
),
base as (
  select m.id     as meal_id,
         f.fecha,
         m.total,
         m.becarios,
         count(r.id) filter (
           where e.estado in ('Activa', 'Utilizada') and s.tipo = 'Becario'
         )::int as res_becarios,
         count(r.id) filter (
           where e.estado in ('Activa', 'Utilizada') and s.tipo = 'Libre'
         )::int as res_libres,
         count(r.id) filter (
           where e.estado = 'Vencida' and s.tipo = 'Becario'
         )::int as becarios_liberados,
         count(r.id) filter (
           where e.estado = 'Vencida'
         )::int as vencidas
  from meals m
  cross join fechas f
  left join efectivo  e on e.meal_id = m.id and e.fecha = f.fecha
  left join reservations r on r.id = e.id
  left join students    s on s.id = r.student_id
  group by m.id, f.fecha, m.total, m.becarios
)
select meal_id::text                 as "mealId",
       fecha,
       total                         as total,
       becarios                      as becarios,
       res_becarios                  as "resBecarios",
       res_libres                    as "resLibres",
       (res_becarios + res_libres)   as "resTotal",
       greatest(becarios - res_becarios - becarios_liberados, 0)
                                     as "dispBecarios",
       greatest(total - becarios - res_libres + becarios_liberados, 0)
                                     as "dispLibres",
       (greatest(becarios - res_becarios - becarios_liberados, 0) +
        greatest(total - becarios - res_libres + becarios_liberados, 0))
                                     as "dispTotal",
       case when total = 0 then 0
            else least(round((res_becarios + res_libres) * 100.0 / total, 1), 100)
       end                           as "percentOcupado",
       becarios_liberados            as "becariosLiberados",
       vencidas                      as "vencidas"
from base;


-- ---------------------------------------------------------------------
-- 5. Verificación
-- ---------------------------------------------------------------------
do $$
declare
  v_cols text;
begin
  select string_agg(column_name, ', ' order by ordinal_position)
    into v_cols
  from information_schema.columns
  where table_schema = 'public'
    and table_name   = 'reservations'
    and column_name in ('slot_start', 'expires_at');

  if v_cols is null then
    raise exception 'MIGRACIÓN v4 FALLÓ: faltan las columnas de franja.';
  end if;

  raise notice 'MIGRACIÓN v4 OK · columnas: %', v_cols;
end $$;
