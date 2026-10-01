import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Filter, Search, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/context/ToastContext";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, statusBadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { inputCls } from "@/components/ui/Field";
import { InfoRow, Modal } from "@/components/ui/Modal";
import { formatLong, formatShort } from "@/utils/dates";
import { formatClock } from "@/utils/text";
import type { Reservation } from "@/types";

export function ReservationsPage() {
  const { reservations, meals, markUsed } = useApp();
  const { push } = useToast();

  const [search, setSearch] = useState("");
  const [mealFilter, setMealFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todas");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [dateFilter, setDateFilter] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);

  // Se deriva del estado global para que el detalle nunca quede obsoleto.
  const detail = detailId
    ? (reservations.find((r) => r.id === detailId) ?? null)
    : null;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return reservations
      .filter((r) => {
        if (term && !r.studentName.toLowerCase().includes(term) && !r.id.toLowerCase().includes(term)) {
          return false;
        }
        if (mealFilter !== "todos" && r.mealId !== mealFilter) return false;
        if (statusFilter !== "todas" && r.status !== statusFilter) return false;
        if (typeFilter !== "todos" && r.studentType !== typeFilter) return false;
        if (dateFilter && r.date !== dateFilter) return false;
        return true;
      })
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [reservations, search, mealFilter, statusFilter, typeFilter, dateFilter]);

  const hasFilters =
    search !== "" ||
    mealFilter !== "todos" ||
    statusFilter !== "todas" ||
    typeFilter !== "todos" ||
    dateFilter !== "";

  const clearFilters = () => {
    setSearch("");
    setMealFilter("todos");
    setStatusFilter("todas");
    setTypeFilter("todos");
    setDateFilter("");
  };

  const handleMarkUsed = (reservation: Reservation) => {
    const result = markUsed(reservation.id);
    if (result.ok) {
      // El panel queda abierto para mostrar el nuevo estado "Utilizada".
      push("success", result.message);
    } else {
      push("error", result.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Gestión de reservas"
        subtitle="Consulta, filtra y valida todas las reservas registradas en el sistema."
        actions={
          hasFilters ? (
            <Button variant="outline" size="sm" icon={<X size={15} />} onClick={clearFilters}>
              Limpiar filtros
            </Button>
          ) : undefined
        }
      />

      {/* Filtros */}
      <div className="card mb-5 p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="relative xl:col-span-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              className={`${inputCls} pl-9`}
              placeholder="Buscar por nombre o código"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar reservas"
            />
          </div>

          <select
            className={inputCls}
            value={mealFilter}
            onChange={(e) => setMealFilter(e.target.value)}
            aria-label="Filtrar por servicio"
          >
            <option value="todos">Todos los servicios</option>
            {meals.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>

          <select
            className={inputCls}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filtrar por estado"
          >
            <option value="todas">Todos los estados</option>
            <option value="Activa">Activa</option>
            <option value="Utilizada">Utilizada</option>
            <option value="Cancelada">Cancelada</option>
          </select>

          <select
            className={inputCls}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filtrar por tipo de estudiante"
          >
            <option value="todos">Todos los tipos</option>
            <option value="Becario">Becario</option>
            <option value="Libre">Libre</option>
          </select>

          <input
            type="date"
            className={inputCls}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            aria-label="Filtrar por fecha"
          />
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
          <Filter size={13} />
          {filtered.length} de {reservations.length} reservas
        </p>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-5 py-6">
            <EmptyState
              title="No hay reservas que coincidan con los filtros."
              description="Ajusta los criterios de búsqueda o limpia los filtros para ver todas las reservas."
              action={
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-surface/70 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3">ID</th>
                  <th className="px-5 py-3">Estudiante</th>
                  <th className="px-5 py-3">Tipo</th>
                  <th className="px-5 py-3">Servicio</th>
                  <th className="px-5 py-3">Fecha</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((r) => (
                  <tr key={r.id} className="transition hover:bg-surface/50">
                    <td className="px-5 py-3.5 font-mono font-semibold text-primary">
                      {r.id}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-ink">
                      {r.studentName}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={r.studentType === "Becario" ? "primary" : "info"}>
                        {r.studentType}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-muted">{r.mealName}</td>
                    <td className="px-5 py-3.5 text-muted">{formatShort(r.date)}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={statusBadgeVariant(r.status)} dot>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDetailId(r.id)}
                        >
                          Ver
                        </Button>
                        {r.status === "Activa" && (
                          <Button
                            variant="success"
                            size="sm"
                            icon={<CheckCircle2 size={15} />}
                            onClick={() => handleMarkUsed(r)}
                          >
                            Validar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detalle */}
      <Modal
        open={detail !== null}
        onClose={() => setDetailId(null)}
        title="Detalle de la reserva"
        size="sm"
        footer={
          detail?.status === "Activa" ? (
            <>
              <Button variant="outline" onClick={() => setDetailId(null)}>
                Cerrar
              </Button>
              <Button
                variant="success"
                icon={<CheckCircle2 size={16} />}
                onClick={() => handleMarkUsed(detail)}
              >
                Marcar como utilizada
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={() => setDetailId(null)}>
              Cerrar
            </Button>
          )
        }
      >
        {detail && (
          <div className="flex flex-col items-center">
            <div className="rounded-xl bg-white p-3 ring-1 ring-line">
              <QRCodeSVG value={detail.qrCode} size={150} level="M" fgColor="#123B6D" />
            </div>

            <div className="mt-4 w-full rounded-xl bg-surface/70 px-3 py-2 ring-1 ring-line">
              <InfoRow label="Código" value={detail.id} />
              <InfoRow label="Estudiante" value={detail.studentName} />
              <InfoRow label="Tipo" value={detail.studentType} />
              <InfoRow label="Servicio" value={detail.mealName} />
              <InfoRow label="Fecha" value={formatLong(detail.date)} />
              <InfoRow label="Horario" value={detail.time} />
              <InfoRow
                label="Estado"
                value={
                  <Badge variant={statusBadgeVariant(detail.status)} dot>
                    {detail.status}
                  </Badge>
                }
              />
              {detail.usedAt && (
                <InfoRow label="Validada a las" value={formatClock(detail.usedAt)} />
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
