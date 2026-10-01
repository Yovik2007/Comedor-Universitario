/**
 * Lógica pura de reservas: cupos, códigos y validación.
 * No depende de React: facilita reutilizarla en estudiante, admin y kiosco.
 */

import type {
  Meal,
  Reservation,
  StudentType,
  ValidationOutcome,
} from "@/types";
import { timeToMinutes } from "@/utils/dates";

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
}

/** Calcula los cupos de un servicio en una fecha dada, a partir de las reservas. */
export function computeMealStats(
  meal: Meal,
  reservations: Reservation[],
  date: string,
): MealStats {
  const occupied = reservations.filter(
    (r) => r.mealId === meal.id && r.date === date && occupiesSlot(r.status),
  );

  const resBecarios = occupied.filter(
    (r) => r.studentType === "Becario",
  ).length;
  const resLibres = occupied.length - resBecarios;

  const becariosQuota = meal.becarios;
  const libresQuota = freeQuota(meal);

  return {
    becariosQuota,
    libresQuota,
    totalQuota: meal.total,
    resBecarios,
    resLibres,
    resTotal: occupied.length,
    dispBecarios: Math.max(becariosQuota - resBecarios, 0),
    dispLibres: Math.max(libresQuota - resLibres, 0),
    dispTotal: Math.max(meal.total - occupied.length, 0),
    percentOcupado:
      meal.total > 0
        ? Math.min(100, Math.round((occupied.length / meal.total) * 100))
        : 0,
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
