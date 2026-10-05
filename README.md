# UNJFSC Comedor digital — Sistema de reservas de comedor universitario

Aplicación web para gestionar las reservas de alimentación del comedor universitario:
los estudiantes reservan desayuno, almuerzo o cena y reciben un código/QR, el equipo
administrativo controla cupos y estudiantes, y el kiosco valida el acceso.

Los datos viven en **Supabase** (proyecto *COMEDOR UNJFSC*, PostgreSQL) cuando se
configuran las credenciales en `.env`; sin ellas, la app funciona igual que antes con
`localStorage` (modo demostración sin internet). No se usa Firebase ni ninguna otra API.

## Requisitos

- Node.js 18 o superior
- npm 9 o superior

## Ejecutar el proyecto

```bash
npm install
npm run dev
```

El servidor de desarrollo queda en **http://localhost:3000**.

> **Windows / PowerShell:** si aparece un error de política de ejecución al usar
> `npm run dev`, usa `npm.cmd run dev`.

Otros comandos:

| Comando             | Descripción                                            |
| ------------------- | ------------------------------------------------------ |
| `npm run dev`       | Servidor de desarrollo (Vite, puerto 3000)             |
| `npm run build`     | Verifica tipos (`tsc --noEmit`) y genera `dist/`       |
| `npm run preview`   | Sirve la compilación de producción                     |
| `npm run typecheck` | Solo verifica TypeScript                               |

## Base de datos (Supabase)

La conexión se define en el archivo **`.env`** de la raíz (dos variables):

| Variable                  | Contenido                                             |
| ------------------------- | ----------------------------------------------------- |
| `VITE_SUPABASE_URL`       | Project URL del proyecto (`https://xxxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY`  | Clave pública `anon` / publishable                    |

```bash
cp .env.example .env     # y pega tus credenciales
npm run dev
```

Cómo se reparte el trabajo (ver `supabase/README.md` para el script SQL):

- **Lecturas**: `AppContext` paga una única carga inicial desde las vistas
  `vw_students`, `vw_app_users`, `vw_meals`, `vw_settings`, `vw_reservations`,
  `vw_surveys` y `vw_survey_responses`, que devuelven exactamente los mismos
  nombres de campo que los tipos de TypeScript.
- **Escrituras**: cada acción (reservar, cancelar, validar, editar cupos,
  crear/eliminar encuestas, votar…) escribe en la tabla base correspondiente
  y solo actualiza la pantalla si la base confirmó la operación.
- **Respaldo local**: mientras tanto, `localStorage` guarda una copia de los
  datos; si Supabase no responde, la app avisa con un toast y sigue operativa
  en modo local.
- Si `.env` no tiene clave, todo funciona en modo local (sin peticiones de red).

> ⚠ La clave `anon` es pública (va embebida en la web) y las políticas RLS del
> script están abiertas **solo para esta demostración**. Para producción se
> recomienda Supabase Auth y políticas por usuario.

## Sitio publicado (GitHub Pages)

El repositorio incluye el workflow **`.github/workflows/deploy.yml`**, que compila y
publica la app en **https://yovik2007.github.io/Comedor-Universitario/** con cada `push`
a `main` (también se puede lanzar a mano desde la pestaña *Actions*).

Único paso manual, solo una vez: en GitHub → **Settings → Pages → Build and deployment →
Source** → elegir **GitHub Actions**.

Cómo está resuelto:

- `GITHUB_PAGES=1 npm run build` compila con `base: "/Comedor-Universitario/"`; las
  compilaciones normales siguen usando `/`, sin cambiar nada del desarrollo local.
- El router usa `basename` derivado de `import.meta.env.BASE_URL`, así que las rutas son
  idénticas en local y en Pages (`/login`, `/admin`, ...).
- El build genera `404.html` (copia del shell de la app) para que al recargar una ruta
  directa como `.../admin` GitHub Pages sirva la SPA en vez de un 404 real.

## Usuarios de demostración

Toca **«Ver cuentas de demostración»** (debajo del formulario) y elige una cuenta:
se autocompletan correo y contraseña. Las cuentas están ocultas por defecto para que
el login muestre solo los campos de correo y contraseña.

| Rol                   | Correo                     | Contraseña |
| --------------------- | -------------------------- | ---------- |
| Administrador         | `admin@demo.com`           | `admin123` |
| Administrador         | `coordinador@demo.com`     | `admin123` |
| Estudiante · Becario  | `estudiante@demo.com`      | `123456`   |
| Estudiante · Becario  | `becario@demo.com`         | `123456`   |
| Estudiante · Becario  | `valeria@demo.com`         | `123456`   |
| Estudiante · Becario  | `camila@demo.com`          | `123456`   |
| Estudiante · Libre    | `libre@demo.com`           | `123456`   |
| Estudiante · Libre    | `jorge@demo.com`           | `123456`   |

Además, **los 12 estudiantes de ejemplo** pueden iniciar sesión con su correo
institucional y la contraseña `123456`, por ejemplo:

- `carlos.mendoza@universidad.edu.pe` — Carlos Mendoza (EST001, Becario)
- `ana.flores@universidad.edu.pe` — Ana Flores (EST004, Becario)
- `maria.torres@universidad.edu.pe` — María Torres (EST002, Libre)
- `luis.ramirez@universidad.edu.pe` — Luis Ramírez (EST003, Libre)

El patrón es `nombre.apellido@universidad.edu.pe` (ver `src/data/mockData.ts`).

## Rutas

| Ruta                | Descripción                                            |
| ------------------- | ------------------------------------------------------ |
| `/login`            | Inicio de sesión                                       |
| `/student`          | Inicio del estudiante (resumen del día)                |
| `/student/reservar` | Reservar desayuno, almuerzo o cena                     |
| `/student/reservas` | Mis reservas (activas / historial) con QR              |
| `/student/encuestas` | Encuestas de comidas: votar y ver resultados          |
| `/student/informacion` | Horarios, reglas y datos del comedor                |
| `/admin`            | Dashboard con indicadores y gráficos                   |
| `/admin/reservas`   | Tabla de reservas con filtros y detalle                |
| `/admin/cupos`      | Cupos por servicio y cierre/apertura de reservas       |
| `/admin/estudiantes`| Alta, búsqueda y baja de estudiantes                   |
| `/admin/encuestas`  | Crear encuestas, abrirlas/cerrarlas y ver resultados   |
| `/admin/validacion` | Validación de reservas por código                      |
| `/admin/configuracion` | Restablecer datos de demostración e información      |
| `/kiosco`           | Kiosco de validación de acceso                         |

Las rutas están protegidas por rol: un estudiante no puede entrar al panel
administrativo ni viceversa; sin sesión, todo redirige a `/login`.

## Funcionalidades

### Estudiante

- Resumen del día: reservas activas, servicio en curso, cupos disponibles y estado del comedor.
- Reserva con **modal de confirmación** (servicio, fecha, horario, tipo y cupos para su tipo).
- Reglas aplicadas: una reserva por servicio y fecha; si no hay cupos, el botón se deshabilita;
  cancelar libera el cupo inmediatamente.
- Mis reservas con pestañas **Activas** e **Historial**, código `RES-XXXXX` y **QR simulado**.
- Estados: `Activa`, `Utilizada`, `Cancelada`.
- **Encuestas de comidas**: vota qué platos quieres ver marcando **varias opciones**,
  cambia tu respuesta mientras la encuesta esté abierta y consulta los resultados
  en vivo (barras con votos y porcentaje). Las encuestas cerradas muestran los
  resultados finales.

### Administrador

- KPIs calculados desde los datos reales (estudiantes, reservas del día, utilizadas, cupos libres).
- Gráficos: reservas por servicio, estado de reservas, distribución becarios/libres y últimas reservas.
- Tabla de reservas con buscador, filtros por servicio, estado, tipo y fecha, más detalle en modal.
- Edición de cupos por servicio con validaciones:
  - los totales deben ser coherentes (becarios ≤ total);
  - no se puede bajar el total por debajo de las reservas existentes.
- Interruptor **Reservas habilitadas**: al apagarse, los estudiantes ven
  *“Las reservas se encuentran temporalmente cerradas.”*
- Gestión de estudiantes: alta, búsqueda, filtro por tipo, alta/baja de cuentas.
- **Encuestas de comidas**:
  - creación con título, pregunta y de 2 a 10 opciones (con validación);
  - interruptor **abierta/cerrada**: cerrada deja de aceptar votos;
  - resultados en tiempo real por opción (votos y porcentaje);
  - eliminación con confirmación (borra también sus respuestas).
- Validación por código con estados `✓ RESERVA VÁLIDA`, `⚠ Reserva ya utilizada`,
  `✕ Reserva cancelada` y `✕ Reserva no encontrada`.
- **Restablecer datos de demostración** con confirmación (restaura estudiantes,
  reservas, cupos, configuración y encuestas originales; en modo Supabase la
  restauración se hace reejecutando `supabase/schema.sql`).

### Kiosco

- Campo **“Ingresa código de reserva”** (Enter o botón *Validar reserva*).
- Acceso permitido marca la reserva como `Utilizada` automáticamente.
- Una reserva utilizada **no puede volver a validarse**.
- Historial de las últimas validaciones con hora.

## Diseño

- Paleta institucional: `#123B6D` (primario), `#2563EB` (secundario), `#38BDF8` (acento),
  `#FFFFFF` (fondo de tarjetas), `#F3F4F6` (fondo), verde/rojo/ámbar para estados.
- Tipos de la interfaz definidos como tokens en `src/index.css`.
- Responsive: escritorio (1920/1440), laptop (1024/768) y móvil (390) con sidebar colapsable.
- Sin `alert()`: los mensajes usan modales de confirmación y toasts.

## Persistencia

La fuente de verdad es **Supabase** (esquema descrito en `supabase/schema.sql`):
9 tablas (`students`, `app_users`, `meals`, `settings`, `reservations`, `surveys`,
`survey_options`, `survey_responses`, `survey_response_options`), 10 vistas `vw_*`
para leer y secuencias `RES-` / `ENC-` / `RESP-` para los códigos visibles.

Además, cada navegador guarda una **copia de respaldo** en `localStorage` bajo estas claves:

| Clave                        | Contenido                        |
| ---------------------------- | -------------------------------- |
| `comedor_current_user`       | Sesión activa                    |
| `comedor_reservations`       | Reservas                         |
| `comedor_students`           | Estudiantes                      |
| `comedor_meal_availability`  | Cupos por servicio               |
| `comedor_settings`           | Configuración (reservas abiertas)|
| `comedor_surveys`            | Encuestas de comidas              |
| `comedor_survey_responses`   | Respuestas a las encuestas        |
| `comedor_seed_date`          | Fecha de generación de datos     |

Los cupos disponibles siempre se **calculan** a partir de las reservas del día
(las canceladas no ocupan cupo), por lo que nunca quedan desincronizados.

## Estructura del proyecto

```
src/
├── components/
│   ├── layouts/        StudentLayout, AdminLayout, Sidebar, Header
│   ├── survey/         SurveyResultsBars (barras de resultados)
│   └── ui/             Button, Badge, Modal, StatCard, Table, Toast, Switch...
├── pages/
│   ├── student/        HomePage, ReservePage, MyReservationsPage,
│   │                   SurveysPage, InfoPage
│   ├── admin/          DashboardPage, ReservationsPage, CupsPage,
│   │                   StudentsPage, SurveyManagementPage,
│   │                   ValidationPage, SettingsPage
│   ├── kiosk/          KioskPage
│   ├── LoginPage.tsx
│   └── NotFoundPage.tsx
├── context/            AppContext (estado global), ToastContext
├── data/               mockData (estudiantes, cuentas demo, servicios,
│                       reservas y encuestas) y brand.ts (nombre y lema)
├── lib/                supabase.ts (cliente y modo de conexión)
├── services/           api.ts (lecturas/escrituras de la base de datos)
├── types/              Tipos compartidos
├── utils/              fechas, almacenamiento, reglas de reserva, formato
├── App.tsx             Rutas, pantalla de carga y guardas de rol
└── main.tsx            Punto de entrada
```

## Cambiar el nombre de la aplicación

El nombre visible y el título de la pestaña se definen en **dos sitios**:

1. `src/data/brand.ts` → `BRAND.name`, `BRAND.tagline`, `BRAND.institution` y
   `BRAND.documentTitle` (sidebar, cabecera, login, kiosco, pie y `document.title`).
2. `index.html` → `<title>` y `meta description` (mantener a mano, es el que ven
   los buscadores antes de cargar la app).

Nombre actual: **UNJFSC Comedor digital**.

## Stack técnico

React 19 · TypeScript · Vite · React Router 7 · Tailwind CSS 4 · Supabase (PostgreSQL) · lucide-react · qrcode.react
