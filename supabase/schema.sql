-- =====================================================================
--  UNJFSC Comedor digital — Base de datos desde cero (Supabase)
--  PostgreSQL 15+ (Supabase ya cumple este requisito)
--
--  Cómo usarlo:
--   1. Crea el proyecto en https://supabase.com (nueva organización/proyecto).
--   2. En el panel: SQL Editor → New query.
--   3. Pega TODO este archivo y pulsa Run (Ctrl + Enter).
--   4. Ve a Table Editor: deben aparecer 9 tablas y 10 vistas (vw_*).
--
--  Decisiones de diseño (acordadas):
--   · Login SIMULADO: los usuarios viven en las tablas `students` y
--     `app_users` con su contraseña de demostración (no se usa Supabase Auth).
--   · Datos demo incluidos: 12 estudiantes, 8 cuentas de acceso, 3 servicios,
--     39 reservas, 2 encuestas y 16 respuestas.
--   · Lecturas de la app → vistas `vw_*` (mismos nombres de campo que los
--     tipos de TypeScript). Escrituras → tablas base.
--   · RLS activado con permisos abiertos para el rol `anon` (demostración).
--     ⚠ En producción hay que sustituir esas políticas por políticas reales.
--
--  Si vas a ejecutarlo una segunda vez sobre la misma base, descomenta:
--      drop schema public cascade;
--      create schema public;
-- =====================================================================


-- =====================================================================
-- 1. TIPOS (enums)
-- =====================================================================

create type student_type   as enum ('Becario', 'Libre');
create type reservation_status as enum ('Activa', 'Utilizada', 'Cancelada');
create type user_role      as enum ('estudiante', 'admin');


-- =====================================================================
-- 2. SECUENCIAS (generan los códigos visibles: RES-, ENC-, RESP-)
-- =====================================================================

create sequence reservation_seq      start 1;
create sequence survey_seq           start 1;
create sequence survey_response_seq  start 1;


-- =====================================================================
-- 3. TABLAS
-- =====================================================================

-- Estudiantes (también sirven como cuenta de acceso)
create table students (
  id          text primary key check (id ~ '^EST[0-9]{3,}$'),
  nombre      text not null check (length(trim(nombre)) > 0),
  correo      text not null unique
              check (correo = lower(correo) and correo ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  tipo        student_type not null,
  activo      boolean not null default true,
  -- Contraseña de demostración en texto plano (el login es simulado).
  password    text not null default '123456',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Cuentas de acceso (administradores y accesos demo de estudiantes)
create table app_users (
  email       text primary key check (email = lower(email)),
  password    text not null,
  role        user_role not null,
  nombre      text not null,
  student_id  text references students(id) on delete set null,
  tipo        student_type,
  -- Toda cuenta de estudiante debe quedar vinculada a un student.
  constraint app_users_estudiante_vinculado
    check (role <> 'estudiante' or student_id is not null)
);

-- Servicios del comedor (desayuno, almuerzo, cena)
create table meals (
  id          text primary key check (id in ('desayuno', 'almuerzo', 'cena')),
  nombre      text not null,
  horario     text not null,                        -- "12:00 PM - 2:30 PM"
  inicio      text not null check (inicio ~ '^[0-2][0-9]:[0-5][0-9]$'),
  fin         text not null check (fin     ~ '^[0-2][0-9]:[0-5][0-9]$'),
  total       int  not null check (total > 0),
  becarios    int  not null check (becarios >= 0),
  habilitado  boolean not null default true,
  constraint meals_becarios_caben check (becarios <= total)
);

-- Configuración global (una sola fila)
create table settings (
  id                     boolean primary key default true check (id),
  reservas_habilitadas   boolean not null default true,
  updated_at             timestamptz not null default now()
);

-- Reservas de comida
create table reservations (
  id          text primary key
              default ('RES-' || lpad(nextval('reservation_seq')::text, 5, '0')),
  student_id  text not null references students(id) on delete cascade,
  meal_id     text not null references meals(id),
  fecha       date not null default current_date,
  status      reservation_status not null default 'Activa',
  qr_code     text not null check (length(trim(qr_code)) > 0),
  created_at  timestamptz not null default now(),
  used_at     timestamptz
);

-- Encuestas de comidas
create table surveys (
  id          text primary key
              default ('ENC-' || lpad(nextval('survey_seq')::text, 3, '0')),
  title       text not null check (length(trim(title))   > 0),
  question    text not null check (length(trim(question))> 0),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Opciones (platos) de cada encuesta
create table survey_options (
  id          bigint generated always as identity primary key,
  survey_id   text not null references surveys(id) on delete cascade,
  label       text not null check (length(trim(label)) > 0),
  orden       int  not null check (orden >= 1),
  unique (survey_id, orden),
  unique (survey_id, label)
);

-- Respuestas: UNA por estudiante y encuesta
create table survey_responses (
  id           text primary key
               default ('RESP-' || lpad(nextval('survey_response_seq')::text, 3, '0')),
  survey_id    text not null references surveys(id) on delete cascade,
  student_id   text not null references students(id) on delete cascade,
  student_name text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (survey_id, student_id)          -- regla de negocio en la base
);

-- Comidas marcadas en cada respuesta (respuesta 1-N opciones)
create table survey_response_options (
  response_id  text not null references survey_responses(id) on delete cascade,
  option_id    bigint not null references survey_options(id) on delete cascade,
  primary key (response_id, option_id)
);


-- =====================================================================
-- 4. ÍNDICES (consultas frecuentes)
-- =====================================================================

create index idx_reservations_student        on reservations (student_id);
create index idx_reservations_fecha          on reservations (fecha);
create index idx_reservations_meal_fecha     on reservations (meal_id, fecha);

-- Regla: una sola reserva activa/utilizada por estudiante, servicio y fecha.
create unique index uq_reserva_unica
  on reservations (student_id, meal_id, fecha)
  where status <> 'Cancelada';

create index idx_surveys_active              on surveys (active);
create index idx_survey_options_survey       on survey_options (survey_id);
create index idx_survey_responses_survey     on survey_responses (survey_id);
create index idx_survey_responses_student    on survey_responses (student_id);
create index idx_survey_resp_options_option  on survey_response_options (option_id);


-- =====================================================================
-- 5. FUNCIONES Y TRIGGERS (updated_at automático)
-- =====================================================================

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_students_updated_at
  before update on students
  for each row execute function set_updated_at();

create trigger trg_settings_updated_at
  before update on settings
  for each row execute function set_updated_at();

create trigger trg_survey_responses_updated_at
  before update on survey_responses
  for each row execute function set_updated_at();


-- =====================================================================
-- 6. VISTAS  →  son las que lee la aplicación (camelCase = tipos TS)
-- =====================================================================

-- Estudiantes: { id, nombre, correo, tipo, activo, password }
create or replace view vw_students
with (security_invoker = true) as
select id, nombre, correo, tipo::text as tipo, activo, password, created_at as "createdAt"
from students;

-- Cuentas de acceso: { email, password, role, nombre, studentId, tipo }
create or replace view vw_app_users
with (security_invoker = true) as
select email, password, role::text as role, nombre,
       student_id as "studentId", tipo::text as tipo
from app_users;

-- Servicios: { id, nombre, horario, inicio, fin, total, becarios, habilitado }
create or replace view vw_meals
with (security_invoker = true) as
select id, nombre, horario, inicio, fin, total, becarios, habilitado
from meals;

-- Configuración: { reservasHabilitadas }  (nombre de columna en camelCase)
create or replace view vw_settings
with (security_invoker = true) as
select reservas_habilitadas as "reservasHabilitadas"
from settings;

-- Reservas con los nombres ya resueltos (misma forma que la interfaz)
create or replace view vw_reservations
with (security_invoker = true) as
select r.id,
       r.student_id                       as "studentId",
       s.nombre                           as "studentName",
       s.tipo::text                       as "studentType",
       r.meal_id                          as "mealId",
       m.nombre                           as "mealName",
       r.fecha                            as "date",
       m.horario                          as "time",
       r.status::text                     as "status",
       r.qr_code                          as "qrCode",
       r.created_at                       as "createdAt",
       r.used_at                          as "usedAt"
from reservations r
join students s on s.id = r.student_id
join meals    m on m.id = r.meal_id;

-- Encuestas con sus opciones en JSON: { id, title, question, active, createdAt, options[] }
create or replace view vw_surveys
with (security_invoker = true) as
select s.id,
       s.title,
       s.question,
       s.active,
       s.created_at as "createdAt",
       coalesce(
         (select jsonb_agg(jsonb_build_object('id', o.id::text, 'label', o.label)
                           order by o.orden)
          from survey_options o
          where o.survey_id = s.id),
         '[]'::jsonb
       ) as options
from surveys s;

-- Respuestas: { id, surveyId, studentId, studentName, optionIds[], createdAt, updatedAt }
create or replace view vw_survey_responses
with (security_invoker = true) as
select r.id,
       r.survey_id    as "surveyId",
       r.student_id   as "studentId",
       r.student_name as "studentName",
       coalesce(
         (select jsonb_agg(ro.option_id::text)
          from survey_response_options ro
          where ro.response_id = r.id),
         '[]'::jsonb
       ) as "optionIds",
       r.created_at as "createdAt",
       r.updated_at as "updatedAt"
from survey_responses r;

-- Resultados por opción (votos y % sobre respuestas, como en la app)
create or replace view vw_survey_results
with (security_invoker = true) as
with tot as (
  select survey_id, count(*)::numeric as n
  from survey_responses
  group by survey_id
)
select o.survey_id                 as "surveyId",
       o.id::text                  as "optionId",
       o.label,
       count(ro.response_id)::int  as votes,
       case
         when coalesce(t.n, 0) = 0 then 0
         else round(count(ro.response_id)::numeric * 100 / t.n)::int
       end                         as percent
from survey_options o
left join survey_response_options ro on ro.option_id = o.id
left join tot t                      on t.survey_id  = o.survey_id
group by o.survey_id, o.id, o.label, t.n;

-- Cupos por servicio y fecha (lo que antes calculaba la app en JavaScript)
create or replace view vw_meal_stats
with (security_invoker = true) as
with fechas as (
  select distinct fecha from reservations
  union
  select current_date
),
base as (
  select m.id     as meal_id,
         f.fecha,
         m.total,
         m.becarios,
         count(r.id) filter (where r.status <> 'Cancelada' and s.tipo = 'Becario')::int as res_becarios,
         count(r.id) filter (where r.status <> 'Cancelada' and s.tipo = 'Libre')::int   as res_libres
  from meals m
  cross join fechas f
  left join reservations r on r.meal_id = m.id and r.fecha = f.fecha
  left join students    s on s.id       = r.student_id
  group by m.id, f.fecha, m.total, m.becarios
)
select meal_id::text                 as "mealId",
       fecha,
       total                         as total,
       becarios                      as becarios,
       res_becarios                  as "resBecarios",
       res_libres                    as "resLibres",
       (res_becarios + res_libres)   as "resTotal",
       (becarios - res_becarios)     as "dispBecarios",
       (total - becarios - res_libres) as "dispLibres",
       (total - res_becarios - res_libres) as "dispTotal",
       case when total = 0 then 0
            else round((res_becarios + res_libres) * 100.0 / total, 1)
       end                           as "percentOcupado"
from base;


-- =====================================================================
-- 7. SEGURIDAD (RLS)
--    En Supabase existen los roles `anon` y `authenticated`.
--    Como el login es simulado, la app usa la clave pública con `anon`:
--    se dejan permisos amplios SOLO para la demostración.
--    ⚠ Producción: sustituir por políticas por usuario (o Supabase Auth).
-- =====================================================================

alter table students                enable row level security;
alter table app_users               enable row level security;
alter table meals                   enable row level security;
alter table settings                enable row level security;
alter table reservations            enable row level security;
alter table surveys                 enable row level security;
alter table survey_options          enable row level security;
alter table survey_responses        enable row level security;
alter table survey_response_options enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'students', 'app_users', 'meals', 'settings', 'reservations',
    'surveys', 'survey_options', 'survey_responses', 'survey_response_options'
  ] loop
    execute format(
      'create policy demo_acceso_total on %I
         for all to anon, authenticated
         using (true) with check (true)',
      t
    );
  end loop;
end;
$$;


-- =====================================================================
-- 8. DATOS DE DEMOSTRACIÓN
-- =====================================================================

-- 8.1 Estudiantes -----------------------------------------------------
insert into students (id, nombre, correo, tipo, activo, password) values
  ('EST001', 'Carlos Mendoza',   'carlos.mendoza@universidad.edu.pe',   'Becario', true, '123456'),
  ('EST002', 'María Torres',     'maria.torres@universidad.edu.pe',     'Libre',    true, '123456'),
  ('EST003', 'Luis Ramírez',     'luis.ramirez@universidad.edu.pe',     'Libre',    true, '123456'),
  ('EST004', 'Ana Flores',       'ana.flores@universidad.edu.pe',       'Becario', true, '123456'),
  ('EST005', 'Diego Paredes',    'diego.paredes@universidad.edu.pe',    'Becario', true, '123456'),
  ('EST006', 'Sofía Herrera',    'sofia.herrera@universidad.edu.pe',    'Libre',    true, '123456'),
  ('EST007', 'Jorge Salazar',    'jorge.salazar@universidad.edu.pe',    'Libre',    true, '123456'),
  ('EST008', 'Valeria Cruz',     'valeria.cruz@universidad.edu.pe',     'Becario', true, '123456'),
  ('EST009', 'Andrés Ríos',      'andres.rios@universidad.edu.pe',      'Libre',    true, '123456'),
  ('EST010', 'Camila Ortiz',     'camila.ortiz@universidad.edu.pe',     'Becario', true, '123456'),
  ('EST011', 'Mateo Quispe',     'mateo.quispe@universidad.edu.pe',     'Libre',    true, '123456'),
  ('EST012', 'Lucía Fernández',  'lucia.fernandez@universidad.edu.pe',  'Becario', true, '123456');

-- 8.2 Cuentas de acceso (mismas del login de demostración) ------------
insert into app_users (email, password, role, nombre, student_id, tipo) values
  ('admin@demo.com',        'admin123', 'admin',      'Administrador',            null,             null),
  ('coordinador@demo.com',  'admin123', 'admin',      'Coordinación de comedor',  null,             null),
  ('estudiante@demo.com',   '123456',   'estudiante', 'Carlos Mendoza',           'EST001', 'Becario'),
  ('libre@demo.com',        '123456',   'estudiante', 'María Torres',             'EST002', 'Libre'),
  ('becario@demo.com',      '123456',   'estudiante', 'Ana Flores',               'EST004', 'Becario'),
  ('jorge@demo.com',        '123456',   'estudiante', 'Jorge Salazar',            'EST007', 'Libre'),
  ('valeria@demo.com',      '123456',   'estudiante', 'Valeria Cruz',             'EST008', 'Becario'),
  ('camila@demo.com',       '123456',   'estudiante', 'Camila Ortiz',             'EST010', 'Becario');

-- 8.3 Servicios y configuración ---------------------------------------
insert into meals (id, nombre, horario, inicio, fin, total, becarios, habilitado) values
  ('desayuno', 'Desayuno', '7:00 AM - 9:00 AM',    '07:00', '09:00',  50, 30, true),
  ('almuerzo', 'Almuerzo', '12:00 PM - 2:30 PM',   '12:00', '14:30', 120, 70, true),
  ('cena',     'Cena',     '6:00 PM - 8:00 PM',    '18:00', '20:00',  80, 45, true);

insert into settings (id, reservas_habilitadas) values (true, true);

-- 8.4 Reservas de muestra (fechas relativas a HOY) ---------------------
with src(ord, days_off, meal_id, student_id, status) as (
  values
    -- Hoy: desayuno (6)
    (1,  0, 'desayuno', 'EST001', 'Utilizada'::reservation_status),
    (2,  0, 'desayuno', 'EST004', 'Activa'::reservation_status),
    (3,  0, 'desayuno', 'EST003', 'Activa'::reservation_status),
    (4,  0, 'desayuno', 'EST007', 'Activa'::reservation_status),
    (5,  0, 'desayuno', 'EST010', 'Activa'::reservation_status),
    (6,  0, 'desayuno', 'EST006', 'Activa'::reservation_status),
    -- Hoy: almuerzo (11)
    (7,  0, 'almuerzo', 'EST002', 'Activa'::reservation_status),
    (8,  0, 'almuerzo', 'EST003', 'Utilizada'::reservation_status),
    (9,  0, 'almuerzo', 'EST005', 'Activa'::reservation_status),
    (10, 0, 'almuerzo', 'EST006', 'Utilizada'::reservation_status),
    (11, 0, 'almuerzo', 'EST007', 'Activa'::reservation_status),
    (12, 0, 'almuerzo', 'EST008', 'Activa'::reservation_status),
    (13, 0, 'almuerzo', 'EST009', 'Activa'::reservation_status),
    (14, 0, 'almuerzo', 'EST011', 'Activa'::reservation_status),
    (15, 0, 'almuerzo', 'EST012', 'Activa'::reservation_status),
    (16, 0, 'almuerzo', 'EST004', 'Activa'::reservation_status),
    (17, 0, 'almuerzo', 'EST010', 'Cancelada'::reservation_status),
    -- Hoy: cena (7)
    (18, 0, 'cena', 'EST002', 'Activa'::reservation_status),
    (19, 0, 'cena', 'EST004', 'Activa'::reservation_status),
    (20, 0, 'cena', 'EST006', 'Activa'::reservation_status),
    (21, 0, 'cena', 'EST008', 'Utilizada'::reservation_status),
    (22, 0, 'cena', 'EST010', 'Activa'::reservation_status),
    (23, 0, 'cena', 'EST012', 'Activa'::reservation_status),
    (24, 0, 'cena', 'EST003', 'Activa'::reservation_status),
    -- Mañana (8)
    (25, 1, 'almuerzo', 'EST001', 'Activa'::reservation_status),
    (26, 1, 'almuerzo', 'EST003', 'Activa'::reservation_status),
    (27, 1, 'almuerzo', 'EST005', 'Activa'::reservation_status),
    (28, 1, 'almuerzo', 'EST009', 'Activa'::reservation_status),
    (29, 1, 'cena',     'EST002', 'Activa'::reservation_status),
    (30, 1, 'cena',     'EST007', 'Activa'::reservation_status),
    (31, 1, 'desayuno', 'EST004', 'Activa'::reservation_status),
    (32, 1, 'desayuno', 'EST011', 'Activa'::reservation_status),
    -- Pasado mañana (4)
    (33, 2, 'almuerzo', 'EST006', 'Activa'::reservation_status),
    (34, 2, 'almuerzo', 'EST010', 'Activa'::reservation_status),
    (35, 2, 'almuerzo', 'EST012', 'Activa'::reservation_status),
    (36, 2, 'cena',     'EST005', 'Activa'::reservation_status),
    -- En 3 días (3)
    (37, 3, 'almuerzo', 'EST002', 'Activa'::reservation_status),
    (38, 3, 'almuerzo', 'EST008', 'Activa'::reservation_status),
    (39, 3, 'desayuno', 'EST001', 'Activa'::reservation_status)
)
insert into reservations (id, student_id, meal_id, fecha, status, qr_code, created_at, used_at)
select 'RES-' || lpad(src.ord::text, 5, '0'),
       src.student_id,
       src.meal_id,
       current_date + src.days_off,
       src.status,
       json_build_object(
         'reservationId', 'RES-' || lpad(src.ord::text, 5, '0'),
         'studentId',     src.student_id,
         'meal',          m.nombre,
         'date',          (current_date + src.days_off)
       )::text,
       (current_date + src.days_off + time '08:00')::timestamptz,
       case when src.status = 'Utilizada'
            then (current_date + src.days_off + time '12:35')::timestamptz
       end
from src
join meals m on m.id = src.meal_id;

-- 8.5 Encuestas --------------------------------------------------------
insert into surveys (id, title, question, active, created_at) values
  ('ENC-001', 'Menú preferido del mes',
   '¿Qué comidas te gustaría ver en el comedor este mes? Puedes marcar varias.',
   true, now() - interval '3 days'),
  ('ENC-002', 'Plato estrella de la semana pasada',
   '¿Cuál fue el plato que más te gustó de la semana anterior?',
   false, now() - interval '10 days');

insert into survey_options (survey_id, label, orden) values
  ('ENC-001', 'Lomo saltado',     1),
  ('ENC-001', 'Ají de gallina',   2),
  ('ENC-001', 'Ceviche',          3),
  ('ENC-001', 'Arroz chaufa',     4),
  ('ENC-001', 'Lasaña',           5),
  ('ENC-001', 'Pollo a la brasa', 6),
  ('ENC-002', 'Causa limeña',     1),
  ('ENC-002', 'Seco de carne',    2),
  ('ENC-002', 'Tallarín rojo',    3);

-- 8.6 Respuestas de muestra (16) ---------------------------------------
with resp(survey_id, student_id, positions, days_off) as (
  values
    -- ENC-001 (abierta): 10 estudiantes ya votaron
    ('ENC-001', 'EST001', array[1, 5], -2),
    ('ENC-001', 'EST002', array[2],    -2),
    ('ENC-001', 'EST003', array[1, 3], -2),
    ('ENC-001', 'EST004', array[2, 6], -2),
    ('ENC-001', 'EST005', array[1],    -2),
    ('ENC-001', 'EST006', array[3, 5], -2),
    ('ENC-001', 'EST007', array[4],    -1),
    ('ENC-001', 'EST008', array[2, 5], -1),
    ('ENC-001', 'EST010', array[1, 6], -1),
    ('ENC-001', 'EST011', array[3],    -1),
    -- ENC-002 (cerrada): 6 respuestas
    ('ENC-002', 'EST001', array[1], -9),
    ('ENC-002', 'EST003', array[2], -9),
    ('ENC-002', 'EST004', array[1], -9),
    ('ENC-002', 'EST006', array[3], -9),
    ('ENC-002', 'EST007', array[1], -8),
    ('ENC-002', 'EST009', array[2], -8)
),
ins as (
  insert into survey_responses (survey_id, student_id, student_name, created_at, updated_at)
  select r.survey_id,
         r.student_id,
         s.nombre,
         (current_date + r.days_off + time '11:15')::timestamptz,
         (current_date + r.days_off + time '11:15')::timestamptz
  from resp r
  join students s on s.id = r.student_id
  returning id, survey_id, student_id
)
insert into survey_response_options (response_id, option_id)
select i.id, o.id
from ins i
join resp r          on r.survey_id = i.survey_id and r.student_id = i.student_id
join survey_options o on o.survey_id = i.survey_id and o.orden = any (r.positions);


-- =====================================================================
-- 9. SECUENCIAS ALINEADAS con los datos sembrados
--    (los ids de arriba se insertaron de forma explícita)
-- =====================================================================

select setval('reservation_seq',
              coalesce((select max(substr(id, 5)::int) from reservations), 0), true);
select setval('survey_seq',
              coalesce((select max(substr(id, 5)::int) from surveys), 0), true);
select setval('survey_response_seq',
              coalesce((select max(substr(id, 6)::int) from survey_responses), 0), true);


-- =====================================================================
-- 10. PERMISOS para los roles de Supabase (lectura/escritura de la app)
-- =====================================================================

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;


-- =====================================================================
-- 11. VERIFICACIÓN (deben devolver estos resultados)
--     students 12 · app_users 8 · meals 3 · reservations 39
--     surveys 2 · survey_options 9 · survey_responses 16
--     survey_response_options 22 · settings 1
-- =====================================================================

select 'students'                 as tabla, count(*) as filas from students
union all select 'app_users',               count(*) from app_users
union all select 'meals',                   count(*) from meals
union all select 'reservations',            count(*) from reservations
union all select 'surveys',                 count(*) from surveys
union all select 'survey_options',          count(*) from survey_options
union all select 'survey_responses',        count(*) from survey_responses
union all select 'survey_response_options', count(*) from survey_response_options
union all select 'settings',                count(*) from settings;

-- Cupos de hoy (lo que vería el estudiante al reservar)
select * from vw_meal_stats where fecha = current_date order by "mealId";

-- Resultados de la encuesta abierta (top primero)
select * from vw_survey_results where "surveyId" = 'ENC-001' order by votes desc;
