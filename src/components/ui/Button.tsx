import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "success"
  | "outline"
  | "ghost";

type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-600 shadow-sm",
  secondary: "bg-secondary text-white hover:bg-secondary-600 shadow-sm",
  danger: "bg-danger text-white hover:bg-danger-700 shadow-sm",
  success: "bg-success text-white hover:bg-success-700 shadow-sm",
  outline:
    "border border-line bg-white text-ink hover:bg-surface hover:border-slate-300",
  ghost: "text-muted hover:bg-surface hover:text-ink",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  icon,
  children,
  className = "",
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-55 ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 size={17} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}
