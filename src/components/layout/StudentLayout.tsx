import { useState } from "react";
import { Outlet } from "react-router-dom";
import {
  CalendarPlus,
  Info,
  LayoutDashboard,
  TicketCheck,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import type { SidebarItem } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useApp } from "@/context/AppContext";
import { BRAND } from "@/data/brand";
import { initialsOf } from "@/utils/text";

const navItems: SidebarItem[] = [
  { to: "/student", label: "Inicio", icon: LayoutDashboard, end: true },
  { to: "/student/reservar", label: "Reservar", icon: CalendarPlus },
  { to: "/student/reservas", label: "Mis reservas", icon: TicketCheck },
  { to: "/student/informacion", label: "Información", icon: Info },
];

export function StudentLayout() {
  const { session, currentStudent, logout } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const nombre = currentStudent?.nombre ?? session?.nombre ?? "Estudiante";
  const tipo = currentStudent?.tipo ?? session?.tipo ?? "Libre";
  const user = {
    nombre,
    subtitulo: `Estudiante · ${tipo}`,
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
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          user={user}
          onLogout={logout}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
        <footer className="px-4 py-4 text-center text-xs text-muted sm:px-6">
          {BRAND.name} · {BRAND.tagline} · Datos simulados
        </footer>
      </div>
    </div>
  );
}
