import { NavLink } from "react-router-dom";
import type { ComponentType, ReactNode } from "react";
import type { LucideProps } from "lucide-react";
import { LogOut, UtensilsCrossed, X } from "lucide-react";
import { BRAND } from "@/data/brand";

export interface SidebarItem {
  to: string;
  label: string;
  icon: ComponentType<LucideProps>;
  end?: boolean;
}

interface SidebarProps {
  items: SidebarItem[];
  open: boolean;
  onClose: () => void;
  user: {
    nombre: string;
    subtitulo: string;
    iniciales: string;
  };
  onLogout: () => void;
  /** Contenido extra sobre el bloque de usuario (ej. enlaces rápidos). */
  extra?: ReactNode;
}

export function Sidebar({
  items,
  open,
  onClose,
  user,
  onLogout,
  extra,
}: SidebarProps) {
  return (
    <>
      {/* Fondo para móviles */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-slate-950/50 transition-opacity lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-primary text-white shadow-xl transition-transform duration-200 lg:static lg:z-auto lg:w-72 lg:max-w-none lg:shrink-0 lg:translate-x-0 lg:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Marca */}
        <div className="flex items-center justify-between gap-3 px-5 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-accent">
              <UtensilsCrossed size={22} />
            </span>
            <div className="leading-tight">
              <p className="text-[15px] font-bold">{BRAND.name}</p>
              <p className="text-xs text-white/60">{BRAND.tagline}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navegación */}
        <nav className="mt-2 flex-1 overflow-y-auto px-3 pb-4">
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-white/15 text-white shadow-sm"
                        : "text-white/65 hover:bg-white/10 hover:text-white"
                    }`
                  }
                >
                  <item.icon size={19} className="shrink-0" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>

          {extra && <div className="mt-6 px-1.5">{extra}</div>}
        </nav>

        {/* Usuario + sesión */}
        <div className="border-t border-white/10 px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/20 text-sm font-bold text-accent">
              {user.iniciales}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.nombre}</p>
              <p className="truncate text-xs text-white/60">{user.subtitulo}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-danger hover:cursor-pointer"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
