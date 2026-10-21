/**
 * Lógica pura de reservas: cupos, códigos y validación.
 * No depende de React: facilita reutilizarla en estudiante, admin y kiosco.
 */

import type {
  Meal,
  MealId,
  Reservation,
  ReservationStatus,
  StudentType,
  ValidationOutcome,
} from "@/types";
import { minutesToTime, timeToMinutes } from "@/utils/dates";

/* ---------------------------------------------------------------------------
   Franjas de 30 minutos y ventana de gracia
   --------------------------------------------------------------------------- */

/** Duración de cada franja de llegada. */
export const SLOT_MINUTES = 30;

/**
 * Minutos que el estudiante tiene, desde el inicio de su franja, para
 * presentarse. Pasado ese plazo la reserva pasa a `Vencida` y su cupo se
 * libera automáticamente.
 */
export const GRACE_MINUTES = 30;

/**
 * Minutos de anticipación con que cada franja empieza a poder reservarse.
 * Con 30, la franja de las 12:00 se habilita a las 11:30, la de 12:30 a
 * las 12:00, y así sucesivamente. Sin este plazo un servicio entero se
 * llenaría muchas horas antes de servirse.
 */
export const LEAD_MINUTES = 30;

/** Una franja de llegada: de 12:00 a 12:30, por ejemplo. */
export interface MealSlot {
  /** Inicio "12:00" */
  start: string;
  /** Fin "12:30" */
  end: string;
  /** Etiqueta legible "12:00 – 12:30" */
  label: string;
  /** Cupos que caben en esta franja (reparto equitativo del total). */
  limit: number;
}

/**
 * Divide el horario de un servicio en franjas de 30 minutos.
 * El almuerzo (12:00–14:30) produce 5 franjas.
 */
export function buildSlots(meal: Meal): MealSlot[] {
  const from = timeToMinutes(meal.inicio);
  const to = timeToMinutes(meal.fin);
  if (to <= from || meal.total <= 0) return [];

  const starts: number[] = [];
  for (let m = from; m < to; m += SLOT_MINUTES) starts.push(m);

  const limit = Math.ceil(meal.total / starts.length);

  return starts.map((m) => {
    const end = Math.min(m + SLOT_MINUTES, to);
    return {
      start: minutesToTime(m),
      end: minutesToTime(end),
      label: `${minutesToTime(m)} – ${minutesToTime(end)}`,
      limit,
    };
  });
}

/** Franja que le corresponde a una reserva (o la primera del servicio). */
export function slotOf(reservation: Reservation, meal: Meal): string {
  return reservation.slotStart ?? meal.inicio;
}

/** Hora límite de presentación: inicio de la franja + ventana de gracia. */
export function expiresAtISO(date: string, slotStart: string): string {
  const d = new Date(`${date}T${slotStart}:00`);
  d.setMinutes(d.getMinutes() + GRACE_MINUTES);
  return d.toISOString();
}

/** true si la reserva ya superó su ventana de gracia. */
export function isExpired(reservation: Reservation, now = new Date()): boolean {
  if (!reservation.expiresAt) return false;
  if (reservation.status !== "Activa") return false;
  return new Date(reservation.expiresAt).getTime() < now.getTime();
}

/**
 * true si la ventana de gracia de una franja **ya pasó**: no se puede
 * reservar. Sin esta validación el estudiante reservaría una hora muerta,
 * su cupo quedaría `Vencida` al instante y perdería su único intento del día.
 */
export function slotIsPast(
  date: string,
  slotStart: string,
  now: Date = new Date(),
): boolean {
  return new Date(expiresAtISO(date, slotStart)).getTime() <= now.getTime();
}

/**
 * Momento exacto en que una franja empieza a poder reservarse:
 * inicio de la franja menos la anticipación.
 */
export function slotOpensAt(date: string, slotStart: string): Date {
  const d = new Date(`${date}T${slotStart}:00`);
  d.setMinutes(d.getMinutes() - LEAD_MINUTES);
  return d;
}

/** "11:50" — la hora a la que se habilita una franja. */
export function slotOpenTime(slotStart: string): string {
  return minutesToTime(timeToMinutes(slotStart) - LEAD_MINUTES);
}

/**
 * true si una franja **todavía no se ha habilitado**. Cada franja se abre
 * sola, `LEAD_MINUTES` antes de su hora.
 */
export function slotNotYetOpen(
  date: string,
  slotStart: string,
  now: Date = new Date(),
): boolean {
  return now.getTime() < slotOpensAt(date, slotStart).getTime();
}

/** Franjas de un servicio que todavía se pueden reservar. */
export function bookableSlots(
  meal: Meal,
  date: string,
  now: Date = new Date(),
): MealSlot[] {
  return buildSlots(meal).filter(
    (s) => !slotIsPast(date, s.start, now) && !slotNotYetOpen(date, s.start, now),
  );
}

/**
 * Estado real de la reserva. Una `Activa` cuya franja ya venció se comporta
 * como `Vencida` sin necesidad de escribir en la base de datos.
 */
export function effectiveStatus(
  reservation: Reservation,
  now = new Date(),
): ReservationStatus {
  return isExpired(reservation, now) ? "Vencida" : reservation.status;
}

/**
 * REGLA (opción A): un solo intento por servicio y fecha.
 *
 * Devuelve la reserva que bloquea un nuevo intento, si existe:
 *  · `Cancelada`   → no bloquea (el estudiante renunció por voluntad propia).
 *  · `Vencida`     → bloquea: su cupo ya se transfirió a los libres y volver
 *                    a reservar sería acaparo.
 *  · `Activa` / `Utilizada` → bloquea.
 */
export function blockingReservation(
  reservations: Reservation[],
  studentId: string,
  mealId: MealId,
  date: string,
): Reservation | undefined {
  return reservations.find(
    (r) =>
      r.studentId === studentId &&
      r.mealId === mealId &&
      r.date === date &&
      r.status !== "Cancelada",
  );
}

/** Ocupación por franja: cuántas reservas ya hay en cada tramo de 30 min. */export function slotOccupancy(
  meal: Meal,
  reservations: Reservation[],
  date: string,
  now = new Date(),
): Record<string, number> {
  const bySlot: Record<string, number> = {};
  for (const slot of buildSlots(meal)) bySlot[slot.start] = 0;

  for (const r of reservations) {
    if (r.mealId !== meal.id || r.date !== date) continue;
    if (!occupiesSlot(effectiveStatus(r, now))) continue;
    const key = r.slotStart ?? meal.inicio;
    if (key in bySlot) bySlot[key] += 1;
  }
  return bySlot;
}

/** Estados que ocupan un cupo (una reserva cancelada libera su cupo). */
export function occupiesSlot(status: Reservation["status"]): boolean {
  return status === "Activa" || status === "Utilizada";
}

/** Cupos destinados a estudiantes libres. */
export function freeQuota(meal: Meal): number {
  return Math.max(meal.total - meal.becarios, 0);
}

export interface MealStats {
  becariosQuota: number;
  libresQuota: number;
  totalQuota: number;
  resBecarios: number;
  resLibres: number;
  resTotal: number;
  dispBecarios: number;
  dispLibres: number;
  dispTotal: number;
  percentOcupado: number;
  /** Cupos de becarios que vencieron y pasaron automáticamente a libres. */
  becariosLiberados: number;
  /** Reservas que ya cumplieron su ventana de gracia (becarios y libres). */
  vencidas: number;
}

/**
 * Calcula los cupos de un servicio en una fecha dada.
 *
 * Reglas:
 *  - Solo `Activa` y `Utilizada` consumen cupo.
 *  - Una `Activa` cuya franja + ventana de gracia ya pasó cuenta como `Vencida`.
 *  - El cupo de un becario vencido **pasa a los estudiantes libres**: así ninguna
 *    ración se desperdicia cuando alguien reservó y no se presentó.
 */
export function computeMealStats(
  meal: Meal,
  reservations: Reservation[],
  date: string,
  now: Date = new Date(),
): MealStats {
  const dayReservations = reservations.filter(
    (r) => r.mealId === meal.id && r.date === date,
  );

  const statuses = dayReservations.map((r) => effectiveStatus(r, now));

  const occupied = dayReservations.filter((_, i) =>
    occupiesSlot(statuses[i]),
  );

  const resBecarios = occupied.filter(
    (r) => r.studentType === "Becario",
  ).length;
  const resLibres = occupied.length - resBecarios;

  // Cupos de becario que vencieron: se transfieren a los libres.
  const becariosLiberados = dayReservations.filter(
    (r, i) => r.studentType === "Becario" && statuses[i] === "Vencida",
  ).length;
  const vencidas = statuses.filter((s) => s === "Vencida").length;

  const becariosQuota = meal.becarios;
  const libresQuota = freeQuota(meal);

  const dispBecarios = Math.max(
    becariosQuota - resBecarios - becariosLiberados,
    0,
  );
  const dispLibres = Math.max(libresQuota - resLibres + becariosLiberados, 0);

  return {
    becariosQuota,
    libresQuota,
    totalQuota: meal.total,
    resBecarios,
    resLibres,
    resTotal: occupied.length,
    dispBecarios,
    dispLibres,
    dispTotal: dispBecarios + dispLibres,
    percentOcupado:
      meal.total > 0
        ? Math.min(100, Math.round((occupied.length / meal.total) * 100))
        : 0,
    becariosLiberados,
    vencidas,
  };
}

/** Cupos disponibles para el tipo de estudiante indicado. */
export function availableForType(stats: MealStats, type: StudentType): number {
  return type === "Becario" ? stats.dispBecarios : stats.dispLibres;
}

/** Reservas de un estudiante (opcionalmente filtradas por fecha). */
export function reservationsOfStudent(
  reservations: Reservation[],
  studentId: string,
  date?: string,
): Reservation[] {
  return reservations.filter(
    (r) => r.studentId === studentId && (date === undefined || r.date === date),
  );
}

/** Crea el siguiente código correlativo: RES-00045. */
export function generateReservationCode(reservations: Reservation[]): string {
  const max = reservations.reduce((acc, r) => {
    const n = Number(r.id.replace(/\D/g, ""));
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return `RES-${String(max + 1).padStart(5, "0")}`;
}

/** Contenido JSON simulado que se imprime dentro del QR. */
export function buildQrPayload(reservation: Reservation): string {
  return JSON.stringify({
    reservationId: reservation.id,
    studentId: reservation.studentId,
    meal: reservation.mealName,
    date: reservation.date,
  });
}

/** Valida un código escrito (kiosco y panel administrativo). */
export function validateReservationCode(
  code: string,
  reservations: Reservation[],
  now: Date = new Date(),
): ValidationOutcome {
  const normalized = code.trim().toUpperCase();

  if (!normalized) {
    return { kind: "empty", message: "Ingresa un código de reserva." };
  }

  const reservation = reservations.find(
    (r) => r.id.trim().toUpperCase() === normalized,
  );

  if (!reservation) {
    return { kind: "not_found", message: "Reserva no encontrada." };
  }

  if (reservation.status === "Utilizada") {
    return {
      kind: "used",
      message: "Reserva ya utilizada.",
      reservation,
    };
  }

  if (reservation.status === "Cancelada") {
    return {
      kind: "canceled",
      message: "Reserva cancelada. El estudiante ya no tiene acceso.",
      reservation,
    };
  }

  // La reserva puede seguir en estado "Activa" en la base, pero su franja
  // y ventana de gracia ya pasaron: se comporta como vencida.
  if (effectiveStatus(reservation, now) === "Vencida") {
    return {
      kind: "expired",
      message: `Reserva vencida. La franja de ${reservation.slotStart ?? "inicio"} ya pasó y el cupo fue liberado.`,
      reservation,
    };
  }

  return { kind: "valid", message: "Reserva válida.", reservation };
}

export interface ServiceSchedule {
  /** Servicio en curso según la hora actual. */
  current: Meal | null;
  /** Próximo servicio de hoy. */
  next: Meal | null;
  /** true si todos los servicios del día ya pasaron. */
  finished: boolean;
}

/** Determina qué servicio está en curso y cuál sigue. */
export function serviceSchedule(
  meals: Meal[],
  minutes: number,
): ServiceSchedule {
  const enabled = meals
    .filter((m) => m.habilitado)
    .sort((a, b) => timeToMinutes(a.inicio) - timeToMinutes(b.inicio));

  const current =
    enabled.find(
      (m) =>
        timeToMinutes(m.inicio) <= minutes && minutes < timeToMinutes(m.fin),
    ) ?? null;

  const upcoming = enabled.filter(
    (m) => timeToMinutes(m.inicio) > minutes,
  );

  return {
    current,
    next: upcoming[0] ?? null,
    finished: !current && upcoming.length === 0,
  };
}
