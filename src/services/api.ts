/**
 * Capa de acceso a datos del UNJFSC Comedor digital.
 *
 * Dos modos de trabajo, decididos por la presencia de credenciales en .env:
 *
 *  - "supabase": sesión real con SUPABASE AUTH (correo + contraseña con
 *    hash bcrypt), lectura desde las vistas vw_* y escritura sobre las
 *    tablas base. Las políticas RLS limitan cada consulta a lo que el rol
 *    autenticado puede ver: un estudiante solo ve sus filas y el admin, todo.
 *  - "local":    se conserva el comportamiento original de la demostración
 *                con localStorage; ninguna función de escritura hace nada.
 *
 * El resto de la app (páginas y lógica de negocio) solo habla con estas
 * funciones, así que el cambio de almacenamiento no se filtra hacia fuera.
 *
 * Nota: los cupos y los resultados de encuestas se leen de las vistas de
 * agregados (vw_meal_stats / vw_survey_results), que solo devuelven conteos
 * y se calculan en el servidor: así RLS puede ocultar las filas individuales
 * sin perder los totales.
 */

import { isSupabaseEnabled, supabase } from "@/lib/supabase";
import type {
  DemoAccount,
  Meal,
  MealId,
  Reservation,
  ReservationStatus,
  Session,
  Settings,
  Student,
  Survey,
  SurveyResponse,
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
import { STORAGE_KEYS, loadJSON } from "@/utils/storage";
import { todayISO } from "@/utils/dates";

export type DataSource = "supabase" | "local";

/** Conjunto completo de datos que necesita la aplicación al arrancar. */
export interface AppData {
  students: Student[];
  accounts: DemoAccount[];
  meals: Meal[];
  settings: Settings;
  reservations: Reservation[];
  surveys: Survey[];
  surveyResponses: SurveyResponse[];
  /** Cupos por servicio y fecha (vista de agregados del servidor). */
  mealStats: MealStat[];
  /** Votos por opción (vista de agregados del servidor). */
  surveyResults: SurveyResultsRow[];
}

/** Fila de vw_meal_stats: cupos y reservas de un servicio en una fecha. */
export interface MealStat {
  mealId: MealId;
  fecha: string;
  total: number;
  becarios: number;
  resBecarios: number;
  resLibres: number;
  resTotal: number;
  dispBecarios: number;
  dispLibres: number;
  dispTotal: number;
  percentOcupado: number;
}

/** Fila de vw_survey_results: votos de una opción y totales de su encuesta. */
export interface SurveyResultsRow {
  surveyId: string;
  optionId: string;
  label: string;
  votes: number;
  percent: number;
  totalResponses: number;
}

/* ---------------------------------------------------------
   Errores legibles
   --------------------------------------------------------- */

interface DbError {
  message: string;
  code?: string;
}

interface DbResult<T> {
  data: T | null;
  error: DbError | null;
}

/** Ejecuta una operación de escritura y lanza un error si falla. */
async function exec(
  query: PromiseLike<DbResult<unknown>>,
  accion: string,
): Promise<void> {
  const res = await query;
  if (res.error) throw new Error(`${accion}: ${res.error.message}`);
}

/** Ejecuta una consulta de lectura y devuelve sus filas. */
async function run<T>(
  query: PromiseLike<DbResult<T>>,
  accion: string,
): Promise<T> {
  const res = await query;
  if (res.error) throw new Error(`${accion}: ${res.error.message}`);
  return res.data as T;
}

/** Traduce los errores técnicos de Supabase a mensajes comprensibles. */
export function errorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);

  if (/failed to fetch|networkerror|load failed|fetch failed/i.test(raw)) {
    return "no hay conexión con Supabase (revisa internet o las credenciales de .env).";
  }
  if (raw.includes("23505")) {
    return "el registro ya existe: quizá otro dispositivo lo creó al mismo tiempo. Recarga la página.";
  }
  if (raw.includes("23503")) {
    return "la operación rompe una relación de la base de datos.";
  }
  if (raw.includes("42501") || /row-level security/i.test(raw)) {
    return "la base de datos rechazó la operación por permisos (políticas RLS).";
  }
  if (raw.includes("PGRST")) {
    return "la base de datos rechazó la operación (" + raw + ").";
  }
  return raw;
}

/* ---------------------------------------------------------
   Filas crudas que devuelve Supabase (vistas vw_*)
   --------------------------------------------------------- */

interface StudentRow {
  id: string;
  nombre: string;
  correo: string;
  tipo: string;
  activo: boolean;
}

/** Cuenta de acceso de vw_app_users (sin contraseña: la valida Auth). */
interface AccountRow {
  email: string;
  role: string;
  nombre: string;
  studentId: string | null;
  tipo: string | null;
}

interface ReservationRow {
  id: string;
  studentId: string;
  studentName: string;
  studentType: string;
  mealId: string;
  mealName: string;
  date: string;
  time: string;
  status: string;
  qrCode: string;
  createdAt: string;
  usedAt: string | null;
}

interface SurveyOptionRow {
  id: string | number;
  label: string;
}

interface SurveyRow {
  id: string;
  title: string;
  question: string;
  active: boolean;
  createdAt: string;
  options: SurveyOptionRow[] | null;
}

interface SurveyResponseRow {
  id: string;
  surveyId: string;
  studentId: string;
  studentName: string;
  optionIds: (string | number)[] | null;
  createdAt: string;
  updatedAt: string;
}

interface SettingsRow {
  reservasHabilitadas: boolean;
}

const toStudent = (r: StudentRow): Student => ({
  id: r.id,
  nombre: r.nombre,
  correo: r.correo,
  tipo: r.tipo as Student["tipo"],
  activo: Boolean(r.activo),
});

const toReservation = (r: ReservationRow): Reservation => ({
  id: r.id,
  studentId: r.studentId,
  studentName: r.studentName,
  studentType: r.studentType as Student["tipo"],
  mealId: r.mealId as Meal["id"],
  mealName: r.mealName as Meal["nombre"],
  date: r.date,
  time: r.time,
  status: r.status as ReservationStatus,
  qrCode: r.qrCode,
  createdAt: r.createdAt,
  usedAt: r.usedAt ?? undefined,
});

const toSurvey = (r: SurveyRow): Survey => ({
  id: r.id,
  title: r.title,
  question: r.question,
  active: Boolean(r.active),
  createdAt: r.createdAt,
  options: (r.options ?? []).map((o) => ({
    id: String(o.id),
    label: o.label,
  })),
});

const toSurveyResponse = (r: SurveyResponseRow): SurveyResponse => ({
  id: r.id,
  surveyId: r.surveyId,
  studentId: r.studentId,
  studentName: r.studentName,
  optionIds: (r.optionIds ?? []).map(String),
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});

/* ---------------------------------------------------------
   Lectura inicial
   --------------------------------------------------------- */

/** Datos iniciales en modo local: exactamente la demostración original. */
function localAppData(): AppData {
  const stored = loadJSON<Reservation[] | null>(
    STORAGE_KEYS.reservations,
    null,
  );
  const seedDate = loadJSON<string | null>(STORAGE_KEYS.seedDate, null);
  const seedToday = todayISO();

  return {
    students: loadJSON(STORAGE_KEYS.students, initialStudents),
    accounts: demoAccounts,
    meals: loadJSON(STORAGE_KEYS.meals, initialMeals),
    settings: loadJSON(STORAGE_KEYS.settings, initialSettings),
    reservations:
      !stored || seedDate !== seedToday ? createSeedReservations() : stored,
    surveys: loadJSON(STORAGE_KEYS.surveys, initialSurveys),
    surveyResponses: loadJSON(
      STORAGE_KEYS.surveyResponses,
      createSeedSurveyResponses(),
    ),
    // En modo local los agregados se calculan en memoria (JS).
    mealStats: [],
    surveyResults: [],
  };
}

/**
 * Carga todos los datos de una vez.
 *
 * En modo Supabase exige tener sesión iniciada: RLS devuelve permisos
 * denegados a quien no la tiene, así que el contexto solo llama a esta
 * función después del login (o si ya había una sesión guardada).
 * Lanza un error si Supabase no responde (el contexto decide qué hacer).
 */
export async function loadAppData(): Promise<{
  data: AppData;
  source: DataSource;
}> {
  if (!isSupabaseEnabled || !supabase) {
    return { data: localAppData(), source: "local" };
  }

  const [
    students,
    meals,
    settings,
    reservations,
    surveys,
    responses,
    mealStats,
    surveyResults,
  ] = await Promise.all([
    run<StudentRow[]>(
      supabase.from("vw_students").select("*"),
      "leer estudiantes",
    ),
    run<Meal[]>(supabase.from("vw_meals").select("*"), "leer servicios"),
    run<SettingsRow[]>(
      supabase.from("vw_settings").select("*"),
      "leer la configuración",
    ),
    run<ReservationRow[]>(
      supabase.from("vw_reservations").select("*"),
      "leer reservas",
    ),
    run<SurveyRow[]>(supabase.from("vw_surveys").select("*"), "leer encuestas"),
    run<SurveyResponseRow[]>(
      supabase.from("vw_survey_responses").select("*"),
      "leer respuestas",
    ),
    loadMealStats(),
    loadSurveyResults(),
  ]);

  return {
    source: "supabase",
    data: {
      students: students.map(toStudent),
      // Las cuentas de demostración son estáticas: las contraseñas ya no
      // se guardan en la base, las valida Supabase Auth.
      accounts: demoAccounts,
      meals: meals.map((m) => ({ ...m })),
      settings: settings[0]
        ? { reservasHabilitadas: Boolean(settings[0].reservasHabilitadas) }
        : initialSettings,
      reservations: reservations.map(toReservation),
      surveys: surveys.map(toSurvey),
      surveyResponses: responses.map(toSurveyResponse),
      mealStats,
      surveyResults,
    },
  };
}

/** Cupos por servicio y fecha (lectura puntual, tras cada movimiento). */
export async function loadMealStats(): Promise<MealStat[]> {
  if (!supabase) return [];
  return run<MealStat[]>(
    supabase.from("vw_meal_stats").select("*"),
    "leer los cupos",
  );
}

/** Votos por opción de cada encuesta (lectura puntual, tras votar). */
export async function loadSurveyResults(): Promise<SurveyResultsRow[]> {
  if (!supabase) return [];
  return run<SurveyResultsRow[]>(
    supabase.from("vw_survey_results").select("*"),
    "leer los resultados",
  );
}

/* ---------------------------------------------------------
   Supabase Auth: sesión real (correo + contraseña con hash)
   --------------------------------------------------------- */

/** Correo del usuario con sesión iniciada (null si no hay sesión). */
export async function currentAuthEmail(): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  const email = data.session?.user?.email ?? "";
  return email ? email.trim().toLowerCase() : null;
}

/**
 * Inicia sesión en Supabase Auth.
 * Devuelve null si todo fue bien o, si no, un mensaje en español.
 */
export async function signIn(
  email: string,
  password: string,
): Promise<string | null> {
  if (!supabase) return "faltan las credenciales de Supabase en el archivo .env.";

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (!error) return null;

  const raw = error.message ?? "";
  if (/invalid login credentials/i.test(raw)) {
    return "el correo o la contraseña no son correctos.";
  }
  if (/email not confirmed/i.test(raw)) {
    return "el correo todavía no está confirmado en Supabase Auth.";
  }
  if (/rate limit|too many request|only request this after/i.test(raw)) {
    return "demasiados intentos: espera un minuto y vuelve a probar.";
  }
  if (/fetch|network/i.test(raw)) {
    return "no hay conexión con Supabase (revisa internet o las credenciales de .env).";
  }
  return raw.toLowerCase();
}

/** Cierra la sesión de Supabase Auth (si la hay). */
export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

/**
 * Construye la sesión de la aplicación a partir del correo autenticado.
 * · Cuenta de app_users  -> su rol y, si es estudiante, su ficha.
 * · Correo institucional -> se busca directamente en students.
 * Devuelve null si la cuenta no existe o el estudiante está inactivo.
 */
export async function sessionFromEmail(
  email: string,
): Promise<Session | null> {
  if (!supabase) return null;
  const mail = email.trim().toLowerCase();

  const cuentas = await run<AccountRow[]>(
    supabase.from("vw_app_users").select("*").eq("email", mail),
    "leer tu cuenta de acceso",
  );
  const acc = cuentas[0];

  if (acc) {
    if (acc.role === "estudiante") {
      const fichas = await run<StudentRow[]>(
        supabase.from("vw_students").select("*").eq("id", acc.studentId ?? ""),
        "leer tu ficha de estudiante",
      );
      const ficha = fichas[0] ? toStudent(fichas[0]) : null;
      if (!ficha || !ficha.activo) return null;
      return {
        role: "estudiante",
        email: acc.email,
        nombre: ficha.nombre,
        studentId: ficha.id,
        tipo: ficha.tipo,
      };
    }
    return { role: "admin", email: acc.email, nombre: acc.nombre };
  }

  // Correo institucional (no está en app_users): se lee de students.
  const filas = await run<StudentRow[]>(
    supabase.from("vw_students").select("*").eq("correo", mail),
    "leer tu ficha de estudiante",
  );
  const ficha = filas[0] ? toStudent(filas[0]) : null;
  if (!ficha || !ficha.activo) return null;
  return {
    role: "estudiante",
    email: ficha.correo,
    nombre: ficha.nombre,
    studentId: ficha.id,
    tipo: ficha.tipo,
  };
}

/**
 * Siguiente código de reserva (RES-00045). Lo asigna la base de datos
 * porque en modo Supabase cada estudiante solo ve las suyas y no podría
 * calcular el correlativo sin colisionar con los demás.
 * Devuelve null en modo local (allí se calcula en memoria).
 */
export async function nextReservationCode(): Promise<string | null> {
  if (!supabase) return null;
  const id = await run<string>(
    supabase.rpc("next_reservation_id"),
    "generar el código de reserva",
  );
  return typeof id === "string" && id ? id : null;
}

/** Siguiente código de respuesta (RESP-017). Mismo motivo que arriba. */
export async function nextResponseCode(): Promise<string | null> {
  if (!supabase) return null;
  const id = await run<string>(
    supabase.rpc("next_response_id"),
    "generar el código de respuesta",
  );
  return typeof id === "string" && id ? id : null;
}

/**
 * Crea la cuenta de acceso de un estudiante en Supabase Auth (hash bcrypt).
 * Solo puede llamarla un administrador; lanza un error en español si falla.
 */
export async function createAuthUser(
  email: string,
  password: string,
): Promise<void> {
  if (!supabase) return;
  await exec(
    supabase.rpc("create_demo_user", {
      p_email: email,
      p_password: password,
    }),
    "crear la cuenta de acceso",
  );
}

/* ---------------------------------------------------------
   Escrituras (sin efecto cuando no hay Supabase)
   --------------------------------------------------------- */

export async function insertReservation(r: Reservation): Promise<void> {
  if (!supabase) return;
  await exec(
    supabase.from("reservations").insert({
      id: r.id,
      student_id: r.studentId,
      meal_id: r.mealId,
      fecha: r.date,
      status: r.status,
      qr_code: r.qrCode,
      created_at: r.createdAt,
      used_at: r.usedAt ?? null,
    }),
    "guardar la reserva",
  );
}

export async function updateReservationRow(
  id: string,
  patch: { status?: ReservationStatus; usedAt?: string },
): Promise<void> {
  if (!supabase) return;
  const payload: Record<string, unknown> = {};
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.usedAt !== undefined) payload.used_at = patch.usedAt;
  await exec(
    supabase.from("reservations").update(payload).eq("id", id),
    "actualizar la reserva",
  );
}

export async function updateMealRow(meal: Meal): Promise<void> {
  if (!supabase) return;
  await exec(
    supabase
      .from("meals")
      .update({
        nombre: meal.nombre,
        horario: meal.horario,
        inicio: meal.inicio,
        fin: meal.fin,
        total: meal.total,
        becarios: meal.becarios,
        habilitado: meal.habilitado,
      })
      .eq("id", meal.id),
    "actualizar los cupos",
  );
}

export async function updateSettingsRow(
  reservasHabilitadas: boolean,
): Promise<void> {
  if (!supabase) return;
  await exec(
    supabase
      .from("settings")
      .upsert({ id: true, reservas_habilitadas: reservasHabilitadas }),
    "actualizar la configuración",
  );
}

export async function insertStudentRow(s: Student): Promise<void> {
  if (!supabase) return;
  // Sin contraseña: el acceso lo gestiona Supabase Auth (create_demo_user).
  await exec(
    supabase.from("students").insert({
      id: s.id,
      nombre: s.nombre,
      correo: s.correo,
      tipo: s.tipo,
      activo: s.activo,
    }),
    "guardar el estudiante",
  );
}

export async function updateStudentRow(
  id: string,
  activo: boolean,
): Promise<void> {
  if (!supabase) return;
  await exec(
    supabase.from("students").update({ activo }).eq("id", id),
    "actualizar el estudiante",
  );
}

/**
 * Crea la encuesta y sus opciones en la base y devuelve la encuesta con
 * los identificadores reales que generó Supabase (survey_options es
 * numérico, así que no se pueden inventar desde el navegador).
 */
export async function insertSurveyRow(survey: Survey): Promise<Survey> {
  if (!supabase) return survey;

  await exec(
    supabase.from("surveys").insert({
      id: survey.id,
      title: survey.title,
      question: survey.question,
      active: survey.active,
      created_at: survey.createdAt,
    }),
    "crear la encuesta",
  );

  if (survey.options.length > 0) {
    await exec(
      supabase
        .from("survey_options")
        .insert(
          survey.options.map((o, index) => ({
            survey_id: survey.id,
            label: o.label,
            orden: index + 1,
          })),
        ),
      "guardar las opciones",
    );
  }

  const creada = await run<Survey>(
    supabase.from("vw_surveys").select("*").eq("id", survey.id).single(),
    "leer la encuesta creada",
  );
  return creada;
}

export async function setSurveyActiveRow(
  id: string,
  active: boolean,
): Promise<void> {
  if (!supabase) return;
  await exec(
    supabase.from("surveys").update({ active }).eq("id", id),
    "actualizar la encuesta",
  );
}

export async function deleteSurveyRow(id: string): Promise<void> {
  if (!supabase) return;
  await exec(
    supabase.from("surveys").delete().eq("id", id),
    "eliminar la encuesta",
  );
}

/**
 * Guarda la respuesta de un estudiante a una encuesta.
 * Si ya existía, se reemplazan sus opciones (una respuesta = muchas comidas).
 */
export async function saveResponseRow(
  response: SurveyResponse,
  isNew: boolean,
): Promise<void> {
  if (!supabase) return;

  if (isNew) {
    await exec(
      supabase.from("survey_responses").insert({
        id: response.id,
        survey_id: response.surveyId,
        student_id: response.studentId,
        student_name: response.studentName,
        created_at: response.createdAt,
        updated_at: response.updatedAt,
      }),
      "guardar tu respuesta",
    );
  } else {
    await exec(
      supabase
        .from("survey_responses")
        .update({ student_name: response.studentName })
        .eq("id", response.id),
      "actualizar tu respuesta",
    );
    await exec(
      supabase
        .from("survey_response_options")
        .delete()
        .eq("response_id", response.id),
      "actualizar tu respuesta",
    );
  }

  const filas = response.optionIds
    .map((optionId) => Number(optionId))
    .filter((n) => Number.isFinite(n))
    .map((option_id) => ({ response_id: response.id, option_id }));

  if (filas.length > 0) {
    await exec(
      supabase.from("survey_response_options").insert(filas),
      "guardar tus opciones",
    );
  }
}
