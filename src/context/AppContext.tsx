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
  SurveyResultRow,
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
  blockingReservation,
  buildSlots,
  computeMealStats,
  effectiveStatus,
  expiresAtISO,
  freeQuota,
  generateReservationCode,
  slotIsPast,
  slotNotYetOpen,
  slotOpenTime,
  slotOccupancy,
  validateReservationCode,
} from "@/utils/reservationUtils";
import type { MealStats } from "@/utils/reservationUtils";
import { computeSurveyResults } from "@/utils/surveyUtils";
import { isSupabaseEnabled } from "@/lib/supabase";
import {
  createAuthUser,
  currentAuthEmail,
  deleteSurveyRow,
  errorMessage,
  insertReservation,
  insertStudentRow,
  insertSurveyRow,
  loadAppData,
  loadMealStats,
  loadSurveyResults,
  nextReservationCode,
  nextResponseCode,
  saveResponseRow,
  sessionFromEmail,
  setSurveyActiveRow,
  signIn,
  signOut,
  updateMealRow,
  updateReservationRow,
  updateSettingsRow,
  updateStudentRow,
} from "@/services/api";
import type { AppData, DataSource, MealStat, SurveyResultsRow } from "@/services/api";
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
  /** Cuentas de demostración que enseña el login (sin contraseñas reales). */
  accounts: DemoAccount[];
  /** true mientras se cargan los datos de la base de datos. */
  loading: boolean;
  /** Dónde están guardados los datos: "supabase" o "local". */
  dataSource: DataSource;

  /** Inicia sesión: valida con Supabase Auth o con las cuentas locales. */
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;

  reserve: (mealId: MealId, slotStart?: string) => Promise<ReserveResult>;
  cancelReservation: (reservationId: string) => Promise<ReserveResult>;
  markUsed: (reservationId: string) => Promise<ReserveResult>;
  validateCode: (code: string) => ValidationOutcome;

  getMealStats: (mealId: MealId, date?: string) => MealStats;
  /** Resultados (votos y %) de una encuesta. */
  getSurveyResults: (surveyId: string) => SurveyResultRow[];
  /** Número de estudiantes que respondieron una encuesta. */
  getSurveyTotal: (surveyId: string) => number;
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
  /** Cupos por servicio/fecha que devuelve vw_meal_stats (solo Supabase). */
  const [mealStats, setMealStats] = useState<MealStat[]>([]);
  /** Votos por opción que devuelve vw_survey_results (solo Supabase). */
  const [surveyResults, setSurveyResults] = useState<SurveyResultsRow[]>([]);
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

  /** Copia un conjunto de datos completo al estado. */
  const applyData = useCallback((data: AppData) => {
    setStudents(data.students);
    setAccounts(data.accounts);
    setMeals(data.meals);
    setSettings(data.settings);
    setReservations(data.reservations);
    setSurveys(data.surveys);
    setSurveyResponses(data.surveyResponses);
    setMealStats(data.mealStats);
    setSurveyResults(data.surveyResults);
  }, []);

  /**
   * Al arrancar se comprueba si había una sesión de Supabase Auth guardada.
   * · Con sesión: se cargan los datos que RLS permite ver a ese usuario.
   * · Sin sesión: se espera en la pantalla de acceso (sin consultar la base).
   */
  useEffect(() => {
    if (!isSupabaseEnabled) return;
    let alive = true;

    void (async () => {
      try {
        const email = await currentAuthEmail();
        if (!alive) return;

        if (email) {
          const restored = await sessionFromEmail(email);
          if (!alive) return;

          if (restored) {
            const { data, source } = await loadAppData();
            if (!alive) return;
            applyData(data);
            setDataSource(source);
            setSession(restored);
          } else {
            // La cuenta ya no existe o está desactivada.
            await signOut();
            setSession(null);
          }
        } else {
          // No hay sesión de Supabase Auth: se descarta cualquier copia
          // que hubiera quedado en el navegador.
          setSession(null);
        }
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
  }, [applyData, push]);

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

  /**
   * Inicio de sesión.
   * · Modo Supabase: se valida con SUPABASE AUTH (contraseña con hash) y,
   *   después, se cargan los datos que las políticas RLS permiten ver a
   *   ese usuario (los suyos, o todos si es administrador).
   * · Modo local: se valida contra las cuentas de demostración, igual que
   *   siempre, con localStorage.
   */
  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      const mail = email.trim().toLowerCase();
      const pass = password.trim();

      if (!mail || !pass) {
        return { ok: false, error: "Completa todos los campos." };
      }

      if (dataSource === "supabase") {
        const fallo = await signIn(mail, pass);
        if (fallo) {
          return { ok: false, error: `No se pudo iniciar sesión: ${fallo}` };
        }

        let restored: Session | null = null;
        try {
          restored = await sessionFromEmail(mail);
        } catch (err) {
          await signOut();
          return {
            ok: false,
            error: `No se pudo leer tu cuenta: ${errorMessage(err)}`,
          };
        }

        if (!restored) {
          await signOut();
          return {
            ok: false,
            error:
              "La cuenta no existe o está deshabilitada. Contacta al administrador.",
          };
        }

        try {
          const { data, source } = await loadAppData();
          applyData(data);
          setDataSource(source);
        } catch (err) {
          await signOut();
          return {
            ok: false,
            error: `No se pudieron cargar tus datos: ${errorMessage(err)}`,
          };
        }

        setSession(restored);
        return { ok: true, role: restored.role };
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
    [accounts, applyData, dataSource, students],
  );

  const logout = useCallback(() => {
    setSession(null);
    // En Supabase se cierra también la sesión real de Auth.
    if (isSupabaseEnabled) void signOut();
  }, []);

  /* -------------------------------------------------
     Recargas de las vistas de agregados
     ------------------------------------------------- */

  /** Vuelve a leer los cupos: cambian al reservar, cancelar o editar. */
  const refreshMealStats = useCallback(async () => {
    if (dataSource !== "supabase") return;
    try {
      setMealStats(await loadMealStats());
    } catch {
      // Un fallo aquí no debe arruinar la operación principal.
    }
  }, [dataSource]);

  /** Vuelve a leer los resultados: cambian al votar o crear encuestas. */
  const refreshSurveyResults = useCallback(async () => {
    if (dataSource !== "supabase") return;
    try {
      setSurveyResults(await loadSurveyResults());
    } catch {
      // Un fallo aquí no debe arruinar la operación principal.
    }
  }, [dataSource]);

  const currentStudent = useMemo(() => {
    if (!session?.studentId) return null;
    return students.find((s) => s.id === session.studentId) ?? null;
  }, [session, students]);

  /* -------------------------------------------------
     Lecturas agregadas (cupos y resultados)
     ------------------------------------------------- */

  /**
   * Cupos de un servicio en una fecha.
   * · Supabase: de vw_meal_stats (calculado en el servidor): así un
   *   estudiante ve los totales aunque RLS le oculte las reservas ajenas.
   * · Local:    calculados en memoria con todas las reservas.
   */
  const getMealStats = useCallback(
    (mealId: MealId, date: string = todayISO()): MealStats => {
      const meal = meals.find((m) => m.id === mealId);

      // Reservas vencidas del día. Se calculan igual en ambos modos de datos
      // porque los cupos de becarios vencidos pasan a los libres.
      const now = new Date();
      const dayReservations = reservations.filter(
        (r) => r.mealId === mealId && r.date === date,
      );
      const vencidas = dayReservations.filter(
        (r) => effectiveStatus(r, now) === "Vencida",
      ).length;
      const becariosLiberados = dayReservations.filter(
        (r) =>
          r.studentType === "Becario" &&
          effectiveStatus(r, now) === "Vencida",
      ).length;

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
          becariosLiberados,
          vencidas,
        };
      }

      if (dataSource === "supabase") {
        const row = mealStats.find(
          (r) => r.mealId === mealId && r.fecha === date,
        );
        if (!row) {
          // Sin reservas ese día: el servicio está completo y libre.
          return {
            becariosQuota: meal.becarios,
            libresQuota: freeQuota(meal),
            totalQuota: meal.total,
            resBecarios: 0,
            resLibres: 0,
            resTotal: 0,
            dispBecarios: meal.becarios,
            dispLibres: freeQuota(meal),
            dispTotal: meal.total,
            percentOcupado: 0,
            becariosLiberados,
            vencidas,
          };
        }
        return {
          becariosQuota: row.becarios,
          libresQuota: Math.max(row.total - row.becarios, 0),
          totalQuota: row.total,
          resBecarios: row.resBecarios,
          resLibres: row.resLibres,
          resTotal: row.resTotal,
          dispBecarios: row.dispBecarios,
          dispLibres: row.dispLibres,
          dispTotal: row.dispTotal,
          percentOcupado: row.percentOcupado,
          becariosLiberados,
          vencidas,
        };
      }

      return computeMealStats(meal, reservations, date);
    },
    [dataSource, mealStats, meals, reservations],
  );

  /**
   * Resultados de una encuesta.
   * · Supabase: de vw_survey_results (solo conteos, sin nombres).
   * · Local:    calculados en memoria con las respuestas cargadas.
   */
  const getSurveyResults = useCallback(
    (surveyId: string): SurveyResultRow[] => {
      if (dataSource === "supabase") {
        return surveyResults
          .filter((r) => r.surveyId === surveyId)
          .map((r) => ({
            optionId: r.optionId,
            label: r.label,
            votes: r.votes,
            percent: r.percent,
          }));
      }
      const survey = surveys.find((s) => s.id === surveyId);
      return survey ? computeSurveyResults(survey, surveyResponses) : [];
    },
    [dataSource, surveyResults, surveys, surveyResponses],
  );

  /** Número de estudiantes que respondieron una encuesta. */
  const getSurveyTotal = useCallback(
    (surveyId: string): number => {
      if (dataSource === "supabase") {
        return (
          surveyResults.find((r) => r.surveyId === surveyId)?.totalResponses ??
          0
        );
      }
      return surveyResponses.filter((r) => r.surveyId === surveyId).length;
    },
    [dataSource, surveyResults, surveyResponses],
  );

  /* -------------------------------------------------
     Reservas
     ------------------------------------------------- */

  const reserve = useCallback(
    async (mealId: MealId, slotStart?: string): Promise<ReserveResult> => {
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
      const now = new Date();

      // Franja de 30 minutos elegida. Si no se indicó, se usa la primera.
      const slots = buildSlots(meal);
      const chosen = slots.find((s) => s.start === slotStart) ?? slots[0];
      if (!chosen) {
        return {
          ok: false,
          message: "Este servicio no tiene franjas disponibles.",
        };
      }

      // Opción A: un solo intento por servicio y fecha.
      // Franja ya vencida: reservarla daría una reserva muerta al instante
      // y, con la opción A, el estudiante perdería su único intento del día.
      if (slotIsPast(date, chosen.start, now)) {
        return {
          ok: false,
          message: `La franja ${chosen.label} ya pasó. Elige una franja posterior.`,
        };
      }

      // Franja todavía no habilitada: cada una se abre sola, `LEAD_MINUTES`
      // minutos antes de su hora.
      if (slotNotYetOpen(date, chosen.start, now)) {
        return {
          ok: false,
          message: `La franja ${chosen.label} se habilita a las ${slotOpenTime(chosen.start)}.`,
        };
      }

      const previous = blockingReservation(
        reservations,
        student.id,
        mealId,
        date,
      );
      if (previous) {
        const estado = effectiveStatus(previous, now);
        return {
          ok: false,
          message:
            estado === "Vencida"
              ? `Tu reserva de ${meal.nombre.toLowerCase()} venció (franja de ${previous.slotStart ?? "inicio"}) y su cupo pasó a los estudiantes libres. No puedes volver a reservar este servicio hoy.`
              : `Ya tienes una reserva de ${meal.nombre.toLowerCase()} para hoy.`,
        };
      }

      // Capacidad máxima de llegadas por franja: evita que todos caigan
      // en la misma hora y se vuelva a formar fila.
      const occupancy = slotOccupancy(meal, reservations, date, now);
      if ((occupancy[chosen.start] ?? 0) >= chosen.limit) {
        return {
          ok: false,
          message: `La franja ${chosen.label} ya está llena (${chosen.limit} personas). Elige otra hora.`,
        };
      }

      const stats = getMealStats(mealId, date);
      if (availableForType(stats, student.tipo) <= 0) {
        return {
          ok: false,
          message:
            student.tipo === "Becario"
              ? "No quedan cupos disponibles para becarios."
              : "No quedan cupos disponibles para estudiantes libres.",
        };
      }

      // En Supabase el código lo asigna la base: así dos dispositivos no
      // generan el mismo RES- a la vez.
      let id: string;
      try {
        id = (await nextReservationCode()) ?? generateReservationCode(reservations);
      } catch (err) {
        return { ok: false, message: saveError(err) };
      }

      const reservation: Reservation = {
        id,
        studentId: student.id,
        studentName: student.nombre,
        studentType: student.tipo,
        mealId: meal.id,
        mealName: meal.nombre,
        date,
        time: chosen.label,
        status: "Activa",
        slotStart: chosen.start,
        expiresAt: expiresAtISO(date, chosen.start),
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
      void refreshMealStats();
      return {
        ok: true,
        message: `Reserva creada para el ${meal.nombre.toLowerCase()} de ${chosen.label}. Preséntate antes de las ${chosen.end}.`,
      };
    },
    [
      currentStudent,
      getMealStats,
      meals,
      refreshMealStats,
      reservations,
      session,
      settings,
    ],
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
      void refreshMealStats();
      return {
        ok: true,
        message: `Reserva de ${reservation.mealName.toLowerCase()} cancelada. El cupo fue liberado.`,
      };
    },
    [refreshMealStats, reservations],
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

      // Ventana de gracia: si la franja ya pasó, la reserva queda vencida y
      // su cupo (de becario o libre) pasa a estar disponible para otros.
      if (effectiveStatus(reservation) === "Vencida") {
        try {
          await updateReservationRow(reservationId, { status: "Vencida" });
        } catch {
          /* el estado en pantalla no depende de esta escritura */
        }
        setReservations((prev) =>
          prev.map((r) =>
            r.id === reservationId ? { ...r, status: "Vencida" } : r,
          ),
        );
        void refreshMealStats();
        return {
          ok: false,
          message: `Reserva ${reservation.id} vencida: la franja de ${reservation.slotStart ?? "inicio"} ya pasó. El cupo fue liberado.`,
        };
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
      void refreshMealStats();
      return {
        ok: true,
        message: `Reserva ${reservation.id} validada correctamente.`,
      };
    },
    [refreshMealStats, reservations],
  );

  const validateCode = useCallback(
    (code: string): ValidationOutcome =>
      validateReservationCode(code, reservations),
    [reservations],
  );

  /* -------------------------------------------------
     Cupos y configuración
     ------------------------------------------------- */

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

      const stats = getMealStats(mealId, todayISO());
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
      void refreshMealStats();
      return { ok: true, message: `Cupos de ${meal.nombre.toLowerCase()} actualizados.` };
    },
    [getMealStats, meals, refreshMealStats],
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
      if (dataSource === "supabase" && password.length < 6) {
        return {
          ok: false,
          message: "La contraseña de acceso debe tener al menos 6 caracteres.",
        };
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

      // En Supabase se crea también la cuenta de acceso (Supabase Auth,
      // contraseña con hash) para que el estudiante pueda iniciar sesión.
      if (dataSource === "supabase") {
        try {
          await createAuthUser(correo, password);
        } catch (err) {
          return {
            ok: true,
            message: `${nombre} fue agregado, pero no se pudo crear su cuenta de acceso (${errorMessage(err)}).`,
          };
        }
        return {
          ok: true,
          message: `${nombre} fue agregado y ya puede iniciar sesión con su correo.`,
        };
      }

      return { ok: true, message: `${nombre} fue agregado correctamente.` };
    },
    [dataSource, students],
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
      void refreshSurveyResults();
      return {
        ok: true,
        message: `Encuesta «${title}» creada y abierta para votar.`,
      };
    },
    [refreshSurveyResults, surveys],
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
      void refreshSurveyResults();
      return { ok: true, message: `Encuesta «${survey.title}» eliminada.` };
    },
    [refreshSurveyResults, surveys],
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
        // En Supabase el código lo asigna la base: al no verse las
        // respuestas ajenas, un correlativo local colisionaría.
        let id: string;
        if (dataSource === "supabase") {
          try {
            id = (await nextResponseCode()) ?? "";
          } catch (err) {
            return { ok: false, message: saveError(err) };
          }
          if (!id) {
            return {
              ok: false,
              message: "No se pudo generar el código de tu respuesta.",
            };
          }
        } else {
          const nextNumber = surveyResponses.reduce((acc, r) => {
            const n = Number(r.id.replace(/\D/g, ""));
            return Number.isFinite(n) && n > acc ? n : acc;
          }, 0);
          id = `RESP-${String(nextNumber + 1).padStart(3, "0")}`;
        }

        response = {
          id,
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
      void refreshSurveyResults();

      return existing
        ? { ok: true, message: "Tu respuesta fue actualizada." }
        : { ok: true, message: "¡Gracias! Tu voto quedó registrado." };
    },
    [
      currentStudent,
      dataSource,
      refreshSurveyResults,
      session,
      surveyResponses,
      surveys,
    ],
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
      getSurveyResults,
      getSurveyTotal,
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
      getSurveyResults,
      getSurveyTotal,
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
