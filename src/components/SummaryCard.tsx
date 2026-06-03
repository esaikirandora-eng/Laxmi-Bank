import type { ReactNode } from "react";

interface SummaryCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  trend?: { value: string; positive?: boolean };
  tone?: "indigo" | "emerald" | "amber" | "rose" | "sky";
}

const toneMap: Record<NonNullable<SummaryCardProps["tone"]>, { ring: string; bg: string; iconBg: string; iconColor: string }> = {
  indigo: { ring: "ring-indigo-100", bg: "from-indigo-500/8 to-indigo-500/0", iconBg: "bg-indigo-50", iconColor: "text-indigo-600" },
  emerald: { ring: "ring-emerald-100", bg: "from-emerald-500/8 to-emerald-500/0", iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
  amber: { ring: "ring-amber-100", bg: "from-amber-500/8 to-amber-500/0", iconBg: "bg-amber-50", iconColor: "text-amber-600" },
  rose: { ring: "ring-rose-100", bg: "from-rose-500/8 to-rose-500/0", iconBg: "bg-rose-50", iconColor: "text-rose-600" },
  sky: { ring: "ring-sky-100", bg: "from-sky-500/8 to-sky-500/0", iconBg: "bg-sky-50", iconColor: "text-sky-600" },
};

export function SummaryCard({ label, value, hint, icon, trend, tone = "indigo" }: SummaryCardProps) {
  const t = toneMap[tone];
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-white p-5 ring-1 ${t.ring} shadow-sm shadow-slate-200/40`}>
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${t.bg}`} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 tabular tracking-tight">{value}</div>
          {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${t.iconBg} ${t.iconColor} shrink-0`}>
          {icon}
        </div>
      </div>
      {trend && (
        <div className="relative mt-3 flex items-center gap-1.5 text-xs">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${
              trend.positive
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            }`}
          >
            {trend.value}
          </span>
          <span className="text-slate-500">vs last month</span>
        </div>
      )}
    </div>
  );
}
