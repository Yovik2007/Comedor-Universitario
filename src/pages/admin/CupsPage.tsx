import { useState } from "react";
import { AlertTriangle, Pencil, SlidersHorizontal } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/context/ToastContext";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Switch } from "@/components/ui/Switch";
import { Field, inputCls } from "@/components/ui/Field";
import { InfoRow, Modal } from "@/components/ui/Modal";
import { todayISO } from "@/utils/dates";
import type { Meal } from "@/types";

interface EditForm {
  total: number;
  becarios: number;
  horario: string;
  habilitado: boolean;
}

export function CupsPage() {
  const { meals, settings, updateMeal, setReservasHabilitadas, getMealStats } =
    useApp();
  const { push } = useToast();

  const [editing, setEditing] = useState<Meal | null>(null);
  const [form, setForm] = useState<EditForm>({
    total: 0,
    becarios: 0,
    horario: "",
    habilitado: true,
  });
  const [formError, setFormError] = useState("");

  const openEdit = (meal: Meal) => {
    setEditing(meal);
    setForm({
      total: meal.total,
      becarios: meal.becarios,
      horario: meal.horario,
      habilitado: meal.habilitado,
    });
    setFormError("");
  };

  const handleSave = () => {
    if (!editing) return;
    const result = updateMeal(editing.id, form);
    if (result.ok) {
      push("success", result.message);
      setEditing(null);
    } else {
      setFormError(result.message);
    }
  };

  const handleToggleGlobal = (enabled: boolean) => {
    setReservasHabilitadas(enabled);
    push(
      enabled ? "success" : "info",
      enabled
        ? "Reservas habilitadas para todos los estudiantes."
        : "Reservas inhabilitadas temporalmente.",
    );
  };

  return (
    <div>
      <PageHeader
        title="Administración de cupos"
        subtitle="Define los cupos, horarios y estado de cada servicio de alimentación."
      />

      {/* Interruptor global */}
      <section className="card mb-6 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary">
              <SlidersHorizontal size={19} />
            </span>
            <div>
              <Switch
                checked={settings.reservasHabilitadas}
                onChange={handleToggleGlobal}
                label="Reservas habilitadas"
                description={
                  settings.reservasHabilitadas
                    ? "Los estudiantes pueden crear nuevas reservas."
                    : "Los estudiantes NO podrán crear nuevas reservas."
                }
              />
            </div>
          </div>

          <Badge
            variant={settings.reservasHabilitadas ? "success" : "danger"}
            dot
          >
            {settings.reservasHabilitadas ? "ABIERTAS" : "CERRADAS"}
          </Badge>
        </div>

        {!settings.reservasHabilitadas && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning-50 px-4 py-3 text-sm font-medium text-warning-700">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            Las reservas se encuentran temporalmente cerradas. Los estudiantes
            verán este aviso en la pantalla de reserva.
          </div>
        )}
      </section>

      {/* Tarjetas de servicios */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {meals.map((meal) => {
          const stats = getMealStats(meal.id);

          return (
            <article key={meal.id} className="card flex flex-col p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-bold text-primary">{meal.nombre}</h3>
                <Badge
                  variant={meal.habilitado ? "success" : "neutral"}
                  dot
                >
                  {meal.habilitado ? "Habilitado" : "Deshabilitado"}
                </Badge>
              </div>

              <p className="mt-1 text-sm text-muted">{meal.horario}</p>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-surface px-2 py-3">
                  <p className="text-xs text-muted">Total</p>
                  <p className="text-xl font-bold text-ink">{meal.total}</p>
                </div>
                <div className="rounded-lg bg-surface px-2 py-3">
                  <p className="text-xs text-muted">Becarios</p>
                  <p className="text-xl font-bold text-ink">{meal.becarios}</p>
                </div>
                <div className="rounded-lg bg-surface px-2 py-3">
                  <p className="text-xs text-muted">Libres</p>
                  <p className="text-xl font-bold text-ink">
                    {meal.total - meal.becarios}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-semibold text-ink">
                    Ocupados hoy: {stats.resTotal} / {meal.total}
                  </span>
                  <span className="text-muted">{stats.dispTotal} libres</span>
                </div>
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
              </div>

              <p className="mt-3 text-xs text-muted">
                Reservados hoy · Becarios {stats.resBecarios} /{" "}
                {stats.becariosQuota} · Libres {stats.resLibres} /{" "}
                {stats.libresQuota}
              </p>

              <div className="mt-4">
                <Button
                  variant="outline"
                  fullWidth
                  icon={<Pencil size={16} />}
                  onClick={() => openEdit(meal)}
                >
                  Editar cupos
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      {/* Modal de edición */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={`Editar cupos — ${editing?.nombre ?? ""}`}
        description="Los cambios se aplican de inmediato a todos los estudiantes."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSave}>
              Guardar cambios
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cupos totales" htmlFor="total">
                <input
                  id="total"
                  type="number"
                  min={1}
                  className={inputCls}
                  value={form.total}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, total: Number(e.target.value) }))
                  }
                />
              </Field>
              <Field label="Cupos becarios" htmlFor="becarios">
                <input
                  id="becarios"
                  type="number"
                  min={0}
                  className={inputCls}
                  value={form.becarios}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, becarios: Number(e.target.value) }))
                  }
                />
              </Field>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-surface/70 px-3.5 py-3 ring-1 ring-line">
              <span className="text-sm font-semibold text-ink">Cupos libres</span>
              <span className="text-sm font-bold text-ink">
                {Math.max(form.total - form.becarios, 0)}
              </span>
            </div>

            <Field
              label="Horario"
              htmlFor="horario"
              hint="Formato legible: 12:00 PM - 2:30 PM"
            >
              <input
                id="horario"
                type="text"
                className={inputCls}
                value={form.horario}
                onChange={(e) =>
                  setForm((f) => ({ ...f, horario: e.target.value }))
                }
              />
            </Field>

            <div className="rounded-xl border border-line px-3.5 py-3">
              <Switch
                checked={form.habilitado}
                onChange={(v) => setForm((f) => ({ ...f, habilitado: v }))}
                label="Servicio habilitado"
                description="Si está apagado, el servicio no aparecerá disponible."
              />
            </div>

            <div className="rounded-xl bg-surface/70 px-3 py-2 ring-1 ring-line">
              <InfoRow
                label="Ocupados hoy"
                value={`${getMealStats(editing.id).resTotal} reservas`}
              />
            </div>

            {formError && (
              <p className="rounded-lg bg-danger-50 px-3.5 py-2.5 text-sm font-medium text-danger-700">
                {formError}
              </p>
            )}

            <p className="text-xs text-muted">
              Fecha de referencia: {todayISO()}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
