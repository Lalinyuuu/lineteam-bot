import {
  getContacts,
  findContact,
  createContact,
} from "../services/contactService.js";

import {
  newId,
} from "../utils/common.js";

/**
 * แปลงชื่อ Field ให้เป็น Key มาตรฐาน
 *
 * รองรับทั้งภาษาอังกฤษและภาษาไทย
 */
function normalizeContactFieldName(
  fieldName
) {
  const value = String(
    fieldName || ""
  )
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");

  const aliases = {
    name: "name",
    ชื่อ: "name",

    nickname: "nickname",
    nick: "nickname",
    ชื่อเล่น: "nickname",

    team: "team",
    ทีม: "team",
    ฝ่าย: "team",
    แผนก: "team",

    company: "company",
    บริษัท: "company",
    หน่วยงาน: "company",

    position: "position",
    ตำแหน่ง: "position",

    phone: "phone",
    tel: "phone",
    telephone: "phone",
    mobile: "phone",
    เบอร์: "phone",
    เบอร์โทร: "phone",
    โทรศัพท์: "phone",

    email: "email",
    อีเมล: "email",
    เมล: "email",

    line: "line",
    lineid: "line",
    ไลน์: "line",
    ไอดีไลน์: "line",

    remark: "remark",
    note: "remark",
    หมายเหตุ: "remark",
  };

  return aliases[value] || "";
}

/**
 * แยกข้อมูลผู้ติดต่อ
 *
 * รองรับ:
 *
 * /contact add
 * Name: น้องฝ้าย
 * Team: ทีม
 * Phone: 08x-xxx-xxxx
 *
 * ภาษาไทย:
 *
 * /contact add
 * ชื่อ: น้องฝ้าย
 * ทีม: ทีม
 * เบอร์โทร: 08x-xxx-xxxx
 *
 * และข้อความบรรทัดเดียว:
 *
 * /contact add Name: น้องฝ้าย Team: ทีม Phone: 08x
 */
function parseContactFields(text) {
  const rawText = String(text || "")
    .replace(/\r\n?/g, "\n")
    .replace(
      /^\/contact\s+add(?:\s|$)/i,
      ""
    )
    .trim();

  if (!rawText) {
    return {};
  }

  /*
   * กรณี LINE หรือระบบอื่นส่งข้อความมาเป็นบรรทัดเดียว
   * จะแทรก newline ก่อนชื่อ Field ถัดไป
   */
  const preparedText = rawText.replace(
    /\s+(?=(?:name|nickname|nick|team|company|position|phone|tel|telephone|mobile|email|line|line\s*id|remark|note|ชื่อ|ชื่อเล่น|ทีม|ฝ่าย|แผนก|บริษัท|หน่วยงาน|ตำแหน่ง|เบอร์|เบอร์โทร|โทรศัพท์|อีเมล|เมล|ไลน์|ไอดีไลน์|หมายเหตุ)\s*[:：])/gi,
    "\n"
  );

  const fields = {};

  const lines = preparedText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const match = line.match(
      /^([^:：]+)\s*[:：]\s*(.*)$/
    );

    if (!match) {
      continue;
    }

    const fieldName =
      normalizeContactFieldName(
        match[1]
      );

    const fieldValue = String(
      match[2] || ""
    ).trim();

    if (
      fieldName &&
      fieldValue
    ) {
      fields[fieldName] =
        fieldValue;
    }
  }

  return fields;
}

export async function handleContactCommand(
  text
) {
  const normalizedText =
    String(text || "").trim();

  // =========================
  // Contact List
  // =========================

  if (
    /^\/contacts$/i.test(
      normalizedText
    )
  ) {
    const contacts =
      await getContacts();

    if (!contacts.length) {
      return "ยังไม่มีผู้ติดต่อ";
    }

    const body = contacts
      .slice(0, 30)
      .map(
        (contact, index) => {
          const nickname =
            contact.Nickname
              ? ` (${contact.Nickname})`
              : "";

          const team =
            contact.Team
              ? ` • ${contact.Team}`
              : "";

          return (
            `${index + 1}. ` +
            `${contact.Name}${nickname}${team}`
          );
        }
      )
      .join("\n");

    return [
      "👥 ผู้ติดต่อ",
      "",
      body,
    ].join("\n");
  }

  // =========================
  // Add Contact
  // =========================

  if (
    /^\/contact\s+add(?:\s|$)/i.test(
      normalizedText
    )
  ) {
    const fields =
      parseContactFields(
        normalizedText
      );

    console.log(
      "CONTACT FIELDS:",
      JSON.stringify(fields)
    );

    if (!fields.name) {
      return [
        "กรุณาระบุ Name",
        "",
        "ตัวอย่างภาษาอังกฤษ:",
        "/contact add",
        "Name: พี่xxx",
        "Team: ลูกค้า",
        "Phone: 08x-xxx-xxxx",
        "",
        "หรือภาษาไทย:",
        "/contact add",
        "ชื่อ: พี่xxx",
        "ทีม: ลูกค้า",
        "เบอร์โทร: 08x-xxx-xxxx",
      ].join("\n");
    }

    const existing =
      await findContact(
        fields.name
      );

    if (existing) {
      return [
        `มีผู้ติดต่อชื่อ ${fields.name} อยู่แล้ว`,
        "",
        "กรุณาใช้ชื่ออื่น หรือตรวจสอบรายการผู้ติดต่อ",
      ].join("\n");
    }

    const contactId =
      newId("CON");

    await createContact({
      contactId,
      name: fields.name,
      nickname:
        fields.nickname || "",
      team:
        fields.team || "",
      company:
        fields.company || "",
      position:
        fields.position || "",
      phone:
        fields.phone || "",
      email:
        fields.email || "",
      line:
        fields.line || "",
      remark:
        fields.remark || "",
    });

    const response = [
      "✅ เพิ่มผู้ติดต่อแล้ว",
      "",
      `👤 ${fields.name}`,
    ];

    if (fields.nickname) {
      response.push(
        `🏷️ ${fields.nickname}`
      );
    }

    if (fields.team) {
      response.push(
        `👥 ${fields.team}`
      );
    }

    if (fields.company) {
      response.push(
        `🏢 ${fields.company}`
      );
    }

    if (fields.position) {
      response.push(
        `💼 ${fields.position}`
      );
    }

    if (fields.phone) {
      response.push(
        `☎️ ${fields.phone}`
      );
    }

    if (fields.email) {
      response.push(
        `✉️ ${fields.email}`
      );
    }

    if (fields.line) {
      response.push(
        `💬 ${fields.line}`
      );
    }

    response.push(
      `🆔 ${contactId}`
    );

    return response.join("\n");
  }

  return null;
}