/**
 * Fuente única de verdad de la aplicación.
 * Gestiona sesión, estudiantes, reservas, cupos y configuración,
 * persistiéndolo todo en localStorage (sin backend ni servicios externos).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import type {
  Meal,
  MealId,
  Reservation,
  ReserveResult,
  Session,
  Settings,
  Student,
  StudentType,
  UserRole,
  ValidationOutcome,
} from "@/types";
import {
  createSeedReservations,
  demoAccounts,
  initialMeals,
  initialSettings,
  initialStudents,
} from "@/data/mockData";
import { STORAGE_KEYS, loadJSON, saveJSON } from "@/utils/storage";
import { nowISO, todayISO } from "@/utils/dates";
import {
  availableForType,
  computeMealStats,
  generateReservationCode,
  validateReservationCode,
} from "@/utils/reservationUtils";
import type { MealStats } from "@/utils/reservationUtils";

export interface LoginResult {
  ok: boolean;
  error?: string;
  role?: UserRole;
}

export interface NewStudentInput {
  nombre: string;
  correo: string;
  tipo: StudentType;
  password: string;
}

interface AppContextValue {
  session: Session | null;
  currentStudent: Student | null;
  students: Student[];
  reservations: Reservation[];
  meals: Meal[];
  settings: Settings;

  login: (email: string, password: string) => LoginResult;
  logout: () => void;

  reserve: (mealId: MealId) => ReserveResult;
  cancelReservation: (reservationId: string) => ReserveResult;
  markUsed: (reservationId: string) => ReserveResult;
  validateCode: (code: string) => ValidationOutcome;

  getMealStats: (mealId: MealId, date?: string) => MealStats;
  updateMeal: (
    mealId: MealId,
    patch: Partial<Pick<Meal, "total" | "becarios" | "horario" | "habilitado">>,
  ) => ReserveResult;
  setReservasHabilitadas: (enabled: boolean) => void;

  addStudent: (input: NewStudentInput) => ReserveResult;
  toggleStudentStatus: (studentId: string) => void;

  resetDemoData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [students, setStudents] = useState<Student[]>(() =>
    loadJSON(STORAGE_KEYS.students, initialStudents),
  );
  const [meals, setMeals] = useState<Meal[]>(() =>
    loadJSON(STORAGE_KEYS.meals, initialMeals),
  );
  const [settings, setSettings] = useState<Settings>(() =>
    loadJSON(STORAGE_KEYS.settings, initialSettings),
  );
  const [session, setSession] = useState<Session | null>(() =>
    loadJSON<Session | null>(STORAGE_KEYS.session, null),
  );

  // Las reservas de muestra se regeneran si cambió el día desde la última visita.
  const [reservations, setReservations] = useState<Reservation[]>(() => {
    const stored = loadJSON<Reservation[] | null>(
      STORAGE_KEYS.reservations,
      null,
    );
    const seedDate = loadJSON<string | null>(STORAGE_KEYS.seedDate, null);
    const today = todayISO();
    if (!stored || seedDate !== today) return createSeedReservations();
    return stored;
  });

  /* -------------------------------------------------
     Persistencia
     ------------------------------------------------- */

  useEffect(() => {
    saveJSON(STORAGE_KEYS.students, students);
  }, [students]);

  useEffect(() => {
    saveJSON(STORAGE_KEYS.meals, meals);
  }, [meals]);

  useEffect(() => {
    saveJSON(STORAGE_KEYS.settings, settings);
  }, [settings]);

  useEffect(() => {
    saveJSON(STORAGE_KEYS.reservations, reservations);
    saveJSON(STORAGE_KEYS.seedDate, todayISO());
  }, [reservations]);

  useEffect(() => {
    if (session) saveJSON(STORAGE_KEYS.session, session);
    else saveJSON(STORAGE_KEYS.session, null);
  }, [session]);

  /* -------------------------------------------------
     Sesión
     ------------------------------------------------- */

  const login = useCallback(
    (email: string, password: string): LoginResult => {
      const mail = email.trim().toLowerCase();
      const pass = password.trim();

      if (!mail || !pass) {
        return { ok: false, error: "Completa todos los campos." };
      }

      const demo = demoAccounts.find(
        (a) => a.email.toLowerCase() === mail,
      );

      if (demo) {
        if (demo.password !== pass) {
          return { ok: false, error: "Contraseña incorrecta." };
        }
        if (demo.role === "estudiante" && demo.studentId) {
          const student = students.find((s) => s.id === demo.studentId);
          if (student && !student.activo) {
            return {
              ok: false,
              error: "La cuenta está deshabilitada. Contacta al administrador.",
            };
          }
          setSession({
            role: "estudiante",
            email: demo.email,
            nombre: student?.nombre ?? demo.nombre,
            studentId: demo.studentId,
            tipo: student?.tipo ?? demo.tipo,
          });
        } else {
          setSession({
            role: "admin",
            email: demo.email,
            nombre: demo.nombre,
          });
        }
        return { ok: true, role: demo.role };
      }

      const student = students.find(
        (s) => s.correo.toLowerCase() === mail,
      );

      if (!student) {
        return { ok: false, error: "El usuario no existe." };
      }
      if (student.password !== pass) {
        return { ok: false, error: "Contraseña incorrecta." };
      }
      if (!student.activo) {
        return {
          ok: false,
          error: "La cuenta está deshabilitada. Contacta al administrador.",
        };
      }

      setSession({
        role: "estudiante",
        email: student.correo,
        nombre: student.nombre,
        studentId: student.id,
        tipo: student.tipo,
      });
      return { ok: true, role: "estudiante" };
    },
    [students],
  );

  const logout = useCallback(() => setSession(null), []);

  const currentStudent = useMemo(() => {
    if (!session?.studentId) return null;
    return students.find((s) => s.id === session.studentId) ?? null;
  }, [session, students]);

  /* -------------------------------------------------
     Reservas
     ------------------------------------------------- */

  const reserve = useCallback(
    (mealId: MealId): ReserveResult => {
      if (!session) {
        return { ok: false, message: "Debes iniciar sesión para reservar." };
      }
      if (!settings.reservasHabilitadas) {
        return {
          ok: false,
          message: "Las reservas se encuentran temporalmente cerradas.",
        };
      }

      const meal = meals.find((m) => m.id === mealId);
      if (!meal) return { ok: false, message: "Servicio no encontrado." };
      if (!meal.habilitado) {
        return {
          ok: false,
          message: `El ${meal.nombre.toLowerCase()} no está habilitado hoy.`,
        };
      }

      const student = currentStudent;
      if (!student) {
        return { ok: false, message: "No se encontró tu perfil de estudiante." };
      }

      const date = todayISO();

      const duplicate = reservations.some(
        (r) =>
          r.studentId === student.id &&
          r.mealId === mealId &&
          r.date === date &&
          r.status !== "Cancelada",
      );
      if (duplicate) {
        return {
          ok: false,
          message: `Ya tienes una reserva de ${meal.nombre.toLowerCase()} para hoy.`,
        };
      }

      const stats = computeMealStats(meal, reservations, date);
      if (availableForType(stats, student.tipo) <= 0) {
        return {
          ok: false,
          message:
            student.tipo === "Becario"
              ? "No quedan cupos disponibles para becarios."
              : "No quedan cupos disponibles para estudiantes libres.",
        };
      }

      const id = generateReservationCode(reservations);
      const reservation: Reservation = {
        id,
        studentId: student.id,
        studentName: student.nombre,
        studentType: student.tipo,
        mealId: meal.id,
        mealName: meal.nombre,
        date,
        time: meal.horario,
        status: "Activa",
        qrCode: JSON.stringify({
          reservationId: id,
          studentId: student.id,
          meal: meal.nombre,
          date,
        }),
        createdAt: nowISO(),
      };

      setReservations((prev) => [...prev, reservation]);
      return {
        ok: true,
        message: `Reserva de ${meal.nombre.toLowerCase()} creada correctamente.`,
      };
    },
    [currentStudent, meals, reservations, session, settings],
  );

  const cancelReservation = useCallback(
    (reservationId: string): ReserveResult => {
      const reservation = reservations.find((r) => r.id === reservationId);
      if (!reservation) {
        return { ok: false, message: "Reserva no encontrada." };
      }
      if (reservation.status !== "Activa") {
        return {
          ok: false,
          message: "Solo se pueden cancelar reservas activas.",
        };
      }

      setReservations((prev) =>
        prev.map((r) =>
          r.id === reservationId ? { ...r, status: "Cancelada" } : r,
        ),
      );
      return {
        ok: true,
        message: `Reserva de ${reservation.mealName.toLowerCase()} cancelada. El cupo fue liberado.`,
      };
    },
    [reservations],
  );

  const markUsed = useCallback(
    (reservationId: string): ReserveResult => {
      const reservation = reservations.find((r) => r.id === reservationId);
      if (!reservation) {
        return { ok: false, message: "Reserva no encontrada." };
      }
      if (reservation.status === "Utilizada") {
        return { ok: false, message: "Esta reserva ya fue utilizada." };
      }
      if (reservation.status === "Cancelada") {
        return { ok: false, message: "Esta reserva está cancelada." };
      }

      setReservations((prev) =>
        prev.map((r) =>
          r.id === reservationId
            ? { ...r, status: "Utilizada", usedAt: nowISO() }
            : r,
        ),
      );
      return {
        ok: true,
        message: `Reserva ${reservation.id} validada correctamente.`,
      };
    },
    [reservations],
  );

  const validateCode = useCallback(
    (code: string): ValidationOutcome =>
      validateReservationCode(code, reservations),
    [reservations],
  );

  /* -------------------------------------------------
     Cupos y configuración
     ------------------------------------------------- */

  const getMealStats = useCallback(
    (mealId: MealId, date: string = todayISO()): MealStats => {
      const meal = meals.find((m) => m.id === mealId);
      if (!meal) {
        return {
          becariosQuota: 0,
          libresQuota: 0,
          totalQuota: 0,
          resBecarios: 0,
          resLibres: 0,
          resTotal: 0,
          dispBecarios: 0,
          dispLibres: 0,
          dispTotal: 0,
          percentOcupado: 0,
        };
      }
      return computeMealStats(meal, reservations, date);
    },
    [meals, reservations],
  );

  const updateMeal: AppContextValue["updateMeal"] = useCallback(
    (mealId, patch) => {
      const meal = meals.find((m) => m.id === mealId);
      if (!meal) return { ok: false, message: "Servicio no encontrado." };

      const total = patch.total ?? meal.total;
      const becarios = patch.becarios ?? meal.becarios;

      if (total <= 0) {
        return { ok: false, message: "Los cupos totales deben ser mayores a 0." };
      }
      if (becarios < 0 || becarios > total) {
        return {
          ok: false,
          message: "Los cupos de becarios deben estar entre 0 y el total.",
        };
      }

      const stats = computeMealStats(meal, reservations, todayISO());
      if (total < stats.resTotal) {
        return {
          ok: false,
          message: `No se puede bajar el total por debajo de ${stats.resTotal} reservas existentes.`,
        };
      }
      if (becarios < stats.resBecarios) {
        return {
          ok: false,
          message: `No se puede bajar los cupos de becarios por debajo de ${stats.resBecarios} reservas existentes.`,
        };
      }

      setMeals((prev) =>
        prev.map((m) => (m.id === mealId ? { ...m, ...patch, total, becarios } : m)),
      );
      return { ok: true, message: `Cupos de ${meal.nombre.toLowerCase()} actualizados.` };
    },
    [meals, reservations],
  );

  const setReservasHabilitadas = useCallback((enabled: boolean) => {
    setSettings((prev) => ({ ...prev, reservasHabilitadas: enabled }));
  }, []);

  /* -------------------------------------------------
     Estudiantes
     ------------------------------------------------- */

  const addStudent = useCallback(
    (input: NewStudentInput): ReserveResult => {
      const nombre = input.nombre.trim();
      const correo = input.correo.trim().toLowerCase();
      const password = input.password.trim();

      if (!nombre || !correo || !password) {
        return { ok: false, message: "Todos los campos son obligatorios." };
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        return { ok: false, message: "El correo no tiene un formato válido." };
      }
      if (students.some((s) => s.correo.toLowerCase() === correo)) {
        return { ok: false, message: "Ya existe un estudiante con ese correo." };
      }

      const nextNumber = students.reduce((acc, s) => {
        const n = Number(s.id.replace(/\D/g, ""));
        return Number.isFinite(n) && n > acc ? n : acc;
      }, 0);

      const newStudent: Student = {
        id: `EST${String(nextNumber + 1).padStart(3, "0")}`,
        nombre,
        correo,
        tipo: input.tipo,
        activo: true,
        password,
      };

      setStudents((prev) => [...prev, newStudent]);
      return { ok: true, message: `${nombre} fue agregado correctamente.` };
    },
    [students],
  );

  const toggleStudentStatus = useCallback((studentId: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, activo: !s.activo } : s)),
    );
  }, []);

  /* -------------------------------------------------
     Restablecer demostración
     ------------------------------------------------- */

  const resetDemoData = useCallback(() => {
    setStudents(initialStudents);
    setMeals(initialMeals);
    setSettings(initialSettings);
    setReservations(createSeedReservations());
    saveJSON(STORAGE_KEYS.seedDate, todayISO());
  }, []);

  /* -------------------------------------------------
     Valor del contexto
     ------------------------------------------------- */

  const value = useMemo<AppContextValue>(
    () => ({
      session,
      currentStudent,
      students,
      reservations,
      meals,
      settings,
      login,
      logout,
      reserve,
      cancelReservation,
      markUsed,
      validateCode,
      getMealStats,
      updateMeal,
      setReservasHabilitadas,
      addStudent,
      toggleStudentStatus,
      resetDemoData,
    }),
    [
      session,
      currentStudent,
      students,
      reservations,
      meals,
      settings,
      login,
      logout,
      reserve,
      cancelReservation,
      markUsed,
      validateCode,
      getMealStats,
      updateMeal,
      setReservasHabilitadas,
      addStudent,
      toggleStudentStatus,
      resetDemoData,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp debe usarse dentro de <AppProvider>");
  }
  return ctx;
}
