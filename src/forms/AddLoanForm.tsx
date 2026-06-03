import { useState } from "react";
import { Button } from "../components/Button";
import { Field, Input } from "../components/TextField";
import { useLedger } from "../store";
import { todayISO } from "../utils/format";

interface AddLoanFormProps {
  customerId: string;
  onDone: () => void;
  onCancel: () => void;
}

export function AddLoanForm({ customerId, onDone, onCancel }: AddLoanFormProps) {
  const { addLoan } = useLedger();
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("2.0");
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(principal);
    const r = parseFloat(rate);
    if (isNaN(p) || p <= 0) {
      setError("Enter a valid principal amount");
      return;
    }
    if (isNaN(r) || r < 0) {
      setError("Enter a valid interest rate");
      return;
    }
    if (!date) {
      setError("Pick a date");
      return;
    }
    addLoan({
      customerId,
      principalAmount: p,
      interestRate: r,
      dateGiven: date,
    });
    onDone();
  };

  const principalNum = parseFloat(principal);
  const rateNum = parseFloat(rate);
  const monthlyInterestPreview =
    !isNaN(principalNum) && !isNaN(rateNum) && principalNum > 0
      ? (principalNum * rateNum) / 100
      : 0;

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Principal Amount (₹)" required error={error && !principal ? error : ""}>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={principal}
          onChange={(e) => {
            setPrincipal(e.target.value);
            setError("");
          }}
          placeholder="e.g. 100000"
          autoFocus
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Interest Rate (% / month)" required>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="2.0"
          />
        </Field>
        <Field label="Date Given" required>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>

      {monthlyInterestPreview > 0 && (
        <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2.5 text-xs text-indigo-800">
          <span className="font-medium">Monthly interest accrues at </span>
          <span className="font-semibold tabular">
            ₹{monthlyInterestPreview.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </span>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Disburse Loan</Button>
      </div>
    </form>
  );
}
