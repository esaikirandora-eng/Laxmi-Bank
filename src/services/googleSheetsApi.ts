// Interface mappings to match your App context states
import type { Customer, Loan, Repayment } from "../types";

// Grab your validated active version 18 deployment URL 
const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL;

interface SyncPayload {
  customers: Customer[];
  loans: Loan[];
  repayments: Repayment[];
}

/**
 * PULL Action: Fetches all sheets from your Google Apps Script Web App
 */
export async function fetchAllData() {
  if (!GOOGLE_SCRIPT_URL) {
    throw new Error("VITE_GOOGLE_SCRIPT_URL is not defined in your environment configs.");
  }

  // CRITICAL: Clean request. No custom header blocks to trigger OPTIONS pre-flights.
  const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAll`);

  if (!response.ok) {
    throw new Error(`Cloud connection failed with HTTP status: ${response.status}`);
  }

  const result = await response.json();

  if (result.status === "success") {
    // Convert backend sheet data naming conventions back into your local camelCase types
    return {
      customers: (result.customers || []).map((c: any) => ({
        id: c.id,
        fullName: c.full_name, // Maps back to application property standard
        phone: c.phone || "",
        city: c.city || "",
        createdAt: c.created_at,
      })),
      loans: (result.loans || []).map((l: any) => ({
        id: l.id,
        customerId: l.customer_id,
        principalAmount: Number(l.principal_amount) || 0,
        dateGiven: l.date_given,
        interestRate: Number(l.interest_rate) || 0,
        status: l.status || "Active",
      })),
      repayments: (result.repayments || []).map((r: any) => ({
        id: r.id,
        loanId: r.loan_id,
        paymentDate: r.payment_date,
        amountPaid: Number(r.amount_paid) || 0,
        paymentType: r.payment_type,
        interestPortion: Number(r.interest_portion) || 0,
        principalPortion: Number(r.principal_portion) || 0,
        note: r.note || "",
      })),
    };
  } else {
    throw new Error(result.message || "Google Apps Script returned an unexpected error status.");
  }
}

/**
 * PUSH Action: Transmits full state package down to Apps Script for spreadsheet overrides
 */
export async function fullSync(data: SyncPayload) {
  if (!GOOGLE_SCRIPT_URL) {
    throw new Error("VITE_GOOGLE_SCRIPT_URL is not defined in your environment configs.");
  }

  // Format the camelCase structures to match the exact keys expected by Google Sheets
  const payload = {
    action: "fullSync",
    customers: data.customers.map((c) => ({
      id: c.id,
      full_name: c.fullName,
      phone: c.phone,
      city: c.city,
      created_at: c.createdAt,
    })),
    loans: data.loans.map((l) => ({
      id: l.id,
      customer_id: l.customerId,
      principal_amount: l.principalAmount,
      date_given: l.dateGiven,
      interest_rate: l.interestRate,
      status: l.status,
    })),
    repayments: data.repayments.map((r) => ({
      id: r.id,
      loan_id: r.loanId,
      payment_date: r.paymentDate,
      amount_paid: r.amountPaid,
      payment_type: r.paymentType,
      interest_portion: r.interestPortion,
      principal_portion: r.principalPortion,
      note: r.note || "",
    })),
  };

  // Crucial: 'no-cors' allows safe structural post redirects inside Google's macro ecosystem
  const response = await fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors", 
    body: JSON.stringify(payload),
  });

  return { success: true };
}