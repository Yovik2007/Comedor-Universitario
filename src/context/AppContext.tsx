/**
 * Fuente única de verdad de la aplicación.
 * Gestiona sesión, estudiantes, reservas, cupos, encuestas y configuración.
 *
 * Los datos viven en Supabase (proyecto «COMEDOR UNJFSC») cuando existe
 * la configuración en .env; mientras llegan, la app muestra una pantalla
 * de carga. Si no hay credenciales, se conserva el modo local original
 * con localStorage (la demostración sigue funcionando sin internet).
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
  DemoAccount,
  Meal,
  MealId,
  Reservation,
  ReserveResult,
  Session,
  Settings,
  Student,
  StudentType,
  Survey,
  SurveyResponse,
  UserRole,
  ValidationOutcome,
} from "@/types";
import {
  createSeedReservations,
  createSeedSurveyResponses,
  demoAccounts,
  initialMeals,
  initialSettings,
  initialStudents,
  initialSurveys,
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
import { isSupabaseEnabled } from "@/lib/supabase";
import {
  deleteSurveyRow,
  errorMessage,
  insertReservation,
  insertStudentRow,
  insertSurveyRow,
  loadAppData,
  saveResponseRow,
  setSurveyActiveRow,
  updateMealRow,
  updateReservationRow,
  updateSettingsRow,
  updateStudentRow,
} from "@/services/api";
import type { DataSource } from "@/services/api";
import { useToast } from "@/context/ToastContext";

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

export interface NewSurveyInput {
  title: string;
  question: string;
  /** Etiquetas en crudo; el contexto las limpia y genera los ids. */
  options: string[];
}

interface AppContextValue {
  session: Session | null;
  currentStudent: Student | null;
  students: Student[];
  reservations: Reservation[];
  meals: Meal[];
  settings: Settings;
  surveys: Survey[];
  surveyResponses: SurveyResponse[];
  /** Cuentas de acceso (app_users en Supabase; demo en modo local). */
  accounts: DemoAccount[];
  /** true mientras se cargan los datos de la base de datos. */
  loading: boolean;
  /** Dónde están guardados los datos: "supabase" o "local". */
  dataSource: DataSource;

  login: (email: string, password: string) => LoginResult;
  logout: () => void;

  reserve: (mealId: MealId) => Promise<ReserveResult>;
  cancelReservation: (reservationId: string) => Promise<ReserveResult>;
  markUsed: (reservationId: string) => Promise<ReserveResult>;
  validateCode: (code: string) => ValidationOutcome;

  getMealStats: (mealId: MealId, date?: string) => MealStats;
  updateMeal: (
    mealId: MealId,
    patch: Partial<Pick<Meal, "total" | "becarios" | "horario" | "habilitado">>,
  ) => Promise<ReserveResult>;
  setReservasHabilitadas: (enabled: boolean) => Promise<ReserveResult>;

  addStudent: (input: NewStudentInput) => Promise<ReserveResult>;
  toggleStudentStatus: (studentId: string) => Promise<ReserveResult>;

  createSurvey: (input: NewSurveyInput) => Promise<ReserveResult>;
  toggleSurvey: (surveyId: string) => Promise<ReserveResult>;
  deleteSurvey: (surveyId: string) => Promise<ReserveResult>;
  submitSurveyResponse: (
    surveyId: string,
    optionIds: string[],
  ) => Promise<ReserveResult>;

  resetDemoData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

/** Mensaje de error compartido para todas las operaciones de guardado. */
const saveError = (err: unknown): string =>
  `No se pudo guardar en la base de datos: ${errorMessage(err)}`;

export function AppProvider({ children }: { children: ReactNode }) {
  const { push } = useToast();

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
  const [surveys, setSurveys] = useState<Survey[]>(() =>
    loadJSON(STORAGE_KEYS.surveys, initialSurveys),
  );
  const [surveyResponses, setSurveyResponses] = useState<SurveyResponse[]>(
    () => loadJSON(STORAGE_KEYS.surveyResponses, createSeedSurveyResponses()),
  );
  const [accounts, setAccounts] = useState<DemoAccount[]>(demoAccounts);
  const [loading, setLoading] = useState(isSupabaseEnabled);
  const [dataSource, setDataSource] = useState<DataSource>(
    isSupabaseEnabled ? "supabase" : "local",
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
     Carga inicial desde Supabase
     ------------------------------------------------- */

  useEffect(() => {
    if (!isSupabaseEnabled) return;
    let alive = true;

    void (async () => {
      try {
        const { data, source } = await loadAppData();
        if (!alive) return;
        setStudents(data.students);
        setAccounts(data.accounts);
        setMeals(data.meals);
        setSettings(data.settings);
        setReservations(data.reservations);
        setSurveys(data.surveys);
        setSurveyResponses(data.surveyResponses);
        setDataSource(source);
      } catch (err) {
        if (!alive) return;
        setDataSource("local");
        push("error", `No se pudo cargar Supabase: ${errorMessage(err)}`);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [push]);

  /* -------------------------------------------------
     Persistencia local (copia de respaldo en el navegador)
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

  useEffect(() => {
    saveJSON(STORAGE_KEYS.surveys, surveys);
  }, [surveys]);

  useEffect(() => {
    saveJSON(STORAGE_KEYS.surveyResponses, surveyResponses);
  }, [surveyResponses]);

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

      const demo = accounts.find((a) => a.email.toLowerCase() === mail);

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
    [accounts, students],
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
    async (mealId: MealId): Promise<ReserveResult> => {
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

      try {
        await insertReservation(reservation);
      } catch (err) {
        return { ok: false, message: saveError(err) };
      }

      setReservations((prev) => [...prev, reservation]);
      return {
        ok: true,
        message: `Reserva de ${meal.nombre.toLowerCase()} creada correctamente.`,
      };
    },
    [currentStudent, meals, reservations, session, settings],
  );

  const cancelReservation = useCallback(
    async (reservationId: string): Promise<ReserveResult> => {
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

      try {
        await updateReservationRow(reservationId, { status: "Cancelada" });
      } catch (err) {
        return { ok: false, message: saveError(err) };
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
    async (reservationId: string): Promise<ReserveResult> => {
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

      const usedAt = nowISO();
      try {
        await updateReservationRow(reservationId, {
          status: "Utilizada",
          usedAt,
        });
      } catch (err) {
        return { ok: false, message: saveError(err) };
      }

      setReservations((prev) =>
        prev.map((r) =>
          r.id === reservationId
            ? { ...r, status: "Utilizada", usedAt }
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
    async (mealId, patch) => {
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

      const updated: Meal = { ...meal, ...patch, total, becarios };
      try {
        await updateMealRow(updated);
      } catch (err) {
        return { ok: false, message: saveError(err) };
      }

      setMeals((prev) =>
        prev.map((m) => (m.id === mealId ? updated : m)),
      );
      return { ok: true, message: `Cupos de ${meal.nombre.toLowerCase()} actualizados.` };
    },
    [meals, reservations],
  );

  const setReservasHabilitadas = useCallback(
    async (enabled: boolean): Promise<ReserveResult> => {
      try {
        await updateSettingsRow(enabled);
      } catch (err) {
        return { ok: false, message: saveError(err) };
      }
      setSettings((prev) => ({ ...prev, reservasHabilitadas: enabled }));
      return {
        ok: true,
        message: enabled
          ? "Reservas habilitadas para todos los estudiantes."
          : "Reservas inhabilitadas temporalmente.",
      };
    },
    [],
  );

  /* -------------------------------------------------
     Estudiantes
     ------------------------------------------------- */

  const addStudent = useCallback(
    async (input: NewStudentInput): Promise<ReserveResult> => {
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

      try {
        await insertStudentRow(newStudent);
      } catch (err) {
        return { ok: false, message: saveError(err) };
      }

      setStudents((prev) => [...prev, newStudent]);
      return { ok: true, message: `${nombre} fue agregado correctamente.` };
    },
    [students],
  );

  const toggleStudentStatus = useCallback(
    async (studentId: string): Promise<ReserveResult> => {
      const student = students.find((s) => s.id === studentId);
      if (!student) {
        return { ok: false, message: "Estudiante no encontrado." };
      }

      try {
        await updateStudentRow(studentId, !student.activo);
      } catch (err) {
        return { ok: false, message: saveError(err) };
      }

      setStudents((prev) =>
        prev.map((s) =>
          s.id === studentId ? { ...s, activo: !s.activo } : s,
        ),
      );
      return {
        ok: true,
        message: student.activo
          ? `${student.nombre} fue desactivado.`
          : `${student.nombre} fue reactivado.`,
      };
    },
    [students],
  );

  /* -------------------------------------------------
     Encuestas de comidas
     ------------------------------------------------- */

  const createSurvey = useCallback(
    async (input: NewSurveyInput): Promise<ReserveResult> => {
      const title = input.title.trim();
      const question = input.question.trim();
      const options = input.options.map((o) => o.trim()).filter(Boolean);

      if (!title || !question) {
        return { ok: false, message: "El título y la pregunta son obligatorios." };
      }
      if (options.length < 2) {
        return { ok: false, message: "Agrega al menos dos opciones." };
      }
      const normalized = options.map((o) => o.toLowerCase());
      if (new Set(normalized).size !== normalized.length) {
        return { ok: false, message: "Las opciones deben ser distintas." };
      }

      const nextNumber = surveys.reduce((acc, s) => {
        const n = Number(s.id.replace(/\D/g, ""));
        return Number.isFinite(n) && n > acc ? n : acc;
      }, 0);

      const draft: Survey = {
        id: `ENC-${String(nextNumber + 1).padStart(3, "0")}`,
        title,
        question,
        options: options.map((label, index) => ({
          id: `opt-${index + 1}`,
          label,
        })),
        active: true,
        createdAt: nowISO(),
      };

      let saved: Survey;
      try {
        // En Supabase devuelve la encuesta con los ids reales de las opciones.
        saved = await insertSurveyRow(draft);
      } catch (err) {
        return { ok: false, message: saveError(err) };
      }

      setSurveys((prev) => [saved, ...prev]);
      return {
        ok: true,
        message: `Encuesta «${title}» creada y abierta para votar.`,
      };
    },
    [surveys],
  );

  const toggleSurvey = useCallback(
    async (surveyId: string): Promise<ReserveResult> => {
      const survey = surveys.find((s) => s.id === surveyId);
      if (!survey) return { ok: false, message: "Encuesta no encontrada." };

      try {
        await setSurveyActiveRow(surveyId, !survey.active);
      } catch (err) {
        return { ok: false, message: saveError(err) };
      }

      setSurveys((prev) =>
        prev.map((s) => (s.id === surveyId ? { ...s, active: !s.active } : s)),
      );
      return {
        ok: true,
        message: survey.active
          ? `«${survey.title}» se cerró: ya no se aceptan votos.`
          : `«${survey.title}» se abrió para votar.`,
      };
    },
    [surveys],
  );

  const deleteSurvey = useCallback(
    async (surveyId: string): Promise<ReserveResult> => {
      const survey = surveys.find((s) => s.id === surveyId);
      if (!survey) return { ok: false, message: "Encuesta no encontrada." };

      try {
        await deleteSurveyRow(surveyId);
      } catch (err) {
        return { ok: false, message: saveError(err) };
      }

      setSurveys((prev) => prev.filter((s) => s.id !== surveyId));
      setSurveyResponses((prev) => prev.filter((r) => r.surveyId !== surveyId));
      return { ok: true, message: `Encuesta «${survey.title}» eliminada.` };
    },
    [surveys],
  );

  const submitSurveyResponse = useCallback(
    async (surveyId: string, optionIds: string[]): Promise<ReserveResult> => {
      if (!session) {
        return { ok: false, message: "Debes iniciar sesión para votar." };
      }

      const survey = surveys.find((s) => s.id === surveyId);
      if (!survey) return { ok: false, message: "Encuesta no encontrada." };
      if (!survey.active) {
        return { ok: false, message: "Esta encuesta ya está cerrada." };
      }

      const valid = optionIds.filter((id) =>
        survey.options.some((o) => o.id === id),
      );
      if (valid.length === 0) {
        return { ok: false, message: "Selecciona al menos una comida." };
      }

      const student = currentStudent;
      if (!student) {
        return { ok: false, message: "No se encontró tu perfil de estudiante." };
      }

      const existing = surveyResponses.find(
        (r) => r.surveyId === surveyId && r.studentId === student.id,
      );
      const now = nowISO();

      let response: SurveyResponse;
      if (existing) {
        response = { ...existing, optionIds: valid, updatedAt: now };
      } else {
        const nextNumber = surveyResponses.reduce((acc, r) => {
          const n = Number(r.id.replace(/\D/g, ""));
          return Number.isFinite(n) && n > acc ? n : acc;
        }, 0);

        response = {
          id: `RESP-${String(nextNumber + 1).padStart(3, "0")}`,
          surveyId,
          studentId: student.id,
          studentName: student.nombre,
          optionIds: valid,
          createdAt: now,
          updatedAt: now,
        };
      }

      try {
        await saveResponseRow(response, !existing);
      } catch (err) {
        return { ok: false, message: saveError(err) };
      }

      setSurveyResponses((prev) =>
        existing
          ? prev.map((r) => (r.id === existing.id ? response : r))
          : [...prev, response],
      );

      return existing
        ? { ok: true, message: "Tu respuesta fue actualizada." }
        : { ok: true, message: "¡Gracias! Tu voto quedó registrado." };
    },
    [currentStudent, session, surveyResponses, surveys],
  );

  /* -------------------------------------------------
     Restablecer demostración (solo modo local)
     ------------------------------------------------- */

  const resetDemoData = useCallback(() => {
    setStudents(initialStudents);
    setMeals(initialMeals);
    setSettings(initialSettings);
    setReservations(createSeedReservations());
    setSurveys(initialSurveys);
    setSurveyResponses(createSeedSurveyResponses());
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
      surveys,
      surveyResponses,
      accounts,
      loading,
      dataSource,
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
      createSurvey,
      toggleSurvey,
      deleteSurvey,
      submitSurveyResponse,
      resetDemoData,
    }),
    [
      session,
      currentStudent,
      students,
      reservations,
      meals,
      settings,
      surveys,
      surveyResponses,
      accounts,
      loading,
      dataSource,
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
      createSurvey,
      toggleSurvey,
      deleteSurvey,
      submitSurveyResponse,
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
