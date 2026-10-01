import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Database,
  Info,
  RotateCcw,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/context/ToastContext";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { ConfirmModal, InfoRow } from "@/components/ui/Modal";
import { STORAGE_KEYS } from "@/utils/storage";

export function SettingsPage() {
  const { resetDemoData, students, reservations, session } = useApp();
  const { push } = useToast();
  const [confirmReset, setConfirmReset] = useState(false);

  const handleReset = () => {
    resetDemoData();
    setConfirmReset(false);
    push("success", "Datos de demostración restablecidos correctamente.");
  };

  return (
    <div>
      <PageHeader
        title="Configuración"
        subtitle="Opciones generales del sistema y mantenimiento de la demostración."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Restablecer */}
        <section className="card p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger-50 text-danger">
              <RotateCcw size={19} />
            </span>
            <div>
              <h2 className="text-base font-bold text-ink">
                Restablecer datos de demostración
              </h2>
              <p className="text-sm text-muted">
                Recupera los valores originales del sistema.
              </p>
            </div>
          </div>

          <ul className="space-y-2 text-sm text-muted">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
              Estudiantes originales ({students.length} registrados).
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
              Reservas de muestra ({reservations.length} en total).
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
              Cupos y horarios de los servicios.
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
              Configuración de reservas (habilitadas / inhabilitadas).
            </li>
          </ul>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              variant="danger"
              icon={<RotateCcw size={16} />}
              onClick={() => setConfirmReset(true)}
            >
              Restablecer datos
            </Button>
            <Link to="/kiosco">
              <Button variant="outline" icon={<ScanLine size={16} />}>
                Ir al kiosco
              </Button>
            </Link>
          </div>
        </section>

        {/* Información */}
        <section className="card p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary">
              <Info size={19} />
            </span>
            <div>
              <h2 className="text-base font-bold text-ink">
                Información del sistema
              </h2>
              <p className="text-sm text-muted">
                Todo funciona localmente en tu navegador.
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-surface/70 px-3 py-2 ring-1 ring-line">
            <InfoRow label="Sesión actual" value={session?.email ?? "—"} />
            <InfoRow label="Perfil" value={session?.nombre ?? "—"} />
            <InfoRow label="Versión" value="1.0.0" />
            <InfoRow label="Persistencia" value="localStorage" />
            <InfoRow label="Backend" value="Sin conexión (demo)" />
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-xl bg-secondary-50 px-4 py-3 text-sm text-secondary">
            <ShieldCheck size={16} className="mt-0.5 shrink-0" />
            <p>
              No se usa ningún servidor ni servicio externo: los datos se
              almacenan únicamente en este equipo (localStorage).
            </p>
          </div>

          <div className="mt-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
              <Database size={13} />
              Claves de almacenamiento
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Object.values(STORAGE_KEYS).map((key) => (
                <code
                  key={key}
                  className="rounded bg-surface px-2 py-1 text-[11px] font-semibold text-primary ring-1 ring-line"
                >
                  {key}
                </code>
              ))}
            </div>
          </div>
        </section>
      </div>

      <ConfirmModal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={handleReset}
        title="Restablecer datos de demostración"
        question="¿Restablecer todos los datos de la demostración?"
        confirmLabel="Sí, restablecer"
        cancelLabel="Cancelar"
        tone="danger"
      >
        <p className="text-sm text-muted">
          Se restaurarán los estudiantes, reservas, cupos y configuración
          originales. Los cambios realizados durante la demostración se
          perderán.
        </p>
      </ConfirmModal>
    </div>
  );
}
