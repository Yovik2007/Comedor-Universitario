import type { ComponentType, ReactNode } from "react";
import type { LucideProps } from "lucide-react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: ComponentType<LucideProps>;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/60 text-center ${compact ? "px-4 py-8" : "px-6 py-14"}`}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface text-muted">
        <Icon size={22} />
      </div>
      <p className="text-base font-semibold text-ink">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
