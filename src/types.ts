export type PaymentType = "Interest Only" | "Principal Only" | "Both";
export type LoanStatus = "Active" | "Closed";

export interface Customer {
  id: string;
  fullName: string;
  phone: string;
  city: string;
  createdAt: string; // ISO date
}

export interface Loan {
  id: string;
  customerId: string;
  principalAmount: number;
  dateGiven: string; // ISO date
  interestRate: number; // % per month
  status: LoanStatus;
}

export interface Repayment {
  id: string;
  loanId: string;
  paymentDate: string; // ISO date
  amountPaid: number;
  paymentType: PaymentType;
  // computed at insertion based on outstanding interest
  interestPortion: number;
  principalPortion: number;
  note?: string;
}

export interface LoanStats {
  loan: Loan;
  customer: Customer;
  monthlyInterest: number;
  monthsElapsed: number;
  interestDue: number; // total interest accrued
  interestPaid: number;
  principalPaid: number;
  remainingPrincipal: number;
  remainingInterest: number; // outstanding interest (accrued - paid)
  monthsPaid: number; // number of full months of interest paid
  totalRepaid: number;
  isClosed: boolean;
  repayments: Repayment[];
}
