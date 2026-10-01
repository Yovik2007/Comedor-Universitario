import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";

type Tone = "primary" | "secondary" | "accent" | "success" | "warning" | "danger";

const tones: Record<Tone, { box: string; icon: string }> = {
  primary: { box: "bg-primary-50", icon: "text-primary" },
  secondary: { box: "bg-secondary-50", icon: "text-secondary" },
  accent: { box: "bg-accent-50", icon: "text-accent-600" },
  success: { box: "bg-success-50", icon: "text-success" },
  warning: { box: "bg-warning-50", icon: "text-warning" },
  danger: { box: "bg-danger-50", icon: "text-danger" },
};

interface StatCardProps {
  icon: ComponentType<LucideProps>;
  label: string;
  value: string | number;
  hint?: string;
  tone?: Tone;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "primary",
}: StatCardProps) {
  const palette = tones[tone];
  return (
    <div className="card flex items-center gap-4 p-5">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${palette.box}`}
      >
        <Icon size={22} className={palette.icon} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-muted">{label}</p>
        <p className="text-2xl font-bold leading-tight text-ink">{value}</p>
        {hint && <p className="mt-0.5 truncate text-xs text-muted">{hint}</p>}
      </div>
    </div>
  );
}
