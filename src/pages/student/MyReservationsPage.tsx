import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  CalendarDays,
  Clock,
  QrCode,
  TicketCheck,
  XCircle,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/context/ToastContext";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, statusBadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmModal, InfoRow, Modal } from "@/components/ui/Modal";
import { formatLong, formatShort } from "@/utils/dates";
import type { Reservation } from "@/types";

type Tab = "activas" | "historial";

export function MyReservationsPage() {
  const { session, reservations, cancelReservation } = useApp();
  const { push } = useToast();

  const [tab, setTab] = useState<Tab>("activas");
  const [qrReservation, setQrReservation] = useState<Reservation | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);

  const mine = useMemo(
    () =>
      reservations
        .filter((r) => r.studentId === (session?.studentId ?? ""))
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [reservations, session?.studentId],
  );

  const actives = mine.filter((r) => r.status === "Activa");
  const history = mine.filter((r) => r.status !== "Activa");

  const handleCancel = () => {
    if (!cancelTarget) return;
    const result = cancelReservation(cancelTarget.id);
    if (result.ok) push("success", result.message);
    else push("error", result.message);
    setCancelTarget(null);
  };

  const list = tab === "activas" ? actives : history;

  return (
    <div>
      <PageHeader
        title="Mis reservas"
        subtitle="Consulta tus reservas activas, presenta tu QR y cancela si ya no asistirás."
      />

      {/* Pestañas */}
      <div className="mb-6 inline-flex rounded-xl border border-line bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setTab("activas")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === "activas"
              ? "bg-primary text-white shadow-sm"
              : "text-muted hover:text-ink"
          }`}
        >
          Activas ({actives.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("historial")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === "historial"
              ? "bg-primary text-white shadow-sm"
              : "text-muted hover:text-ink"
          }`}
        >
          Historial ({history.length})
        </button>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={tab === "activas" ? TicketCheck : CalendarDays}
          title={
            tab === "activas"
              ? "No tienes reservas activas."
              : "No hay historial de reservas."
          }
          description={
            tab === "activas"
              ? "Reserva tu servicio del día en la sección «Reservar» y tu cupo aparecerá aquí."
              : "Las reservas utilizadas o canceladas aparecerán en este espacio."
          }
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {list.map((res) => (
            <article key={res.id} className="card flex flex-col p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-bold text-primary">
                  {res.mealName}
                </h3>
                <Badge variant={statusBadgeVariant(res.status)} dot>
                  {res.status}
                </Badge>
              </div>

              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-ink">
                  <CalendarDays size={15} className="text-muted" />
                  {formatLong(res.date)}
                </div>
                <div className="flex items-center gap-2 text-ink">
                  <Clock size={15} className="text-muted" />
                  {res.time}
                </div>
                <div className="flex items-center gap-2 text-ink">
                  <TicketCheck size={15} className="text-muted" />
                  <span className="font-mono font-semibold">{res.id}</span>
                  <Badge variant={res.studentType === "Becario" ? "primary" : "info"}>
                    {res.studentType}
                  </Badge>
                </div>
              </dl>

              <div className="mt-5 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  icon={<QrCode size={16} />}
                  onClick={() => setQrReservation(res)}
                >
                  Ver QR
                </Button>
                {res.status === "Activa" && (
                  <Button
                    variant="danger"
                    size="sm"
                    fullWidth
                    icon={<XCircle size={16} />}
                    onClick={() => setCancelTarget(res)}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal de QR */}
      <Modal
        open={qrReservation !== null}
        onClose={() => setQrReservation(null)}
        title="Código QR de la reserva"
        description="Presenta este código al ingresar al comedor."
        size="sm"
        footer={
          <Button variant="primary" onClick={() => setQrReservation(null)}>
            Cerrar
          </Button>
        }
      >
        {qrReservation && (
          <div className="flex flex-col items-center text-center">
            <div className="rounded-2xl bg-white p-4 ring-1 ring-line">
              <QRCodeSVG
                value={qrReservation.qrCode}
                size={208}
                level="M"
                bgColor="#FFFFFF"
                fgColor="#123B6D"
              />
            </div>

            <p className="mt-4 font-mono text-lg font-bold text-primary">
              {qrReservation.id}
            </p>

            <div className="mt-3 w-full rounded-xl bg-surface/70 px-3 py-2 text-left ring-1 ring-line">
              <InfoRow label="Estudiante" value={qrReservation.studentName} />
              <InfoRow label="Servicio" value={qrReservation.mealName} />
              <InfoRow label="Fecha" value={formatShort(qrReservation.date)} />
              <InfoRow label="Horario" value={qrReservation.time} />
            </div>

            <p className="mt-3 text-xs text-muted">
              QR simulado · Personal e intransferible · Válido solo para la fecha
              indicada.
            </p>
          </div>
        )}
      </Modal>

      {/* Confirmación de cancelación */}
      <ConfirmModal
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        title="Cancelar reserva"
        question="¿Estás seguro de cancelar esta reserva?"
        confirmLabel="Sí, cancelar reserva"
        cancelLabel="No, mantenerla"
        tone="danger"
      >
        {cancelTarget && (
          <div className="rounded-xl bg-surface/70 px-3 py-2 ring-1 ring-line">
            <InfoRow label="Servicio" value={cancelTarget.mealName} />
            <InfoRow label="Fecha" value={formatShort(cancelTarget.date)} />
            <InfoRow label="Horario" value={cancelTarget.time} />
            <InfoRow label="Código" value={cancelTarget.id} />
          </div>
        )}
        <p className="mt-3 text-sm text-muted">
          El cupo será liberado inmediatamente para otros estudiantes.
        </p>
      </ConfirmModal>
    </div>
  );
}
