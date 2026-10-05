/**
 * Acceso a localStorage con manejo de errores.
 * Es la copia de respaldo local de los datos (la fuente de verdad es
 * Supabase cuando está configurado en .env; sin credenciales, este
 * almacenamiento es el único, como en la demostración original).
 */

export const STORAGE_KEYS = {
  session: "comedor_current_user",
  reservations: "comedor_reservations",
  students: "comedor_students",
  meals: "comedor_meal_availability",
  settings: "comedor_settings",
  surveys: "comedor_surveys",
  surveyResponses: "comedor_survey_responses",
  seedDate: "comedor_seed_date",
} as const;

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    // localStorage no disponible o valor corrupto: se usa el valor por defecto.
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Cuota llena o modo privado: la app sigue funcionando sin persistencia.
  }
}

export function removeKey(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignorado a propósito.
  }
}

/** Limpia todos los datos de la demostración. */
export function clearAppStorage(): void {
  Object.values(STORAGE_KEYS).forEach(removeKey);
}
