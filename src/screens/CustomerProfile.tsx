import { useMemo, useState } from "react";
import { useLedger } from "../store";
import { Avatar } from "../components/Avatar";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { AddLoanForm } from "../forms/AddLoanForm";
import { AddRepaymentForm } from "../forms/AddRepaymentForm";
import {
  IconArrowLeft,
  IconCalendar,
  IconCheck,
  IconCoins,
  IconMapPin,
  IconPhone,
  IconPlus,
  IconReceipt,
  IconTrendingUp,
  IconUser,
  IconWallet,
} from "../components/Icon";
import { formatCurrency, formatDate } from "../utils/format";
import type { Loan } from "../types";

interface CustomerProfileProps {
  customerId: string;
  onBack: () => void;
}

export function CustomerProfile({ customerId, onBack }: CustomerProfileProps) {
  const {
    customers,
    loans,
    computeLoanStats,
    getLoansByCustomer,
    closeLoan,
    deleteLoan,
    deleteRepayment,
    deleteCustomer,
  } = useLedger();
  const customer = customers.find((c) => c.id === customerId);

  const [showAddLoan, setShowAddLoan] = useState(false);
  const [repaymentLoanId, setRepaymentLoanId] = useState<string | null>(null);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);

  if (!customer) {
    return (
      <div className="text-center py-20">
        <div className="text-slate-700 font-medium">Customer not found</div>
        <Button variant="secondary" className="mt-4" onClick={onBack}>
          Back to customers
        </Button>
      </div>
    );
  }

  const customerLoans = getLoansByCustomer(customerId);
  const loanStats = useMemo(
    () => customerLoans.map((l) => computeLoanStats(l, customer)),
    [customerLoans, customer, computeLoanStats]
  );

  // active loans only
  const activeLoans = loanStats.filter((s) => s.loan.status === "Active");
  const closedLoans = loanStats.filter((s) => s.loan.status !== "Active");

  // combined totals
  const totalLent = loanStats.reduce((s, st) => s + st.loan.principalAmount, 0);
  const totalInterestPaid = loanStats.reduce((s, st) => s + st.interestPaid, 0);
  const totalPrincipalPaid = loanStats.reduce((s, st) => s + st.principalPaid, 0);
  const totalOutstanding = loanStats.reduce(
    (s, st) => s + (st.loan.status === "Active" ? st.remainingPrincipal : 0),
    0
  );
  const totalOutstandingInterest = loanStats.reduce(
    (s, st) => s + (st.loan.status === "Active" ? st.remainingInterest : 0),
    0
  );

  const selectedLoan: Loan | undefined = selectedLoanId
    ? loans.find((l) => l.id === selectedLoanId)
    : activeLoans[0]?.loan;

  const selectedStats = selectedLoan
    ? loanStats.find((s) => s.loan.id === selectedLoan.id)
    : undefined;

  const repaymentLoanForModal = repaymentLoanId
    ? loans.find((l) => l.id === repaymentLoanId)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition"
        >
          <IconArrowLeft size={14} />
          Back to customers
        </button>
      </div>

      {/* Customer Header */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
        <div className="px-6 pb-5 -mt-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="ring-4 ring-white rounded-full">
                <Avatar name={customer.fullName} size={80} />
              </div>
              <div className="pb-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
                    {customer.fullName}
                  </h1>
                  {activeLoans.length > 0 ? (
                    <Badge tone="success">Active</Badge>
                  ) : (
                    <Badge tone="neutral">No active loans</Badge>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="inline-flex items-center gap-1.5">
                    <IconUser size={12} className="text-slate-400" />
                    {customer.id}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <IconPhone size={12} className="text-slate-400" />
                    {customer.phone || "—"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <IconMapPin size={12} className="text-slate-400" />
                    {customer.city || "—"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <IconCalendar size={12} className="text-slate-400" />
                    Joined {formatDate(customer.createdAt)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 sm:pb-1">
              <Button
                variant="secondary"
                icon={<IconPlus size={16} />}
                onClick={() => setShowAddLoan(true)}
              >
                New Loan
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  if (window.confirm(`Delete ${customer.fullName} and ALL their loans?`)) {
                    deleteCustomer(customer.id);
                    onBack();
                  }
                }}
              >
                Delete Customer
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Customer-level metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricTile
          label="Total Lent"
          value={formatCurrency(totalLent)}
          icon={<IconWallet size={16} />}
          tone="indigo"
        />
        <MetricTile
          label="Interest Paid"
          value={formatCurrency(totalInterestPaid)}
          icon={<IconCoins size={16} />}
          tone="emerald"
        />
        <MetricTile
          label="Principal Paid"
          value={formatCurrency(totalPrincipalPaid)}
          icon={<IconReceipt size={16} />}
          tone="sky"
        />
        <MetricTile
          label="Outstanding"
          value={formatCurrency(totalOutstanding + totalOutstandingInterest)}
          hint={`${formatCurrency(totalOutstanding)} principal · ${formatCurrency(
            totalOutstandingInterest
          )} interest`}
          icon={<IconTrendingUp size={16} />}
          tone="amber"
        />
      </div>

      {/* Active Loans */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
            Active Loans
          </h2>
          <span className="text-xs text-slate-500">{activeLoans.length} active</span>
        </div>
        {activeLoans.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-10 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
              <IconWallet size={20} />
            </div>
            <div className="text-sm font-medium text-slate-900">No active loans</div>
            <div className="text-xs text-slate-500 mt-1">
              Disburse a new loan to start tracking interest & repayments.
            </div>
            <Button
              size="sm"
              className="mt-4"
              icon={<IconPlus size={14} />}
              onClick={() => setShowAddLoan(true)}
            >
              Disburse Loan
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Loan list (left) */}
            <div className="lg:col-span-4 space-y-2">
              {activeLoans.map((s) => {
                const isSelected = selectedLoan?.id === s.loan.id;
                return (
                  <button
                    key={s.loan.id}
                    onClick={() => setSelectedLoanId(s.loan.id)}
                    className={`w-full text-left rounded-xl border p-4 transition ${
                      isSelected
                        ? "border-indigo-300 bg-indigo-50/40 ring-1 ring-indigo-200"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            {s.loan.id}
                          </span>
                          <Badge tone="success">Active</Badge>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Disbursed {formatDate(s.loan.dateGiven)} · {s.loan.interestRate}% p.m.
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-slate-500">Principal</div>
                        <div className="font-semibold tabular text-slate-900">
                          {formatCurrency(s.loan.principalAmount)}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500">Outstanding</div>
                        <div className="font-semibold tabular text-amber-700">
                          {formatCurrency(s.remainingPrincipal)}
                        </div>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <ProgressBar
                      value={s.principalPaid}
                      max={s.loan.principalAmount}
                      className="mt-3"
                    />
                  </button>
                );
              })}
            </div>

            {/* Selected loan detail (right) */}
            {selectedStats && selectedLoan && (
              <div className="lg:col-span-8 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">
                        Loan {selectedLoan.id}
                      </h3>
                      <Badge tone="success">Active</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Disbursed {formatDate(selectedLoan.dateGiven)} · {selectedLoan.interestRate}%
                      per month
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => closeLoan(selectedLoan.id)}
                    >
                      Mark Closed
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (window.confirm("Delete this loan and all its repayments?")) {
                          deleteLoan(selectedLoan.id);
                        }
                      }}
                    >
                      Delete Loan
                    </Button>
                    <Button
                      size="sm"
                      icon={<IconPlus size={14} />}
                      onClick={() => setRepaymentLoanId(selectedLoan.id)}
                    >
                      Add Repayment
                    </Button>
                  </div>
                </div>

                <div className="px-5 py-4 border-b border-slate-100">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <Stat
                      label="Total Interest Paid"
                      value={formatCurrency(selectedStats.interestPaid)}
                      tone="amber"
                    />
                    <Stat
                      label="Total Principal Paid"
                      value={formatCurrency(selectedStats.principalPaid)}
                      tone="emerald"
                    />
                    <Stat
                      label="Remaining Principal"
                      value={formatCurrency(selectedStats.remainingPrincipal)}
                      tone="rose"
                    />
                    <Stat
                      label="Months Paid"
                      value={String(selectedStats.monthsPaid)}
                      hint={`of ${selectedStats.monthsElapsed} elapsed`}
                      tone="indigo"
                    />
                  </div>
                </div>

                {/* Repayment ledger */}
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                      Repayment History
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      {selectedStats.repayments.length} entries
                    </span>
                  </div>
                  {selectedStats.repayments.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-500">
                      No repayments yet. Click "Add Repayment" to log the first payment.
                    </div>
                  ) : (
                    <div className="rounded-lg border border-slate-200 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 text-slate-500">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-[10px]">
                              Date
                            </th>
                            <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-[10px]">
                              Type
                            </th>
                            <th className="px-3 py-2 text-right font-semibold uppercase tracking-wider text-[10px]">
                              Interest
                            </th>
                            <th className="px-3 py-2 text-right font-semibold uppercase tracking-wider text-[10px]">
                              Principal
                            </th>
                          <th className="px-3 py-2 text-right font-semibold uppercase tracking-wider text-[10px]">
                            Total
                          </th>
                          <th className="w-6"></th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {[...selectedStats.repayments]
                            .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))
                            .map((r) => (
                              <tr key={r.id} className="hover:bg-slate-50/60">
                                <td className="px-3 py-2.5 text-slate-700 tabular">
                                  {formatDate(r.paymentDate)}
                                </td>
                                <td className="px-3 py-2.5">
                                  <Badge
                                    tone={
                                      r.paymentType === "Interest Only"
                                        ? "warning"
                                        : r.paymentType === "Principal Only"
                                        ? "success"
                                        : "primary"
                                    }
                                  >
                                    {r.paymentType}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2.5 text-right tabular text-amber-700">
                                  {r.interestPortion > 0
                                    ? formatCurrency(r.interestPortion)
                                    : "—"}
                                </td>
                                <td className="px-3 py-2.5 text-right tabular text-emerald-700">
                                  {r.principalPortion > 0
                                    ? formatCurrency(r.principalPortion)
                                    : "—"}
                                </td>
                                <td className="px-3 py-2.5 text-right tabular font-semibold text-slate-900">
                                  {formatCurrency(r.amountPaid)}
                                </td>
                                <td className="px-2 py-2.5">
                                  <button
                                    onClick={() => {
                                      if (window.confirm("Delete this repayment?")) {
                                        deleteRepayment(r.id);
                                      }
                                    }}
                                    className="text-[10px] text-rose-500 hover:text-rose-700 px-1"
                                  >
                                    ×
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Closed loans (collapsed) */}
      {closedLoans.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">
            Closed Loans
          </h2>
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm divide-y divide-slate-100">
            {closedLoans.map((s) => (
              <div key={s.loan.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <IconCheck size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900">{s.loan.id}</div>
                  <div className="text-[11px] text-slate-500">
                    {formatDate(s.loan.dateGiven)} · {s.loan.interestRate}% p.m. · Principal{" "}
                    {formatCurrency(s.loan.principalAmount)}
                  </div>
                </div>
                <Badge tone="success">Closed</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal
        open={showAddLoan}
        onClose={() => setShowAddLoan(false)}
        title="Disburse New Loan"
        description="Add a loan to this customer's account."
        size="md"
      >
        <AddLoanForm
          customerId={customerId}
          onDone={() => {
            setShowAddLoan(false);
          }}
          onCancel={() => setShowAddLoan(false)}
        />
      </Modal>

      <Modal
        open={!!repaymentLoanForModal}
        onClose={() => setRepaymentLoanId(null)}
        title="Log Repayment"
        description={
          repaymentLoanForModal
            ? `Recording payment for ${repaymentLoanForModal.id}`
            : ""
        }
        size="lg"
      >
        {repaymentLoanForModal && (
          <AddRepaymentForm
            loanId={repaymentLoanForModal.id}
            onDone={() => setRepaymentLoanId(null)}
            onCancel={() => setRepaymentLoanId(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function MetricTile({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  tone: "indigo" | "emerald" | "sky" | "amber" | "rose";
}) {
  const toneMap: Record<string, { bg: string; color: string }> = {
    indigo: { bg: "bg-indigo-50", color: "text-indigo-600" },
    emerald: { bg: "bg-emerald-50", color: "text-emerald-600" },
    sky: { bg: "bg-sky-50", color: "text-sky-600" },
    amber: { bg: "bg-amber-50", color: "text-amber-600" },
    rose: { bg: "bg-rose-50", color: "text-rose-600" },
  };
  const t = toneMap[tone];
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
          {label}
        </span>
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${t.bg} ${t.color}`}>
          {icon}
        </div>
      </div>
      <div className="mt-2 text-lg font-semibold text-slate-900 tabular tracking-tight">
        {value}
      </div>
      {hint && <div className="text-[11px] text-slate-500 mt-0.5">{hint}</div>}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: "amber" | "emerald" | "rose" | "indigo";
}) {
  const toneMap = {
    amber: "text-amber-700 bg-amber-50",
    emerald: "text-emerald-700 bg-emerald-50",
    rose: "text-rose-700 bg-rose-50",
    indigo: "text-indigo-700 bg-indigo-50",
  };
  return (
    <div className={`rounded-xl ${toneMap[tone]} p-3`}>
      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-1 text-base font-semibold tabular tracking-tight">{value}</div>
      {hint && <div className="text-[10px] opacity-70 mt-0.5">{hint}</div>}
    </div>
  );
}

function ProgressBar({
  value,
  max,
  className = "",
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={`h-1.5 w-full rounded-full bg-slate-100 overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
