# 7. PRESUPUESTO DEL PROYECTO

> Precios verificados el **14 de octubre de 2026** en tiendas peruanas (Falabella, Hiraoka, NIC.PE).
> Los valores están en soles (S/) e incluyen impuestos.

---

## 7.1. Naturaleza de la inversión

El proyecto se divide en dos tipos de costo:

| Tipo de costo | Qué incluye | Frecuencia |
| --- | --- | --- |
| **Inversión única** | Equipo (lector QR, cámara web) y gestiones del dominio | Solo la primera vez |
| **Gasto recurrente** | Renovación del dominio | Una vez al año |
| **Sin costo** | Licencias de software, alojamiento y base de datos | Gratis de por vida |

El sistema está construido íntegramente con **software libre** (React, TypeScript, Vite, Tailwind,
Supabase y GitHub Pages), por lo que **no se paga ninguna licencia** y el costo de operación
mensual es **S/ 0**.

---

## 7.2. Recursos humanos

| Rol | Función en el proyecto | Dedicación | Horas estimadas |
| --- | --- | --- | --- |
| Desarrollador (perfil full stack) | Interfaz, lógica de negocio, base de datos y seguridad | 6 meses (medio tiempo) | 130 – 185 h |
| Módulos futuros (ventana de gracia e identidad) | Ampliación del sistema | 1 – 2 meses | 18 – 28 h |
| **Total** | | | **150 – 220 h** |

Al ser un proyecto **académico**, la mano de obra **no se contrata** y su costo es **S/ 0**.
Como referencia, si la institución encargara el desarrollo a un profesional externo,
ver el desglose completo en la **sección 7.10** (Costo de desarrollo del software):
**S/ 2,250 a S/ 17,600** según el perfil del desarrollador.

---

## 7.3. Recursos tecnológicos (software libre)

| Componente | Para qué sirve | Costo |
| --- | --- | --- |
| React 19 + TypeScript | Construcción de la interfaz | S/ 0 (licencia MIT) |
| Vite | Compilador y servidor de desarrollo | S/ 0 (licencia MIT) |
| Tailwind CSS | Estilos y diseño responsive | S/ 0 (licencia MIT) |
| Supabase (plan gratuito) | Base de datos, inicio de sesión y permisos | S/ 0 |
| GitHub Pages | Alojamiento público con HTTPS | S/ 0 |
| Git / GitHub | Control de versiones del código | S/ 0 |
| **Total de licencias** | | **S/ 0** |

El plan gratuito de Supabase soporta 50,000 usuarios simultáneos y 500 MB de datos:
es muy superior a lo que necesita el comedor universitario.

---

## 7.4. Equipamiento: análisis de opciones

Se evaluó la opción **más económica que cumpla bien la función**, descartando lo que
ofrece ventajas que el proyecto no necesita.

### Lector de códigos (pieza principal del kiosco)

| Opción | Precio | Decisión y motivo |
| --- | --- | --- |
| **Lector alámbrico USB 2D/1D YHD-1100D** | **S/ 159.90** | **ELEGIDO.** Lee QR y código de barras, se conecta por USB (sin baterías que se agoten), 1 año de garantía. |
| Lector inalámbrico YHD-3200DB | S/ 259.90 | Descartado: cuesta S/ 100 más y la inalámbridez no aporta en un kiosco fijo. |
| Lector omnidireccional de mesa | S/ 499.00 | Descartado: está diseñado para supermercados con flujo alto; aquí es excesivo. |

### Pantalla / computadora del kiosco

| Opción | Precio | Decisión y motivo |
| --- | --- | --- |
| **Computadora que la institución ya tiene** | **S/ 0** | **ELEGIDA.** El kiosco solo abre una página web; cualquier PC con monitor sirve. |
| Tablet 8.7" (Lenovo Tab One) | S/ 449.00 | Alternativa si no hay PC disponible. |
| Tablet 10.1" (TCL Tab 10L / Samsung Tab A11) | S/ 499.00 | Descartada: la pantalla más grande no mejora la validación. |
| Laptop nueva (Acer Aspire Lite, Ryzen 3) | S/ 1,799.00 | Descartada: es una compra innecesaria para una estación fija. |

### Cámara web (para el módulo de identidad: foto del estudiante al validar)

| Opción | Precio | Decisión y motivo |
| --- | --- | --- |
| **Cámara web Genius FaceCam 1000X** | **S/ 69.90** | **ELEGIDA.** Basta para una fotografía de verificación. |
| Cámara web Logitech C270 | S/ 144.90 | Descartada: mejor calidad, pero no se necesita para la función prevista. |

### Dominio (dirección propia)

| Opción | Precio | Decisión y motivo |
| --- | --- | --- |
| **Dominio `.net.pe`** (1 año) | **S/ 20.00** | **ELEGIDO.** Es una terminación peruana oficial del NIC.PE, permite crear la dirección `comedor.unjfsc.net.pe` y cuesta S/ 90 menos al año que el `.pe`. |
| Dominio `.pe` o `.com.pe` (1 año) | S/ 110.00 | Alternativa más prestigiosa si la institución asume el costo. |
| Dominio `.edu.pe` (1 año) | S/ 110.00 | Dedicado a instituciones educativas; solo lo puede registrar la universidad, con documentación oficial. |
| Sin dominio (URL de GitHub) | S/ 0.00 | Funciona, pero la dirección es larga y poco formal para la institución. |

> El `.net.pe` es la misma autoridad registral (NIC.PE), con las mismas garantías que el `.pe`;
> solo cambia la etiqueta, pensada originalmente para proyectos de tecnología.

---

## 7.5. Presupuesto de inversión inicial (plan recomendado)

Escenario: la institución **ya cuenta con computadora** para el kiosco.

| Ítem | Cant. | Precio unitario | Subtotal |
| --- | --- | --- | --- |
| Lector de códigos USB 2D/1D (YHD-1100D) | 1 | S/ 159.90 | S/ 159.90 |
| Cámara web Genius FaceCam 1000X | 1 | S/ 69.90 | S/ 69.90 |
| Dominio `.net.pe` (1 año) | 1 | S/ 20.00 | S/ 20.00 |
| Imprevistos (10 %) | — | — | S/ 24.98 |
| **TOTAL INVERSIÓN AÑO 1** | | | **S/ 274.78** |

> La computadora, monitor, teclado y mouse se aprovechan de los que la institución ya posee.
> Si la institución prefiere el dominio `.pe` más prestigioso (S/ 110), el total del primer año
> asciende a **S/ 364.78**.

### Plan alternativo (si no existe computadora disponible)

| Ítem | Cant. | Precio unitario | Subtotal |
| --- | --- | --- | --- |
| Tablet 8.7" (Lenovo Tab One) | 1 | S/ 449.00 | S/ 449.00 |
| Lector de códigos USB 2D/1D (YHD-1100D) | 1 | S/ 159.90 | S/ 159.90 |
| Dominio `.net.pe` (1 año) | 1 | S/ 20.00 | S/ 20.00 |
| Imprevistos (10 %) | — | — | S/ 62.89 |
| **TOTAL INVERSIÓN AÑO 1** | | | **S/ 691.79** |

---

## 7.6. Costo de operación

| Concepto | Frecuencia | Costo |
| --- | --- | --- |
| Renovación del dominio `.net.pe` | Anual | S/ 20.00 |
| Alojamiento (GitHub Pages) | Mensual | S/ 0 |
| Base de datos y autenticación (Supabase) | Mensual | S/ 0 |
| Licencias de software | — | S/ 0 |
| Mantenimiento correctivo | — | S/ 0 (equipo del proyecto) |
| **Total de operación anual** | | **S/ 20.00** |

El costo recurrente equivale a **S/ 1.67 al mes**, menos que el precio de una botella de agua:
es prácticamente gratuito mantener el sistema funcionando.

---

## 7.7. Cuadro consolidado

| Concepto | Año 1 | Año 2 en adelante |
| --- | --- | --- |
| Equipo (lector + cámara) | S/ 229.80 | S/ 0 |
| Dominio `.net.pe` (1 año) | S/ 20.00 | S/ 20.00 |
| Imprevistos (10 %) | S/ 24.98 | S/ 0 |
| Software y servicios en la nube | S/ 0 | S/ 0 |
| **TOTAL** | **S/ 274.78** | **S/ 20.00 / año** |

---

## 7.8. Justificación de la elección

1. **El lector alámbrico es el mismo tipo de equipo que se usa en cajas de supermercado**:
   escanea el QR del estudiante en menos de un segundo, no depende de baterías y dura años.
   Pagar S/ 259.90 o S/ 499 por un lector más avanzado no mejoraría el proceso.
2. **No se compra computadora nueva**: el kiosco solo abre la aplicación web, por lo que
   se aprovecha el equipo que la institución ya posee. Es la decisión que más ahorra (S/ 1,799).
3. **El software es libre y está en la nube**: Supabase y GitHub Pages no cobran, y su plan
   gratuito supera con creces la demanda estimada del comedor.
4. **El costo recurrente es mínimo**: S/ 20 al año por el dominio peruano `.net.pe`,
   equivalente a S/ 1.67 al mes. Si la institución desea el dominio `.pe`, el costo
   adicional sería de S/ 90 al año.
5. **Crecimiento sin volver a invertir**: si el comedor necesita más módulos (ventana de gracia,
   verificación de identidad), el costo adicional es principalmente de horas de programación
   (18 – 28 h), no de equipo.

---

## 7.9. Escalabilidad (costos futuros previstos)

| Concepto | Costo estimado |
| --- | --- |
| Módulo «ventana de gracia» (libera el cupo a los 30 min) | 8 – 12 h de programación |
| Módulo de identidad (foto, DNI y validación de fecha) | 10 – 16 h + cámara web S/ 69.90 |
| Un módulo kiosco adicional (tablet) | S/ 449.00 |
| Notificaciones por correo (plan gratuito de proveedor) | S/ 0 hasta cierto volumen |

---

## 7.10. Costo de desarrollo del software

Mientras que las secciones anteriores miden el **costo de operar** el sistema (equipo y dominio),
esta sección estima el **costo de construirlo desde cero**, que es lo que solicita una
institución cuando quiere saber cuánto valdría el software desarrollado profesionalmente.

### 7.10.1. Método de cálculo

> Costo de desarrollo = **horas de programación × tarifa por hora**.
> Es el mismo método que usan las empresas de software para cotizar un proyecto.

### 7.10.2. Esfuerzo por módulo

| Módulo del sistema | Horas estimadas |
| --- | --- |
| Análisis, diseño de interfaz (UI/UX) y esquema de base de datos | 18 – 25 h |
| Autenticación, roles y seguridad (bcrypt + RLS) | 25 – 35 h |
| Gestión de estudiantes, servicios y cupos | 15 – 22 h |
| Reservas con código QR y reglas de negocio | 25 – 35 h |
| Kiosco de validación en puerta | 12 – 18 h |
| Encuestas y resultados en vivo | 20 – 28 h |
| Reportes y estadísticas para el administrador | 12 – 18 h |
| Pruebas, publicación y diseño responsive (1920 → 390 px) | 12 – 16 h |
| Documentación y capacitación | 8 – 12 h |
| **TOTAL** | **≈ 150 – 220 h** |

Equivalente a **3 – 6 meses** de una persona dedicada medio tiempo, o **6 – 8 semanas**
de dos profesionales trabajando en paralelo.

### 7.10.3. Escenarios de costo (mercado peruano)

| Perfil de desarrollo | Tarifa por hora | Costo total estimado |
| --- | --- | --- |
| Desarrollador junior / estudiante | S/ 15 – 25 | **S/ 2,250 – 5,500** |
| **Profesional independiente con experiencia** *(recomendado)* | S/ 30 – 45 | **S/ 4,500 – 9,000** |
| Empresa o consultora de software (incluye análisis, pruebas y gestión) | S/ 50 – 80 | **S/ 7,500 – 17,600** |

### 7.10.4. Costo total de un proyecto real

| Concepto | Costo |
| --- | --- |
| Desarrollo del software (valor estimado) | S/ 6,000.00 |
| Equipo, dominio e instalación (sección 7.5) | S/ 274.78 |
| Accesorios de instalación (sección 7.10.5) | S/ 60.00 |
| Mantenimiento anual (10 % del desarrollo) | S/ 600.00 / año |
| **Proyecto completo, primer año** | **≈ S/ 6,934.78** |

### 7.10.5. Accesorios de instalación (complemento del equipo)

| Ítem | Costo estimado |
| --- | --- |
| Regleta / protector de sobretensión | S/ 25 – 40 |
| Cable USB de extensión para el lector | S/ 15 – 25 |
| Soporte o brazo para el lector en el mostrador | S/ 20 – 40 |
| **Total accesorios** | **S/ 60 – 105** |

> Costos de referencia; verificar el precio vigente en tienda antes de la compra.

### 7.10.6. Consideraciones importantes

1. **El prototipo presentado ya cubre el desarrollo completo**: las horas de la tabla 7.10.2
   están ejecutadas en el repositorio del proyecto, verificables commit por commit.
2. **Las tarifas por hora son estimaciones del mercado peruano**, no cotizaciones formales
   de una empresa; sirven como referencia para dimensionar el costo.
3. **El mantenimiento anual** (10 % del costo de desarrollo) cubre corrección de errores,
   ajustes menores y actualizaciones de seguridad.
4. **No hay costo de licencias**: todo el sistema se construyó con software libre
   (React, TypeScript, Vite, Tailwind, Supabase y GitHub Pages).

> **Qué decir:** «Construir este sistema desde cero con un profesional independiente
> costaría aproximadamente S/ 6,000 (200 horas a S/ 30 por hora). El prototipo que
> presentamos ya ejecuta ese desarrollo completo, y el costo anual de operarlo es de
> solo S/ 20 por el dominio.»

---

*Fuentes: Falabella Perú (ficha del lector YHD-1100D), Hiraoka (tablets, cámaras web y laptops)
y NIC.PE (tarifas oficiales de dominios .pe). Consulta realizada el 14/10/2026.
Las tarifas de desarrollo y los accesorios son estimaciones de referencia, no cotizaciones formales.*
