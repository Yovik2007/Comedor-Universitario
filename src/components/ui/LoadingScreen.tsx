import { BRAND } from "@/data/brand";

/**
 * Pantalla de bienvenida mientras se cargan los datos de la base de datos.
 * Se muestra solo al arrancar la aplicación (una fracción de segundo).
 */
export function LoadingScreen({
  message = "Cargando los datos del comedor…",
}: {
  message?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-surface px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-accent shadow-lg">
        <span className="text-2xl">🍽️</span>
      </span>

      <div>
        <p className="text-xl font-bold text-primary">{BRAND.name}</p>
        <p className="mt-1 text-sm text-muted">{BRAND.tagline}</p>
      </div>

      <div role="status" aria-live="polite" className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="h-5 w-5 animate-spin rounded-full border-[3px] border-primary border-t-transparent"
        />
        <span className="text-sm font-medium text-ink">{message}</span>
      </div>
    </div>
  );
}
