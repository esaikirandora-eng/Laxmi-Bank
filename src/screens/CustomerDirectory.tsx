import { useMemo, useState } from "react";
import { useLedger } from "../store";
import { Avatar } from "../components/Avatar";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { IconPlus, IconSearch, IconChevronRight, IconMapPin, IconPhone } from "../components/Icon";
import { formatCurrency, formatDate } from "../utils/format";

interface CustomerDirectoryProps {
  onOpenCustomer: (id: string) => void;
  onAddCustomer: () => void;
}

export function CustomerDirectory({ onOpenCustomer, onAddCustomer }: CustomerDirectoryProps) {
  const { customers, loans, computeLoanStats, deleteCustomer, exportToCSV } = useLedger();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "closed">("all");

  const rows = useMemo(() => {
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
        const lastDate = statsArr
          .flatMap((s) => s.repayments.map((r) => r.paymentDate))
          .sort()
          .pop();
        const hasActive = cLoans.some((l) => l.status === "Active");
        const allClosed = cLoans.length > 0 && !hasActive;
        return {
          customer: c,
          loanCount: cLoans.length,
          totalLent,
          totalInterestPaid,
          outstanding,
          lastDate,
          hasActive,
          allClosed,
        };
      })
      .sort((a, b) => b.totalLent - a.totalLent);
  }, [customers, loans, computeLoanStats]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesQ =
        !q ||
        r.customer.fullName.toLowerCase().includes(q) ||
        r.customer.phone.toLowerCase().includes(q) ||
        r.customer.city.toLowerCase().includes(q) ||
        r.customer.id.toLowerCase().includes(q);
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "active"
          ? r.hasActive
          : r.allClosed;
      return matchesQ && matchesFilter;
    });
  }, [rows, query, filter]);

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500 mt-1">
            {customers.length} {customers.length === 1 ? "customer" : "customers"} in your ledger
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={exportToCSV}>
            Export CSV
          </Button>
          <Button icon={<IconPlus size={16} />} onClick={onAddCustomer}>
            Add New Customer
          </Button>
        </div>
      </header>

      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-3 px-5 py-4 border-b border-slate-100 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md w-full">
            <IconSearch
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search customers by name, phone, city…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-2 text-sm placeholder:text-slate-400 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition"
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 text-xs font-medium self-start">
            {(
              [
                { id: "all", label: "All" },
                { id: "active", label: "Active Loans" },
                { id: "closed", label: "Closed" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`px-3 py-1.5 rounded-md transition ${
                  filter === t.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/50 border-b border-slate-100">
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3 text-right">Loans</th>
                <th className="px-5 py-3 text-right">Total Lent</th>
                <th className="px-5 py-3 text-right">Interest Paid</th>
                <th className="px-5 py-3 text-right">Outstanding</th>
                <th className="px-5 py-3">Last Payment</th>
                <th className="px-5 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <div className="text-sm font-medium text-slate-900">No customers found</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {query
                        ? "Try a different search term"
                        : "Get started by adding your first customer"}
                    </div>
                    {!query && (
                      <Button
                        size="sm"
                        className="mt-4"
                        icon={<IconPlus size={14} />}
                        onClick={onAddCustomer}
                      >
                        Add Customer
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr
                    key={r.customer.id}
                    onClick={() => onOpenCustomer(r.customer.id)}
                    className="group cursor-pointer hover:bg-slate-50/80 transition"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={r.customer.fullName} size={36} />
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">
                            {r.customer.fullName}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {r.customer.id} · Joined {formatDate(r.customer.createdAt)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-slate-700 text-xs flex items-center gap-1.5">
                        <IconPhone size={11} className="text-slate-400" />
                        <span className="tabular">{r.customer.phone || "—"}</span>
                      </div>
                      <div className="text-slate-500 text-[11px] flex items-center gap-1.5 mt-0.5">
                        <IconMapPin size={11} className="text-slate-400" />
                        {r.customer.city || "—"}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right tabular">
                      <span className="font-semibold text-slate-900">{r.loanCount}</span>
                      {r.hasActive && (
                        <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle" />
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular font-semibold text-slate-900">
                      {formatCurrency(r.totalLent)}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular text-slate-700">
                      {formatCurrency(r.totalInterestPaid)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {r.outstanding > 0 ? (
                        <span className="tabular font-semibold text-amber-700">
                          {formatCurrency(r.outstanding)}
                        </span>
                      ) : (
                        <Badge tone="success">Settled</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      {r.lastDate ? formatDate(r.lastDate) : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Delete ${r.customer.fullName} and all their loans?`)) {
                              deleteCustomer(r.customer.id);
                            }
                          }}
                          className="text-xs text-rose-600 hover:text-rose-700 px-2 py-0.5 rounded hover:bg-rose-50"
                        >
                          Delete
                        </button>
                        <IconChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition" />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
