/** Utilidades de fecha (todo en horario local, nunca en UTC). */

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const DIAS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

const pad = (n: number) => String(n).padStart(2, "0");

/** Convierte una fecha a texto local YYYY-MM-DD. */
export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Fecha de hoy en formato YYYY-MM-DD (horario local). */
export function todayISO(): string {
  return toISODate(new Date());
}

/** Interpreta "YYYY-MM-DD" como mediodía local (evita desfases de zona horaria). */
export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1, 12, 0, 0);
}

/** Suma días a una fecha ISO. */
export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** 24/09/2026 */
export function formatShort(iso: string): string {
  const date = parseISODate(iso);
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** 24 de septiembre de 2026 */
export function formatLong(iso: string): string {
  const date = parseISODate(iso);
  return `${date.getDate()} de ${MESES[date.getMonth()]} de ${date.getFullYear()}`;
}

/** jueves */
export function formatWeekday(iso: string): string {
  return DIAS[parseISODate(iso).getDay()];
}

export function isToday(iso: string): boolean {
  return iso === todayISO();
}

/** Minutos desde medianoche de una hora "HH:MM". */
export function timeToMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

/** Minutos desde medianoche de la hora actual. */
export function currentMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/** Hora actual "HH:MM". */
export function currentTime(): string {
  const now = new Date();
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

/** Marca de tiempo para registros (ISO local). */
export function nowISO(): string {
  return new Date().toISOString();
}
