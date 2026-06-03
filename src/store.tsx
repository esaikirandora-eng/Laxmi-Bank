import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Customer, Loan, Repayment, LoanStats } from "./types";
import { monthsBetween, todayISO, uid } from "./utils/format";
import {
  fetchAllData,
  fullSync,
} from "./services/googleSheetsApi";

/* ===================================================================
   LOAN LEDGER — Local-first with Google Sheets + Google Apps Script
   ===================================================================
   - All mutations (add, delete, update) happen locally instantly.
   - "Push to Cloud" sends the complete current state to Google Sheets
     (overwrites everything — guarantees deletes are synced).
   - "Pull from Cloud" replaces local state with whatever is in Google Sheets.
   - No Supabase. Pure fetch to Google Apps Script Web App.
   =================================================================== */

const STORAGE_KEY = "loan-ledger:v1";

// -------------------------------------------------------------------
// Interest calculation engine (unchanged from original logic)
// -------------------------------------------------------------------

interface DB {
  customers: Customer[];
  loans: Loan[];
  repayments: Repayment[];
}

const saveLocal = (d: DB) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  } catch {
    /* ignore quota errors */
  }
};

const calcInterestDue = (
  principal: number,
  rate: number,
  dateGiven: string,
  payments: Repayment[],
  status: "Active" | "Closed"
) => {
  const monthly = (principal * rate) / 100;
  const today = todayISO();
  const endRef =
    status === "Closed"
      ? payments.length > 0
        ? payments[payments.length - 1].paymentDate
        : dateGiven
      : today;
  return monthly * Math.max(0, monthsBetween(dateGiven, endRef));
};

const buildLoanStats = (
  loan: Loan,
  customer: Customer,
  payments: Repayment[],
  today: string
): LoanStats => {
  const sorted = [...payments]
    .filter((p) => p.loanId === loan.id)
    .sort((a, b) => a.paymentDate.localeCompare(b.paymentDate));

  const monthlyInterest = (loan.principalAmount * loan.interestRate) / 100;
  const interestDue = calcInterestDue(
    loan.principalAmount,
    loan.interestRate,
    loan.dateGiven,
    sorted,
    loan.status
  );
  const monthsElapsed = Math.max(0, monthsBetween(loan.dateGiven, today));
  const interestPaid = sorted.reduce((s, p) => s + p.interestPortion, 0);
  const principalPaid = sorted.reduce((s, p) => s + p.principalPortion, 0);
  const remainingPrincipal = Math.max(0, loan.principalAmount - principalPaid);
  const remainingInterest = Math.max(0, interestDue - interestPaid);
  const monthsPaid = monthlyInterest > 0 ? Math.floor(interestPaid / monthlyInterest) : 0;

  return {
    loan,
    customer,
    monthlyInterest,
    monthsElapsed,
    interestDue,
    interestPaid,
    principalPaid,
    remainingPrincipal,
    remainingInterest,
    monthsPaid,
    totalRepaid: interestPaid + principalPaid,
    isClosed: loan.status === "Closed",
    repayments: sorted,
  };
};

// -------------------------------------------------------------------
// Context Interface (preserved exactly for UI compatibility)
// -------------------------------------------------------------------

interface LedgerCtx {
  customers: Customer[];
  loans: Loan[];
  repayments: Repayment[];
  pushing: boolean;
  pulling: boolean;
  error: string | null;
  lastSync: string | null;

  // Local CRUD (instant, no network)
  addCustomer: (d: Omit<Customer, "id" | "createdAt"> & { createdAt?: string }) => Customer;
  addLoan: (d: Omit<Loan, "id" | "status">) => Loan;
  addRepayment: (d: Omit<Repayment, "id" | "interestPortion" | "principalPortion">) => Repayment;
  closeLoan: (loanId: string) => void;
  deleteRepayment: (id: string) => void;
  deleteLoan: (id: string) => void;
  deleteCustomer: (id: string) => void;

  // Cloud sync (explicit buttons)
  pushToCloud: () => Promise<{ newCustomers: number; newLoans: number; newRepayments: number }>;
  pullFromCloud: () => Promise<void>;

  // Export
  exportToCSV: () => void;

  // Selectors
  getCustomer: (id: string) => Customer | undefined;
  getLoansByCustomer: (cid: string) => Loan[];
  getRepaymentsByLoan: (lid: string) => Repayment[];
  computeLoanStats: (loan: Loan, customer: Customer) => LoanStats;

  // Aggregates
  totalPrincipalLent: number;
  totalInterestCollected: number;
  totalPrincipalCollected: number;
  totalActiveCustomers: number;
  totalOutstandingPrincipal: number;
  totalOutstandingInterest: number;
}

const Ctx = createContext<LedgerCtx | null>(null);

// -------------------------------------------------------------------
// Provider
// -------------------------------------------------------------------

export function LedgerProvider({ children }: { children: ReactNode }) {
  // Start completely empty (no seed data)
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [repayments, setRepayments] = useState<Repayment[]>([]);

  const [pushing, setPushing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const db: DB = useMemo(
    () => ({ customers, loans, repayments }),
    [customers, loans, repayments]
  );

  const persist = (next: DB) => {
    setCustomers(next.customers);
    setLoans(next.loans);
    setRepayments(next.repayments);
    saveLocal(next);
  };

  // -----------------------------------------------------------------
  // LOCAL CRUD (unchanged behavior)
  // -----------------------------------------------------------------

  const addCustomer = (data: Omit<Customer, "id" | "createdAt"> & { createdAt?: string }): Customer => {
    const c: Customer = {
      id: `CUST-${uid()}`,
      fullName: data.fullName,
      phone: data.phone ?? "",
      city: data.city ?? "",
      createdAt: data.createdAt ?? todayISO(),
    };
    persist({ customers: [c, ...db.customers], loans: db.loans, repayments: db.repayments });
    return c;
  };

  const addLoan = (data: Omit<Loan, "id" | "status">): Loan => {
    const l: Loan = {
      id: `LN-${uid()}`,
      customerId: data.customerId,
      principalAmount: data.principalAmount,
      dateGiven: data.dateGiven,
      interestRate: data.interestRate,
      status: "Active",
    };
    persist({ customers: db.customers, loans: [l, ...db.loans], repayments: db.repayments });
    return l;
  };

  const addRepayment = (raw: Omit<Repayment, "id" | "interestPortion" | "principalPortion">): Repayment => {
    const loan = db.loans.find((l) => l.id === raw.loanId);
    if (!loan) throw new Error("Loan not found");

    const existing = db.repayments.filter((p) => p.loanId === loan.id);
    const interestDue = calcInterestDue(
      loan.principalAmount,
      loan.interestRate,
      loan.dateGiven,
      existing,
      loan.status
    );
    const interestPaid = existing.reduce((s, p) => s + p.interestPortion, 0);
    const principalPaid = existing.reduce((s, p) => s + p.principalPortion, 0);

    let interestPortion = 0;
    let principalPortion = 0;

    if (raw.paymentType === "Interest Only") {
      interestPortion = Math.min(raw.amountPaid, Math.max(0, interestDue - interestPaid));
    } else if (raw.paymentType === "Principal Only") {
      principalPortion = Math.min(raw.amountPaid, Math.max(0, loan.principalAmount - principalPaid));
    } else {
      interestPortion = Math.min(raw.amountPaid, Math.max(0, interestDue - interestPaid));
      const rem = raw.amountPaid - interestPortion;
      principalPortion = Math.min(rem, Math.max(0, loan.principalAmount - principalPaid));
    }

    const r: Repayment = {
      id: `REPAY-${Date.now().toString(36)}-${uid()}`,
      loanId: raw.loanId,
      paymentDate: raw.paymentDate,
      amountPaid: raw.amountPaid,
      paymentType: raw.paymentType,
      interestPortion,
      principalPortion,
      note: raw.note ?? undefined,
    };

    // Auto close only if principal is fully paid AND no remaining interest due
    let loansNext = db.loans;
    const newPrincipalPaid = principalPaid + principalPortion;
    const remainingInterest = Math.max(0, interestDue - interestPaid - interestPortion);

    if (
      loan.status === "Active" &&
      newPrincipalPaid >= loan.principalAmount &&
      remainingInterest <= 0
    ) {
      loansNext = db.loans.map((l) => (l.id === loan.id ? { ...l, status: "Closed" } : l));
    }

    persist({ customers: db.customers, loans: loansNext, repayments: [r, ...db.repayments] });
    return r;
  };

  const closeLoan = (loanId: string) => {
    persist({
      ...db,
      loans: db.loans.map((l) => (l.id === loanId ? { ...l, status: "Closed" } : l)),
    });
  };

  const deleteRepayment = (repaymentId: string) => {
    persist({
      ...db,
      repayments: db.repayments.filter((r) => r.id !== repaymentId),
    });
  };

  const deleteLoan = (loanId: string) => {
    persist({
      customers: db.customers,
      loans: db.loans.filter((l) => l.id !== loanId),
      repayments: db.repayments.filter((r) => r.loanId !== loanId),
    });
  };

  const deleteCustomer = (customerId: string) => {
    const customerLoanIds = db.loans
      .filter((l) => l.customerId === customerId)
      .map((l) => l.id);

    persist({
      customers: db.customers.filter((c) => c.id !== customerId),
      loans: db.loans.filter((l) => l.customerId !== customerId),
      repayments: db.repayments.filter((r) => !customerLoanIds.includes(r.loanId)),
    });
  };

  // -----------------------------------------------------------------
  // GOOGLE SHEETS SYNC (replaces previous Supabase logic)
  // -----------------------------------------------------------------

  const pushToCloud = async () => {
    setPushing(true);
    setError(null);
    try {
      // Full overwrite — this is the most reliable way to sync deletes + current state
      await fullSync({
        customers: db.customers,
        loans: db.loans,
        repayments: db.repayments,
      });

      setLastSync(new Date().toISOString());
      return {
        newCustomers: db.customers.length,
        newLoans: db.loans.length,
        newRepayments: db.repayments.length,
      };
    } catch (err: any) {
      const message = err?.message || "Failed to push data to Google Sheets.";
      setError(message);
      console.error("Push to Google Sheets failed:", err);
      throw err;
    } finally {
      setPushing(false);
    }
  };

  const pullFromCloud = async () => {
    setPulling(true);
    setError(null);
    try {
      const { customers: cloudCustomers, loans: cloudLoans, repayments: cloudRepayments } =
        await fetchAllData();

      const next: DB = {
        customers: cloudCustomers,
        loans: cloudLoans,
        repayments: cloudRepayments,
      };

      persist(next);
      setLastSync(new Date().toISOString());
    } catch (err: any) {
      const message = err?.message || "Failed to pull data from Google Sheets.";
      setError(message);
      console.error("Pull from Google Sheets failed:", err);
      throw err;
    } finally {
      setPulling(false);
    }
  };

  // -----------------------------------------------------------------
  // CSV Export (unchanged)
  // -----------------------------------------------------------------

  const exportToCSV = () => {
    const lines: string[] = [];

    lines.push("=== CUSTOMERS ===");
    lines.push("ID,Full Name,Phone,City,Created At");
    db.customers.forEach((c) => {
      lines.push([c.id, `"${c.fullName.replace(/"/g, '""')}"`, c.phone, c.city, c.createdAt].join(","));
    });
    lines.push("");

    lines.push("=== LOANS ===");
    lines.push("ID,Customer ID,Principal,Date Given,Interest Rate (%),Status");
    db.loans.forEach((l) => {
      lines.push([l.id, l.customerId, l.principalAmount, l.dateGiven, l.interestRate, l.status].join(","));
    });
    lines.push("");

    lines.push("=== REPAYMENTS ===");
    lines.push("ID,Loan ID,Payment Date,Amount Paid,Type,Interest Portion,Principal Portion,Note");
    db.repayments.forEach((r) => {
      lines.push([
        r.id,
        r.loanId,
        r.paymentDate,
        r.amountPaid,
        r.paymentType,
        r.interestPortion,
        r.principalPortion,
        `"${(r.note ?? "").replace(/"/g, '""')}"`,
      ].join(","));
    });

    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `loan-ledger-${todayISO()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // -----------------------------------------------------------------
  // Selectors & Aggregates (unchanged)
  // -----------------------------------------------------------------

  const getCustomer = (id: string) => db.customers.find((c) => c.id === id);
  const getLoansByCustomer = (cid: string) => db.loans.filter((l) => l.customerId === cid);
  const getRepaymentsByLoan = (lid: string) => db.repayments.filter((r) => r.loanId === lid);
  const computeLoanStats = (loan: Loan, customer: Customer) =>
    buildLoanStats(loan, customer, db.repayments, todayISO());

  const aggregates = useMemo(() => {
    const totalPrincipalLent = db.loans.reduce((s, l) => s + l.principalAmount, 0);
    let totalInterestCollected = 0;
    let totalPrincipalCollected = 0;
    let totalOutstandingPrincipal = 0;
    let totalOutstandingInterest = 0;
    const activeIds = new Set<string>();

    for (const loan of db.loans) {
      const customer = db.customers.find((c) => c.id === loan.customerId);
      if (!customer) continue;
      const st = buildLoanStats(loan, customer, db.repayments, todayISO());
      totalInterestCollected += st.interestPaid;
      totalPrincipalCollected += st.principalPaid;
      if (loan.status === "Active") {
        totalOutstandingPrincipal += st.remainingPrincipal;
        totalOutstandingInterest += st.remainingInterest;
        activeIds.add(loan.customerId);
      }
    }

    return {
      totalPrincipalLent,
      totalInterestCollected,
      totalPrincipalCollected,
      totalActiveCustomers: activeIds.size,
      totalOutstandingPrincipal,
      totalOutstandingInterest,
    };
  }, [db]);

  // -----------------------------------------------------------------
  // Context Value
  // -----------------------------------------------------------------

  const value: LedgerCtx = {
    customers: db.customers,
    loans: db.loans,
    repayments: db.repayments,
    pushing,
    pulling,
    error,
    lastSync,
    addCustomer,
    addLoan,
    addRepayment,
    closeLoan,
    deleteRepayment,
    deleteLoan,
    deleteCustomer,
    pushToCloud,
    pullFromCloud,
    exportToCSV,
    getCustomer,
    getLoansByCustomer,
    getRepaymentsByLoan,
    computeLoanStats,
    ...aggregates,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLedger() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLedger must be used within LedgerProvider");
  return ctx;
}
