const SHEET_URL = "https://script.google.com/macros/s/AKfycbx1DHEGCuUo_sKiYUODF_1SzDsqBnay7QrvVt47DjyoaZPNQ6yDi52viykvyrLU0humAg/exec";

export async function fullSync(data: { customers: any[]; loans: any[]; repayments: any[]; }) {
  try {
    await fetch(SHEET_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "fullSync", payload: data }),
    });
    return { success: true };
  } catch (err) {
    throw new Error("Unable to reach Google Apps Script.");
  }
}

export async function fetchAllData() {
  try {
    const url = `${SHEET_URL}?action=getAll`;
    const res = await fetch(url, { method: "GET", mode: "cors" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    return {
      customers: result.customers || [],
      loans: result.loans || [],
      repayments: result.repayments || [],
    };
  } catch (err) {
    throw new Error("Unable to pull data from Google Sheets.");
  }
}
