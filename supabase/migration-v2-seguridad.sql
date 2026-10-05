-- =====================================================================
--  UNJFSC Comedor digital — Migración v2: Supabase Auth + RLS por usuario
--
--  Qué cambia respecto a la v1 (login simulado con permisos abiertos):
--   1. El login pasa a usar Supabase Auth (contraseñas con hash bcrypt).
--   2. Se eliminan las columnas `password` en texto plano de `students`
--      y `app_users`: las contraseñas solo viven en `auth.users`.
--   3. RLS por usuario: cada estudiante solo ve/modifica sus propias filas;
--      el rol `admin` ve todo; el rol `anon` no accede a nada.
--   4. Los agregados (cupos y resultados de encuestas) se sirven desde
--      vistas que solo devuelven conteos, sin datos personales.
--   5. Nuevas funciones para la app: crear cuentas, obtener el siguiente
--      código de reserva/respuesta (sin colisiones entre dispositivos).
--   6. Repara las columnas de token de `auth.users` que deben quedar en ''
--      (si quedan en NULL, el login devuelve 500 «database error querying
--      schema»: bug conocido supabase/auth#1940 al crear usuarios a mano).
--
--  Cómo usarlo:
--   1. Supabase → SQL Editor → New query.
--   2. Pega TODO este archivo y pulsa Run (Ctrl + Enter).
--   3. (Recomendado) Authentication → Settings → Providers → Email:
--      desactiva «Allow new users to sign up».
--
--  Es idempotente: se puede ejecutar más de una vez sin romper nada.
-- =====================================================================


-- =====================================================================
-- 1. EXTENSIÓN PARA CIFRAR CONTRASEÑAS (bcrypt)
-- =====================================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- Helper público que resuelve crypt()/gen_salt() esté pgcrypto en
-- `extensions` o en `public`.
create or replace function public.demo_crypt(p_pass text)
returns text
language sql volatile
set search_path = public, extensions
as $$
  select crypt(p_pass, gen_salt('bf'))
$$;


-- =====================================================================
-- 2. FUNCIONES AUXILIARES DE SEGURIDAD
--    SECURITY DEFINER: se ejecutan con permisos de propietario, así que
--    pueden leer `app_users`/`students` sin disparar las políticas RLS
--    (evita recursión infinita entre políticas).
-- =====================================================================

-- Correo del usuario autenticado en la petición actual (minúsculas).
-- Lee los claims del JWT de la misma fuente que auth.jwt() (GUC que fija
-- PostgREST en cada petición), así no depende de privilegios sobre el
-- esquema `auth`.
create or replace function public.app_email()
returns text
language sql stable
as $$
  select lower(coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email',
    ''
  ))
$$;

-- true cuando la cuenta pertenece al rol administrador.
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public, extensions, auth
as $$
  select exists (
    select 1 from public.app_users
    where email = public.app_email()
      and role = 'admin'
  )
$$;

-- Identificador EST### del usuario autenticado (null si no es estudiante).
create or replace function public.my_student_id()
returns text
language sql stable security definer
set search_path = public, extensions, auth
as $$
  select coalesce(
    (select student_id from public.app_users
      where email = public.app_email() and student_id is not null),
    (select id from public.students
      where lower(correo) = public.app_email())
  )
$$;


-- =====================================================================
-- 3. SIGUIENTES CÓDIGOS (la BD los asigna; sin colisiones entre equipos)
-- =====================================================================

create or replace function public.next_reservation_id()
returns text
language plpgsql volatile security definer
set search_path = public
as $$
begin
  return 'RES-' || lpad(nextval('reservation_seq')::text, 5, '0');
end;
$$;

create or replace function public.next_response_id()
returns text
language plpgsql volatile security definer
set search_path = public
as $$
begin
  return 'RESP-' || lpad(nextval('survey_response_seq')::text, 3, '0');
end;
$$;


-- =====================================================================
-- 4. CREAR CUENTA DE ACCESO (la usa el admin al agregar un estudiante)
--    Solo administradores; inserta en auth.users con hash bcrypt.
-- =====================================================================

-- ⚠️ Al crear usuarios con SQL a mano, estas columnas de texto quedan en
-- NULL y GoTrue (el motor de Supabase Auth) las escanea como texto NO
-- anulable al iniciar sesión: devuelve 500 «database error querying
-- schema» (bug supabase/auth#1940). Se rellenan con ''.
-- Documentación: ninguna de estas columnas aparece en los docs de Supabase.
create or replace function public.fix_auth_tokens(p_id uuid default null)
returns void
language plpgsql security definer
set search_path = public, extensions, auth
as $$
declare r record;
begin
  -- Cualquier columna de texto anulable que GoTrue escanea a un `string`
  -- (confirmation_token, recovery_token, email_change, email_change_token_*)
  -- debe llevar '' y nunca NULL.
  -- Ojo: en Supabase son VARCHAR(255), no `text` (migraciones de GoTrue),
  -- así que se buscan por data_type in ('text', 'character varying').
  for r in
    select column_name
      from information_schema.columns
     where table_schema = 'auth'
       and table_name    = 'users'
       and data_type     in ('text', 'character varying')
       and is_nullable   = 'YES'
       and column_name   not in ('email', 'phone')   -- tienen índice único
  loop
    execute format(
      'update auth.users set %I = '''' where %I is null%s',
      r.column_name, r.column_name,
      case when p_id is null then ''
           else format(' and id = %L::uuid', p_id) end
    );
  end loop;

  -- En auth.identities también puede existir una columna `email` escaneable.
  -- En algunos proyectos es GENERADA (se calcula de identity_data), así que
  -- solo se toca si es una columna normal y corriente.
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'identities'
      and column_name = 'email'
      and data_type in ('text', 'character varying')
      and is_generated = 'NEVER'
  ) then
    execute format(
      'update auth.identities
         set email = coalesce(email, identity_data ->> ''email'', '''')
       where email is null%s',
      case when p_id is null then ''
           else format(' and user_id = %L::uuid', p_id) end
    );
  end if;
end $$;

create or replace function public.create_demo_user(p_email text, p_password text)
returns void
language plpgsql security definer
set search_path = public, extensions, auth
as $$
declare
  v_mail text := lower(trim(coalesce(p_email, '')));
  v_pass text := coalesce(p_password, '');
  v_uid  uuid;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede crear cuentas de acceso.';
  end if;
  if v_mail = '' or position('@' in v_mail) = 0 then
    raise exception 'El correo no tiene un formato válido.';
  end if;
  if length(v_pass) < 6 then
    raise exception 'La contraseña debe tener al menos 6 caracteres.';
  end if;

  select id into v_uid from auth.users where lower(email) = v_mail;

  if v_uid is null then
    v_uid := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated',
      'authenticated', v_mail, public.demo_crypt(v_pass), now(),
      '{"provider":"email","providers":["email"]}', '{}'::jsonb, now(), now()
    );

    insert into auth.identities (
      id, user_id, provider, provider_id, identity_data,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_uid, 'email', v_uid::text,
      jsonb_build_object('sub', v_uid::text, 'email', v_mail),
      now(), now(), now()
    );
  else
    -- La cuenta ya existía: se actualiza la contraseña.
    update auth.users
       set encrypted_password   = public.demo_crypt(v_pass),
           email_confirmed_at   = coalesce(email_confirmed_at, now()),
           updated_at           = now()
     where id = v_uid;
  end if;

  -- GoTrue necesita estas columnas en '' (bug supabase/auth#1940).
  perform public.fix_auth_tokens(v_uid);
end;
$$;


-- =====================================================================
-- 5. CREDENCIALES DE ACCESO EN AUTH (bcrypt)
--    · 8 cuentas de demostración (app_users)
--    · 12 correos institucionales de los estudiantes (contraseña 123456)
--    Idempotente: si el correo ya existe, se omite.
-- =====================================================================

do $$
declare
  acc       record;
  v_uid     uuid;
  v_mail    text;
  v_pass    text;
begin
  for acc in
    select * from (values
      ('admin@demo.com',       'admin123'),
      ('coordinador@demo.com', 'admin123'),
      ('estudiante@demo.com',  '123456'),
      ('libre@demo.com',       '123456'),
      ('becario@demo.com',     '123456'),
      ('jorge@demo.com',       '123456'),
      ('valeria@demo.com',     '123456'),
      ('camila@demo.com',      '123456')
    ) as v(email, pass)
  loop
    v_mail := lower(acc.email);
    v_pass := acc.pass;
    select id into v_uid from auth.users where lower(email) = v_mail;

    if v_uid is null then
      v_uid := gen_random_uuid();
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at
      ) values (
        '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated',
        'authenticated', v_mail, public.demo_crypt(v_pass), now(),
        '{"provider":"email","providers":["email"]}', '{}'::jsonb, now(), now()
      );
      insert into auth.identities (
        id, user_id, provider, provider_id, identity_data,
        last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(), v_uid, 'email', v_uid::text,
        jsonb_build_object('sub', v_uid::text, 'email', v_mail),
        now(), now(), now()
      );
    end if;
  end loop;

  -- Correos institucionales de los estudiantes (todos con 123456).
  for acc in select lower(correo) as email, '123456' as pass from public.students loop
    v_mail := acc.email;
    v_pass := acc.pass;
    select id into v_uid from auth.users where lower(email) = v_mail;

    if v_uid is null then
      v_uid := gen_random_uuid();
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at
      ) values (
        '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated',
        'authenticated', v_mail, public.demo_crypt(v_pass), now(),
        '{"provider":"email","providers":["email"]}', '{}'::jsonb, now(), now()
      );
      insert into auth.identities (
        id, user_id, provider, provider_id, identity_data,
        last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(), v_uid, 'email', v_uid::text,
        jsonb_build_object('sub', v_uid::text, 'email', v_mail),
        now(), now(), now()
      );
    end if;
  end loop;
end $$;

-- Importante: repara también a los usuarios creados en una ejecución
-- anterior (las columnas de token quedaron en NULL y GoTrue devuelve
-- «database error querying schema» al iniciar sesión — bug supabase/auth#1940).
select public.fix_auth_tokens();


-- =====================================================================
-- 6. SE ADIOS AL TEXTO PLANO  (el DROP de columnas va en la sección 7,
--    al final, porque mientras `vw_students` y `vw_app_users` sigan
--    leyendo `password`, PostgreSQL no deja quitar la columna de las
--    tablas; además `create or replace view` no admite eliminar columnas
--    de una vista que ya existe, así que esas vistas se recrean.)
-- =====================================================================


-- =====================================================================
-- 7. VISTAS ACTUALIZADAS
--    · vw_students / vw_app_users: ya no exponen `password`.
--    · vw_meal_stats / vw_survey_results: SOLO agregados (sin nombres),
--      ejecutan como propietario (security_invoker = false) para que un
--      estudiante vea los cupos y los resultados aunque RLS le oculte las
--      filas individuales.
--    · vw_survey_results incluye `totalResponses` (total de votantes).
-- =====================================================================

-- Se recrean (no se puede usar `create or replace` porque cambia el número
-- de columnas: desaparece `password`).
drop view if exists vw_students;
create view vw_students
with (security_invoker = true) as
select id, nombre, correo, tipo::text as tipo, activo, created_at as "createdAt"
from students;

drop view if exists vw_app_users;
create view vw_app_users
with (security_invoker = true) as
select email, role::text as role, nombre,
       student_id as "studentId", tipo::text as tipo
from app_users;

drop view if exists vw_meal_stats;
create view vw_meal_stats
with (security_invoker = false) as
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

drop view if exists vw_survey_results;
create view vw_survey_results
with (security_invoker = false) as
with tot as (
  select survey_id, count(*)::int as n
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
       end                         as percent,
       coalesce(t.n, 0)            as "totalResponses"
from survey_options o
left join survey_response_options ro on ro.option_id = o.id
left join tot t                      on t.survey_id  = o.survey_id
group by o.survey_id, o.id, o.label, t.n;

-- Por fin ya nadie lee `password`: se eliminan las columnas.
alter table students drop column if exists password;
alter table app_users  drop column if exists password;


-- =====================================================================
-- 8. ROW LEVEL SECURITY POR USUARIO
--    (se retira la política abierta `demo_acceso_total` de la v1)
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
    execute format('drop policy if exists demo_acceso_total on %I', t);
    execute format('drop policy if exists %I_lectura on %I', t, t);
    execute format('drop policy if exists %I_escritura on %I', t, t);
  end loop;
  drop policy if exists reservations_actualizar on reservations;
  drop policy if exists reservations_borrar     on reservations;
  drop policy if exists survey_response_options_encuesta on survey_response_options;
end;
$$;

-- 8.1 students: el admin ve a todos; cada estudiante solo a sí mismo.
create policy students_lectura on students
  for select to authenticated
  using (public.is_admin() or id = public.my_student_id());

create policy students_escritura on students
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 8.2 app_users: cada cuenta ve la suya; el admin, todas.
create policy app_users_lectura on app_users
  for select to authenticated
  using (public.is_admin() or email = public.app_email());

create policy app_users_escritura on app_users
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 8.3 meals y settings: lectura para cualquier sesión; cambios, solo admin.
create policy meals_lectura on meals
  for select to authenticated using (true);

create policy meals_escritura on meals
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy settings_lectura on settings
  for select to authenticated using (true);

create policy settings_escritura on settings
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 8.4 surveys y survey_options: lectura para votar; cambios, solo admin.
create policy surveys_lectura on surveys
  for select to authenticated using (true);

create policy surveys_escritura on surveys
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy survey_options_lectura on survey_options
  for select to authenticated using (true);

create policy survey_options_escritura on survey_options
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 8.5 reservations: propias o todas (admin). El estudiante puede cancelar
--     su reserva pero no marcarse la como «utilizada».
create policy reservations_lectura on reservations
  for select to authenticated
  using (public.is_admin() or student_id = public.my_student_id());

create policy reservations_escritura on reservations
  for insert to authenticated
  with check (public.is_admin() or student_id = public.my_student_id());

create policy reservations_actualizar on reservations
  for update to authenticated
  using (public.is_admin() or student_id = public.my_student_id())
  with check (
    public.is_admin()
    or (student_id = public.my_student_id() and status <> 'Utilizada')
  );

create policy reservations_borrar on reservations
  for delete to authenticated
  using (public.is_admin());

-- 8.6 survey_responses: la propia (o todas, si eres admin).
create policy survey_responses_lectura on survey_responses
  for select to authenticated
  using (public.is_admin() or student_id = public.my_student_id());

create policy survey_responses_escritura on survey_responses
  for all to authenticated
  using (public.is_admin() or student_id = public.my_student_id())
  with check (public.is_admin() or student_id = public.my_student_id());

-- 8.7 survey_response_options: siguen a su respuesta (dueño o admin).
create policy survey_response_options_encuesta on survey_response_options
  for all to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from survey_responses r
      where r.id = response_id and r.student_id = public.my_student_id()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from survey_responses r
      where r.id = response_id and r.student_id = public.my_student_id()
    )
  );


-- =====================================================================
-- 9. PERMISOS
--    · `anon` (clave pública sin sesión) no accede a ninguna tabla.
--    · `authenticated` lee las vistas y ejecuta las funciones de la app.
-- =====================================================================

revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

grant select on vw_students, vw_app_users, vw_meals, vw_settings,
               vw_reservations, vw_surveys, vw_survey_responses,
               vw_survey_results, vw_meal_stats
to authenticated;

revoke execute on function public.demo_crypt(text)            from public, anon;
revoke execute on function public.app_email()                 from public, anon;
revoke execute on function public.is_admin()                  from public, anon;
revoke execute on function public.my_student_id()             from public, anon;
revoke execute on function public.next_reservation_id()       from public, anon;
revoke execute on function public.next_response_id()          from public, anon;
revoke execute on function public.create_demo_user(text, text) from public, anon;
-- fix_auth_tokens solo la llama el propio script (postgres); no la expone.
revoke execute on function public.fix_auth_tokens(uuid)               from public, anon;

grant execute on function public.demo_crypt(text)             to authenticated, service_role;
grant execute on function public.app_email()                  to authenticated;
grant execute on function public.is_admin()                   to authenticated;
grant execute on function public.my_student_id()              to authenticated;
grant execute on function public.next_reservation_id()        to authenticated;
grant execute on function public.next_response_id()           to authenticated;
grant execute on function public.create_demo_user(text, text) to authenticated;


-- =====================================================================
-- 10. SECUENCIAS AL DÍA
--     La siembra creó los códigos a mano (RES-00001...), así que hay que
--     dejar la secuencia justo después del último para que los nuevos
--     códigos no se repitan.
-- =====================================================================

select setval('reservation_seq',
  coalesce((select max((regexp_replace(id, '\D', '', 'g'))::int) from reservations), 0));
select setval('survey_seq',
  coalesce((select max((regexp_replace(id, '\D', '', 'g'))::int) from surveys), 0));
select setval('survey_response_seq',
  coalesce((select max((regexp_replace(id, '\D', '', 'g'))::int) from survey_responses), 0));
