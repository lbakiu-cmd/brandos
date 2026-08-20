export interface BadgeProps {
  label: string;
  variant?: "success" | "warning" | "danger" | "neutral" | "info";
}

export function getBadgeClasses(variant: BadgeProps["variant"] = "neutral"): string {
  switch (variant) {
    case "success":
      return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
    case "warning":
      return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
    case "danger":
      return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
    case "info":
      return "bg-sky-500/10 text-sky-400 border border-sky-500/20";
    default:
      return "bg-slate-800 text-slate-300 border border-slate-700";
  }
}
