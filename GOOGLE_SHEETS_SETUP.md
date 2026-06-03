# Google Sheets + Google Apps Script Setup Guide

This document explains how to replace Supabase with Google Sheets for the Loan Ledger app.

## 1. Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a **new blank spreadsheet**.
2. Rename the default sheet tabs to exactly these three names (case sensitive):
   - `Customers`
   - `Loans`
   - `Repayments`
3. (Optional) Add the header row manually for clarity:
   - **Customers**: `id, full_name, phone, city, created_at`
   - **Loans**: `id, customer_id, principal_amount, date_given, interest_rate, status`
   - **Repayments**: `id, loan_id, payment_date, amount_paid, payment_type, interest_portion, principal_portion, note`

## 2. Create the Google Apps Script

1. In your Google Sheet, go to menu: **Extensions → Apps Script**.
2. Delete all the default code in the editor.
3. Copy the entire content of the file `google-apps-script/Code.gs` (included in this project).
4. Paste it into the Apps Script editor.
5. **Important**: Replace this line with your actual spreadsheet ID:

   ```js
   const SPREADSHEET_ID = 'PUT_YOUR_SPREADSHEET_ID_HERE';
   ```

   To find your ID: Look at the URL of your sheet. It looks like:
   `https://docs.google.com/spreadsheets/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890/edit`
   → The ID is `1aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890`

6. Click the **Save** icon (floppy disk).

## 3. Deploy as Web App

1. In the Apps Script editor, click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill in:
   - **Description**: `Loan Ledger API`
   - **Execute as**: `Me`
   - **Who has access to the app**: `Anyone` (this is required for the frontend to call it)
4. Click **Deploy**.
5. Google will ask for authorization — review and allow the permissions.
6. After deployment, copy the **Web app URL**. It will look like:
   ```
   https://script.google.com/macros/s/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/exec
   ```

## 4. Configure the Frontend

Create a `.env` file in the root of the React project (if it doesn't exist):

```env
VITE_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/exec
```

Replace the URL with the one you just copied.

Restart your dev server after changing `.env`:
```bash
npm run dev
```

## 5. Test the Integration

1. Open the app.
2. Add a few customers, loans, and repayments (everything is local at this point).
3. Click **Push to Supabase** → it is now labeled **Push to Google Sheets** (or similar in UI).
4. Click **Pull from Google Sheets**.
5. Refresh the page — your data should persist via Google Sheets.

## 6. Important Notes

- Every **Push** performs a full overwrite of the three sheets. This is intentional and the most reliable way to keep local deletes in sync.
- The app remains **local-first**: you can work completely offline. Data only goes to Google Sheets when you explicitly press "Push".
- "Pull" will replace whatever is currently in the browser with the data from the sheet.
- Rate limits: Google Apps Script has generous but not unlimited quotas. For personal/small team use this is more than enough.

## 7. Troubleshooting

**"Google Script URL is not configured"**
→ Make sure `VITE_GOOGLE_SCRIPT_URL` is correctly set in `.env` and you restarted the dev server.

**CORS / Failed to fetch errors**
→ Make sure you deployed with "Who has access: Anyone".
→ Re-deploy after making changes to the script.

**Data not appearing**
→ Check that the three sheet tabs are named exactly `Customers`, `Loans`, `Repayments` (no extra spaces).

**Script errors in Google**
→ Open the Apps Script editor → Executions tab to see detailed logs.

## 8. Production / Vercel Deployment

The app is already configured to be built as a single file (`vite-plugin-singlefile`).

1. Create a `.env` file with your real `VITE_GOOGLE_SCRIPT_URL` (or use Vercel environment variables).
2. Run:
   ```bash
   npm run build
   ```
3. Deploy the generated `dist/index.html` (it contains everything inline) to Vercel, Netlify, or any static host.

In Vercel:
- Add an Environment Variable named `VITE_GOOGLE_SCRIPT_URL` with your script URL.
- Redeploy.

## 9. Security Note

This setup uses a publicly accessible web app URL. Anyone who has the URL can read/write the data. 

For a personal or small internal tool this is usually acceptable. For sensitive financial data in a larger organization, you should add authentication (Google OAuth + checking email domain in the Apps Script) or move to a more secure backend.

---

You are now fully migrated from Supabase to Google Sheets + Google Apps Script!
