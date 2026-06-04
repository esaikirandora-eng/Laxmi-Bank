/**
 * ===================================================================
 * GOOGLE APPS SCRIPT BACKEND FOR LOAN LEDGER APP
 * ===================================================================
 * 
 * This script turns a Google Sheet into a simple REST-like backend
 * for the React Loan Ledger application.
 *
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Sheet.
 * 2. Rename the first three sheets exactly to:
 *    - Customers
 *    - Loans
 *    - Repayments
 * 3. Go to Extensions → Apps Script.
 * 4. Delete all default code.
 * 5. Paste this entire file.
 * 6. Replace the SPREADSHEET_ID below with your actual Sheet ID
 *    (found in the URL: https://docs.google.com/spreadsheets/d/HERE_IS_THE_ID/edit).
 * 7. Click Deploy → New deployment → Web app.
 *    - Description: Loan Ledger API
 *    - Execute as: Me
 *    - Who has access to the app: Anyone
 * 8. Click Deploy and authorize the script.
 * 9. Copy the "Web app URL" (ends with /exec).
 * 10. Put it in your .env file as:
 *     VITE_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/XXXXXXX/exec
 *
 * ===================================================================
 */

https://script.google.com/macros/s/AKfycby-RsmLspa8QriXnnR1Iv2fKMMessJs3rMp6iwsa-UUHHAAxJa-CyLpQ829ikD4XtlNgg/exec // ←←← CHANGE THIS

/**
 * Returns the spreadsheet.
 */
function getSpreadsheet() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID === 'PUT_YOUR_SPREADSHEET_ID_HERE') {
    throw new Error('Please set SPREADSHEET_ID in the script.');
  }
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

/**
 * Helper: Get all rows from a sheet as array of objects.
 */
function getSheetData(sheetName) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(h => String(h).trim());
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}

/**
 * Helper: Completely replace a sheet's content.
 */
function clearAndWriteSheet(sheetName, rows, headers) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  sheet.clearContents();

  // Write headers
  sheet.appendRow(headers);

  if (!rows || rows.length === 0) return;

  // Convert objects to rows in header order
  const dataRows = rows.map(row => {
    return headers.map(header => {
      const val = row[header];
      return val === undefined || val === null ? '' : val;
    });
  });

  sheet.getRange(2, 1, dataRows.length, headers.length).setValues(dataRows);
}

/**
 * Main GET handler
 */
function doGet(e) {
  const action = e.parameter.action;

  try {
    if (action === 'getCustomers') {
      const data = getSheetData('Customers');
      return jsonResponse({ success: true, data });
    }

    if (action === 'getLoans') {
      const data = getSheetData('Loans');
      return jsonResponse({ success: true, data });
    }

    if (action === 'getRepayments') {
      const data = getSheetData('Repayments');
      return jsonResponse({ success: true, data });
    }

    if (action === 'getAll') {
      return jsonResponse({
        success: true,
        customers: getSheetData('Customers'),
        loans: getSheetData('Loans'),
        repayments: getSheetData('Repayments'),
      });
    }

    return jsonResponse({ success: false, error: 'Unknown GET action' });

  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

/**
 * Main POST handler
 */
function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ success: false, error: 'Invalid JSON in request body' });
  }

  const action = body.action;

  try {
    if (action === 'fullSync') {
      // Full overwrite — best for push from local-first app
      clearAndWriteSheet('Customers', body.customers, ['id', 'full_name', 'phone', 'city', 'created_at']);
      clearAndWriteSheet('Loans', body.loans, ['id', 'customer_id', 'principal_amount', 'date_given', 'interest_rate', 'status']);
      clearAndWriteSheet('Repayments', body.repayments, ['id', 'loan_id', 'payment_date', 'amount_paid', 'payment_type', 'interest_portion', 'principal_portion', 'note']);
      return jsonResponse({ success: true, message: 'Full sync completed' });
    }

    if (action === 'saveCustomers') {
      clearAndWriteSheet('Customers', body.data, ['id', 'full_name', 'phone', 'city', 'created_at']);
      return jsonResponse({ success: true });
    }

    if (action === 'saveLoans') {
      clearAndWriteSheet('Loans', body.data, ['id', 'customer_id', 'principal_amount', 'date_given', 'interest_rate', 'status']);
      return jsonResponse({ success: true });
    }

    if (action === 'saveRepayments') {
      clearAndWriteSheet('Repayments', body.data, ['id', 'loan_id', 'payment_date', 'amount_paid', 'payment_type', 'interest_portion', 'principal_portion', 'note']);
      return jsonResponse({ success: true });
    }

    return jsonResponse({ success: false, error: 'Unknown POST action: ' + action });

  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

/**
 * Helper to return JSON with proper CORS headers.
 */
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
