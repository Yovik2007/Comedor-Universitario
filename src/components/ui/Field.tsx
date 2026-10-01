import type { ReactNode } from "react";

export const inputCls =
  "w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm outline-none transition placeholder:text-slate-400 focus:border-secondary focus:ring-2 focus:ring-secondary/15 disabled:cursor-not-allowed disabled:bg-surface";

export const labelCls = "mb-1.5 block text-sm font-semibold text-ink";

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className = "",
}: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className={labelCls}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}
