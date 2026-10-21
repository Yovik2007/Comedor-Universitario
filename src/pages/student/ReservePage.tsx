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
import {
  availableForType,
  buildSlots,
  bookableSlots,
  effectiveStatus,
  slotIsPast,
  slotNotYetOpen,
  slotOpenTime,
  slotOccupancy,
  GRACE_MINUTES,
  LEAD_MINUTES,
} from "@/utils/reservationUtils";
import type { MealStats } from "@/utils/reservationUtils";
import type {
  Meal,
  Reservation,
  ReservationStatus,
  StudentType,
} from "@/types";

export function ReservePage() {
  const { currentStudent, meals, reservations, settings, reserve, getMealStats } =
    useApp();
  const { push } = useToast();

  const [confirmMeal, setConfirmMeal] = useState<Meal | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const today = todayISO();

  const openConfirm = (meal: Meal) => {
    const slots = buildSlots(meal);
    const occupancy = slotOccupancy(meal, reservations, today);
    // Por defecto se preselecciona la primera franja libre que ya está
    // abierta y todavía no pasó.
    const firstFree = slots.find(
      (s) =>
        (occupancy[s.start] ?? 0) < s.limit &&
        !slotIsPast(today, s.start) &&
        !slotNotYetOpen(today, s.start),
    );
    setSelectedSlot(firstFree?.start ?? null);
    setConfirmMeal(meal);
  };

  const closeConfirm = () => {
    setConfirmMeal(null);
    setSelectedSlot(null);
  };

  const handleConfirm = async () => {
    if (!confirmMeal) return;
    const result = await reserve(confirmMeal.id, selectedSlot ?? undefined);
    if (result.ok) push("success", result.message);
    else push("error", result.message);
    closeConfirm();
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
          const slots = buildSlots(meal);
          const firstSlot = slots[0];
          const slotsAvailable = bookableSlots(meal, today).length > 0;
          const allPast = slots.every((s) => slotIsPast(today, s.start));
          const opensAtLabel =
            firstSlot && slotNotYetOpen(today, firstSlot.start)
              ? slotOpenTime(firstSlot.start)
              : null;

          return (
            <MealCard
              key={meal.id}
              mealName={meal.nombre}
              horario={meal.horario}
              stats={stats}
              remaining={availableForType(stats, currentStudent.tipo)}
              tipoEstudiante={currentStudent.tipo}
              myStatus={
                myReservation ? effectiveStatus(myReservation) : null
              }
              reservationsOpen={reservationsOpen && meal.habilitado}
              slotsAvailable={slotsAvailable}
              allPast={allPast}
              opensAtLabel={opensAtLabel}
              onReserve={() => openConfirm(meal)}
            />
          );
        })}
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-xl bg-white px-4 py-3.5 text-sm text-muted ring-1 ring-line">
        <Info size={17} className="mt-0.5 shrink-0 text-secondary" />
        <p>
          Cada estudiante tiene <strong>un solo intento por servicio y
          fecha</strong>: debes presentarte dentro de los 30 minutos de tu
          franja. Si no llegas, la reserva vence, su cupo pasa a los
          estudiantes libres y no podrás volver a reservar ese servicio hoy.
          Si cancelas a tiempo, el cupo queda libre para otros compañeros.
        </p>
      </div>

      <ConfirmModal
        open={confirmMeal !== null}
        onClose={closeConfirm}
        onConfirm={handleConfirm}
        title="Confirmar reserva"
        question="Elige la hora en que pasarás por tu comida"
        confirmLabel="Confirmar reserva"
        tone="primary"
      >
        {confirmMeal && confirmStats && (
          <div className="space-y-4">
            <div className="rounded-xl bg-surface/70 px-3 py-2 ring-1 ring-line">
              <InfoRow label="Servicio" value={confirmMeal.nombre} />
              <InfoRow label="Fecha" value={formatShort(today)} />
              <InfoRow label="Tipo de estudiante" value={currentStudent.tipo} />
              <InfoRow
                label="Cupos disponibles"
                value={`${availableForType(confirmStats, currentStudent.tipo)} para tu tipo`}
              />
            </div>

            <SlotPicker
              meal={confirmMeal}
              reservations={reservations}
              date={today}
              selected={selectedSlot}
              onSelect={setSelectedSlot}
            />
          </div>
        )}
      </ConfirmModal>
    </div>
  );
}

/* -----------------------------------------------------------
   Selector de franja de 30 minutos
   ----------------------------------------------------------- */

interface SlotPickerProps {
  meal: Meal;
  reservations: Reservation[];
  date: string;
  selected: string | null;
  onSelect: (slot: string) => void;
}

function SlotPicker({
  meal,
  reservations,
  date,
  selected,
  onSelect,
}: SlotPickerProps) {
  const slots = buildSlots(meal);
  const occupancy = slotOccupancy(meal, reservations, date);

  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
        <Clock size={15} className="text-secondary" />
        Franja de llegada (cada 30 minutos)
      </p>

      <div className="grid grid-cols-3 gap-2">
        {slots.map((slot) => {
          const used = occupancy[slot.start] ?? 0;
          const free = Math.max(slot.limit - used, 0);
          const past = slotIsPast(date, slot.start);
          const waiting = slotNotYetOpen(date, slot.start);
          const full = free <= 0;
          const disabled = full || past || waiting;
          const isSelected = selected === slot.start;

          return (
            <button
              key={slot.start}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(slot.start)}
              aria-pressed={isSelected}
              className={`rounded-xl border px-2 py-2 text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isSelected
                  ? "border-primary bg-primary text-white"
                  : disabled
                    ? "cursor-not-allowed border-line bg-surface text-muted opacity-60"
                    : "border-line bg-white text-ink hover:border-primary"
              }`}
            >
              <span className="block text-sm font-bold">
                {slot.start}–{slot.end}
              </span>
              <span
                className={`block text-xs ${
                  isSelected ? "text-white/85" : "text-muted"
                }`}
              >
                {past
                  ? "Ya pasó"
                  : waiting
                    ? `Abre ${slotOpenTime(slot.start)}`
                    : full
                      ? "Llena"
                      : `${free} cupos`}
              </span>
            </button>
          );
        })}
      </div>

      {slots.every((s) => slotIsPast(date, s.start)) ? (
        <p className="mt-2 rounded-lg bg-warning-50 px-3 py-2 text-xs font-medium text-warning-700 ring-1 ring-warning/25">
          Todas las franjas de este servicio ya pasaron.
        </p>
      ) : (
        slots.every((s) => slotNotYetOpen(date, s.start)) && (
          <p className="mt-2 rounded-lg bg-surface px-3 py-2 text-xs font-medium text-muted">
            Las franjas se habilitan{" "}
            <strong>{LEAD_MINUTES} minutos antes</strong> de su hora. Todavía
            no se puede reservar.
          </p>
        )
      )}

      <p className="mt-2 text-xs leading-relaxed text-muted">
        Cada franja se abre sola <strong>{LEAD_MINUTES} minutos antes</strong>{" "}
        de su hora. Luego tienes{" "}
        <strong>{GRACE_MINUTES} minutos</strong> desde el inicio de tu franja
        para presentarte; si no llegas, el cupo se libera automáticamente para
        otro estudiante.
      </p>
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
  /** ¿Queda alguna franja que se pueda reservar ahora mismo? */
  slotsAvailable: boolean;
  /** Todas las franjas del servicio ya pasaron. */
  allPast: boolean;
  /** Hora a la que abre la primera franja, si todavía no abrió. */
  opensAtLabel: string | null;
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
  slotsAvailable,
  allPast,
  opensAtLabel,
  onReserve,
}: MealCardProps) {
  // Opción A: un intento por servicio y fecha. Si la reserva venció, su cupo
  // ya se transfirió a los libres y este estudiante no puede reservar otra vez.
  const reservedByMe = myStatus === "Activa" || myStatus === "Utilizada";
  const expired = myStatus === "Vencida";
  const finished = !slotsAvailable && allPast && myStatus === null;
  const notYetOpen =
    !slotsAvailable && opensAtLabel !== null && myStatus === null;
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
        ) : expired ? (
          <Badge variant="warning" dot>
            Vencida
          </Badge>
        ) : finished ? (
          <Badge variant="neutral">Finalizado</Badge>
        ) : notYetOpen ? (
          <Badge variant="neutral">Aún no abre</Badge>
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

      {expired && (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-warning-50 px-3 py-2 text-xs leading-relaxed text-warning-700 ring-1 ring-warning/25">
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>
            Tu reserva venció y su cupo se transfirió a los estudiantes
            libres. Cada servicio admite <strong>un solo intento por día</strong>,
            por lo que no puedes volver a reservarlo hoy.
          </span>
        </p>
      )}

      <div className="mt-4">
        {myStatus === "Activa" ? (
          <Button fullWidth variant="success" disabled icon={<CheckCircle2 size={16} />}>
            Reserva activa
          </Button>
        ) : myStatus === "Utilizada" ? (
          <Button fullWidth variant="outline" disabled icon={<CheckCircle2 size={16} />}>
            Reserva ya utilizada
          </Button>
        ) : expired ? (
          <Button fullWidth variant="outline" disabled icon={<Lock size={16} />}>
            Cupo liberado · no reservable
          </Button>
        ) : finished ? (
          <Button fullWidth variant="outline" disabled icon={<Lock size={16} />}>
            Servicio finalizado hoy
          </Button>
        ) : notYetOpen ? (
          <Button fullWidth variant="outline" disabled icon={<Lock size={16} />}>
            Abre a las {opensAtLabel}
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
