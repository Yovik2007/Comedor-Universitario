/**
 * Marca del sistema: fuente única del nombre visible.
 *
 * Cambiando estos valores se actualizan el sidebar, la cabecera, el login,
 * el kiosco, el pie de página y el título de la pestaña.
 * (El texto inicial de `index.html` debe mantenerse a mano para SEO.)
 */

export const BRAND = {
  /** Nombre completo de la aplicación. */
  name: "UNJFSC Comedor digital",
  /** Lema corto que acompaña al nombre. */
  tagline: "Sistema de reservas",
  /** Siglas de la institución. */
  institution: "UNJFSC",
  /** Título de la pestaña del navegador. */
  documentTitle: "UNJFSC Comedor digital | Sistema de Reservas",
} as const;
