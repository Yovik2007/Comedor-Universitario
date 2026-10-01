import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary">
        <Compass size={26} />
      </span>
      <p className="text-5xl font-bold text-primary">404</p>
      <h1 className="mt-2 text-xl font-bold text-ink">Página no encontrada</h1>
      <p className="mt-1 max-w-sm text-sm text-muted">
        La ruta que intentas abrir no existe o fue movida dentro del sistema.
      </p>
      <Link to="/login" className="mt-6">
        <Button>Volver al inicio de sesión</Button>
      </Link>
    </main>
  );
}
