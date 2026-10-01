import type { ElementType } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import type { ToastType } from "@/context/ToastContext";

const styles: Record<ToastType, { wrap: string; icon: ElementType }> = {
  success: { wrap: "border-l-success", icon: CheckCircle2 },
  error: { wrap: "border-l-danger", icon: AlertCircle },
  info: { wrap: "border-l-secondary", icon: Info },
};

const iconColors: Record<ToastType, string> = {
  success: "text-success",
  error: "text-danger",
  info: "text-secondary",
};

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="pointer-events-none fixed inset-x-4 top-4 z-[60] flex flex-col gap-2 sm:inset-x-auto sm:right-6 sm:top-6 sm:w-[26rem]">
      {toasts.map((toast) => {
        const style = styles[toast.type];
        const Icon = style.icon;
        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border border-line border-l-4 bg-white px-4 py-3 shadow-lg animate-slide-in ${style.wrap}`}
          >
            <Icon size={19} className={`mt-0.5 shrink-0 ${iconColors[toast.type]}`} />
            <p className="flex-1 text-sm font-medium text-ink">{toast.message}</p>
            <button
              type="button"
              aria-label="Cerrar notificación"
              onClick={() => dismiss(toast.id)}
              className="rounded p-0.5 text-muted transition hover:text-ink"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
