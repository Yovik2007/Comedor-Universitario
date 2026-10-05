/**
 * Cliente de Supabase del UNJFSC Comedor digital.
 *
 * Las credenciales salen de las variables de entorno Vite (.env):
 *   VITE_SUPABASE_URL        -> Project URL
 *   VITE_SUPABASE_ANON_KEY   -> clave pública anon / publishable
 *
 * Si faltan, `supabase` queda en null y la aplicación entera sigue
 * funcionando en modo local con localStorage (modo demostración).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = String(import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const anonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();

/** true cuando hay credenciales completas y se usará la base de datos. */
export const isSupabaseEnabled = Boolean(url && anonKey);

/** Cliente REST de Supabase (null si no hay credenciales). */
export const supabase: SupabaseClient | null = isSupabaseEnabled
  ? createClient(url, anonKey, {
      // Sesión real de Supabase Auth: se guarda en el navegador y se
      // renueva sola, así el usuario sigue conectado al recargar.
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;

/** Nombre del proyecto, para mostrarlo en la interfaz. */
export const SUPABASE_PROJECT_NAME = "COMEDOR UNJFSC";
