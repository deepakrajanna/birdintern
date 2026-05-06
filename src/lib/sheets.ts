import { google, sheets_v4 } from "googleapis";

let cached: sheets_v4.Sheets | null = null;

/**
 * Returns a singleton Google Sheets API client authenticated with the
 * service account in env. Lazy so module import doesn't crash if env is
 * missing (e.g. during a `next build` without secrets).
 */
export function getSheets(): sheets_v4.Sheets {
  if (cached) return cached;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!email || !rawKey) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_KEY must be set"
    );
  }

  // Service account private keys often arrive with literal "\n" instead of
  // real newlines (env files, Vercel UI, etc.) — normalize either way.
  const key = rawKey.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  cached = google.sheets({ version: "v4", auth });
  return cached;
}

export function getSheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error("GOOGLE_SHEET_ID must be set");
  return id;
}

export const TAB = {
  records: process.env.SHEET_TAB_RECORDS || "records",
  users: process.env.SHEET_TAB_USERS || "users",
  audit: process.env.SHEET_TAB_AUDIT || "audit_log",
};

/** Convert a 0-based column index to a sheet column letter (A, B, ..., Z, AA, AB, ...). */
export function colLetter(index0: number): string {
  let n = index0;
  let s = "";
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

/** Read a whole tab as a 2D array of strings. */
export async function readTab(tab: string): Promise<string[][]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: tab,
  });
  return (res.data.values || []) as string[][];
}

/** Build a header → 0-based-index map from row 1. */
export function headerIndex(rows: string[][]): Map<string, number> {
  const m = new Map<string, number>();
  if (rows.length === 0) return m;
  rows[0].forEach((h, i) => m.set(h.trim(), i));
  return m;
}

/** Append rows to the bottom of a tab. */
export async function appendRows(tab: string, rows: string[][]): Promise<void> {
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSheetId(),
    range: tab,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: rows },
  });
}

/**
 * Update specific cells in one row. `updates` is a map of header name -> new
 * string value. Uses a batch update so it's a single API call.
 */
export async function updateRowCells(
  tab: string,
  rowNumber: number,
  header: Map<string, number>,
  updates: Record<string, string>
): Promise<void> {
  const sheets = getSheets();
  const data: sheets_v4.Schema$ValueRange[] = [];
  for (const [name, value] of Object.entries(updates)) {
    const idx = header.get(name);
    if (idx === undefined) {
      throw new Error(`Column "${name}" not found in tab "${tab}"`);
    }
    const cell = `${tab}!${colLetter(idx)}${rowNumber}`;
    data.push({ range: cell, values: [[value]] });
  }
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: getSheetId(),
    requestBody: { valueInputOption: "USER_ENTERED", data },
  });
}
