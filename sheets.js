import { google } from "googleapis";
import { HEADERS } from "./config.js";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

export const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

let sheetsClient = null;

// =========================
// Google Sheets Client
// =========================

export async function getSheetsClient() {
  if (sheetsClient) return sheetsClient;

  const credentials = JSON.parse(
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY.replace(/\n/g, "\\n")
  );

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES,
  });

  sheetsClient = google.sheets({
    version: "v4",
    auth,
  });

  return sheetsClient;
}

// =========================
// Ensure Sheet Exists
// =========================

export async function ensureSheetExists(sheetName) {
  const sheets = await getSheetsClient();

  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  const exists = spreadsheet.data.sheets.some(
    (sheet) => sheet.properties.title === sheetName
  );

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetName,
              },
            },
          },
        ],
      },
    });
  }
}

// =========================
// Ensure Headers
// =========================

export async function ensureHeaders(sheetName) {
  await ensureSheetExists(sheetName);

  const sheets = await getSheetsClient();

  const header = HEADERS[sheetName.toUpperCase()];

  if (!header) return;

  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1:ZZ1`,
  });

  const firstRow = result.data.values?.[0];

  if (firstRow?.length) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [header],
    },
  });
}

// =========================
// Read Rows
// =========================

export async function getRows(sheetName) {
  await ensureHeaders(sheetName);

  const sheets = await getSheetsClient();

  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
  });

  return result.data.values || [];
}

// =========================
// Read Objects
// =========================

export async function getObjects(sheetName) {
  const rows = await getRows(sheetName);

  if (rows.length <= 1) return [];

  const headers = rows[0];

  return rows.slice(1).map((row) => {
    const obj = {};

    headers.forEach((header, index) => {
      obj[header] = row[index] || "";
    });

    return obj;
  });
}

// =========================
// Append Row
// =========================

export async function appendRow(sheetName, row) {
  await ensureHeaders(sheetName);

  const sheets = await getSheetsClient();

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [row],
    },
  });
}

// =========================
// Update Row
// =========================

export async function updateRow(sheetName, rowNumber, row) {
  const sheets = await getSheetsClient();

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [row],
    },
  });
}

// =========================
// Find Row
// =========================

export async function findRow(sheetName, columnName, value) {
  const rows = await getRows(sheetName);

  if (rows.length <= 1) return null;

  const headers = rows[0];

  const columnIndex = headers.indexOf(columnName);

  if (columnIndex === -1) return null;

  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][columnIndex] || "") === value) {
      return {
        rowNumber: i + 1,
        row: rows[i],
        headers,
      };
    }
  }

  return null;
}

// =========================
// Delete Row
// =========================

export async function deleteRow(sheetName, rowNumber) {
  const sheets = await getSheetsClient();

  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  const sheet = spreadsheet.data.sheets.find(
    (s) => s.properties.title === sheetName
  );

  if (!sheet) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: "ROWS",
              startIndex: rowNumber - 1,
              endIndex: rowNumber,
            },
          },
        },
      ],
    },
  });
}