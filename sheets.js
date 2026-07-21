import { google } from "googleapis";
import { HEADERS } from "./config.js";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

export function normalizeSpreadsheetId(value) {
  if (!value || typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return trimmedValue;
  }

  const urlMatch = trimmedValue.match(/\/d\/([a-zA-Z0-9-_]+)/i);

  if (urlMatch?.[1]) {
    return urlMatch[1];
  }

  return trimmedValue;
}

export const SPREADSHEET_ID = normalizeSpreadsheetId(process.env.SPREADSHEET_ID);

let sheetsClient = null;

// =========================
// Helper: Validate Env
// =========================

function validateEnvironmentVariables() {
  if (!SPREADSHEET_ID) {
    throw new Error(
      "Missing SPREADSHEET_ID environment variable"
    );
  }

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_KEY environment variable"
    );
  }
}

// =========================
// Helper: Parse Credentials
// =========================

function getGoogleCredentials() {
  const rawCredentials =
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!rawCredentials) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_KEY environment variable"
    );
  }

  let credentials;

  try {
    credentials = JSON.parse(rawCredentials);
  } catch (error) {
    throw new Error(
      `GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON: ${error.message}`
    );
  }

  if (!credentials.client_email) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_KEY is missing client_email"
    );
  }

  if (!credentials.private_key) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_KEY is missing private_key"
    );
  }

  return {
    ...credentials,
    private_key: credentials.private_key.replace(
      /\\n/g,
      "\n"
    ),
  };
}

// =========================
// Helper: Escape Sheet Name
// =========================

function getSheetRange(sheetName, range = "") {
  if (!sheetName) {
    throw new Error("sheetName is required");
  }

  const escapedSheetName = sheetName.replace(
    /'/g,
    "''"
  );

  if (!range) {
    return `'${escapedSheetName}'`;
  }

  return `'${escapedSheetName}'!${range}`;
}

// =========================
// Google Sheets Client
// =========================

export async function getSheetsClient() {
  if (sheetsClient) {
    return sheetsClient;
  }

  validateEnvironmentVariables();

  const credentials = getGoogleCredentials();

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
  if (!sheetName) {
    throw new Error(
      "ensureSheetExists: sheetName is required"
    );
  }

  const sheets = await getSheetsClient();

  const spreadsheet =
    await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
      fields:
        "sheets.properties.sheetId,sheets.properties.title",
    });

  const exists =
    spreadsheet.data.sheets?.some(
      (sheet) =>
        sheet.properties?.title === sheetName
    ) ?? false;

  if (exists) {
    return;
  }

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

// =========================
// Ensure Headers
// =========================

export async function ensureHeaders(sheetName) {
  if (!sheetName) {
    throw new Error(
      "ensureHeaders: sheetName is required"
    );
  }

  await ensureSheetExists(sheetName);

  const sheets = await getSheetsClient();

  const header =
    HEADERS[sheetName.toUpperCase()];

  if (!header || !Array.isArray(header)) {
    console.warn(
      `No headers configured for sheet: ${sheetName}`
    );

    return;
  }

  const result =
    await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: getSheetRange(
        sheetName,
        "A1:ZZ1"
      ),
    });

  const firstRow = result.data.values?.[0];

  if (firstRow?.length) {
    return;
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: getSheetRange(sheetName, "A1"),
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
  if (!sheetName) {
    throw new Error(
      "getRows: sheetName is required"
    );
  }

  await ensureHeaders(sheetName);

  const sheets = await getSheetsClient();

  const result =
    await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: getSheetRange(sheetName),
    });

  return result.data.values ?? [];
}

// =========================
// Read Objects
// =========================

export async function getObjects(sheetName) {
  const rows = await getRows(sheetName);

  if (rows.length <= 1) {
    return [];
  }

  const headers = rows[0];

  return rows.slice(1).map(
    (row, rowIndex) => {
      const object = {};

      headers.forEach(
        (header, columnIndex) => {
          if (!header) {
            return;
          }

          object[header] =
            row[columnIndex] ?? "";
        }
      );

      return {
        ...object,
        _rowNumber: rowIndex + 2,
      };
    }
  );
}

// =========================
// Append Row
// =========================

export async function appendRow(
  sheetName,
  row
) {
  if (!sheetName) {
    throw new Error(
      "appendRow: sheetName is required"
    );
  }

  if (!Array.isArray(row)) {
    throw new Error(
      "appendRow: row must be an array"
    );
  }

  await ensureHeaders(sheetName);

  const sheets = await getSheetsClient();

  const result =
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: getSheetRange(
        sheetName,
        "A:ZZ"
      ),
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [row],
      },
    });

  return result.data;
}

// =========================
// Update Row
// =========================

export async function updateRow(
  sheetName,
  rowNumber,
  row
) {
  if (!sheetName) {
    throw new Error(
      "updateRow: sheetName is required"
    );
  }

  if (
    !Number.isInteger(rowNumber) ||
    rowNumber < 1
  ) {
    throw new Error(
      "updateRow: rowNumber must be a positive integer"
    );
  }

  if (!Array.isArray(row)) {
    throw new Error(
      "updateRow: row must be an array"
    );
  }

  await ensureSheetExists(sheetName);

  const sheets = await getSheetsClient();

  const result =
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: getSheetRange(
        sheetName,
        `A${rowNumber}`
      ),
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [row],
      },
    });

  return result.data;
}

// =========================
// Find Row
// =========================

export async function findRow(
  sheetName,
  columnName,
  value
) {
  if (!sheetName) {
    throw new Error(
      "findRow: sheetName is required"
    );
  }

  if (!columnName) {
    throw new Error(
      "findRow: columnName is required"
    );
  }

  const rows = await getRows(sheetName);

  if (rows.length <= 1) {
    return null;
  }

  const headers = rows[0];

  const columnIndex =
    headers.indexOf(columnName);

  if (columnIndex === -1) {
    return null;
  }

  const expectedValue =
    value === null ||
    value === undefined
      ? ""
      : String(value);

  for (
    let rowIndex = 1;
    rowIndex < rows.length;
    rowIndex += 1
  ) {
    const currentValue =
      rows[rowIndex][columnIndex] ?? "";

    if (
      String(currentValue) ===
      expectedValue
    ) {
      return {
        rowNumber: rowIndex + 1,
        row: rows[rowIndex],
        headers,
      };
    }
  }

  return null;
}

// =========================
// Delete Row
// =========================

export async function deleteRow(
  sheetName,
  rowNumber
) {
  if (!sheetName) {
    throw new Error(
      "deleteRow: sheetName is required"
    );
  }

  if (
    !Number.isInteger(rowNumber) ||
    rowNumber < 2
  ) {
    throw new Error(
      "deleteRow: rowNumber must be an integer greater than or equal to 2"
    );
  }

  const sheets = await getSheetsClient();

  const spreadsheet =
    await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
      fields:
        "sheets.properties.sheetId,sheets.properties.title",
    });

  const sheet =
    spreadsheet.data.sheets?.find(
      (item) =>
        item.properties?.title ===
        sheetName
    );

  if (!sheet?.properties?.sheetId) {
    throw new Error(
      `Sheet not found: ${sheetName}`
    );
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId:
                sheet.properties.sheetId,
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

// =========================
// Clear Row
// =========================

export async function clearRow(
  sheetName,
  rowNumber
) {
  if (!sheetName) {
    throw new Error(
      "clearRow: sheetName is required"
    );
  }

  if (
    !Number.isInteger(rowNumber) ||
    rowNumber < 2
  ) {
    throw new Error(
      "clearRow: rowNumber must be an integer greater than or equal to 2"
    );
  }

  const sheets = await getSheetsClient();

  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: getSheetRange(
      sheetName,
      `A${rowNumber}:ZZ${rowNumber}`
    ),
    requestBody: {},
  });
}

// =========================
// Get Sheet ID
// =========================

export async function getSheetId(
  sheetName
) {
  if (!sheetName) {
    throw new Error(
      "getSheetId: sheetName is required"
    );
  }

  const sheets = await getSheetsClient();

  const spreadsheet =
    await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
      fields:
        "sheets.properties.sheetId,sheets.properties.title",
    });

  const sheet =
    spreadsheet.data.sheets?.find(
      (item) =>
        item.properties?.title ===
        sheetName
    );

  return sheet?.properties?.sheetId ?? null;
}