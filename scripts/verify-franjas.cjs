/**
 * Verificación de la lógica de franjas, ventana de gracia y liberación.
 * Compila los módulos REALES del proyecto con esbuild y los ejecuta en Node.
 *
 * Uso: node scripts/verify-franjas.cjs
 */
const path = require("path");
const os = require("os");
const fs = require("fs");

const root = path.resolve(__dirname, "..");
const esbuild = require(path.join(root, "node_modules", "esbuild"));

const entry = path.join(__dirname, "__verify-entry.ts");
const out = path.join(os.tmpdir(), "verify-franjas.bundle.cjs");

entryWrite();

function entryWrite() {
  fs.writeFileSync(
    entry,
    `
import { buildSlots, slotLimit, computeMealStats, effectiveStatus, expiresAtISO, slotOccupancy, validateReservationCode, blockingReservation, slotIsPast, slotNotYetOpen, slotOpenTime, slotOpensAt, bookableSlots, SLOT_MINUTES, GRACE_MINUTES, LEAD_MINUTES } from "@/utils/reservationUtils";
import { minutesToTime, timeToMinutes } from "@/utils/dates";
import type { Meal, Reservation } from "@/types";

let failures = 0;
const check = (name: string, got: unknown, want: unknown) => {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  const ok = g === w;
  if (!ok) failures += 1;
  console.log((ok ? "  OK   " : "  FAIL ") + name + (ok ? "  => " + g : "  => got " + g + ", want " + w));
};

const meal = (over: Partial<Meal> = {}): Meal => ({
  id: "almuerzo",
  nombre: "Almuerzo",
  horario: "12:00 PM - 2:30 PM",
  inicio: "12:00",
  fin: "14:30",
  total: 3000,
  becarios: 1637,
  habilitado: true,
  ...over,
});

const res = (over: Partial<Reservation> = {}): Reservation => ({
  id: "RES-00001",
  studentId: "EST001",
  studentName: "Ana",
  studentType: "Becario",
  mealId: "almuerzo",
  mealName: "Almuerzo",
  date: "2026-10-20",
  time: "12:00 – 12:30",
  status: "Activa",
  qrCode: "{}",
  createdAt: "2026-10-20T08:00:00.000Z",
  ...over,
});

console.log("\\n1) Franjas de 30 minutos");
const almuerzo = meal();
const slots = buildSlots(almuerzo);
check("cantidad de franjas del almuerzo (12:00-14:30)", slots.length, 5);
check("etiquetas", slots.map((s) => s.label), ["12:00 – 12:30", "12:30 – 13:00", "13:00 – 13:30", "13:30 – 14:00", "14:00 – 14:30"]);
check("limite por franja = ceil(3000/5)", slots[0].limit, 600);
check("desayuno 07:00-09:00 = 4 franjas", buildSlots(meal({ id: "desayuno", inicio: "07:00", fin: "09:00", total: 1000, becarios: 546 })).length, 4);
check("cena 18:00-20:00 = 4 franjas", buildSlots(meal({ id: "cena", inicio: "18:00", fin: "20:00", total: 1500, becarios: 818 })).length, 4);
check("SLOT_MINUTES", SLOT_MINUTES, 30);
check("GRACE_MINUTES", GRACE_MINUTES, 30);
check("minutesToTime(750)", minutesToTime(750), "12:30");
check("timeToMinutes('14:30')", timeToMinutes("14:30"), 870);

console.log("\\n2) Vencimiento (ventana de gracia)");
const exp = expiresAtISO("2026-10-20", "12:00");
const expDate = new Date(exp);
check("vence 30 min despues del inicio de franja", expDate.getUTCHours() - 5 === 12 && expDate.getUTCMinutes() === 30 ? "12:30 hora local" : exp.toISOString(), "12:30 hora local");

const antes = new Date("2026-10-20T16:55:00.000Z"); // 11:55 local
const despues = new Date("2026-10-20T17:35:00.000Z"); // 12:35 local
const r = res({ slotStart: "12:00", expiresAt: exp });
check("antes de la hora limite sigue Activa", effectiveStatus(r, antes), "Activa");
check("despues de la hora limite pasa a Vencida", effectiveStatus(r, despues), "Vencida");
check("una reserva Utilizada nunca vence", effectiveStatus(res({ status: "Utilizada", expiresAt: "2000-01-01T00:00:00Z" }), despues), "Utilizada");
check("una reserva sin expires_at no vence", effectiveStatus(res({}), despues), "Activa");

console.log("\\n3) Liberacion automatica del cupo de becario");
// 1100 becarios usaron, 537 vencieron, 800 libres activos
const list: Reservation[] = [];
for (let i = 0; i < 1100; i++) list.push(res({ id: "U" + i, status: "Utilizada" }));
for (let i = 0; i < 537; i++) list.push(res({ id: "V" + i, studentId: "B" + i, expiresAt: "2026-10-20T17:30:00.000Z" }));
for (let i = 0; i < 800; i++) list.push(res({ id: "L" + i, studentId: "L" + i, studentType: "Libre", expiresAt: "2026-10-20T20:00:00.000Z" }));

const now = new Date("2026-10-20T17:40:00.000Z"); // 12:40 local -> paso la gracia
const stats = computeMealStats(almuerzo, list, "2026-10-20", now);
check("resBecarios", stats.resBecarios, 1100);
check("resLibres", stats.resLibres, 800);
check("resTotal", stats.resTotal, 1900);
check("vencidas", stats.vencidas, 537);
check("becariosLiberados", stats.becariosLiberados, 537);
check("dispBecarios = 1637 - 1100 - 537", stats.dispBecarios, 0);
check("dispLibres = 1363 - 800 + 537", stats.dispLibres, 1100);
check("dispTotal = dispBecarios + dispLibres", stats.dispTotal, 1100);
check("sin vencidas: dispTotal = 3000 - 1900", computeMealStats(almuerzo, list.filter((x) => !x.expiresAt?.startsWith("2026-10-20T17:30")), "2026-10-20", now).dispTotal, 1100);

console.log("\\n4) Ocupacion por franja");
const occ = slotOccupancy(almuerzo, [
  res({ slotStart: "12:00" }),
  res({ slotStart: "12:00" }),
  res({ slotStart: "14:00" }),
  res({ slotStart: "12:00", status: "Cancelada" }),
  res({ slotStart: "13:00", expiresAt: "2026-10-20T17:35:00.000Z" }), // vencida -> no cuenta
], "2026-10-20", now);
check("ocupacion 12:00", occ["12:00"], 2);
check("ocupacion 14:00", occ["14:00"], 1);
check("cancelada no ocupa", occ["12:30"], 0);
check("vencida no ocupa", occ["13:00"], 0);

console.log("\\n5) Validacion de codigo en kiosco");
const cv = validateReservationCode("RES-00001", [res({ slotStart: "12:00", expiresAt: "2026-10-20T17:30:00.000Z" })], despues);
check("codigo vencido detectado", cv.kind, "expired");
const cvOk = validateReservationCode("RES-00001", [res({ slotStart: "12:00", expiresAt: "2026-10-20T17:30:00.000Z" })], antes);
check("codigo vigente aceptado", cvOk.kind, "valid");
const cvUsed = validateReservationCode("RES-00001", [res({ status: "Utilizada" })], despues);
check("codigo ya usado", cvUsed.kind, "used");

console.log("\\n6) Opcion A: un solo intento por servicio y fecha");
const buscar = (lista: Reservation[]) =>
  blockingReservation(lista, "EST001", "almuerzo", "2026-10-20");
check("sin reservas previas -> puede reservar", buscar([]), undefined);
check("Activa bloquea", buscar([res({ status: "Activa" })])?.status, "Activa");
check("Utilizada bloquea", buscar([res({ status: "Utilizada" })])?.status, "Utilizada");
check("Cancelada NO bloquea", buscar([res({ status: "Cancelada" })]), undefined);
check("Vencida bloquea", buscar([res({ status: "Vencida" })])?.status, "Vencida");
check(
  "Activa ya vencida por tiempo tambien bloquea",
  buscar([res({ expiresAt: "2026-10-20T17:30:00.000Z" })])?.id,
  "RES-00001",
);
check(
  "otro servicio no bloquea",
  blockingReservation([res({ status: "Activa" })], "EST001", "cena", "2026-10-20"),
  undefined,
);
check(
  "otro dia no bloquea",
  blockingReservation([res({ status: "Activa" })], "EST001", "almuerzo", "2026-10-21"),
  undefined,
);
check(
  "otro estudiante no bloquea",
  blockingReservation([res({ status: "Activa" })], "EST099", "almuerzo", "2026-10-20"),
  undefined,
);

console.log("\\n7) Franjas pasadas no se pueden reservar");
check(
  "franja de 07:00 con gracia hasta 07:30, a las 18:31 -> pasada",
  slotIsPast("2026-10-20", "07:00", new Date("2026-10-20T23:31:00.000Z")),
  true,
);
check(
  "franja de 19:00 a las 18:31 -> todavia se puede",
  slotIsPast("2026-10-20", "19:00", new Date("2026-10-20T23:31:00.000Z")),
  false,
);
check(
  "en el limite exacto (gracia vencida) -> pasada",
  slotIsPast("2026-10-20", "12:00", new Date("2026-10-20T17:30:00.000Z")),
  true,
);
check(
  "1 segundo antes del limite -> todavia no",
  slotIsPast("2026-10-20", "12:00", new Date("2026-10-20T17:29:59.000Z")),
  false,
);
const cena = meal({ id: "cena", inicio: "18:00", fin: "20:00", total: 1500, becarios: 818 });
const ahora = new Date("2026-10-20T23:31:00.000Z"); // 18:31 local
check(
  "cena a las 18:31 -> abiertas 18:30 y 19:00 (la de 19:30 abre 19:00)",
  bookableSlots(cena, "2026-10-20", ahora).map((s) => s.start),
  ["18:30", "19:00"],
);
check(
  "desayuno por la noche -> ninguna franja reservable",
  bookableSlots(meal({ id: "desayuno", inicio: "07:00", fin: "09:00", total: 1000, becarios: 546 }), "2026-10-20", ahora).length,
  0,
);

console.log("\\n8) Ventana de apertura automatica (30 min antes)");
check("LEAD_MINUTES", LEAD_MINUTES, 30);
check("apertura de la franja 12:00", slotOpenTime("12:00"), "11:30");
check("apertura de la franja 12:30", slotOpenTime("12:30"), "12:00");
check("apertura de la franja 14:00", slotOpenTime("14:00"), "13:30");
check(
  "11:29:59 -> la franja 12:00 todavia no abre",
  slotNotYetOpen("2026-10-20", "12:00", new Date("2026-10-20T11:29:59")),
  true,
);
check(
  "11:30:00 exacto -> la franja 12:00 ya abre",
  slotNotYetOpen("2026-10-20", "12:00", new Date("2026-10-20T11:30:00")),
  false,
);
check(
  "slotOpensAt devuelve 11:30 local",
  (() => { const d = slotOpensAt("2026-10-20", "12:00");
    return d.getHours() * 60 + d.getMinutes(); })(),
  690,
);
const alm = meal({ id: "almuerzo", inicio: "12:00", fin: "14:30", total: 3000, becarios: 1637 });
check(
  "a las 11:00 ninguna franja del almuerzo se puede reservar",
  bookableSlots(alm, "2026-10-20", new Date("2026-10-20T11:00:00")).length,
  0,
);
check(
  "a las 11:40 solo abrio la de 12:00",
  bookableSlots(alm, "2026-10-20", new Date("2026-10-20T11:40:00")).map((s) => s.start),
  ["12:00"],
);
check(
  "a las 12:10 ya abrieron 12:00 y 12:30",
  bookableSlots(alm, "2026-10-20", new Date("2026-10-20T12:10:00")).map((s) => s.start),
  ["12:00", "12:30"],
);
check(
  "a las 12:40 la de 12:00 vencio pero ya abrio la de 13:00",
  bookableSlots(alm, "2026-10-20", new Date("2026-10-20T12:40:00")).map((s) => s.start),
  ["12:30", "13:00"],
);
check(
  "a las 13:55 solo 13:30 y 14:00 estan vigentes (las demas ya vencieron)",
  bookableSlots(alm, "2026-10-20", new Date("2026-10-20T13:55:00")).map((s) => s.start),
  ["13:30", "14:00"],
);

console.log("");
console.log(failures === 0 ? "TODO OK" : failures + " VERIFICACIONES FALLARON");
process.exit(failures === 0 ? 0 : 1);
`,
  );
}

esbuild
  .build({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: out,
    alias: { "@": path.join(root, "src") },
    logLevel: "silent",
  })
  .then(() => {
    const { spawnSync } = require("child_process");
    const r = spawnSync(process.execPath, [out], { stdio: "inherit" });
    try { fs.unlinkSync(entry); } catch {}
    process.exit(r.status ?? 1);
  })
  .catch((e) => {
    console.error(e);
    try { fs.unlinkSync(entry); } catch {}
    process.exit(1);
  });
