import type { Customer, Loan, Repayment } from '../types';

// ===================================================================
// Google Sheets API Service
// ===================================================================
// This service communicates with a Google Apps Script Web App
// that acts as a backend for storing data in Google Sheets.
//
// The Google Apps Script must be deployed as a Web App with:
// - Execute as: Me
// - Who has access: Anyone
//
// Environment variable required:
// VITE_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
// ===================================================================

const SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL as string | undefined;

if (!SCRIPT_URL) {
  console.warn(
    '[GoogleSheetsApi] VITE_GOOGLE_SCRIPT_URL is not set. ' +
    'Create a .env file with your deployed Google Apps Script Web App URL.'
  );
}

/**
 * Generic fetch helper with error handling.
 */
async function apiRequest<T>(
  params: Record<string, string> = {},
  body?: object
): Promise<T> {
  if (!SCRIPT_URL) {
    throw new Error('Google Script URL is not configured. Please set VITE_GOOGLE_SCRIPT_URL in your .env file.');
  }

  const url = new URL(SCRIPT_URL);

  // Add query parameters for GET requests
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const fetchOptions: RequestInit = {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    // Note: Google Apps Script Web Apps support CORS when properly deployed.
  };

  if (body) {
    fetchOptions.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url.toString(), fetchOptions);

    if (!response.ok) {
      throw new Error(`Network error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success === false) {
      throw new Error(result.error || 'Google Apps Script returned an error.');
    }

    return result.data ?? result;
  } catch (error: any) {
    console.error('[GoogleSheetsApi] Request failed:', error);
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Unable to reach Google Apps Script. Check your internet connection and that the script is deployed correctly.');
    }
    throw error;
  }
}

// ===================================================================
// READ OPERATIONS
// ===================================================================

/**
 * Fetch all customers from Google Sheets.
 */
export async function fetchCustomers(): Promise<Customer[]> {
  const result = await apiRequest<{ success: boolean; data: any[] }>({ action: 'getCustomers' });
  return (result.data || result || []).map(mapCustomerRow);
}

/**
 * Fetch all loans from Google Sheets.
 */
export async function fetchLoans(): Promise<Loan[]> {
  const result = await apiRequest<{ success: boolean; data: any[] }>({ action: 'getLoans' });
  return (result.data || result || []).map(mapLoanRow);
}

/**
 * Fetch all repayments from Google Sheets.
 */
export async function fetchRepayments(): Promise<Repayment[]> {
  const result = await apiRequest<{ success: boolean; data: any[] }>({ action: 'getRepayments' });
  return (result.data || result || []).map(mapRepaymentRow);
}

/**
 * Fetch everything in one call (more efficient).
 */
export async function fetchAllData(): Promise<{
  customers: Customer[];
  loans: Loan[];
  repayments: Repayment[];
}> {
  try {
    const result = await apiRequest<any>({ action: 'getAll' });
    return {
      customers: (result.customers || []).map(mapCustomerRow),
      loans: (result.loans || []).map(mapLoanRow),
      repayments: (result.repayments || []).map(mapRepaymentRow),
    };
  } catch (err) {
    // Fallback to individual calls if getAll is not implemented in script
    console.warn('getAll not available, falling back to individual fetches');
    const [customers, loans, repayments] = await Promise.all([
      fetchCustomers(),
      fetchLoans(),
      fetchRepayments(),
    ]);
    return { customers, loans, repayments };
  }
}

// ===================================================================
// WRITE OPERATIONS
// ===================================================================

/**
 * Save (overwrite) all customers.
 */
export async function saveCustomers(customers: Customer[]): Promise<void> {
  await apiRequest(
    {},
    {
      action: 'saveCustomers',
      data: customers.map((c) => ({
        id: c.id,
        full_name: c.fullName,
        phone: c.phone,
        city: c.city,
        created_at: c.createdAt,
      })),
    }
  );
}

/**
 * Save (overwrite) all loans.
 */
export async function saveLoans(loans: Loan[]): Promise<void> {
  await apiRequest(
    {},
    {
      action: 'saveLoans',
      data: loans.map((l) => ({
        id: l.id,
        customer_id: l.customerId,
        principal_amount: l.principalAmount,
        date_given: l.dateGiven,
        interest_rate: l.interestRate,
        status: l.status,
      })),
    }
  );
}

/**
 * Save (overwrite) all repayments.
 */
export async function saveRepayments(repayments: Repayment[]): Promise<void> {
  await apiRequest(
    {},
    {
      action: 'saveRepayments',
      data: repayments.map((r) => ({
        id: r.id,
        loan_id: r.loanId,
        payment_date: r.paymentDate,
        amount_paid: r.amountPaid,
        payment_type: r.paymentType,
        interest_portion: r.interestPortion,
        principal_portion: r.principalPortion,
        note: r.note ?? '',
      })),
    }
  );
}

/**
 * Full sync - replaces ALL data in Google Sheets with the provided local state.
 * This is the recommended method for pushToCloud because it guarantees
 * deletes and the entire local state are reflected on the server.
 */
export async function fullSync(data: {
  customers: Customer[];
  loans: Loan[];
  repayments: Repayment[];
}): Promise<void> {
  await apiRequest(
    {},
    {
      action: 'fullSync',
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
        note: r.note ?? '',
      })),
    }
  );
}

// ===================================================================
// MAPPING HELPERS (normalize Google Sheets row to our TypeScript types)
// ===================================================================

function mapCustomerRow(row: any): Customer {
  return {
    id: row.id || row.ID || '',
    fullName: row.full_name || row.fullName || row['Full Name'] || '',
    phone: row.phone || row.Phone || '',
    city: row.city || row.City || '',
    createdAt: row.created_at || row.createdAt || row['Created At'] || new Date().toISOString().slice(0, 10),
  };
}

function mapLoanRow(row: any): Loan {
  return {
    id: row.id || row.ID || '',
    customerId: row.customer_id || row.customerId || row['Customer ID'] || '',
    principalAmount: Number(row.principal_amount || row.principalAmount || row.Principal || 0),
    dateGiven: row.date_given || row.dateGiven || row['Date Given'] || '',
    interestRate: Number(row.interest_rate || row.interestRate || row['Interest Rate'] || 0),
    status: (row.status || row.Status || 'Active') as 'Active' | 'Closed',
  };
}

function mapRepaymentRow(row: any): Repayment {
  return {
    id: row.id || row.ID || '',
    loanId: row.loan_id || row.loanId || row['Loan ID'] || '',
    paymentDate: row.payment_date || row.paymentDate || row['Payment Date'] || '',
    amountPaid: Number(row.amount_paid || row.amountPaid || row['Amount Paid'] || 0),
    paymentType: (row.payment_type || row.paymentType || row['Payment Type'] || 'Both') as Repayment['paymentType'],
    interestPortion: Number(row.interest_portion || row.interestPortion || row['Interest Portion'] || 0),
    principalPortion: Number(row.principal_portion || row.principalPortion || row['Principal Portion'] || 0),
    note: row.note || row.Note || undefined,
  };
}
