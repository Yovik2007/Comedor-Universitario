import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleX,
  History,
  LogOut,
  ScanLine,
  TicketX,
  UtensilsCrossed,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";
import { Badge, statusBadgeVariant } from "@/components/ui/Badge";
import { Field, inputCls } from "@/components/ui/Field";
import { InfoRow } from "@/components/ui/Modal";
import { formatLong } from "@/utils/dates";
import { formatClock } from "@/utils/text";
import { BRAND } from "@/data/brand";
import type { ValidationResultKind } from "@/types";

interface HistoryItem {
  code: string;
  kind: ValidationResultKind;
  label: string;
  time: string;
}

const toneStyles = {
  valid: "border-success/40 bg-success-50 text-success-700",
  used: "border-warning/40 bg-warning-50 text-warning-700",
  canceled: "border-danger/40 bg-danger-50 text-danger-700",
  not_found: "border-danger/40 bg-danger-50 text-danger-700",
  empty: "border-line bg-surface text-muted",
} as const;

export function KioskPage() {
  const { session, reservations, validateCode, markUsed, logout } = useApp();
  const { push } = useToast();
  const navigate = useNavigate();

  const [code, setCode] = useState("");
  const [result, setResult] = useState<{
    kind: ValidationResultKind;
    reservationId?: string;
    message: string;
  } | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const activeReservations = reservations.filter((r) => r.status === "Activa");
  const reservation = result?.reservationId
    ? reservations.find((r) => r.id === result.reservationId)
    : undefined;

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const validate = (rawCode: string) => {
    const outcome = validateCode(rawCode);

    if (outcome.kind === "empty") {
      push("error", outcome.message);
      return;
    }

    if (outcome.kind === "valid" && outcome.reservation) {
      const markResult = markUsed(outcome.reservation.id);
      if (markResult.ok) {
        push("success", `Acceso concedido a ${outcome.reservation.studentName}.`);
      } else {
        push("error", markResult.message);
      }
      setResult({
        kind: "valid",
        reservationId: outcome.reservation.id,
        message: "Reserva válida. Acceso permitido.",
      });
    } else {
      setResult({
        kind: outcome.kind,
        reservationId: outcome.reservation?.id,
        message: outcome.message,
      });
      if (outcome.kind === "not_found" || outcome.kind === "canceled") {
        push("error", outcome.message);
      }
    }

    setHistory((prev) =>
      [
        {
          code: rawCode.trim().toUpperCase(),
          kind: outcome.kind,
          label:
            outcome.kind === "valid"
              ? "Acceso concedido"
              : outcome.kind === "used"
                ? "Ya utilizada"
                : outcome.kind === "canceled"
                  ? "Cancelada"
                  : "No encontrada",
          time: new Date().toLocaleTimeString("es-PE", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
        ...prev,
      ].slice(0, 5),
    );

    setCode("");
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-primary-700 via-primary to-secondary">
      {/* Barra superior */}
      <header className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3 text-white">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-accent">
            <UtensilsCrossed size={20} />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold">{BRAND.name}</p>
            <p className="text-xs text-white/60">Módulo de kiosco</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link to={session?.role === "admin" ? "/admin" : "/login"}>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/15 hover:text-white"
              icon={<ArrowLeft size={15} />}
            >
              <span className="hidden sm:inline">Volver</span>
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/15 hover:text-white"
            onClick={handleLogout}
            icon={<LogOut size={15} />}
          >
            <span className="hidden sm:inline">Salir</span>
          </Button>
        </div>
      </header>

      {/* Panel central */}
      <main className="flex flex-1 items-start justify-center px-4 pb-10 sm:px-6">
        <div className="w-full max-w-xl">
          <div className="card p-6 sm:p-8">
            <div className="text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary">
                <ScanLine size={26} />
              </span>
              <h1 className="mt-4 text-2xl font-bold text-primary">
                Kiosco de validación
              </h1>
              <p className="mt-1 text-sm text-muted">
                Ingresa el código de la reserva para habilitar el acceso.
              </p>
            </div>

            <form
              className="mt-6 flex flex-col gap-3 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                validate(code);
              }}
            >
              <div className="flex-1">
                <Field label="Código de reserva" htmlFor="kiosk-code">
                  <input
                    id="kiosk-code"
                    type="text"
                    className={`${inputCls} text-center font-mono text-base uppercase tracking-widest`}
                    placeholder="RES-00045"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    autoFocus
                  />
                </Field>
              </div>
              <div className="flex items-end">
                <Button type="submit" size="lg" fullWidth className="sm:w-auto">
                  Validar reserva
                </Button>
              </div>
            </form>

            {/* Resultado */}
            {result ? (
              <div
                className={`mt-5 rounded-xl border px-5 py-4 animate-fade-up ${toneStyles[result.kind]}`}
              >
                <div className="flex items-center gap-3">
                  {result.kind === "valid" && <CheckCircle2 size={30} />}
                  {result.kind === "used" && <AlertTriangle size={30} />}
                  {result.kind === "canceled" && <TicketX size={30} />}
                  {result.kind === "not_found" && <CircleX size={30} />}
                  <p className="text-lg font-bold">
                    {result.kind === "valid"
                      ? "✓ RESERVA VÁLIDA"
                      : result.kind === "used"
                        ? "⚠ Reserva ya utilizada."
                        : result.kind === "canceled"
                          ? "✕ Reserva cancelada."
                          : "✕ Reserva no encontrada."}
                  </p>
                </div>

                {reservation && (
                  <div className="mt-3 rounded-xl bg-white/70 px-3 py-2 ring-1 ring-black/5">
                    <InfoRow label="Estudiante" value={reservation.studentName} />
                    <InfoRow label="Servicio" value={reservation.mealName} />
                    <InfoRow label="Fecha" value={formatLong(reservation.date)} />
                    <InfoRow label="Horario" value={reservation.time} />
                    {reservation.usedAt && (
                      <InfoRow
                        label="Validada a las"
                        value={formatClock(reservation.usedAt)}
                      />
                    )}
                    <InfoRow
                      label="Estado"
                      value={
                        <Badge variant={statusBadgeVariant(reservation.status)} dot>
                          {reservation.status}
                        </Badge>
                      }
                    />
                  </div>
                )}

                <p className="mt-3 text-sm font-semibold">
                  {result.kind === "valid"
                    ? "Estado: Acceso permitido"
                    : result.message}
                </p>
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-surface/60 px-5 py-6 text-center text-sm text-muted">
                Esperando código de reserva…
              </div>
            )}

            {/* Códigos para la demostración */}
            <div className="mt-5 rounded-xl bg-surface/70 px-4 py-3.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Reservas activas para probar
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {activeReservations.length === 0 ? (
                  <p className="text-sm text-muted">
                    No hay reservas activas disponibles.
                  </p>
                ) : (
                  activeReservations.slice(0, 6).map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => validate(r.id)}
                      className="rounded-lg bg-white px-2.5 py-1.5 font-mono text-xs font-semibold text-primary ring-1 ring-line transition hover:bg-secondary-50 hover:text-secondary"
                    >
                      {r.id}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Historial de la sesión */}
          {history.length > 0 && (
            <div className="card mt-4 p-5">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
                <History size={15} className="text-muted" />
                Últimas validaciones
              </p>
              <ul className="space-y-2">
                {history.map((item, index) => (
                  <li
                    key={`${item.code}-${index}`}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="font-mono font-semibold text-primary">
                      {item.code}
                    </span>
                    <span className="truncate text-muted">{item.label}</span>
                    <span className="shrink-0 text-xs text-muted">
                      {item.time}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>

      <footer className="pb-6 text-center text-xs text-white/60">
        {BRAND.name} · Kiosco de demostración
      </footer>
    </div>
  );
}
