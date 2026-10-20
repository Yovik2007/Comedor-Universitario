# Cómo se construyó «UNJFSC Comedor digital»

Guía para entender el proyecto desde cero y poder explicarlo.
Cada fase corresponde a **commits reales** del repositorio (se puede verificar en la pestaña *History* de GitHub).

---

## 1. En una página: qué es y para qué sirve

**El problema:** en un comedor universitario, los estudiantes hacen fila para pedir comida,
no hay control de cupos, no se sabe quién comió, y el equipo administrativo lleva todo en papel o Excel.
Resultado: colas largas, comida que sobra o falta, y cero información para tomar decisiones.

**La solución:** una **aplicación web** donde

- el **estudiante** reserva desayuno, almuerzo o cena desde su celular y recibe un código/QR;
- el **administrador** controla cupos, estudiantes, reservas y encuestas desde su panel;
- el **kiosco** (una pantalla en la entrada) valida el código y marca quién ya pasó.

**Los tres números que lo resumen:** 12 estudiantes, 3 servicios diarios (desayuno/almuerzo/cena),
cupos calculados en tiempo real (las cancelaciones libran cupo al instante).

---

## 2. Stack técnico y por qué cada pieza

| Pieza | Para qué está | Alternativa descartada y por qué |
| --- | --- | --- |
| **React 19 + TypeScript** | Interfaz; TS evita errores de tipos antes de ejecutar | JavaScript puro: sin detección de errores |
| **Vite** | Servidor de desarrollo instantáneo y build de producción | Create React App (obsoleto) |
| **React Router 7** | Rutas (`/login`, `/admin`, `/kiosco`) con guardas por rol | — |
| **Tailwind CSS 4** | Estilos + responsive (1920 → 390 px) | CSS a mano: más lento y propenso a inconsistencias |
| **Context API** | Estado global (sesión, datos, toasts) sin librerías extra | Redux: innecesario para este tamaño |
| **Supabase (PostgreSQL)** | Base de datos en la nube, login y permisos | **Firebase**: descartado por el enunciado / más dependencias |
| **localStorage** | Respaldo local si no hay internet | — |
| **GitHub Pages** | Hosting público y gratuito con despliegue automático | — |

> Regla del proyecto: **solo Supabase**, ninguna otra API externa.

---

## 3. Las 7 fases del desarrollo

### Fase 1 · Prototipo funcional (30 sep — `7cdc713`)
Se creó la app completa **sin base de datos**: datos de ejemplo en `src/data/mockData.ts`
y persistencia en `localStorage`.

Qué se resolvió aquí (y sigue vigente):
- las **reglas de negocio**: una reserva por servicio y fecha, no reservar si no hay cupo,
  cancelar libera cupo, una reserva no se valida dos veces;
- los **tres roles** y sus pantallas;
- el **diseño**: paleta institucional `#123B6D`, responsive, sin `alert()` (modales y toasts).

> **Qué decir:** «Primero construimos el producto completo con datos de mentira, para validar
> la lógica y la interfaz antes de tocar una base de datos.»

### Fase 2 · Publicación automática (30 sep — `1d743a8`, `812526f`, `76823a0`)
Workflow de GitHub Actions que compila y publica en
`https://yovik2007.github.io/Comedor-Universitario/` con cada `push`.
Detalles que costaron: `base` del router según el entorno y un `404.html` para que al
recargar `/admin` no aparezca el 404 de GitHub.

> **Qué decir:** «Cada vez que subo código, la web se actualiza sola en ~1 minuto.»

### Fase 3 · Login depurado (3 oct — `5c24022`)
La pantalla de acceso quedó en **solo correo y contraseña**; las cuentas de demostración
se ocultan tras un botón.

> **Qué decir:** «El login no muestra atajos: parece un login real. Las cuentas de prueba
> están disponibles, pero no a la vista.»

### Fase 4 · Módulo de encuestas (4 oct — `bf66e71`)
- Admin: crea encuestas con título, pregunta y de 2 a 10 opciones; abre/cierra; borra.
- Estudiante: marca **varias** opciones, envía y puede cambiar su respuesta.
- Resultados en vivo con barras y porcentajes (`SurveyResultsBars`).

> **Qué decir:** «Pasamos de reservas a *opinión*: la institución pregunta, el estudiante vota
> y los resultados salen en tiempo real.»

### Fase 5 · Conexión a la nube (5 oct — `bfc4df0`)
Supabase en lugar del navegador:
- `supabase/schema.sql`: **9 tablas**, 10 vistas `vw_*`, secuencias para los códigos `RES-`/`ENC-`/`RESP-`;
- `src/services/api.ts`: **capa de datos** única (lecturas y escrituras);
- `AppContext` hace una **carga inicial única** y cada acción solo pinta si la base confirmó;
- **modo dual**: sin `.env`, la app sigue funcionando local (útil para demo sin internet).

> **Qué decir:** «Los datos dejaron de vivir en el navegador: ahora viven en PostgreSQL en la nube,
> y el navegador es solo una ventana.»

### Fase 6 · Seguridad real: Auth + RLS (5 oct — `77c8974`)
La fase más importante técnicamente. Problemas que resolvía:
1. las contraseñas estaban **en texto plano** en las tablas;
2. cualquiera con la clave pública (`anon`) podía **leer y escribir toda la base**;
3. el "login" validaba contra una lista en el cliente (cualquiera podía saltárselo).

Solución:
- **Supabase Auth**: contraseñas guardadas como hash **bcrypt** dentro de `auth.users`;
  nuestras tablas ya **no tienen columna `password`**;
- **RLS (Row-Level Security)**: políticas fila por fila →
  *estudiante solo ve lo suyo, admin ve todo, sin sesión no se lee nada*;
- **vistas de agregados** (`vw_meal_stats`, `vw_survey_results`) para que los totales sigan
  siendo correctos aunque RLS oculte filas individuales;
- funciones en la base: `create_demo_user`, `next_reservation_id`, `next_response_id`, `is_admin`, `my_student_id`;
- script de migración **idempotente** (`migration-v2-seguridad.sql`): se puede re-ejecutar sin romper nada.

> **Qué decir:** «La seguridad ahora está en el servidor. Aunque alguien use la API directamente
> con la clave pública, la base no le devuelve ni una fila.»

---

## 4. El modelo actual (cómo funciona hoy)

### Arquitectura en tres capas

```
┌─────────────────────────────┐
│  1. INTERFAZ (React)        │  páginas, componentes, rutas, guardas por rol
└──────────────┬──────────────┘
               │  llama a
┌──────────────▼──────────────┐
│  2. CAPA DE DATOS (api.ts)  │  traduce cada acción a operaciones de la base
└──────────────┬──────────────┘
               │  HTTPS + JWT
┌──────────────▼──────────────┐
│  3. SUPABASE                │  PostgreSQL + Auth + RLS  (aquí se decide qué ves)
└─────────────────────────────┘
```

### Las 9 tablas

| Tabla | Qué guarda |
| --- | --- |
| `students` | Los estudiantes (id `EST###`, nombre, correo, tipo, activo) |
| `app_users` | Las 8 cuentas de acceso de demostración y su rol |
| `meals` | Los 3 servicios y sus cupos (total, becarios) |
| `settings` | Configuración global (reservas abiertas/cerradas) |
| `reservations` | Las reservas (`RES-00001`…, estado Activa/Utilizada/Cancelada) |
| `surveys` | Las encuestas (título, pregunta, abierta/cerrada) |
| `survey_options` | Las opciones de cada encuesta |
| `survey_responses` | Quién respondió (1 por estudiante y encuesta) |
| `survey_response_options` | Qué opciones marcó (respuesta 1-N) |

Las **vistas `vw_*`** devuelven los mismos nombres de campo que los tipos de TypeScript,
así que la interfaz no sabe (ni necesita saber) de dónde vienen los datos.

### Seguridad: quién ve qué

| Rol | Ve |
| --- | --- |
| `anon` (sin sesión) | **Nada** — ni una fila |
| Estudiante | Solo sus filas (`student_id = el tuyo`) |
| Admin | Todo |

### Tres flujos para tener claros

**a) Iniciar sesión**
1. Escribes correo y contraseña → `api.signIn()`.
2. Supabase Auth compara el hash bcrypt → si coincide, devuelve un **token JWT**.
3. Con ese token, la app pide los datos: cada consulta pasa por las políticas RLS
   y la base devuelve **solo lo que ese usuario puede ver**.

**b) Reservar una cena**
1. El estudiante pulsa *Reservar* → se abre el modal con horario, tipo y cupos.
2. La app llama a la base; esta comprueba: ¿hay sesión?, ¿es suyo?, ¿hay cupo?, ¿ya reservó ese día?
3. La base inserta y **asigna el código** (`RES-00040`) con una secuencia (sin colisiones aunque entren dos personas a la vez).
4. Solo si la base responde OK, la pantalla se actualiza.

**c) Cancelar**
Se cambia el estado a `Cancelada`; el cupo se **recalcula** siempre a partir de las reservas del día,
así que nunca queda desincronizado.

---

## 5. Guion de exposición (5 minutos)

1. **Problema** (30 s): «En el comedor no hay control: filas, desperdicio y nada de información.»
2. **Solución** (45 s): «Una web con tres roles: estudiante reserva y recibe QR, admin gestiona, kiosco valida.»
3. **Evolución** (60 s): «Empezamos con datos de ejemplo para validar la lógica, lo publicamos en GitHub Pages,
   añadimos encuestas, lo conectamos a Supabase y, al final, blindamos la seguridad con
   autenticación real y permisos por usuario.»
4. **Demo** (2 min): login admin → panel (12 estudiantes, 24 reservas) → alta de estudiante →
   cerrar sesión → entrar como estudiante → reservar y cancelar → encuesta y resultados.
5. **Cierre** (30 s): «Las contraseñas están hasheadas con bcrypt y, sin sesión, la base no devuelve
   ni una fila: lo puedo demostrar con la clave pública.»

---

## 6. Preguntas típicas y respuestas cortas

**¿Por qué Supabase y no Firebase?** → Postgres real con SQL y RLS, sin bloqueo de proveedor;
además el enunciado pedía solo Supabase.

**¿No expones la clave pública?** → Esa clave *tiene* que ser pública (va dentro del JavaScript).
Lo que protege es la RLS: sin sesión, el rol `anon` no tiene ningún permiso.

**¿Qué pasa si se cae Supabase?** → La app tiene respaldo en `localStorage` y puede operar en modo local;
y si se pierde la configuración, `supabase/schema.sql` reconstruye todo.

**¿Y si entran dos personas a reservar el último cupo?** → Lo decide la base (transacción + restricción),
no el navegador; no se puede pasara de cupo.

**¿Por qué TypeScript?** → Errores detectados antes de ejecutar; `npm run typecheck` debe pasar.

**¿Cuánto pesa el proyecto?** → 8 commits, 12 archivos en la última versión, ~40 pantallas/componentes.

---

## 7. Presupuesto y esfuerzo

> Datos **verificados el 14 de octubre de 2026** en tiendas peruanas (fuentes enlazadas).
> Los precios pueden cambiar; para la exposición, decir la fecha y la tienda da credibilidad.

### 7.1 Costo de operación: **S/ 0 al mes**

| Componente | Plan | Costo mensual |
| --- | --- | --- |
| Alojamiento (la web) | GitHub Pages | S/ 0 |
| Base de datos, login y permisos | Supabase (plan gratuito) | S/ 0 |
| Correo de notificaciones | no se usa (pendiente) | S/ 0 |
| **Total mensual** | | **S/ 0** |

> La única cuota posible es el **dominio propio**: **S/ 20 al año** con `.net.pe`
> (elegido, ej. `comedor.unjfsc.net.pe`) u **S/ 110 al año** con `.pe` o `.com.pe`,
> según [tarifas del NIC.PE](https://nic.pe/tarifas.php).
> Sin dominio, la web vive en `yovik2007.github.io/Comedor-Universitario/` y también cuesta S/ 0.

### 7.2 Equipo (compra única)

| Qué es | Para qué sirve | Precio | Fuente verificada |
| --- | --- | --- | --- |
| Lector QR USB 2D/1D (YHD-1100D) | Escanear el QR del estudiante en ~1 s | **S/ 159.90** (antes S/ 180) | [Falabella](https://www.falabella.com.pe/falabella-pe/product/117834219/Lector-escaner-alambrico-de-codigo-de-barras-USB-2D-1D-QR-YHD-1100D/117834220) |
| Tablet 10.1" (TCL Tab 10L o Samsung Tab A11) | Pantalla del kiosco de reserva | **S/ 499** | [Hiraoka](https://hiraoka.com.pe/computo-y-tablets/tablets) |
| Tablet 8.7" (Lenovo Tab One) | Kiosco en versión económica | **S/ 449** | [Hiraoka](https://hiraoka.com.pe/computo-y-tablets/tablets) |
| Cámara web (Genius FaceCam 1000X) | Foto del estudiante al validar | **S/ 69.90** | [Hiraoka](https://hiraoka.com.pe/computo-y-tablets/accesorios-computo/camaras-web) |
| Cámara web Logitech C270 | Foto con mejor calidad | **S/ 144.90** | [Hiraoka](https://hiraoka.com.pe/computo-y-tablets/accesorios-computo/camaras-web) |
| Laptop (Acer Aspire Lite, Ryzen 3, 8 GB) | PC de la estación de validación | **S/ 1,799** | [Hiraoka](https://hiraoka.com.pe/computo-y-tecnologia/computadoras/laptops) |
| Dominio `.net.pe` (elegido) | Dirección propia (ej. comedor.unjfsc.net.pe) | **S/ 20 / año** | [NIC.PE](https://nic.pe/tarifas.php) |

### 7.3 Tres escenarios (elegir uno según el contexto)

| Escenario | Qué incluye | Total |
| --- | --- | --- |
| **A · Demo mínima** | Tablet S/ 499 + lector S/ 159.90 + dominio S/ 20 | **S/ 678.90** |
| **B · Con la PC que ya existe** *(el más lógico para la universidad)* | Lector S/ 159.90 + cámara S/ 69.90 + dominio S/ 20 | **S/ 249.80** |
| **C · Estación completa** | Laptop S/ 1,799 + tablet S/ 499 + lector S/ 159.90 + cámara S/ 144.90 | **S/ 2,602.80** |

### 7.4 Esfuerzo de desarrollo (estimación en horas)

Estimación por módulo; el total histórico se calculó sumando las fases de la sección 3.

| Módulo | Horas estimadas |
| --- | --- |
| Fase 1 · Prototipo funcional (reglas, roles, interfaz) | 30 – 40 h |
| Fase 2 · Publicación automática (GitHub Actions, router, 404) | 6 – 10 h |
| Fase 3 · Login depurado | 4 – 6 h |
| Fase 4 · Módulo de encuestas | 20 – 28 h |
| Fase 5 · Conexión a Supabase (esquema, vistas, capa de datos) | 40 – 55 h |
| Fase 6 · Seguridad Auth + RLS + migración | 30 – 45 h |
| **Subtotal hecho** | **130 – 185 h** |
| Módulo futuro · Ventana de gracia (30 min → libera cupo) | 8 – 12 h |
| Módulo futuro · Identidad (foto/DNI + escáner QR + validación de fecha) | 10 – 16 h |
| **Total con módulos futuros** | **150 – 220 h** |

**Costo de mano de obra** (dos caminos):

- **Equipo universitario**: las horas no se cobran → **S/ 0 en mano de obra**;
  solo se paga el equipo de la tabla 7.2.
- **Encargado a freelance/consultora**: 150–220 h × S/ 15 – 80/h = **S/ 2,250 – S/ 17,600**
  (junior, profesional independiente o empresa). Detalle por módulo en el documento
  `PRESUPUESTO-DEL-PROYECTO.md`, sección 7.10.

> **Qué decir:** «El sistema es gratis de operar: S/ 0 al mes, más S/ 20 al año por el dominio
> `.net.pe`. Solo se compra el equipo: desde S/ 250 si la universidad ya tiene computadora,
> hasta S/ 2,602 para una estación completa. Todo con precios verificados en Falabella,
> Hiraoka y el NIC.PE en octubre de 2026.»

---

## 8. Glosario mínimo

- **CRUD**: crear, leer, actualizar, borrar.
- **Hash bcrypt**: contraseña convertida en un texto irreversible; la base solo guarda eso.
- **JWT / token**: credencial temporal que demuestra quién eres en cada petición.
- **RLS**: permisos aplicados *dentro* de la base, fila por fila.
- **Vista (`vw_*`)**: consulta guardada; aquí además oculta columnas sensibles.
- **Secuencia**: contador automático que genera `RES-00040`, `RESP-018`… sin repetir.
- **Migración**: script SQL que lleva una base de una versión a otra (la nuestra es idempotente).
- **Workflow**: receta de GitHub que compila y publica con cada `push`.
- **SPA / `404.html`**: la app de una sola página; el truco para que GitHub no la rompa al recargar.

---

*Guía generada a partir del historial real del repositorio (8 commits, `7cdc713` → `77c8974`).*
