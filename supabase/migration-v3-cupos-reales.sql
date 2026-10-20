-- ===========================================================================
--  MIGRACIÓN v3 · Cupos reales de la institución y 54.55 % para becarios
-- ===========================================================================
--  Contexto:
--    La institución brinda 5,500 raciones diarias:
--      · Desayuno  1,000
--      · Almuerzo  3,000
--      · Cena      1.500
--
--    Se reserva el 54.55 % de los cupos para estudiantes becarios:
--      · 1,000 x 0.5455 =   546  → regulares:   454
--      · 3,000 x 0.5455 = 1,637  → regulares: 1,363
--      · 1,500 x 0.5455 =   818  → regulares:   682
--
--  IMPORTANTE: el cupo de becarios está DENTRO del total (no se suma).
--  La restricción meals_becarios_caben exige becarios <= total.
--
--  Este script es IDEMPOTENTE: se puede ejecutar varias veces sin romper nada.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. Actualizar los cupos de los tres servicios
-- ---------------------------------------------------------------------------
update meals set total = 1000, becarios =  546 where id = 'desayuno';
update meals set total = 3000, becarios = 1637 where id = 'almuerzo';
update meals set total = 1500, becarios =  818 where id = 'cena';


-- ---------------------------------------------------------------------------
-- 2. Verificación: los cupos reservados no pueden superar el total
-- ---------------------------------------------------------------------------
do $$
declare
  v_falla int;
begin
  select count(*) into v_falla from meals where becarios > total;
  if v_falla > 0 then
    raise exception 'Hay % servicio(s) con becarios mayor al total.', v_falla;
  end if;
  raise notice 'OK: restricción de becarios verificada.';
end $$;


-- ---------------------------------------------------------------------------
-- 3. Verificación: resumen por servicio
-- ---------------------------------------------------------------------------
select m.nombre                                          as servicio,
       m.horario                                         as horario,
       m.total                                           as cupos_totales,
       m.becarios                                        as cupos_becarios,
       (m.total - m.becarios)                            as cupos_regulares,
       round(m.becarios * 100.0 / m.total, 2)           as pct_becarios
from meals m
order by case m.id when 'desayuno' then 1 when 'almuerzo' then 2 else 3 end;


-- ---------------------------------------------------------------------------
-- 4. (Opcional) Liberar reservas de muestra que ya no caben
--    Solo es necesario si tenías datos de prueba con cupos viejos.
--    No borra reservas reales de estudiantes.
-- ---------------------------------------------------------------------------
-- select count(*) as reservas_activas
-- from reservations
-- where status in ('Activa', 'Utilizada');


-- ===========================================================================
--  FIN DE LA MIGRACIÓN
-- ===========================================================================
