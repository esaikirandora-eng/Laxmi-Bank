import { IconBank, IconDashboard, IconUsers } from "./Icon";

export type View = "dashboard" | "customers" | "loans";

interface SidebarProps {
  view: View;
  onView: (v: View) => void;
}

const items: { id: View; label: string; icon: typeof IconDashboard; count?: number }[] = [
  { id: "dashboard", label: "Dashboard", icon: IconDashboard },
  { id: "customers", label: "Customers", icon: IconUsers },
];

export function Sidebar({ view, onView }: SidebarProps) {
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-slate-800/40 bg-slate-900 text-slate-200">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800/60">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-900/40">
          <IconBank size={18} className="text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white tracking-tight">Ledger</div>
          <div className="text-[11px] text-slate-400 -mt-0.5">Loan & Interest Manager</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((it) => {
          const Icon = it.icon;
          const active = view === it.id;
          return (
            <button
              key={it.id}
              onClick={() => onView(it.id)}
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-slate-800/80 text-white shadow-inner shadow-black/20"
                  : "text-slate-400 hover:bg-slate-800/40 hover:text-white"
              }`}
            >
              <Icon size={18} className={active ? "text-indigo-300" : ""} />
              <span>{it.label}</span>
              {it.count !== undefined && (
                <span className="ml-auto rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
                  {it.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="m-3 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/10 border border-indigo-400/20 p-4">
        <div className="text-xs font-semibold text-indigo-200 uppercase tracking-wider">Pro tip</div>
        <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">
          Use <span className="text-white font-medium">"Both"</span> for EMI-style payments — interest is
          settled first, the rest goes to principal.
        </p>
      </div>

      <div className="border-t border-slate-800/60 px-5 py-4 text-[11px] text-slate-500">
        v1.0 · Local-first data
      </div>
    </aside>
  );
}
