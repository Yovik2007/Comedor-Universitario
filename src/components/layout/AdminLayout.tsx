import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import {
  BadgeCheck,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  ScanLine,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import type { SidebarItem } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useApp } from "@/context/AppContext";
import { initialsOf } from "@/utils/text";

const navItems: SidebarItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/reservas", label: "Reservas", icon: ClipboardList },
  { to: "/admin/cupos", label: "Cupos", icon: SlidersHorizontal },
  { to: "/admin/estudiantes", label: "Estudiantes", icon: GraduationCap },
  { to: "/admin/validacion", label: "Validación", icon: BadgeCheck },
  { to: "/admin/configuracion", label: "Configuración", icon: Settings },
];

export function AdminLayout() {
  const { session, logout } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const nombre = session?.nombre ?? "Administrador";
  const user = {
    nombre,
    subtitulo: "Administrador",
    iniciales: initialsOf(nombre),
  };

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar
        items={navItems}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onLogout={logout}
        extra={
          <Link
            to="/kiosco"
            className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/30 px-3 py-2.5 text-xs font-semibold text-white/80 transition hover:border-accent hover:text-accent"
          >
            <ScanLine size={16} />
            Abrir módulo de kiosco
          </Link>
        }
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          user={user}
          onLogout={logout}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
        <footer className="px-4 py-4 text-center text-xs text-muted sm:px-6">
          Panel administrativo · Información simulada almacenada en este navegador
        </footer>
      </div>
    </div>
  );
}
