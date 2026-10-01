import { BrowserRouter, Navigate, Route, Routes, Outlet } from "react-router-dom";
import { AppProvider, useApp } from "@/context/AppContext";
import { ToastProvider } from "@/context/ToastContext";
import { Toaster } from "@/components/ui/Toaster";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";

import { LoginPage } from "@/pages/LoginPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

import { HomePage } from "@/pages/student/HomePage";
import { ReservePage } from "@/pages/student/ReservePage";
import { MyReservationsPage } from "@/pages/student/MyReservationsPage";
import { InfoPage } from "@/pages/student/InfoPage";

import { DashboardPage } from "@/pages/admin/DashboardPage";
import { ReservationsPage } from "@/pages/admin/ReservationsPage";
import { CupsPage } from "@/pages/admin/CupsPage";
import { StudentsPage } from "@/pages/admin/StudentsPage";
import { ValidationPage } from "@/pages/admin/ValidationPage";
import { SettingsPage } from "@/pages/admin/SettingsPage";

import { KioskPage } from "@/pages/kiosk/KioskPage";

import type { UserRole } from "@/types";

const homeOf = (role: UserRole) => (role === "admin" ? "/admin" : "/student");

/**
 * Base del router: "/" en local y "/Comedor-Universitario" cuando la app
 * se sirve desde GitHub Pages (lo define `base` en vite.config.ts).
 */
const routerBasename = import.meta.env.BASE_URL.replace(/\/+$/, "");

/** Guarda de sesión: exige login y, opcionalmente, un rol específico. */
function RequireAuth({ role }: { role?: UserRole }) {
  const { session } = useApp();

  if (!session) return <Navigate to="/login" replace />;

  if (role && session.role !== role) {
    // Evita que un estudiante entre al panel admin y viceversa.
    return <Navigate to={homeOf(session.role)} replace />;
  }

  return <Outlet />;
}

/** Redirección desde la raíz según la sesión activa. */
function HomeRedirect() {
  const { session } = useApp();
  return <Navigate to={session ? homeOf(session.role) : "/login"} replace />;
}

/** Muestra el login, salvo que ya exista una sesión. */
function LoginRoute() {
  const { session } = useApp();
  if (session) return <Navigate to={homeOf(session.role)} replace />;
  return <LoginPage />;
}

export default function App() {
  return (
    <ToastProvider>
      <AppProvider>
        <BrowserRouter basename={routerBasename}>
          <Toaster />
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<LoginRoute />} />

            {/* Módulo estudiante */}
            <Route element={<RequireAuth role="estudiante" />}>
              <Route path="/student" element={<StudentLayout />}>
                <Route index element={<HomePage />} />
                <Route path="reservar" element={<ReservePage />} />
                <Route path="reservas" element={<MyReservationsPage />} />
                <Route path="informacion" element={<InfoPage />} />
              </Route>
            </Route>

            {/* Módulo administrador */}
            <Route element={<RequireAuth role="admin" />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="reservas" element={<ReservationsPage />} />
                <Route path="cupos" element={<CupsPage />} />
                <Route path="estudiantes" element={<StudentsPage />} />
                <Route path="validacion" element={<ValidationPage />} />
                <Route path="configuracion" element={<SettingsPage />} />
              </Route>
            </Route>

            {/* Kiosco (accesible con cualquier sesión) */}
            <Route element={<RequireAuth />}>
              <Route path="/kiosco" element={<KioskPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </ToastProvider>
  );
}
