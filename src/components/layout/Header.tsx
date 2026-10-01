import { LogOut, Menu, UtensilsCrossed } from "lucide-react";
import { BRAND } from "@/data/brand";

interface HeaderProps {
  onMenuClick: () => void;
  user: {
    nombre: string;
    subtitulo: string;
    iniciales: string;
  };
  onLogout: () => void;
}

export function Header({ onMenuClick, user, onLogout }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/85 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
        {/* Izquierda: menú móvil + marca */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Abrir menú"
            className="rounded-lg border border-line p-2 text-primary transition hover:bg-surface lg:hidden"
          >
            <Menu size={20} />
          </button>
          <span className="flex items-center gap-2 text-primary">
            <UtensilsCrossed size={20} />
            <span className="truncate text-[15px] font-bold tracking-tight">
              {BRAND.name}
            </span>
          </span>
        </div>

        {/* Derecha: usuario + cerrar sesión */}
        <div className="flex items-center gap-3">
          <div className="hidden text-right md:block">
            <p className="max-w-[14rem] truncate text-sm font-semibold leading-tight text-ink">
              {user.nombre}
            </p>
            <p className="text-xs text-muted">{user.subtitulo}</p>
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary">
            {user.iniciales}
          </span>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-danger transition hover:border-danger hover:bg-danger-50"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
}
