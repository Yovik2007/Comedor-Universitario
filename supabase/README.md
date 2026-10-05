# UNJFSC Comedor digital — Base de datos en Supabase

Este script crea **desde cero** toda la base de datos del proyecto en
[Supabase](https://supabase.com), con la misma información que hoy vive en
`localStorage`.

## 1. Crear el proyecto

1. Entra a <https://supabase.com> y crea una cuenta (plan Free).
2. **New project**:
   - *Name*: `Comedor UNJFSC` (o el que prefieras)
   - *Database Password*: genera uno y guárdalo
   - *Region*: **South America (São Paulo)** o la más cercana
3. Espera ~2 minutos a que el proyecto quede *Ready*.

## 2. Ejecutar el script

1. En el panel lateral: **SQL Editor** → **New query**.
2. Abre `supabase/schema.sql`, copia **todo** su contenido y pégalo.
3. Pulsa **Run** (o `Ctrl + Enter`).
4. Al terminar verás la tabla de conteos de la sección 11.

## 3. Comprobar que quedó bien

- **Table Editor**: deben aparecer 9 tablas (`students`, `app_users`, `meals`,
  `settings`, `reservations`, `surveys`, `survey_options`, `survey_responses`,
  `survey_response_options`).
- **Database → Views**: 10 vistas `vw_*` (son las que leerá la aplicación).
- Datos esperados:

  | Tabla | Filas |
  | --- | --- |
  | `students` | 12 |
  | `app_users` | 8 |
  | `meals` | 3 |
  | `settings` | 1 |
  | `reservations` | 39 |
  | `surveys` | 2 |
  | `survey_options` | 9 |
  | `survey_responses` | 16 |
  | `survey_response_options` | 22 |

## 4. Datos con los que puedes entrar (igual que ahora)

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Administrador | `admin@demo.com` | `admin123` |
| Coordinación | `coordinador@demo.com` | `admin123` |
| Estudiante | `estudiante@demo.com` | `123456` |
| Estudiante | `libre@demo.com` | `123456` |
| Estudiante | `becario@demo.com` | `123456` |

También sirve el correo institucional de cualquiera de los 12 estudiantes
(p. ej. `ana.flores@universidad.edu.pe`) con la contraseña `123456`.

## 5. Diseño del esquema

- **Lecturas** de la app → vistas `vw_*`, cuyos campos coinciden con los tipos
  de TypeScript (`vw_reservations`, `vw_surveys`, `vw_survey_results`,
  `vw_meal_stats`, etc.).
- **Escrituras** → tablas base (`reservations`, `survey_responses`, ...).
- Reglas de negocio reforzadas en la base:
  - `uq_reserva_unica`: una sola reserva *Activa/Utilizada* por estudiante,
    servicio y fecha (las canceladas no cuentan).
  - `survey_responses (survey_id, student_id)`: **un voto por estudiante**.
  - `check` de validación de correos, cupos (`becarios ≤ total`) y textos.
- Códigos visibles generados por secuencia: `RES-00040`, `ENC-003`, `RESP-017`.
- `updated_at` automático mediante triggers.

## 6. Seguridad (importante)

- **RLS está activado** en las 9 tablas con la política `demo_acceso_total`
  (lectura y escritura para el rol `anon`), porque el login de la app es
  **simulado** y no usa Supabase Auth.
- ⚠️ Esto es válido **solo para la demostración**: cualquiera con la *anon key*
  podría modificar los datos. Para producción hay que pasar a Supabase Auth y
  sustituir esas políticas por políticas por usuario.
- Las contraseñas se guardan en texto plano (el login lo compara en el
  cliente); igual que hoy en `localStorage`. No usar con datos reales.

## 7. Conectar la aplicación

La aplicación ya incluye el cliente (`@supabase/supabase-js`) y toda la capa de
lectura/escritura (`src/services/api.ts`). Solo falta pegar la clave pública:

1. En Supabase: **Project Settings (engranaje, abajo a la izquierda) → API keys**
   → copia la clave **`anon public`**. (También desde el botón verde **Connect →
   pestaña API**.)
2. Pégala en el `.env` de la raíz del proyecto:

   ```env
   VITE_SUPABASE_URL=https://mndwgcxdrpnwbqulosjk.supabase.co
   VITE_SUPABASE_ANON_KEY=PEGA_AQUI_TU_CLAVE_ANON
   ```

3. Reinicia el servidor (`npm run dev`) y entra a **Configuración**: debe
   aparecer *Base de datos: COMEDOR UNJFSC (PostgreSQL)*.

Sin clave, la app funciona en modo local (`localStorage`), igual que siempre.
Con clave, las lecturas salen de las vistas `vw_*` y las escrituras van a las
tablas base; si Supabase no responde, la app lo avisa y sigue en modo local.

## 8. Restaurar los datos demo

Vuelve a ejecutar **todo** `supabase/schema.sql` en el SQL Editor: sus dos
primeras líneas borran el esquema y lo vuelven a sembrar con los datos
originales (12 estudiantes, 39 reservas, 2 encuestas, 16 respuestas…).
