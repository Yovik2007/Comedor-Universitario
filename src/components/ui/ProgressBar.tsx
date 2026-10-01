interface ProgressBarProps {
  percent: number;
  tone?: "primary" | "success" | "warning" | "danger" | "accent";
}

const tones: Record<NonNullable<ProgressBarProps["tone"]>, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  accent: "bg-accent-600",
};

export function ProgressBar({ percent, tone = "primary" }: ProgressBarProps) {
  const value = Math.max(0, Math.min(100, percent));
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 w-full overflow-hidden rounded-full bg-surface"
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ${tones[tone]}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
