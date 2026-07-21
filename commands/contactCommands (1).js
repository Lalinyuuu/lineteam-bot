import {
  getContacts,
  findContact,
  createContact,
} from "../services/contactService.js";

import { newId } from "../utils/common.js";
import { parseFields } from "../utils/parser.js";

export async function handleContactCommand(text) {
  if (/^\/contacts$/i.test(text)) {
    const contacts = await getContacts();

    if (!contacts.length) {
      return "ยังไม่มีผู้ติดต่อ";
    }

    const body = contacts
      .slice(0, 30)
      .map((contact, index) => {
        const nickname = contact.Nickname
          ? ` (${contact.Nickname})`
          : "";

        const team = contact.Team
          ? ` • ${contact.Team}`
          : "";

        return (
          `${index + 1}. ` +
          `${contact.Name}${nickname}${team}`
        );
      })
      .join("\n");

    return `👥 ผู้ติดต่อ\n\n${body}`;
  }

  if (/^\/contact\s+add(?:\s|$)/i.test(text)) {
    const fields = parseFields(text);

    if (!fields.name) {
      return [
        "กรุณาระบุ Name",
        "",
        "/contact add",
        "Name: พี่บอย",
        "Team: ลูกค้า",
        "Phone: 08x-xxx-xxxx",
      ].join("\n");
    }

    const existing = await findContact(fields.name);

    if (existing) {
      return `มีผู้ติดต่อชื่อ ${fields.name} อยู่แล้ว`;
    }

    const contactId = newId("CON");

    await createContact({
      contactId,
      name: fields.name,
      nickname: fields.nickname,
      team: fields.team,
      company: fields.company,
      position: fields.position,
      phone: fields.phone,
      email: fields.email,
      line: fields.line,
      remark: fields.remark,
    });

    return [
      "✅ เพิ่มผู้ติดต่อแล้ว",
      `👤 ${fields.name}`,
      `ID: ${contactId}`,
    ].join("\n");
  }

  return null;
}
