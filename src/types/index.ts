/**
 * Tipos centrales del sistema de reservas del UNJFSC Comedor digital.
 * Toda la información es simulada y se persiste en localStorage.
 */

export type StudentType = "Becario" | "Libre";

export type MealId = "desayuno" | "almuerzo" | "cena";

export type MealName = "Desayuno" | "Almuerzo" | "Cena";

export type ReservationStatus = "Activa" | "Utilizada" | "Cancelada";

export type UserRole = "estudiante" | "admin";

/** Estudiante simulado (también sirve como cuenta de acceso). */
export interface Student {
  id: string;
  nombre: string;
  correo: string;
  tipo: StudentType;
  activo: boolean;
  /** Contraseña simulada de acceso (solo demostración). */
  password?: string;
}

/** Servicio de alimentación con sus cupos y horario. */
export interface Meal {
  id: MealId;
  nombre: MealName;
  /** Horario legible: "12:00 PM - 2:30 PM" */
  horario: string;
  /** Inicio y fin en 24h: "12:00" / "14:30" */
  inicio: string;
  fin: string;
  /** Cupos totales del servicio. */
  total: number;
  /** Cupos reservados para becarios. El resto (total - becarios) son los libres. */
  becarios: number;
  /** Si el servicio está habilitado para el día. */
  habilitado: boolean;
}

export interface Reservation {
  /** Código visible: "RES-00045" */
  id: string;
  studentId: string;
  studentName: string;
  studentType: StudentType;
  mealId: MealId;
  mealName: MealName;
  /** Fecha del servicio (YYYY-MM-DD). */
  date: string;
  /** Horario del servicio al que pertenece. */
  time: string;
  status: ReservationStatus;
  /** JSON simulado embebido en el código QR. */
  qrCode: string;
  createdAt: string;
  usedAt?: string;
}

export interface Settings {
  reservasHabilitadas: boolean;
}

/** Sesión del usuario autenticado (simulada, guardada en localStorage). */
export interface Session {
  role: UserRole;
  email: string;
  nombre: string;
  studentId?: string;
  tipo?: StudentType;
}

/** Cuentas de demostración mostradas en el login. */
export interface DemoAccount {
  email: string;
  password: string;
  role: UserRole;
  studentId?: string;
  nombre: string;
  tipo?: StudentType;
}

export type ReserveResult = { ok: boolean; message: string };

export type ValidationResultKind =
  | "valid"
  | "used"
  | "canceled"
  | "not_found"
  | "empty";

export interface ValidationOutcome {
  kind: ValidationResultKind;
  message: string;
  reservation?: Reservation;
}
