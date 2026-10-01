import {
  AlarmClock,
  BookOpen,
  Clock,
  Info,
  ShieldCheck,
  TicketCheck,
  UtensilsCrossed,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageHeader } from "@/components/ui/PageHeader";

const rules = [
  {
    icon: ShieldCheck,
    title: "La reserva es personal",
    text: "No puede ser usada por otra persona; el QR está vinculado a tu nombre.",
  },
  {
    icon: TicketCheck,
    title: "Una sola reserva por servicio",
    text: "No se permite reservar dos veces el mismo servicio para la misma fecha.",
  },
  {
    icon: Clock,
    title: "Presenta tu código QR",
    text: "Al llegar al comedor, muestra el código QR generado en «Mis reservas».",
  },
  {
    icon: AlarmClock,
    title: "Cancela si no asistirás",
    text: "Cancela a tiempo para que otro estudiante pueda aprovechar el cupo.",
  },
  {
    icon: BookOpen,
    title: "Respeta los horarios",
    text: "Cada servicio tiene un horario definido para mantener el orden del comedor.",
  },
];

export function InfoPage() {
  const { meals } = useApp();

  return (
    <div>
      <PageHeader
        title="Información del comedor"
        subtitle="Horarios de los servicios, reglas de uso y datos generales del comedor universitario."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Horarios */}
        <section className="card p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary">
              <UtensilsCrossed size={19} />
            </span>
            <h2 className="text-lg font-bold text-ink">Horarios de servicio</h2>
          </div>

          <ul className="space-y-3">
            {meals.map((meal) => (
              <li
                key={meal.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface/60 px-4 py-3.5"
              >
                <div>
                  <p className="font-semibold text-ink">{meal.nombre}</p>
                  <p className="text-sm text-muted">
                    {meal.total} cupos · {meal.becarios} para becarios
                  </p>
                </div>
                <span className="rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-primary ring-1 ring-line">
                  {meal.horario}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex items-start gap-2 rounded-xl bg-secondary-50 px-4 py-3 text-sm text-secondary">
            <Info size={16} className="mt-0.5 shrink-0" />
            Los cupos se actualizan en tiempo real según las reservas y
            cancelaciones del día.
          </div>
        </section>

        {/* Reglas */}
        <section className="card p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-50 text-success">
              <BookOpen size={19} />
            </span>
            <h2 className="text-lg font-bold text-ink">Reglas del comedor</h2>
          </div>

          <ul className="space-y-4">
            {rules.map((rule) => (
              <li key={rule.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-primary">
                  <rule.icon size={16} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">{rule.title}</p>
                  <p className="text-sm text-muted">{rule.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Datos generales */}
      <section className="card mt-6 p-6">
        <h2 className="text-lg font-bold text-ink">Acerca del sistema</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-surface/70 px-4 py-3">
            <p className="text-sm text-muted">Servicios</p>
            <p className="text-lg font-bold text-ink">
              Desayuno, Almuerzo y Cena
            </p>
          </div>
          <div className="rounded-xl bg-surface/70 px-4 py-3">
            <p className="text-sm text-muted">Tipos de estudiante</p>
            <p className="text-lg font-bold text-ink">Becarios y Libres</p>
          </div>
          <div className="rounded-xl bg-surface/70 px-4 py-3">
            <p className="text-sm text-muted">Ingreso</p>
            <p className="text-lg font-bold text-ink">Validación por QR</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted">
          Este es un sistema de demostración: todos los datos (estudiantes,
          reservas y cupos) son simulados y se almacenan localmente en tu
          navegador.
        </p>
      </section>
    </div>
  );
}
