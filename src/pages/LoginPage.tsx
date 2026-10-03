import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  UtensilsCrossed,
  Users,
  Zap,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";
import { Field, inputCls } from "@/components/ui/Field";
import { demoAccounts } from "@/data/mockData";
import { BRAND } from "@/data/brand";

const features = [
  {
    icon: Zap,
    title: "Reserva en segundos",
    text: "Cupos de desayuno, almuerzo y cena en tiempo real.",
  },
  {
    icon: ShieldCheck,
    title: "Cupos justos",
    text: "Cupos diferenciados para becarios y estudiantes libres.",
  },
  {
    icon: UtensilsCrossed,
    title: "Ingreso con QR",
    text: "Cada reserva genera un código QR de uso personal.",
  },
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Cuentas agrupadas por rol para el listado del login. */
const accountGroups = [
  {
    label: "Administradores",
    icon: ShieldCheck,
    accounts: demoAccounts.filter((acc) => acc.role === "admin"),
  },
  {
    label: "Estudiantes",
    icon: UtensilsCrossed,
    accounts: demoAccounts.filter((acc) => acc.role === "estudiante"),
  },
];

export function LoginPage() {
  const { login } = useApp();
  const { push } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Las cuentas demo quedan ocultas por defecto: el login muestra solo el formulario.
  const [showDemo, setShowDemo] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError("");

    setLoading(true);
    await sleep(350);
    const result = login(email, password);
    setLoading(false);

    if (!result.ok) {
      setError(result.error ?? "No se pudo iniciar sesión.");
      return;
    }

    push("success", "Sesión iniciada correctamente.");
    navigate(result.role === "admin" ? "/admin" : "/student", {
      replace: true,
    });
  };

  const fillDemo = (mail: string, pass: string) => {
    setEmail(mail);
    setPassword(pass);
    setError("");
  };

  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-2">
      {/* Panel institucional */}
      <section className="relative hidden overflow-hidden bg-primary lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-secondary/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-accent">
            <UtensilsCrossed size={26} />
          </span>
          <div className="leading-tight text-white">
            <p className="text-lg font-bold">{BRAND.name}</p>
            <p className="text-sm text-white/60">
              {BRAND.institution} · {BRAND.tagline}
            </p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-4xl font-bold leading-tight text-white">
            Reserva tu alimentación de forma simple y segura.
          </h1>
          <p className="mt-4 text-white/70">
            Consulta los cupos disponibles, reserva tu servicio del día y
            presenta tu código QR al ingresar al comedor.
          </p>

          <ul className="mt-8 space-y-4">
            {features.map((f) => (
              <li key={f.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/12 text-accent">
                  <f.icon size={18} />
                </span>
                <div>
                  <p className="font-semibold text-white">{f.title}</p>
                  <p className="text-sm text-white/60">{f.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-white/50">
          © {new Date().getFullYear()} {BRAND.name} · Demostración
        </p>
      </section>

      {/* Formulario */}
      <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-accent">
              <UtensilsCrossed size={22} />
            </span>
            <div className="leading-tight">
              <p className="font-bold text-primary">{BRAND.name}</p>
              <p className="text-xs text-muted">{BRAND.tagline}</p>
            </div>
          </div>

          <div className="card p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-primary">Iniciar sesión</h2>
            <p className="mt-1 text-sm text-muted">
              Ingresa con tu correo institucional o cuenta de demostración.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              <Field label="Correo electrónico" htmlFor="email">
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  className={inputCls}
                  placeholder="nombre@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>

              <Field label="Contraseña" htmlFor="password">
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className={`${inputCls} pr-11`}
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-ink"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </Field>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-50 px-3.5 py-2.5 text-sm font-medium text-danger-700"
                >
                  <LockKeyhole size={16} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                fullWidth
                loading={loading}
                disabled={!email || !password}
              >
                Ingresar
              </Button>
            </form>
          </div>

          {/* Cuentas de demostración: ocultas por defecto para dejar solo el formulario */}
          <div className="mt-5 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => setShowDemo((v) => !v)}
              aria-expanded={showDemo}
              className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-primary transition hover:border-secondary/60 hover:text-secondary"
            >
              <Users size={14} />
              {showDemo
                ? "Ocultar cuentas de demostración"
                : "Ver cuentas de demostración"}
            </button>

            <p className="text-center text-xs text-muted">
              Los datos de esta demostración son simulados.{" "}
              <Link
                to="/kiosco"
                className="font-semibold text-secondary hover:underline"
              >
                Ir al kiosco
              </Link>
            </p>
          </div>

          {showDemo && (
            <div className="card mt-4 p-5">
              <p className="text-sm font-bold text-ink">
                Usuarios de demostración
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Toca una cuenta para autocompletar el formulario.
              </p>

              <div className="mt-3 space-y-3">
                {accountGroups.map((group) => (
                  <div key={group.label}>
                    <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                      <group.icon size={12} />
                      {group.label}
                    </p>

                    <div className="space-y-2">
                      {group.accounts.map((acc) => (
                        <button
                          key={acc.email}
                          type="button"
                          onClick={() => fillDemo(acc.email, acc.password)}
                          className="flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-surface/60 px-3 py-2 text-left transition hover:border-secondary/60 hover:bg-secondary-50"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink">
                              {acc.email}
                            </p>
                            <p className="truncate text-xs text-muted">
                              {acc.nombre}
                              {acc.tipo ? ` · ${acc.tipo}` : ""}
                            </p>
                          </div>
                          <code className="shrink-0 rounded bg-white px-2 py-1 text-xs font-semibold text-primary ring-1 ring-line">
                            {acc.password}
                          </code>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-xs text-muted">
                También funciona cualquier correo institucional de los 12
                estudiantes (p. ej.{" "}
                <span className="font-semibold text-ink">
                  ana.flores@universidad.edu.pe
                </span>
                ) con la contraseña{" "}
                <span className="font-semibold text-ink">123456</span>.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
