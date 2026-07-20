import { SHEETS } from "../config.js";
import {
  getObjects,
 appendRow,
  findRow,
  updateRow,
} from "../sheets.js";

// =========================
// Get All Contacts
// =========================

export async function getContacts() {
  return await getObjects(SHEETS.CONTACTS);
}

// =========================
// Get Contact By ID
// =========================

export async function getContact(contactId) {
  const contacts = await getContacts();

  return (
    contacts.find(
      (c) => c["Contact ID"] === contactId
    ) || null
  );
}

// =========================
// Find By Name
// =========================

export async function findContact(name) {
  const contacts = await getContacts();

  return (
    contacts.find(
      (c) =>
        c.Name?.toLowerCase() ===
        name.toLowerCase()
    ) || null
  );
}

// =========================
// Create Contact
// =========================

export async function createContact(contact) {
  const now = new Date().toISOString();

  const row = [
    contact.contactId,
    contact.name,
    contact.nickname ?? "",
    contact.team ?? "",
    contact.company ?? "",
    contact.position ?? "",
    contact.phone ?? "",
    contact.email ?? "",
    contact.line ?? "",
    contact.remark ?? "",
    now,
    now,
  ];

  await appendRow(
    SHEETS.CONTACTS,
    row
  );

  return true;
}

// =========================
// Update Contact
// =========================

export async function updateContact(
  contactId,
  data
) {
  const result = await findRow(
    SHEETS.CONTACTS,
    "Contact ID",
    contactId
  );

  if (!result) return false;

  const row = [...result.row];
  const headers = result.headers;

  function set(name, value) {
    if (value === undefined) return;

    const index = headers.indexOf(name);

    if (index !== -1) {
      row[index] = value;
    }
  }

  set("Name", data.name);
  set("Nickname", data.nickname);
  set("Team", data.team);
  set("Company", data.company);
  set("Position", data.position);
  set("Phone", data.phone);
  set("Email", data.email);
  set("LINE", data.line);
  set("Remark", data.remark);
  set("Updated At", new Date().toISOString());

  await updateRow(
    SHEETS.CONTACTS,
    result.rowNumber,
    row
  );

  return true;
}

// =========================
// Delete (Soft)
// =========================

export async function disableContact(
  contactId
) {
  return updateContact(contactId, {
    remark: "Inactive",
  });
}