import { useMemo, useState } from "react";
import {
  GraduationCap,
  Plus,
  Search,
  UserCheck,
  UserX,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/context/ToastContext";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, statusBadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, inputCls } from "@/components/ui/Field";
import { InfoRow, Modal } from "@/components/ui/Modal";
import { formatShort } from "@/utils/dates";
import type { NewStudentInput } from "@/context/AppContext";
import type { Student, StudentType } from "@/types";

export function StudentsPage() {
  const { students, reservations, addStudent, toggleStudentStatus } = useApp();
  const { push } = useToast();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [detail, setDetail] = useState<Student | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    correo: "",
    tipo: "Libre" as StudentType,
    password: "123456",
  });
  const [formError, setFormError] = useState("");

  const reservationCount = useMemo(() => {
    const map = new Map<string, number>();
    reservations.forEach((r) => {
      map.set(r.studentId, (map.get(r.studentId) ?? 0) + 1);
    });
    return map;
  }, [reservations]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return students
      .filter((s) => {
        if (
          term &&
          !s.nombre.toLowerCase().includes(term) &&
          !s.correo.toLowerCase().includes(term)
        ) {
          return false;
        }
        if (typeFilter !== "todos" && s.tipo !== typeFilter) return false;
        return true;
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [students, search, typeFilter]);

  const openAdd = () => {
    setForm({ nombre: "", correo: "", tipo: "Libre", password: "123456" });
    setFormError("");
    setAddOpen(true);
  };

  const handleCreate = () => {
    const input: NewStudentInput = {
      nombre: form.nombre,
      correo: form.correo,
      tipo: form.tipo,
      password: form.password,
    };
    const result = addStudent(input);
    if (result.ok) {
      push("success", result.message);
      setAddOpen(false);
    } else {
      setFormError(result.message);
    }
  };

  const handleToggle = (student: Student) => {
    toggleStudentStatus(student.id);
    push(
      "info",
      student.activo
        ? `${student.nombre} fue desactivado.`
        : `${student.nombre} fue reactivado.`,
    );
    setDetail((prev) =>
      prev && prev.id === student.id
        ? { ...prev, activo: !prev.activo }
        : prev,
    );
  };

  const detailReservations = detail
    ? reservations
        .filter((r) => r.studentId === detail.id)
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 5)
    : [];

  return (
    <div>
      <PageHeader
        title="Estudiantes"
        subtitle="Consulta y administra los estudiantes registrados en el comedor."
        actions={
          <Button icon={<Plus size={16} />} onClick={openAdd}>
            Agregar estudiante
          </Button>
        }
      />

      {/* Buscador y filtros */}
      <div className="card mb-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            className={`${inputCls} pl-9`}
            placeholder="Buscar por nombre o correo"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar estudiantes"
          />
        </div>
        <select
          className={`${inputCls} sm:w-52`}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          aria-label="Filtrar por tipo"
        >
          <option value="todos">Todos los tipos</option>
          <option value="Becario">Becarios</option>
          <option value="Libre">Libres</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-5 py-6">
            <EmptyState
              icon={GraduationCap}
              title="No hay estudiantes registrados."
              description="No se encontraron estudiantes que coincidan con la búsqueda."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-surface/70 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3">Nombre</th>
                  <th className="px-5 py-3">Correo</th>
                  <th className="px-5 py-3">Tipo</th>
                  <th className="px-5 py-3">Reservas</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((s) => (
                  <tr key={s.id} className="transition hover:bg-surface/50">
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-ink">{s.nombre}</span>
                      <span className="ml-2 font-mono text-xs text-muted">
                        {s.id}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-muted">{s.correo}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={s.tipo === "Becario" ? "primary" : "info"}>
                        {s.tipo}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-muted">
                      {reservationCount.get(s.id) ?? 0}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={s.activo ? "success" : "danger"} dot>
                        {s.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDetail(s)}
                        >
                          Ver
                        </Button>
                        <Button
                          variant={s.activo ? "danger" : "success"}
                          size="sm"
                          icon={s.activo ? <UserX size={15} /> : <UserCheck size={15} />}
                          onClick={() => handleToggle(s)}
                        >
                          {s.activo ? "Desactivar" : "Activar"}
                        </Button>
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
        onClose={() => setDetail(null)}
        title="Información del estudiante"
        size="sm"
        footer={
          <Button variant="primary" onClick={() => setDetail(null)}>
            Cerrar
          </Button>
        }
      >
        {detail && (
          <div>
            <div className="rounded-xl bg-surface/70 px-3 py-2 ring-1 ring-line">
              <InfoRow label="Nombre" value={detail.nombre} />
              <InfoRow label="Correo" value={detail.correo} />
              <InfoRow label="Código" value={detail.id} />
              <InfoRow label="Tipo" value={detail.tipo} />
              <InfoRow
                label="Estado"
                value={
                  <Badge variant={detail.activo ? "success" : "danger"} dot>
                    {detail.activo ? "Activo" : "Inactivo"}
                  </Badge>
                }
              />
              <InfoRow
                label="Reservas totales"
                value={reservationCount.get(detail.id) ?? 0}
              />
            </div>

            <p className="mt-5 mb-2 text-sm font-bold text-ink">
              Últimas reservas
            </p>
            {detailReservations.length === 0 ? (
              <p className="rounded-lg bg-surface/70 px-3.5 py-3 text-sm text-muted">
                Este estudiante aún no tiene reservas registradas.
              </p>
            ) : (
              <ul className="space-y-2">
                {detailReservations.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-line px-3.5 py-2.5 text-sm"
                  >
                    <span className="font-medium text-ink">
                      {r.mealName} · {formatShort(r.date)}
                    </span>
                    <Badge variant={statusBadgeVariant(r.status)} dot>
                      {r.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Modal>

      {/* Agregar */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Agregar estudiante"
        description="El registro se guarda localmente en este navegador."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate}>Guardar estudiante</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nombre completo" htmlFor="nombre">
            <input
              id="nombre"
              type="text"
              className={inputCls}
              placeholder="Ej. Andrea Salinas"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            />
          </Field>

          <Field label="Correo electrónico" htmlFor="correo">
            <input
              id="correo"
              type="email"
              className={inputCls}
              placeholder="nombre@universidad.edu.pe"
              value={form.correo}
              onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo" htmlFor="tipo">
              <select
                id="tipo"
                className={inputCls}
                value={form.tipo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tipo: e.target.value as StudentType }))
                }
              >
                <option value="Libre">Libre</option>
                <option value="Becario">Becario</option>
              </select>
            </Field>

            <Field label="Contraseña" htmlFor="password">
              <input
                id="password"
                type="text"
                className={inputCls}
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
              />
            </Field>
          </div>

          {formError && (
            <p className="rounded-lg bg-danger-50 px-3.5 py-2.5 text-sm font-medium text-danger-700">
              {formError}
            </p>
          )}

          <p className="text-xs text-muted">
            Podrás iniciar sesión con este correo y la contraseña indicada.
          </p>
        </div>
      </Modal>
    </div>
  );
}
