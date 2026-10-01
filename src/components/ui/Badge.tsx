import type { ReactNode } from "react";

export type BadgeVariant =
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "primary"
  | "neutral";

const variants: Record<BadgeVariant, string> = {
  success: "bg-success-50 text-success-700 ring-success/25",
  danger: "bg-danger-50 text-danger-700 ring-danger/25",
  warning: "bg-warning-50 text-warning-700 ring-warning/25",
  info: "bg-secondary-50 text-secondary ring-secondary/25",
  primary: "bg-primary-50 text-primary ring-primary/20",
  neutral: "bg-surface text-muted ring-line",
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}

export function Badge({
  variant = "neutral",
  children,
  dot = false,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${variants[variant]} ${className}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/** Variante de badge según el estado de una reserva. */
export function statusBadgeVariant(
  status: "Activa" | "Utilizada" | "Cancelada",
): BadgeVariant {
  if (status === "Activa") return "success";
  if (status === "Utilizada") return "info";
  return "danger";
}
