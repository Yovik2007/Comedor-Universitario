import { copyFileSync } from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * GitHub Pages publica el sitio en https://<usuario>.github.io/Comedor-Universitario/
 * (una subcarpeta), por lo que ese build necesita una "base" distinta.
 * Local (dev/preview) sigue usando "/".
 *
 * Build para Pages:  GITHUB_PAGES=1 npm run build
 * Build normal:      npm run build
 */
const isGitHubPages = process.env.GITHUB_PAGES === "1";

/**
 * GitHub Pages no sirve index.html para rutas internas (devuelve 404),
 * así que copiamos el shell de la app a 404.html: al cargarlo, el router
 * lee la URL y muestra la página correspondiente (fallback SPA).
 */
function spaFallback(): Plugin {
  return {
    name: "spa-404-fallback",
    apply: "build",
    closeBundle() {
      const outDir = path.resolve(__dirname, "dist");
      copyFileSync(path.join(outDir, "index.html"), path.join(outDir, "404.html"));
    },
  };
}

export default defineConfig({
  base: isGitHubPages ? "/Comedor-Universitario/" : "/",
  server: {
    port: 3000,
  },
  plugins: [react(), tailwindcss(), spaFallback()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
