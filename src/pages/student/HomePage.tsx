import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  CalendarClock,
  Clock,
  Lock,
  TicketCheck,
  Unlock,
  Utensils,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import type { BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { currentMinutes, todayISO } from "@/utils/dates";
import { serviceSchedule } from "@/utils/reservationUtils";
import type { MealStats } from "@/utils/reservationUtils";
import type { Meal } from "@/types";

interface MealStatus {
  label: string;
  variant: BadgeVariant;
}

function resolveStatus(
  meal: Meal,
  stats: MealStats,
  reservationsOpen: boolean,
): MealStatus {
  if (!reservationsOpen) return { label: "Reservas cerradas", variant: "warning" };
  if (!meal.habilitado) return { label: "No habilitado", variant: "neutral" };
  if (stats.dispTotal <= 0) return { label: "Cupos agotados", variant: "danger" };
  return { label: "Disponible", variant: "success" };
}

export function HomePage() {
  const { session, currentStudent, meals, reservations, settings, getMealStats } =
    useApp();

  const today = todayISO();
  const studentId = session?.studentId ?? "";
  const firstName = (currentStudent?.nombre ?? session?.nombre ?? "estudiante")
    .split(" ")[0];

  const schedule = useMemo(
    () => serviceSchedule(meals, currentMinutes()),
    [meals],
  );

  const myActiveToday = useMemo(
    () =>
      reservations.filter(
        (r) => r.studentId === studentId && r.date === today && r.status === "Activa",
      ),
    [reservations, studentId, today],
  );

  const myToday = useMemo(
    () =>
      reservations.filter(
        (r) =>
          r.studentId === studentId && r.date === today && r.status !== "Cancelada",
      ),
    [reservations, studentId, today],
  );

  const availableTotal = useMemo(
    () =>
      meals
        .filter((m) => m.habilitado)
        .reduce((acc, m) => acc + getMealStats(m.id).dispTotal, 0),
    [meals, getMealStats],
  );

  if (!currentStudent) {
    return (
      <EmptyState
        title="Perfil no encontrado"
        description="Tu perfil de estudiante ya no está disponible. Cierra sesión y vuelve a ingresar."
      />
    );
  }

  const comedorAbierto = settings.reservasHabilitadas;

  return (
    <div>
      <PageHeader
        title={`¡Hola, ${firstName}!`}
        subtitle="Bienvenido al sistema de reservas del comedor universitario."
      />

      {/* Tarjetas de resumen */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={TicketCheck}
          label="Reservas activas"
          value={myActiveToday.length}
          hint={
            myActiveToday.length > 0
              ? myActiveToday.map((r) => r.mealName).join(" · ")
              : "Aún no reservas para hoy"
          }
          tone="success"
        />
        <StatCard
          icon={CalendarClock}
          label={
            schedule.current ? "Servicio en curso" : "Próximo servicio"
          }
          value={
            schedule.current?.nombre ??
            schedule.next?.nombre ??
            "Jornada completada"
          }
          hint={
            schedule.current
              ? `En curso · ${schedule.current.horario}`
              : schedule.next
                ? `Próximo · ${schedule.next.horario}`
                : "Mañana temprano volvemos a abrir"
          }
          tone="secondary"
        />
        <StatCard
          icon={Utensils}
          label="Cupos disponibles"
          value={availableTotal}
          hint="Suma de los servicios habilitados"
          tone="accent"
        />
        <StatCard
          icon={comedorAbierto ? Unlock : Lock}
          label="Estado del comedor"
          value={comedorAbierto ? "Abierto" : "Cerrado"}
          hint={
            comedorAbierto
              ? "Reservas habilitadas"
              : "Reservas temporalmente suspendidas"
          }
          tone={comedorAbierto ? "success" : "danger"}
        />
      </div>

      {/* Servicios de hoy */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Servicios de hoy</h2>
          <span className="text-sm text-muted">
            {new Date().toLocaleDateString("es-ES", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </span>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {meals.map((meal) => {
            const stats = getMealStats(meal.id);
            const status = resolveStatus(meal, stats, comedorAbierto);
            const myRes = myToday.find((r) => r.mealId === meal.id);

            return (
              <div key={meal.id} className="card flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary">
                      <Utensils size={19} />
                    </span>
                    <div>
                      <p className="text-base font-bold text-ink">
                        {meal.nombre}
                      </p>
                      <p className="flex items-center gap-1.5 text-xs text-muted">
                        <Clock size={13} />
                        {meal.horario}
                      </p>
                    </div>
                  </div>
                  <Badge variant={status.variant} dot>
                    {status.label}
                  </Badge>
                </div>

                <div className="mt-4">
                  <p className="text-sm text-muted">Cupos disponibles</p>
                  <p className="mt-0.5 text-3xl font-bold text-ink">
                    {stats.dispTotal}
                    <span className="ml-1.5 text-sm font-medium text-muted">
                      de {meal.total}
                    </span>
                  </p>
                </div>

                <div className="mt-3">
                  <ProgressBar
                    percent={stats.percentOcupado}
                    tone={
                      stats.percentOcupado >= 90
                        ? "danger"
                        : stats.percentOcupado >= 60
                          ? "warning"
                          : "success"
                    }
                  />
                  <p className="mt-1.5 text-xs text-muted">
                    {stats.resTotal} de {meal.total} cupos ocupados
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="primary">{stats.dispBecarios} becarios</Badge>
                  <Badge variant="info">{stats.dispLibres} libres</Badge>
                  {myRes && (
                    <Badge
                      variant={myRes.status === "Activa" ? "success" : "info"}
                    >
                      {myRes.status === "Activa" ? "Reservado" : "Utilizado"}
                    </Badge>
                  )}
                </div>

                <Link to="/student/reservar" className="mt-4">
                  <Button variant="outline" fullWidth>
                    {myRes ? "Ver detalle" : "Reservar"}
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
