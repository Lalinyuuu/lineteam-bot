import {
  getRows,
  appendRow,
  updateRow,
} from "../sheets.js";

const SHEET_NAME = "UserContext";

export async function getUserContext(userId) {
  const rows = await getRows(SHEET_NAME);

  return (
    rows.find(
      (row) =>
        String(row["User ID"] || "").trim() ===
        String(userId || "").trim()
    ) || null
  );
}

export async function setUserProject({
  userId,
  displayName,
  project,
}) {
  const existing =
    await getUserContext(userId);

  const data = {
    "User ID": userId,
    "Display Name": displayName || "",
    "Current Project ID":
      project?.["Project ID"] || "",
    "Current Project Code":
      project?.["Project Code"] || "",
    "Updated At":
      new Date().toISOString(),
  };

  if (existing) {
    await updateRow(
      SHEET_NAME,
      existing._rowNumber,
      data
    );

    return data;
  }

  await appendRow(
    SHEET_NAME,
    data
  );

  return data;
}

export async function clearUserProject({
  userId,
  displayName,
}) {
  const existing =
    await getUserContext(userId);

  if (!existing) {
    return null;
  }

  const data = {
    "User ID": userId,
    "Display Name":
      displayName ||
      existing["Display Name"] ||
      "",
    "Current Project ID": "",
    "Current Project Code": "",
    "Updated At":
      new Date().toISOString(),
  };

  await updateRow(
    SHEET_NAME,
    existing._rowNumber,
    data
  );

  return data;
}