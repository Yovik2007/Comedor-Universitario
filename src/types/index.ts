/**
 * Tipos centrales del sistema de reservas del UNJFSC Comedor digital.
 * Son idénticos a los campos que devuelven las vistas vw_* de Supabase
 * (y a lo que se guarda en localStorage en modo local).
 */

export type StudentType = "Becario" | "Libre";

export type MealId = "desayuno" | "almuerzo" | "cena";

export type MealName = "Desayuno" | "Almuerzo" | "Cena";

export type ReservationStatus =
  | "Activa"
  | "Utilizada"
  | "Cancelada"
  /** La reserva venció: pasó la franja y la ventana de gracia sin usarse. */
  | "Vencida";

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
  /**
   * Inicio de la franja elegida ("12:00"). Las franjas duran 30 minutos.
   * Si no existe (reservas antiguas), se toma el inicio del servicio.
   */
  slotStart?: string;
  /** Momento en que la reserva vence (ISO). Si no existe, no vence. */
  expiresAt?: string;
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
  /** La reserva venció: pasó la franja y la ventana de gracia. */
  | "expired"
  | "not_found"
  | "empty";

export interface ValidationOutcome {
  kind: ValidationResultKind;
  message: string;
  reservation?: Reservation;
}

/* ---------------------------------------------------------
   Encuestas de comidas
   --------------------------------------------------------- */

export interface SurveyOption {
  /** Identificador único dentro de su encuesta: "opt-1", "opt-2"... */
  id: string;
  label: string;
}

export interface Survey {
  /** Código visible: "ENC-001". */
  id: string;
  title: string;
  question: string;
  options: SurveyOption[];
  /** true = abierta para votar; false = cerrada (solo se ven resultados). */
  active: boolean;
  createdAt: string;
}

export interface SurveyResponse {
  /** Código visible: "RESP-001". */
  id: string;
  surveyId: string;
  studentId: string;
  studentName: string;
  /** Comidas marcadas por el estudiante (una respuesta puede tener varias). */
  optionIds: string[];
  createdAt: string;
  updatedAt: string;
}

/** Votos agregados de una opción (para las barras de resultados). */
export interface SurveyResultRow {
  optionId: string;
  label: string;
  votes: number;
  /** Porcentaje sobre el total de respuestas (0-100). */
  percent: number;
}
