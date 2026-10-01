import { useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck,
  CheckCircle2,
  CircleX,
  ScanLine,
  TicketX,
  AlertTriangle,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/context/ToastContext";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, statusBadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, inputCls } from "@/components/ui/Field";
import { InfoRow } from "@/components/ui/Modal";
import { formatLong } from "@/utils/dates";
import { formatClock } from "@/utils/text";
import { validateReservationCode } from "@/utils/reservationUtils";
import type { Reservation, ValidationOutcome } from "@/types";

export function ValidationPage() {
  const { reservations, markUsed } = useApp();
  const { push } = useToast();

  const [code, setCode] = useState("");
  // Solo se guarda el código consultado: el resultado se recalcula en cada
  // render para que siempre refleje el estado real de la reserva.
  const [checkedCode, setCheckedCode] = useState<string | null>(null);

  const outcome: ValidationOutcome | null =
    checkedCode === null ? null : validateReservationCode(checkedCode, reservations);

  const activeToday = reservations.filter((r) => r.status === "Activa").slice(0, 6);

  const handleValidate = (value?: string) => {
    const toCheck = (value ?? code).trim();

    if (!toCheck) {
      push("error", "Ingresa un código de reserva.");
      setCheckedCode(null);
      return;
    }

    if (value !== undefined) setCode(value);
    setCheckedCode(toCheck);
  };

  const handleMarkUsed = () => {
    const reservationId = outcome?.reservation?.id;
    if (!reservationId) return;

    const result = markUsed(reservationId);
    if (result.ok) push("success", result.message);
    else push("error", result.message);
  };

  const handleReset = () => {
    setCode("");
    setCheckedCode(null);
  };

  return (
    <div>
      <PageHeader
        title="Validación de reservas"
        subtitle="Ingresa el código de una reserva para verificar su estado antes de permitir el acceso."
        actions={
          <Link to="/kiosco">
            <Button variant="outline" icon={<ScanLine size={16} />}>
              Abrir kiosco
            </Button>
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Formulario */}
        <section className="card p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary">
              <BadgeCheck size={19} />
            </span>
            <div>
              <h2 className="text-base font-bold text-ink">Verificar código</h2>
              <p className="text-sm text-muted">
                Ejemplo: {activeToday[0]?.id ?? "RES-00001"}
              </p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleValidate();
            }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <div className="flex-1">
              <Field label="Código de reserva" htmlFor="code">
                <input
                  id="code"
                  type="text"
                  className={`${inputCls} font-mono uppercase tracking-wide`}
                  placeholder="RES-00045"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </Field>
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit">Validar reserva</Button>
              {outcome && (
                <Button variant="outline" onClick={handleReset} type="button">
                  Limpiar
                </Button>
              )}
            </div>
          </form>

          {/* Códigos de demostración */}
          <div className="mt-5 rounded-xl bg-surface/70 px-4 py-3.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Reservas activas para probar
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {activeToday.length === 0 ? (
                <p className="text-sm text-muted">
                  No hay reservas activas en este momento.
                </p>
              ) : (
                activeToday.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleValidate(r.id)}
                    className="rounded-lg bg-white px-2.5 py-1.5 font-mono text-xs font-semibold text-primary ring-1 ring-line transition hover:bg-secondary-50 hover:text-secondary"
                  >
                    {r.id}
                  </button>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Resultado */}
        <section className="card p-6">
          <h2 className="mb-4 text-base font-bold text-ink">Resultado</h2>

          {!outcome || outcome.kind === "empty" ? (
            <div className="flex h-full min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-surface/50 px-6 py-8 text-center">
              <ScanLine size={30} className="text-muted" />
              <p className="mt-3 font-semibold text-ink">Esperando un código</p>
              <p className="mt-1 text-sm text-muted">
                Ingresa un código de reserva para ver el resultado de la
                validación.
              </p>
            </div>
          ) : (
            <ValidationResult outcome={outcome} onMarkUsed={handleMarkUsed} />
          )}
        </section>
      </div>
    </div>
  );
}

/* -----------------------------------------------------------
   Panel de resultado
   ----------------------------------------------------------- */

function ValidationResult({
  outcome,
  onMarkUsed,
}: {
  outcome: ValidationOutcome;
  onMarkUsed: () => void;
}) {
  if (outcome.kind === "not_found") {
    return (
      <ResultPanel tone="danger" icon={<CircleX size={34} />} title="✕ Reserva no encontrada.">
        Verifica que el código sea correcto e inténtalo nuevamente.
      </ResultPanel>
    );
  }

  const reservation = outcome.reservation!;

  if (outcome.kind === "used") {
    return (
      <ResultPanel tone="warning" icon={<AlertTriangle size={34} />} title="⚠ Reserva ya utilizada.">
        <Details reservation={reservation} />
        <p className="mt-3 text-sm font-medium text-warning-700">
          Validada a las {formatClock(reservation.usedAt) || "hora desconocida"}.
        </p>
      </ResultPanel>
    );
  }

  if (outcome.kind === "canceled") {
    return (
      <ResultPanel tone="danger" icon={<TicketX size={34} />} title="✕ Reserva cancelada.">
        <Details reservation={reservation} />
        <p className="mt-3 text-sm font-medium text-danger-700">
          El estudiante canceló esta reserva; no se permite el acceso.
        </p>
      </ResultPanel>
    );
  }

  return (
    <ResultPanel
      tone="success"
      icon={<CheckCircle2 size={34} />}
      title="✓ RESERVA VÁLIDA"
      footer={
        <Button variant="success" fullWidth onClick={onMarkUsed}>
          Marcar como utilizada
        </Button>
      }
    >
      <Details reservation={reservation} />
      <p className="mt-3 text-sm font-medium text-success-700">
        Estado: Acceso permitido
      </p>
    </ResultPanel>
  );
}

function Details({ reservation }: { reservation: Reservation }) {
  return (
    <div className="mt-3 rounded-xl bg-surface/70 px-3 py-2 ring-1 ring-line">
      <InfoRow label="Estudiante" value={reservation.studentName} />
      <InfoRow label="Servicio" value={reservation.mealName} />
      <InfoRow label="Fecha" value={formatLong(reservation.date)} />
      <InfoRow
        label="Estado"
        value={
          <Badge variant={statusBadgeVariant(reservation.status)} dot>
            {reservation.status}
          </Badge>
        }
      />
    </div>
  );
}

function ResultPanel({
  tone,
  icon,
  title,
  children,
  footer,
}: {
  tone: "success" | "danger" | "warning";
  icon: ReactNode;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const styles = {
    success: "border-success/30 bg-success-50 text-success-700",
    danger: "border-danger/30 bg-danger-50 text-danger-700",
    warning: "border-warning/30 bg-warning-50 text-warning-700",
  } as const;

  return (
    <div className={`rounded-xl border px-5 py-4 ${styles[tone]} animate-fade-up`}>
      <div className="flex items-center gap-3">
        {icon}
        <p className="text-lg font-bold">{title}</p>
      </div>
      <div className="mt-3 text-sm text-ink">{children}</div>
      {footer && <div className="mt-4">{footer}</div>}
    </div>
  );
}
