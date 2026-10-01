import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toasts: Toast[];
  push: (type: ToastType, message: string) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type: ToastType, message: string) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, type, message }]);
      window.setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({ toasts, push, dismiss }),
    [toasts, push, dismiss],
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast debe usarse dentro de <ToastProvider>");
  }
  return ctx;
}
