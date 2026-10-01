/**
 * Datos simulados iniciales del UNJFSC Comedor digital.
 * Son la fuente de partida: si localStorage está vacío, se cargan estos valores.
 */

import type {
  DemoAccount,
  Meal,
  MealId,
  Reservation,
  ReservationStatus,
  Settings,
  Student,
} from "@/types";
import { addDays, todayISO } from "@/utils/dates";

/* ---------------------------------------------------------
   Estudiantes
   --------------------------------------------------------- */

export const initialStudents: Student[] = [
  { id: "EST001", nombre: "Carlos Mendoza", correo: "carlos.mendoza@universidad.edu.pe", tipo: "Becario", activo: true, password: "123456" },
  { id: "EST002", nombre: "María Torres", correo: "maria.torres@universidad.edu.pe", tipo: "Libre", activo: true, password: "123456" },
  { id: "EST003", nombre: "Luis Ramírez", correo: "luis.ramirez@universidad.edu.pe", tipo: "Libre", activo: true, password: "123456" },
  { id: "EST004", nombre: "Ana Flores", correo: "ana.flores@universidad.edu.pe", tipo: "Becario", activo: true, password: "123456" },
  { id: "EST005", nombre: "Diego Paredes", correo: "diego.paredes@universidad.edu.pe", tipo: "Becario", activo: true, password: "123456" },
  { id: "EST006", nombre: "Sofía Herrera", correo: "sofia.herrera@universidad.edu.pe", tipo: "Libre", activo: true, password: "123456" },
  { id: "EST007", nombre: "Jorge Salazar", correo: "jorge.salazar@universidad.edu.pe", tipo: "Libre", activo: true, password: "123456" },
  { id: "EST008", nombre: "Valeria Cruz", correo: "valeria.cruz@universidad.edu.pe", tipo: "Becario", activo: true, password: "123456" },
  { id: "EST009", nombre: "Andrés Ríos", correo: "andres.rios@universidad.edu.pe", tipo: "Libre", activo: true, password: "123456" },
  { id: "EST010", nombre: "Camila Ortiz", correo: "camila.ortiz@universidad.edu.pe", tipo: "Becario", activo: true, password: "123456" },
  { id: "EST011", nombre: "Mateo Quispe", correo: "mateo.quispe@universidad.edu.pe", tipo: "Libre", activo: true, password: "123456" },
  { id: "EST012", nombre: "Lucía Fernández", correo: "lucia.fernandez@universidad.edu.pe", tipo: "Becario", activo: true, password: "123456" },
];

/* ---------------------------------------------------------
   Cuentas de demostración del login
   --------------------------------------------------------- */

export const demoAccounts: DemoAccount[] = [
  /* ---- Administración ---- */
  {
    email: "admin@demo.com",
    password: "admin123",
    role: "admin",
    nombre: "Administrador",
  },
  {
    email: "coordinador@demo.com",
    password: "admin123",
    role: "admin",
    nombre: "Coordinación de comedor",
  },

  /* ---- Estudiantes (becarios y libres) ---- */
  {
    email: "estudiante@demo.com",
    password: "123456",
    role: "estudiante",
    studentId: "EST001",
    nombre: "Carlos Mendoza",
    tipo: "Becario",
  },
  {
    email: "libre@demo.com",
    password: "123456",
    role: "estudiante",
    studentId: "EST002",
    nombre: "María Torres",
    tipo: "Libre",
  },
  {
    email: "becario@demo.com",
    password: "123456",
    role: "estudiante",
    studentId: "EST004",
    nombre: "Ana Flores",
    tipo: "Becario",
  },
  {
    email: "jorge@demo.com",
    password: "123456",
    role: "estudiante",
    studentId: "EST007",
    nombre: "Jorge Salazar",
    tipo: "Libre",
  },
  {
    email: "valeria@demo.com",
    password: "123456",
    role: "estudiante",
    studentId: "EST008",
    nombre: "Valeria Cruz",
    tipo: "Becario",
  },
  {
    email: "camila@demo.com",
    password: "123456",
    role: "estudiante",
    studentId: "EST010",
    nombre: "Camila Ortiz",
    tipo: "Becario",
  },
];

/* ---------------------------------------------------------
   Servicios (cupos y horarios)
   --------------------------------------------------------- */

export const initialMeals: Meal[] = [
  {
    id: "desayuno",
    nombre: "Desayuno",
    horario: "7:00 AM - 9:00 AM",
    inicio: "07:00",
    fin: "09:00",
    total: 50,
    becarios: 30,
    habilitado: true,
  },
  {
    id: "almuerzo",
    nombre: "Almuerzo",
    horario: "12:00 PM - 2:30 PM",
    inicio: "12:00",
    fin: "14:30",
    total: 120,
    becarios: 70,
    habilitado: true,
  },
  {
    id: "cena",
    nombre: "Cena",
    horario: "6:00 PM - 8:00 PM",
    inicio: "18:00",
    fin: "20:00",
    total: 80,
    becarios: 45,
    habilitado: true,
  },
];

export const initialSettings: Settings = {
  reservasHabilitadas: true,
};

/* ---------------------------------------------------------
   Reservas de muestra (se regeneran según la fecha actual)
   --------------------------------------------------------- */

interface SeedRow {
  offset: number;
  meal: MealId;
  student: string;
  status: ReservationStatus;
}

const seedRows: SeedRow[] = [
  // ---- Hoy: desayuno ----
  { offset: 0, meal: "desayuno", student: "EST001", status: "Utilizada" },
  { offset: 0, meal: "desayuno", student: "EST004", status: "Activa" },
  { offset: 0, meal: "desayuno", student: "EST003", status: "Activa" },
  { offset: 0, meal: "desayuno", student: "EST007", status: "Activa" },
  { offset: 0, meal: "desayuno", student: "EST010", status: "Activa" },
  { offset: 0, meal: "desayuno", student: "EST006", status: "Activa" },

  // ---- Hoy: almuerzo ----
  { offset: 0, meal: "almuerzo", student: "EST002", status: "Activa" },
  { offset: 0, meal: "almuerzo", student: "EST003", status: "Utilizada" },
  { offset: 0, meal: "almuerzo", student: "EST005", status: "Activa" },
  { offset: 0, meal: "almuerzo", student: "EST006", status: "Utilizada" },
  { offset: 0, meal: "almuerzo", student: "EST007", status: "Activa" },
  { offset: 0, meal: "almuerzo", student: "EST008", status: "Activa" },
  { offset: 0, meal: "almuerzo", student: "EST009", status: "Activa" },
  { offset: 0, meal: "almuerzo", student: "EST011", status: "Activa" },
  { offset: 0, meal: "almuerzo", student: "EST012", status: "Activa" },
  { offset: 0, meal: "almuerzo", student: "EST004", status: "Activa" },
  { offset: 0, meal: "almuerzo", student: "EST010", status: "Cancelada" },

  // ---- Hoy: cena ----
  { offset: 0, meal: "cena", student: "EST002", status: "Activa" },
  { offset: 0, meal: "cena", student: "EST004", status: "Activa" },
  { offset: 0, meal: "cena", student: "EST006", status: "Activa" },
  { offset: 0, meal: "cena", student: "EST008", status: "Utilizada" },
  { offset: 0, meal: "cena", student: "EST010", status: "Activa" },
  { offset: 0, meal: "cena", student: "EST012", status: "Activa" },
  { offset: 0, meal: "cena", student: "EST003", status: "Activa" },

  // ---- Mañana ----
  { offset: 1, meal: "almuerzo", student: "EST001", status: "Activa" },
  { offset: 1, meal: "almuerzo", student: "EST003", status: "Activa" },
  { offset: 1, meal: "almuerzo", student: "EST005", status: "Activa" },
  { offset: 1, meal: "almuerzo", student: "EST009", status: "Activa" },
  { offset: 1, meal: "cena", student: "EST002", status: "Activa" },
  { offset: 1, meal: "cena", student: "EST007", status: "Activa" },
  { offset: 1, meal: "desayuno", student: "EST004", status: "Activa" },
  { offset: 1, meal: "desayuno", student: "EST011", status: "Activa" },

  // ---- Pasado mañana ----
  { offset: 2, meal: "almuerzo", student: "EST006", status: "Activa" },
  { offset: 2, meal: "almuerzo", student: "EST010", status: "Activa" },
  { offset: 2, meal: "almuerzo", student: "EST012", status: "Activa" },
  { offset: 2, meal: "cena", student: "EST005", status: "Activa" },

  // ---- En 3 días ----
  { offset: 3, meal: "almuerzo", student: "EST002", status: "Activa" },
  { offset: 3, meal: "almuerzo", student: "EST008", status: "Activa" },
  { offset: 3, meal: "desayuno", student: "EST001", status: "Activa" },
];

export function formatReservationCode(number: number): string {
  return `RES-${String(number).padStart(5, "0")}`;
}

/** Genera el conjunto de reservas simuladas en torno a la fecha actual. */
export function createSeedReservations(): Reservation[] {
  const studentsById = new Map(initialStudents.map((s) => [s.id, s]));
  const today = todayISO();
  let counter = 0;

  return seedRows.flatMap<Reservation>((row) => {
    const student = studentsById.get(row.student);
    const meal = initialMeals.find((m) => m.id === row.meal);
    if (!student || !meal) return [];

    counter += 1;
    const date = addDays(today, row.offset);
    const id = formatReservationCode(counter);

    return [
      {
        id,
        studentId: student.id,
        studentName: student.nombre,
        studentType: student.tipo,
        mealId: meal.id,
        mealName: meal.nombre,
        date,
        time: meal.horario,
        status: row.status,
        qrCode: JSON.stringify({
          reservationId: id,
          studentId: student.id,
          meal: meal.nombre,
          date,
        }),
        createdAt: `${date}T08:00:00`,
        ...(row.status === "Utilizada"
          ? { usedAt: `${date}T12:35:00` }
          : {}),
      },
    ];
  });
}
