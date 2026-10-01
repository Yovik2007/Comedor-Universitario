import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  TicketCheck,
  Utensils,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, statusBadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatShort, todayISO } from "@/utils/dates";

export function DashboardPage() {
  const { students, reservations, meals, settings, getMealStats } = useApp();
  const today = todayISO();

  const todayReservations = useMemo(
    () => reservations.filter((r) => r.date === today),
    [reservations, today],
  );

  const counts = useMemo(() => {
    const activas = todayReservations.filter((r) => r.status === "Activa").length;
    const utilizadas = todayReservations.filter(
      (r) => r.status === "Utilizada",
    ).length;
    const canceladas = todayReservations.filter(
      (r) => r.status === "Cancelada",
    ).length;
    return { activas, utilizadas, canceladas };
  }, [todayReservations]);

  const availableCups = useMemo(
    () =>
      meals
        .filter((m) => m.habilitado)
        .reduce((acc, m) => acc + getMealStats(m.id).dispTotal, 0),
    [meals, getMealStats],
  );

  const perMeal = useMemo(
    () =>
      meals.map((meal) => ({
        meal,
        count: todayReservations.filter(
          (r) => r.mealId === meal.id && r.status !== "Cancelada",
        ).length,
        stats: getMealStats(meal.id),
      })),
    [meals, todayReservations, getMealStats],
  );

  const byType = useMemo(() => {
    const valid = todayReservations.filter((r) => r.status !== "Cancelada");
    return {
      becarios: valid.filter((r) => r.studentType === "Becario").length,
      libres: valid.filter((r) => r.studentType === "Libre").length,
    };
  }, [todayReservations]);

  const latest = useMemo(
    () =>
      [...todayReservations]
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .slice(0, 6),
    [todayReservations],
  );

  const totalToday = todayReservations.length;
  const base = totalToday > 0 ? totalToday : 1;
  const percentActiva = (counts.activas / base) * 100;
  const percentUsada = (counts.utilizadas / base) * 100;
  const maxMealCount = Math.max(1, ...perMeal.map((p) => p.count));
  const totalTypes = byType.becarios + byType.libres || 1;

  return (
    <div>
      <PageHeader
        title="Panel administrativo"
        subtitle="Indicadores calculados en tiempo real a partir de los datos del sistema."
        actions={
          <Link to="/admin/reservas">
            <Button variant="outline" icon={<ClipboardList size={16} />}>
              Ver todas las reservas
            </Button>
          </Link>
        }
      />

      {!settings.reservasHabilitadas && (
        <div className="mb-6 rounded-xl border border-warning/30 bg-warning-50 px-4 py-3.5 text-sm font-medium text-warning-700">
          Las reservas están <strong>inhabilitadas</strong> actualmente. Los
          estudiantes no pueden crear nuevas reservas.
        </div>
      )}

      {/* Indicadores */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <StatCard
          icon={GraduationCap}
          label="Total de estudiantes"
          value={students.length}
          hint={`${students.filter((s) => s.activo).length} activos`}
          tone="primary"
        />
        <StatCard
          icon={CalendarDays}
          label="Reservas de hoy"
          value={totalToday}
          hint={formatShort(today)}
          tone="secondary"
        />
        <StatCard
          icon={TicketCheck}
          label="Reservas activas"
          value={counts.activas}
          hint="Pendientes de usar"
          tone="success"
        />
        <StatCard
          icon={CheckCircle2}
          label="Reservas utilizadas"
          value={counts.utilizadas}
          hint="Ya ingirieron su comida"
          tone="accent"
        />
        <StatCard
          icon={Utensils}
          label="Cupos disponibles"
          value={availableCups}
          hint="En servicios habilitados"
          tone="warning"
        />
      </div>

      {/* Gráficos */}
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {/* Reservas por servicio */}
        <section className="card p-5">
          <h2 className="mb-4 text-base font-bold text-ink">
            Reservas por servicio
          </h2>
          <div className="space-y-4">
            {perMeal.map(({ meal, count, stats }) => (
              <div key={meal.id}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-semibold text-ink">{meal.nombre}</span>
                  <span className="text-muted">
                    {count} · {stats.dispTotal} disp.
                  </span>
                </div>
                <ProgressBar
                  percent={(count / maxMealCount) * 100}
                  tone="primary"
                />
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted">
            Reservas vigentes (activas y utilizadas) de hoy, sin contar
            canceladas.
          </p>
        </section>

        {/* Estado de reservas */}
        <section className="card flex flex-col items-center p-5">
          <h2 className="mb-4 self-start text-base font-bold text-ink">
            Estado de reservas
          </h2>

          {totalToday === 0 ? (
            <EmptyState
              compact
              title="Sin reservas hoy"
              description="Aún no se registran reservas para la fecha de hoy."
            />
          ) : (
            <div className="flex flex-col items-center gap-4 sm:flex-row lg:flex-col xl:flex-row">
              <div
                className="relative h-36 w-36 shrink-0 rounded-full"
                style={{
                  background: `conic-gradient(var(--color-success) 0 ${percentActiva}%, var(--color-secondary) ${percentActiva}% ${percentActiva + percentUsada}%, var(--color-danger) ${percentActiva + percentUsada}% 100%)`,
                }}
                aria-label="Distribución de estados"
              >
                <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-white">
                  <span className="text-2xl font-bold text-ink">
                    {totalToday}
                  </span>
                  <span className="text-[11px] text-muted">reservas</span>
                </div>
              </div>

              <ul className="w-full space-y-2 text-sm">
                <li className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-muted">
                    <span className="h-2.5 w-2.5 rounded-full bg-success" />
                    Activas
                  </span>
                  <strong className="text-ink">{counts.activas}</strong>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-muted">
                    <span className="h-2.5 w-2.5 rounded-full bg-secondary" />
                    Utilizadas
                  </span>
                  <strong className="text-ink">{counts.utilizadas}</strong>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-muted">
                    <span className="h-2.5 w-2.5 rounded-full bg-danger" />
                    Canceladas
                  </span>
                  <strong className="text-ink">{counts.canceladas}</strong>
                </li>
              </ul>
            </div>
          )}
        </section>

        {/* Distribución becarios / libres */}
        <section className="card p-5">
          <h2 className="mb-4 text-base font-bold text-ink">
            Distribución becarios / libres
          </h2>

          <div className="space-y-5">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-semibold text-ink">Becarios</span>
                <span className="text-muted">{byType.becarios} reservas</span>
              </div>
              <ProgressBar
                percent={(byType.becarios / totalTypes) * 100}
                tone="primary"
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-semibold text-ink">Libres</span>
                <span className="text-muted">{byType.libres} reservas</span>
              </div>
              <ProgressBar
                percent={(byType.libres / totalTypes) * 100}
                tone="accent"
              />
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <Badge variant="primary">
              {totalToday > 0
                ? Math.round((byType.becarios / base) * 100)
                : 0}
              % becarios
            </Badge>
            <Badge variant="info">
              {totalToday > 0 ? Math.round((byType.libres / base) * 100) : 0}%
              libres
            </Badge>
          </div>
        </section>
      </div>

      {/* Últimas reservas */}
      <section className="card mt-6 overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-base font-bold text-ink">Últimas reservas de hoy</h2>
          <Link to="/admin/reservas">
            <Button variant="ghost" size="sm" icon={<ArrowRight size={15} />}>
              Ver todas
            </Button>
          </Link>
        </div>

        {latest.length === 0 ? (
          <div className="px-5 py-6">
            <EmptyState
              compact
              icon={ClipboardList}
              title="No hay reservas registradas hoy."
              description="Cuando los estudiantes reserven, aparecerán aquí."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-surface/70 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3">Código</th>
                  <th className="px-5 py-3">Estudiante</th>
                  <th className="px-5 py-3">Servicio</th>
                  <th className="px-5 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {latest.map((r) => (
                  <tr key={r.id} className="transition hover:bg-surface/50">
                    <td className="px-5 py-3 font-mono font-semibold text-primary">
                      {r.id}
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-medium text-ink">
                        {r.studentName}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted">{r.mealName}</td>
                    <td className="px-5 py-3">
                      <Badge variant={statusBadgeVariant(r.status)} dot>
                        {r.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
