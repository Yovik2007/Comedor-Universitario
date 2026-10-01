import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Info,
  Lock,
  TicketCheck,
  Utensils,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/context/ToastContext";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmModal, InfoRow } from "@/components/ui/Modal";
import { formatShort, todayISO } from "@/utils/dates";
import { availableForType } from "@/utils/reservationUtils";
import type { MealStats } from "@/utils/reservationUtils";
import type { Meal, ReservationStatus, StudentType } from "@/types";

export function ReservePage() {
  const { currentStudent, meals, reservations, settings, reserve, getMealStats } =
    useApp();
  const { push } = useToast();

  const [confirmMeal, setConfirmMeal] = useState<Meal | null>(null);
  const today = todayISO();

  const handleConfirm = () => {
    if (!confirmMeal) return;
    const result = reserve(confirmMeal.id);
    if (result.ok) push("success", result.message);
    else push("error", result.message);
    setConfirmMeal(null);
  };

  if (!currentStudent) {
    return (
      <EmptyState
        title="Perfil no encontrado"
        description="Tu perfil de estudiante ya no está disponible. Cierra sesión y vuelve a ingresar."
      />
    );
  }

  const reservationsOpen = settings.reservasHabilitadas;
  const confirmStats = confirmMeal ? getMealStats(confirmMeal.id) : null;

  return (
    <div>
      <PageHeader
        title="Reserva tu alimentación"
        subtitle="Elige el servicio del día, verifica los cupos disponibles y confirma tu reserva."
      />

      {!reservationsOpen && (
        <div
          role="status"
          className="mb-6 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-50 px-4 py-3.5 text-sm font-medium text-warning-700"
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          Las reservas se encuentran temporalmente cerradas. Contacta con el
          administrador del comedor.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {meals.map((meal) => {
          const stats = getMealStats(meal.id);
          const myReservation = reservations.find(
            (r) =>
              r.studentId === currentStudent.id &&
              r.mealId === meal.id &&
              r.date === today &&
              r.status !== "Cancelada",
          );

          return (
            <MealCard
              key={meal.id}
              mealName={meal.nombre}
              horario={meal.horario}
              stats={stats}
              remaining={availableForType(stats, currentStudent.tipo)}
              tipoEstudiante={currentStudent.tipo}
              myStatus={myReservation?.status ?? null}
              reservationsOpen={reservationsOpen && meal.habilitado}
              onReserve={() => setConfirmMeal(meal)}
            />
          );
        })}
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-xl bg-white px-4 py-3.5 text-sm text-muted ring-1 ring-line">
        <Info size={17} className="mt-0.5 shrink-0 text-secondary" />
        <p>
          Cada estudiante puede mantener <strong>una sola reserva por servicio y
          fecha</strong>. Al cancelar, el cupo se libera automáticamente para
          otros compañeros.
        </p>
      </div>

      <ConfirmModal
        open={confirmMeal !== null}
        onClose={() => setConfirmMeal(null)}
        onConfirm={handleConfirm}
        title="Confirmar reserva"
        question="¿Deseas confirmar esta reserva?"
        confirmLabel="Confirmar reserva"
        tone="primary"
      >
        {confirmMeal && confirmStats && (
          <div className="rounded-xl bg-surface/70 px-3 py-2 ring-1 ring-line">
            <InfoRow label="Servicio" value={confirmMeal.nombre} />
            <InfoRow label="Fecha" value={formatShort(today)} />
            <InfoRow label="Horario" value={confirmMeal.horario} />
            <InfoRow label="Tipo de estudiante" value={currentStudent.tipo} />
            <InfoRow
              label="Cupos disponibles"
              value={`${availableForType(confirmStats, currentStudent.tipo)} para tu tipo`}
            />
          </div>
        )}
      </ConfirmModal>
    </div>
  );
}

/* -----------------------------------------------------------
   Tarjeta de cada servicio
   ----------------------------------------------------------- */

interface MealCardProps {
  mealName: string;
  horario: string;
  stats: MealStats;
  remaining: number;
  tipoEstudiante: StudentType;
  /** Estado de la reserva del estudiante para este servicio hoy (si existe). */
  myStatus: ReservationStatus | null;
  reservationsOpen: boolean;
  onReserve: () => void;
}

function MealCard({
  mealName,
  horario,
  stats,
  remaining,
  tipoEstudiante,
  myStatus,
  reservationsOpen,
  onReserve,
}: MealCardProps) {
  const reservedByMe = myStatus !== null;
  const soldOut = remaining <= 0 && !reservedByMe;

  return (
    <div className="card flex flex-col p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary">
            <Utensils size={20} />
          </span>
          <div>
            <h3 className="text-xl font-bold text-primary">{mealName}</h3>
            <p className="flex items-center gap-1.5 text-sm text-muted">
              <Clock size={14} />
              {horario}
            </p>
          </div>
        </div>

        {reservedByMe ? (
          <Badge variant={myStatus === "Activa" ? "success" : "info"} dot>
            {myStatus === "Activa" ? "Reservado" : "Utilizado"}
          </Badge>
        ) : !reservationsOpen ? (
          <Badge variant="warning">Cerrado</Badge>
        ) : soldOut ? (
          <Badge variant="danger" dot>
            Agotado
          </Badge>
        ) : (
          <Badge variant="success" dot>
            Disponible
          </Badge>
        )}
      </div>

      {/* Totales */}
      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-surface px-2 py-3">
          <p className="text-xs text-muted">Totales</p>
          <p className="text-xl font-bold text-ink">{stats.totalQuota}</p>
        </div>
        <div className="rounded-lg bg-surface px-2 py-3">
          <p className="text-xs text-muted">Reservados</p>
          <p className="text-xl font-bold text-ink">{stats.resTotal}</p>
        </div>
        <div className="rounded-lg bg-success-50 px-2 py-3">
          <p className="text-xs text-muted">Disponibles</p>
          <p className="text-xl font-bold text-success-700">{stats.dispTotal}</p>
        </div>
      </div>

      {/* Reparto por tipo */}
      <div className="mt-5 space-y-3">
        <div>
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span className="font-semibold text-ink">
              Becarios:{" "}
              <span className="font-normal text-muted">
                {stats.resBecarios} / {stats.becariosQuota} utilizados
              </span>
            </span>
            <Badge variant="primary">{stats.dispBecarios} disp.</Badge>
          </div>
          <ProgressBar
            percent={
              stats.becariosQuota > 0
                ? (stats.resBecarios / stats.becariosQuota) * 100
                : 0
            }
            tone="primary"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span className="font-semibold text-ink">
              Libres:{" "}
              <span className="font-normal text-muted">
                {stats.resLibres} / {stats.libresQuota} utilizados
              </span>
            </span>
            <Badge variant="info">{stats.dispLibres} disp.</Badge>
          </div>
          <ProgressBar
            percent={
              stats.libresQuota > 0
                ? (stats.resLibres / stats.libresQuota) * 100
                : 0
            }
            tone="accent"
          />
        </div>
      </div>

      <p className="mt-4 flex items-center gap-2 text-sm text-muted">
        <TicketCheck size={15} className="text-secondary" />
        Tu cupo ({tipoEstudiante}):{" "}
        <strong className="text-ink">{remaining} disponible(s)</strong>
      </p>

      <div className="mt-4">
        {myStatus === "Activa" ? (
          <Button fullWidth variant="success" disabled icon={<CheckCircle2 size={16} />}>
            Reserva activa
          </Button>
        ) : myStatus === "Utilizada" ? (
          <Button fullWidth variant="outline" disabled icon={<CheckCircle2 size={16} />}>
            Reserva ya utilizada
          </Button>
        ) : soldOut ? (
          <Button fullWidth disabled icon={<Lock size={16} />}>
            Cupos agotados
          </Button>
        ) : !reservationsOpen ? (
          <Button fullWidth disabled variant="outline" icon={<Lock size={16} />}>
            Reservas cerradas
          </Button>
        ) : (
          <Button fullWidth onClick={onReserve} icon={<CalendarDays size={16} />}>
            Reservar
          </Button>
        )}
      </div>

      <Link
        to="/student/reservas"
        className="mt-3 flex items-center justify-center gap-1.5 text-sm font-semibold text-secondary hover:underline"
      >
        <CheckCircle2 size={15} />
        Ver mis reservas
      </Link>
    </div>
  );
}
