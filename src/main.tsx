import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { BRAND } from "./data/brand";
import "./index.css";

// Título de la pestaña (fuente única: src/data/brand.ts)
document.title = BRAND.documentTitle;

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("No se encontró el elemento #root para montar la aplicación.");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
