import { useEffect } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";
import type { ButtonVariant } from "./Button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl animate-fade-up sm:rounded-2xl ${sizes[size]}`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-primary">{title}</h2>
            {description && (
              <p className="mt-0.5 text-sm text-muted">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-muted transition hover:bg-surface hover:text-ink"
          >
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">{children}</div>

        {footer && (
          <footer className="flex flex-col-reverse gap-2 border-t border-line bg-surface/60 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  /** Contenido opcional (pares clave/valor del resumen). */
  children?: ReactNode;
  /** Pregunta final antes de confirmar. */
  question?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Extract<ButtonVariant, "primary" | "danger" | "success">;
  loading?: boolean;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  children,
  question = "¿Deseas confirmar esta acción?",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "primary",
  loading = false,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
      <p className="mt-4 text-sm font-medium text-ink">{question}</p>
    </Modal>
  );
}

/** Fila de resumen usada dentro de modales de confirmación. */
export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line/70 py-2 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-semibold text-ink">{value}</span>
    </div>
  );
}
