/** Utilidades de texto para presentación. */

/** Iniciales de un nombre: "Carlos Mendoza" → "CM". */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

/** Convierte una marca ISO a hora local legible: 12:35 p. m. */
export function formatClock(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
