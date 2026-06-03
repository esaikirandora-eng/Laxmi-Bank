import { useMemo, useState } from "react";
import { useLedger } from "../store";
import { SummaryCard } from "../components/SummaryCard";
import { Avatar } from "../components/Avatar";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import {
  IconArrowRight,
  IconCoins,
  IconDownload,
  IconPlus,
  IconSearch,
  IconTrendingUp,
  IconUpload,
  IconUsers,
  IconWallet,
} from "../components/Icon";
import { formatCurrency, formatDate, initials } from "../utils/format";

interface DashboardProps {
  onOpenCustomer: (id: string) => void;
  onAddCustomer: () => void;
  onNavigateCustomers: () => void;
  lastSync: string | null;
  pushing: boolean;
  pulling: boolean;
  onPush: () => Promise<void>;
  onPull: () => Promise<void>;
}

export function Dashboard({ onOpenCustomer, onAddCustomer, onNavigateCustomers, lastSync, pushing, pulling, onPush, onPull }: DashboardProps) {
  const {
    customers,
    loans,
    computeLoanStats,
    exportToCSV,
    totalPrincipalLent,
    totalInterestCollected,
    totalOutstandingPrincipal,
    totalOutstandingInterest,
    totalActiveCustomers,
  } = useLedger();
  const [query, setQuery] = useState("");
  const [showQuickRepay, setShowQuickRepay] = useState(false);

  const enrichedCustomers = useMemo(() => {
    return customers
      .map((c) => {
        const cLoans = loans.filter((l) => l.customerId === c.id);
        const statsArr = cLoans.map((l) => computeLoanStats(l, c));
        const totalLent = statsArr.reduce((s, st) => s + st.loan.principalAmount, 0);
        const totalInterestPaid = statsArr.reduce((s, st) => s + st.interestPaid, 0);
        const outstanding = statsArr.reduce(
          (s, st) => s + (st.loan.status === "Active" ? st.remainingPrincipal : 0),
          0
        );
        const outstandingInterest = statsArr.reduce(
          (s, st) => s + (st.loan.status === "Active" ? st.remainingInterest : 0),
          0
        );
        const lastDate = statsArr
          .flatMap((s) => s.repayments.map((r) => r.paymentDate))
          .sort()
          .pop();
        return {
          customer: c,
          loanCount: cLoans.length,
          activeLoanCount: cLoans.filter((l) => l.status === "Active").length,
          totalLent,
          totalInterestPaid,
          outstanding,
          outstandingInterest,
          lastDate,
        };
      })
      .sort((a, b) => b.totalLent - a.totalLent);
  }, [customers, loans, computeLoanStats]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return enrichedCustomers;
    return enrichedCustomers.filter(
      (e) =>
        e.customer.fullName.toLowerCase().includes(q) ||
        e.customer.phone.toLowerCase().includes(q) ||
        e.customer.city.toLowerCase().includes(q) ||
        e.customer.id.toLowerCase().includes(q)
    );
  }, [enrichedCustomers, query]);

  // Recent activity
  const recentRepayments = useMemo(() => {
    return loans
      .flatMap((l) => {
        const c = customers.find((cu) => cu.id === l.customerId)!;
        const stats = computeLoanStats(l, c);
        return stats.repayments.map((r) => ({ ...r, loan: l, customer: c }));
      })
      .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))
      .slice(0, 5);
  }, [loans, customers, computeLoanStats]);

  // Compute overdue interest and active loans for quick actions
  const activeLoansWithStats = useMemo(() => {
    return loans
      .filter((l) => l.status === "Active")
      .map((l) => {
        const c = customers.find((cu) => cu.id === l.customerId);
        if (!c) return null;
        const st = computeLoanStats(l, c);
        const isOverdue = st.monthsPaid < st.monthsElapsed;
        return { loan: l, customer: c, stats: st, isOverdue };
      })
      .filter(Boolean) as any[];
  }, [loans, customers, computeLoanStats]);

  const totalOverdueInterest = useMemo(() => {
    return activeLoansWithStats.reduce((sum, item) => {
      const { stats } = item;
      const unpaidMonths = Math.max(0, stats.monthsElapsed - stats.monthsPaid);
      const monthly = stats.monthlyInterest;
      return sum + (monthly * unpaidMonths);
    }, 0);
  }, [activeLoansWithStats]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">
              A snapshot of your lending book — money out, interest collected, and active customers.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="secondary"
              onClick={onPull}
              loading={pulling}
              icon={<IconDownload size={14} />}
            >
              {pulling ? "Pulling…" : "Pull from Supabase"}
            </Button>
            <Button
              size="sm"
              onClick={onPush}
              loading={pushing}
              icon={<IconUpload size={14} />}
            >
              {pushing ? "Pushing…" : "Push to Supabase"}
            </Button>
            <Button size="sm" variant="primary" icon={<IconPlus size={14} />} onClick={onAddCustomer}>
              Add Customer
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={exportToCSV}
              icon={<IconDownload size={14} />}
            >
              Export CSV
            </Button>
          </div>
        </div>

        {/* Sync status */}
        {lastSync && (
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Last synced {new Date(lastSync).toLocaleTimeString()}
          </div>
        )}
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Money Out"
          value={formatCurrency(totalPrincipalLent)}
          hint="Cumulative principal disbursed"
          icon={<IconWallet size={18} />}
          tone="indigo"
        />
        <SummaryCard
          label="Total Interest Collected"
          value={formatCurrency(totalInterestCollected)}
          hint="Lifetime interest received"
          icon={<IconCoins size={18} />}
          tone="emerald"
        />
        <SummaryCard
          label="Active Customers"
          value={String(totalActiveCustomers)}
          hint={`${customers.length} total customers`}
          icon={<IconUsers size={18} />}
          tone="sky"
        />
        <SummaryCard
          label="Outstanding Balance"
          value={formatCurrency(totalOutstandingPrincipal + totalOutstandingInterest)}
          hint={`${formatCurrency(totalOutstandingPrincipal)} principal · ${formatCurrency(
            totalOutstandingInterest
          )} interest`}
          icon={<IconTrendingUp size={18} />}
          tone="amber"
        />
        <SummaryCard
          label="Overdue Interest"
          value={formatCurrency(totalOverdueInterest)}
          hint={activeLoansWithStats.length > 0 ? `${activeLoansWithStats.filter((x: any) => x.isOverdue).length} loans behind` : "All current"}
          icon={<IconTrendingUp size={18} />}
          tone="rose"
        />
      </div>

      {/* Quick Repayments + Insights */}
      {activeLoansWithStats.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-slate-900">Quick Repayments</h3>
              <p className="text-xs text-slate-500">Log payments for active loans directly</p>
            </div>
            <button
              onClick={() => setShowQuickRepay(!showQuickRepay)}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              {showQuickRepay ? "Hide" : "Show all"}
            </button>
          </div>

          <div className={`${showQuickRepay ? "" : "max-h-[128px] overflow-hidden"}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeLoansWithStats.slice(0, showQuickRepay ? 12 : 3).map((item: any) => {
                const { loan, customer, stats, isOverdue } = item;
                return (
                  <div key={loan.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm">
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="font-medium text-slate-900 truncate">{customer.fullName}</div>
                      <div className="text-xs text-slate-500 tabular">
                        {loan.id} · {formatCurrency(stats.remainingPrincipal)} left
                      </div>
                      {isOverdue && (
                        <div className="text-[10px] mt-0.5 text-rose-600 font-medium">Overdue</div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        // Navigate to the customer profile and open repayment modal from there
                        onOpenCustomer(customer.id);
                      }}
                      className="shrink-0 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                    >
                      Log Payment
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer quick-find */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Find a customer</h2>
              <p className="text-xs text-slate-500 mt-0.5">Search by name, phone, or city</p>
            </div>
            <button
              onClick={onNavigateCustomers}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
            >
              View all <IconArrowRight size={12} />
            </button>
          </div>
          <div className="px-5 pt-4">
            <div className="relative">
              <IconSearch
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a customer name, phone or city…"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-2.5 text-sm placeholder:text-slate-400 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition"
              />
            </div>
          </div>
          <div className="px-2 py-2 max-h-96 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-10 text-center text-sm text-slate-500">
                No customers match "{query}".
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filtered.slice(0, 8).map((e) => (
                  <li key={e.customer.id}>
                    <button
                      onClick={() => onOpenCustomer(e.customer.id)}
                      className="group w-full text-left flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-50 transition"
                    >
                      <Avatar name={e.customer.fullName} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-slate-900 truncate">
                            {e.customer.fullName}
                          </div>
                          {e.activeLoanCount > 0 ? (
                            <Badge tone="success">Active</Badge>
                          ) : (
                            <Badge tone="neutral">No active loan</Badge>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 truncate">
                          {e.customer.city} · {e.loanCount} loan{e.loanCount === 1 ? "" : "s"} · Lent{" "}
                          <span className="tabular">{formatCurrency(e.totalLent)}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs text-slate-500">Outstanding</div>
                        <div className="text-sm font-semibold text-slate-900 tabular">
                          {formatCurrency(e.outstanding)}
                        </div>
                      </div>
                      <IconArrowRight
                        size={14}
                        className="text-slate-300 group-hover:text-indigo-500 transition shrink-0"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Recent activity */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Recent Repayments</h2>
            <p className="text-xs text-slate-500 mt-0.5">Last 5 payments received</p>
          </div>
          <div className="px-2 py-2">
            {recentRepayments.length === 0 ? (
              <div className="px-3 py-10 text-center text-sm text-slate-500">
                No repayments yet.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentRepayments.map((r) => (
                  <li key={r.id} className="px-3 py-3 flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-semibold shrink-0 ${
                        r.paymentType === "Interest Only"
                          ? "bg-amber-50 text-amber-700"
                          : r.paymentType === "Principal Only"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-indigo-50 text-indigo-700"
                      }`}
                    >
                      {initials(r.customer.fullName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {r.customer.fullName}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {r.paymentType} · {formatDate(r.paymentDate)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold text-slate-900 tabular">
                        +{formatCurrency(r.amountPaid)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
