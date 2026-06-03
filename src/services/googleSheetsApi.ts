const SHEET_URL = "https://script.google.com/macros/s/AKfycby5TXnT_VBX4w7qrlaiJmBkhl8eopuI19xIfSZY1P_czg5Vtm1lISmCtgW8FTDz4OsETg/exec";

export async function fullSync(data: { customers: any[]; loans: any[]; repayments: any[]; }) {
  try {
    await fetch(SHEET_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "fullSync", payload: data }),
    });
    console.log("[GoogleSheetsApi] Push request sent");
    return { success: true };
  } catch (err) {
    console.error("[GoogleSheetsApi] Request failed:", err);
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
    console.error("[GoogleSheetsApi] Pull failed:", err);
    throw new Error("Unable to pull data from Google Sheets.");
  }
}
