import { useState } from "react";
import { Button } from "../components/Button";
import { Field, Input, Select, Textarea } from "../components/TextField";
import { useLedger } from "../store";
import { todayISO, formatCurrency } from "../utils/format";
import type { PaymentType } from "../types";

interface AddRepaymentFormProps {
  loanId: string;
  onDone: () => void;
  onCancel: () => void;
}

export function AddRepaymentForm({ loanId, onDone, onCancel }: AddRepaymentFormProps) {
  const { loans, customers, computeLoanStats, addRepayment } = useLedger();
  const loan = loans.find((l) => l.id === loanId)!;
  const customer = customers.find((c) => c.id === loan.customerId)!;
  const stats = computeLoanStats(loan, customer);

  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] = useState<PaymentType>("Both");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  // compute distribution preview
  const amountNum = parseFloat(amount);
  const outstandingInterest = stats.remainingInterest;
  const outstandingPrincipal = stats.remainingPrincipal;

  let interestPortion = 0;
  let principalPortion = 0;
  if (!isNaN(amountNum) && amountNum > 0) {
    if (paymentType === "Interest Only") {
      interestPortion = Math.min(amountNum, outstandingInterest);
      principalPortion = 0;
    } else if (paymentType === "Principal Only") {
      interestPortion = 0;
      principalPortion = Math.min(amountNum, outstandingPrincipal);
    } else {
      interestPortion = Math.min(amountNum, outstandingInterest);
      const remainder = amountNum - interestPortion;
      principalPortion = Math.min(remainder, outstandingPrincipal);
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Enter a valid amount");
      return;
    }
    addRepayment({
      loanId,
      amountPaid: amountNum,
      paymentType,
      paymentDate: date,
      note: note.trim() || undefined,
    });
    onDone();
  };

  const willCloseLoan =
    !isNaN(amountNum) &&
    amountNum > 0 &&
    principalPortion >= outstandingPrincipal &&
    outstandingPrincipal > 0;

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 grid grid-cols-2 gap-2">
        <div>
          <div className="text-slate-500">Outstanding Interest</div>
          <div className="text-sm font-semibold text-slate-900 tabular">
            {formatCurrency(outstandingInterest)}
          </div>
        </div>
        <div>
          <div className="text-slate-500">Outstanding Principal</div>
          <div className="text-sm font-semibold text-slate-900 tabular">
            {formatCurrency(outstandingPrincipal)}
          </div>
        </div>
      </div>

      <Field label="Amount Paid (₹)" required>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setError("");
          }}
          placeholder="e.g. 5000"
          autoFocus
        />
        {error && <span className="block text-[11px] text-rose-600 mt-1">{error}</span>}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Payment Type" required>
          <Select
            value={paymentType}
            onChange={(e) => setPaymentType(e.target.value as PaymentType)}
          >
            <option value="Both">Both (Interest first)</option>
            <option value="Interest Only">Interest Only</option>
            <option value="Principal Only">Principal Only</option>
          </Select>
        </Field>
        <Field label="Payment Date" required>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>

      <Field label="Note (optional)">
        <Textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Cash received at office"
        />
      </Field>

      {amountNum > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="px-3 py-2 border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Distribution Preview
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-100">
            <div className="px-3 py-3">
              <div className="text-[11px] text-slate-500">Interest Portion</div>
              <div className="text-sm font-semibold text-amber-700 tabular">
                {formatCurrency(interestPortion)}
              </div>
            </div>
            <div className="px-3 py-3">
              <div className="text-[11px] text-slate-500">Principal Portion</div>
              <div className="text-sm font-semibold text-emerald-700 tabular">
                {formatCurrency(principalPortion)}
              </div>
            </div>
            <div className="px-3 py-3">
              <div className="text-[11px] text-slate-500">Total</div>
              <div className="text-sm font-semibold text-slate-900 tabular">
                {formatCurrency(interestPortion + principalPortion)}
              </div>
            </div>
          </div>
        </div>
      )}

      {willCloseLoan && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800">
          ✓ This payment will fully close the loan.
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Log Payment</Button>
      </div>
    </form>
  );
}
