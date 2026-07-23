import {
  displayName,
} from "../utils/common.js";

import {
  handleWorklogCommand,
} from "./worklogCommand.js";

import {
  handleTaskCommand,
} from "./taskCommand.js";

import {
  handleProjectCommand,
} from "./projectCommand.js";

import {
  handleContactCommand,
} from "./contactCommand.js";

import {
  handleContextCommand,
} from "./contextCommand.js";

// =========================
// Main Menu
// =========================

export function menuText() {
  return [
    "📋 Yuu Log Work",
    "",
    "เลือกสิ่งที่ต้องการทำ",
    "",
    "1️⃣ บันทึกงาน",
    "2️⃣ งานของฉัน",
    "3️⃣ โปรเจกต์",
    "4️⃣ สรุปวันนี้",
    "5️⃣ งานที่กำลังรอ",
    "6️⃣ ผู้ติดต่อ",
    "",
    "พิมพ์หมายเลข 1–6 ได้เลย",
    "หรือพิมพ์ข้อความ เช่น",
    "",
    "• ประชุมกับพี่บอยเรื่อง Project 50",
    "• ดูงานของฉัน",
    "• โปรเจกต์ทั้งหมด",
    "• สรุปวันนี้",
    "• ใช้โปรเจกต์ P50",
  ].join("\n");
}

// =========================
// Help
// =========================

export function helpText() {
  return [
    "📋 คู่มือ Yuu Log Work",
    "",
    "━━━━━━━━━━━━━━",
    "📝 บันทึกงาน",
    "━━━━━━━━━━━━━━",
    "",
    "บันทึกรายการเดียว:",
    "/update ประชุมกับพี่บอยเรื่อง Project 50",
    "",
    "บันทึกหลายรายการ:",
    "/update",
    "09:00 ประชุมกับพี่บอย",
    "10:30 รับงานจากพี่กบ",
    "13:00 รอ BA ส่ง Flow",
    "",
    "ระบุโปรเจกต์ในข้อความ:",
    "/update",
    "Project: P50",
    "09:00 ประชุมกับพี่บอย",
    "13:00 ทำรายงาน",
    "",
    "━━━━━━━━━━━━━━",
    "📌 โปรเจกต์ปัจจุบัน",
    "━━━━━━━━━━━━━━",
    "",
    "ตั้งโปรเจกต์:",
    "ใช้โปรเจกต์ P50",
    "",
    "ดูโปรเจกต์ปัจจุบัน:",
    "โปรเจกต์ปัจจุบัน",
    "",
    "ล้างโปรเจกต์:",
    "ล้างโปรเจกต์",
    "",
    "━━━━━━━━━━━━━━",
    "✅ งานของฉัน",
    "━━━━━━━━━━━━━━",
    "",
    "งานของฉัน:",
    "/my",
    "",
    "งานที่รอ:",
    "/waiting",
    "",
    "งานที่เสร็จ:",
    "/done",
    "",
    "━━━━━━━━━━━━━━",
    "📁 โปรเจกต์",
    "━━━━━━━━━━━━━━",
    "",
    "ดูทั้งหมด:",
    "/projects",
    "",
    "เปิดโปรเจกต์:",
    "/project P50",
    "",
    "เพิ่มโปรเจกต์:",
    "/project add",
    "",
    "━━━━━━━━━━━━━━",
    "📊 สรุป",
    "━━━━━━━━━━━━━━",
    "",
    "งานวันนี้:",
    "/today",
    "",
    "สรุปวันนี้:",
    "/summary",
    "",
    "━━━━━━━━━━━━━━",
    "👤 ผู้ติดต่อ",
    "━━━━━━━━━━━━━━",
    "",
    "ดูทั้งหมด:",
    "/contacts",
    "",
    "เพิ่มผู้ติดต่อ:",
    "/contact add",
  ].join("\n");
}

// =========================
// Update Guide
// =========================

function updateGuideText() {
  return [
    "📝 บันทึกงาน",
    "",
    "พิมพ์รายละเอียดต่อจาก /update ได้เลย",
    "",
    "ตัวอย่างรายการเดียว:",
    "/update ประชุมกับพี่xxxxเรื่อง Project 50",
    "",
    "ตัวอย่างหลายรายการ:",
    "/update",
    "09:00 ประชุมกับพี่xxxx",
    "10:30 รับงานจากพี่xxxx",
    "13:00 รอ BA ส่ง Flow",
    "",
    "หากเป็นโปรเจกต์เดียวกัน:",
    "/update",
    "Project: P50",
    "09:00 ประชุมกับพี่xxxx",
    "13:00 ทำรายงาน",
    "",
    "หากตั้งโปรเจกต์ปัจจุบันไว้แล้ว",
    "ไม่จำเป็นต้องพิมพ์ Project ซ้ำ",
  ].join("\n");
}

// =========================
// Task Guide
// =========================

function taskGuideText() {
  return [
    "✅ จัดการงาน",
    "",
    "ดูงานของฉัน:",
    "งานของฉัน",
    "",
    "ดูงานที่รอ:",
    "งานที่รอ",
    "",
    "เพิ่มงานแบบละเอียด:",
    "/task add",
    "Project: P50",
    "Task: จัดทำรายงานผลการศึกษา",
    "Project Manager: ยู",
    "Due: 2026-07-30",
    "Priority: High",
    "",
    "อัปเดตความคืบหน้า:",
    "/task update TASK-ID Doing 70",
    "",
    "ปิดงาน:",
    "/task update TASK-ID Done 100",
  ].join("\n");
}

// =========================
// Project Guide
// =========================

function projectGuideText() {
  return [
    "📁 โปรเจกต์",
    "",
    "ดูโปรเจกต์ทั้งหมด:",
    "โปรเจกต์ทั้งหมด",
    "",
    "เปิดโปรเจกต์:",
    "พิมพ์ Code หรือชื่อได้เลย",
    "",
    "ตัวอย่าง:",
    "P50",
    "Project 50",
    "Oracle",
    "",
    "เพิ่มโปรเจกต์:",
    "/project add",
    "",
    "ตั้งโปรเจกต์ปัจจุบัน:",
    "ใช้โปรเจกต์ P50",
  ].join("\n");
}

// =========================
// Contact Guide
// =========================

function contactGuideText() {
  return [
    "👤 ผู้ติดต่อ",
    "",
    "ดูผู้ติดต่อทั้งหมด:",
    "ผู้ติดต่อทั้งหมด",
    "",
    "เพิ่มผู้ติดต่อ:",
    "/contact add",
    "Name: น้องฝ้าย",
    "Nickname: ฝ้าย",
    "Team: ทีม",
    "Company: CKC",
    "Position: Project Coordinator",
    "Phone: 08x-xxx-xxxx",
    "Email: fai@example.com",
    "LINE: fai-line",
    "Remark: ผู้ประสานงานโครงการ",
  ].join("\n");
}

// =========================
// Normalize Input
// =========================

function normalizeText(text = "") {
  return String(text)
    .replace(/\r\n?/g, "\n")
    .replace(/\u200B/g, "")
    .trim();
}

// =========================
// Natural Language Aliases
// =========================

function mapNaturalCommand(text) {
  /*
   * originalValue เก็บ newline เอาไว้
   * สำคัญสำหรับ /update หลายรายการ
   */
  const originalValue =
    normalizeText(text);

  /*
   * compactValue ใช้เฉพาะตรวจคำสั่งสั้น ๆ
   */
  const compactValue =
    originalValue.replace(/\s+/g, " ");

  const lower =
    compactValue.toLowerCase();

  const exactCommands = {
    // Menu
    เมนู: "/menu",
    menu: "/menu",
    เริ่มต้น: "/menu",
    เริ่มใช้งาน: "/menu",

    // Help
    ช่วยเหลือ: "/help",
    วิธีใช้: "/help",
    คู่มือ: "/help",
    help: "/help",

    // Update
    บันทึกงาน: "/update-guide",
    เพิ่มบันทึกงาน: "/update-guide",
    อัปเดตงาน: "/update-guide",
    อัพเดตงาน: "/update-guide",

    // Tasks
    งาน: "/task-guide",
    ดูงาน: "/my",
    งานของฉัน: "/my",
    งานของยู: "/my",
    งานฉัน: "/my",
    my: "/my",

    งานที่รอ: "/waiting",
    งานรอ: "/waiting",
    กำลังรอ: "/waiting",
    waiting: "/waiting",

    งานที่เสร็จ: "/done",
    งานเสร็จ: "/done",
    เสร็จแล้ว: "/done",
    done: "/done",

    เพิ่มงาน: "/task add",
    สร้างงาน: "/task add",
    เพิ่มtask: "/task add",
    "เพิ่ม task": "/task add",

    // Projects
    โปรเจกต์: "/project-guide",
    project: "/project-guide",

    โปรเจกต์ทั้งหมด: "/projects",
    ดูโปรเจกต์: "/projects",
    ดูโปรเจกต์ทั้งหมด: "/projects",
    รายการโปรเจกต์: "/projects",
    projects: "/projects",

    เพิ่มโปรเจกต์: "/project add",
    สร้างโปรเจกต์: "/project add",
    เพิ่มproject: "/project add",
    "เพิ่ม project": "/project add",

    // Work logs
    วันนี้: "/today",
    งานวันนี้: "/today",
    ดูงานวันนี้: "/today",
    บันทึกวันนี้: "/today",

    สรุป: "/summary",
    สรุปวันนี้: "/summary",
    รายงานวันนี้: "/summary",
    summary: "/summary",

    // Contacts
    ผู้ติดต่อ: "/contact-guide",
    ติดต่อ: "/contact-guide",

    ผู้ติดต่อทั้งหมด: "/contacts",
    ดูผู้ติดต่อ: "/contacts",
    รายชื่อผู้ติดต่อ: "/contacts",
    contacts: "/contacts",

    เพิ่มผู้ติดต่อ: "/contact add",
    สร้างผู้ติดต่อ: "/contact add",
    เพิ่มcontact: "/contact add",
    "เพิ่ม contact": "/contact add",
  };

  if (exactCommands[lower]) {
    return exactCommands[lower];
  }

  const numberCommands = {
    "1": "/update-guide",
    "2": "/my",
    "3": "/projects",
    "4": "/summary",
    "5": "/waiting",
    "6": "/contacts",
  };

  if (numberCommands[compactValue]) {
    return numberCommands[compactValue];
  }

  /*
   * ต้องคืน originalValue
   * ห้ามคืน compactValue เพราะ newline ของ /update จะหาย
   */
  return originalValue;
}

// =========================
// Detect Project Search
// =========================

function shouldTryProjectSearch(text) {
  const value =
    normalizeText(text);

  if (!value) {
    return false;
  }

  if (value.startsWith("/")) {
    return false;
  }

  if (value.includes("\n")) {
    return false;
  }

  if (value.length > 60) {
    return false;
  }

  /*
   * ข้อความเหล่านี้เป็น Context Command
   * ไม่ควรส่งไปค้นโปรเจกต์ธรรมดา
   */
  if (
    /^(?:ใช้|ตั้ง|เลือก|ล้าง|ยกเลิก)\s*(?:โปรเจกต์|project)/i.test(
      value
    )
  ) {
    return false;
  }

  if (
    /^(?:โปรเจกต์ปัจจุบัน|current project|project current)$/i.test(
      value
    )
  ) {
    return false;
  }

  /*
   * ประโยคกิจกรรมไม่ควรถูกตีความเป็นชื่อโปรเจกต์
   */
  if (
    /ประชุม|หารือ|ประสาน|ติดต่อ|รับงาน|รับเรื่อง|รอ|จัดทำ|ทำรายงาน|ทำเอกสาร|แก้ไข|เตรียม|รวบรวม|ศึกษา|ดำเนินการ|ส่ง|ตรวจสอบ|ตรวจทาน|โทร|อีเมล/.test(
      value
    )
  ) {
    return false;
  }

  return true;
}

// =========================
// Detect Natural Work Log
// =========================

function shouldTryQuickUpdate(text) {
  const value =
    normalizeText(text);

  if (
    !value ||
    value.startsWith("/")
  ) {
    return false;
  }

  return /ประชุม|หารือ|ประสาน|ติดต่อ|รับงาน|รับเรื่อง|รอ|จัดทำ|ทำรายงาน|ทำเอกสาร|แก้ไข|เตรียม|รวบรวม|ศึกษา|ดำเนินการ|ตรวจสอบ|ตรวจทาน|โทร|อีเมล|ส่งเมล|ส่งแล้ว|เรียบร้อยแล้ว|แจ้ง|เพิ่มสิทธิ์|อัปเดต|อัพเดต/.test(
    value
  );
}

// =========================
// Main Command Handler
// =========================

export async function handleCommand(
  inputText,
  userId
) {
  const originalText =
    normalizeText(inputText);

  if (!originalText) {
    return menuText();
  }

  const text =
    mapNaturalCommand(
      originalText
    );

  // =========================
  // Basic Commands
  // =========================

  if (/^\/menu$/i.test(text)) {
    return menuText();
  }

  if (/^\/help$/i.test(text)) {
    return helpText();
  }

  if (
    /^\/update-guide$/i.test(text)
  ) {
    return updateGuideText();
  }

  if (
    /^\/task-guide$/i.test(text)
  ) {
    return taskGuideText();
  }

  if (
    /^\/project-guide$/i.test(text)
  ) {
    return projectGuideText();
  }

  if (
    /^\/contact-guide$/i.test(text)
  ) {
    return contactGuideText();
  }

  const reporter =
    displayName(userId);

  // =========================
  // Main Command Chain
  // =========================

  const commandResult =
    /*
     * Context ต้องตรวจเป็นลำดับแรก เช่น:
     * ใช้โปรเจกต์ P50
     * โปรเจกต์ปัจจุบัน
     * ล้างโปรเจกต์
     */
    (await handleContextCommand({
      text,
      userId,
      displayName: reporter,
    })) ||

    /*
     * WorkLog ตัวใหม่รับค่าเป็น Object
     */
    (await handleWorklogCommand({
      text,
      reporter,
      userId,
    })) ||

    (await handleTaskCommand(
      text,
      reporter
    )) ||

    (await handleProjectCommand(
      text
    )) ||

    (await handleContactCommand(
      text
    ));

  if (commandResult) {
    return commandResult;
  }

  // =========================
  // Direct Project Search
  // =========================

  /*
   * รองรับพิมพ์ Code หรือชื่อ Project ตรง ๆ เช่น:
   *
   * P50
   * 69DDPM001
   * Project 50
   * Oracle
   */
  if (
    shouldTryProjectSearch(
      originalText
    )
  ) {
    const projectResult =
      await handleProjectCommand(
        `/project ${originalText}`
      );

    if (projectResult) {
      const resultText =
        String(projectResult);

      const notFound =
        /ไม่พบโปรเจกต์|ไม่พบ project|ไม่พบข้อมูล/i.test(
          resultText
        );

      if (!notFound) {
        return projectResult;
      }
    }
  }

  // =========================
  // Natural Quick Update
  // =========================

  /*
   * รองรับ WorkLog แบบไม่ต้องพิมพ์ /update
   *
   * ตัวอย่าง:
   * ประชุมกับxxxเรื่อง Project 50
   */
  if (
    shouldTryQuickUpdate(
      originalText
    )
  ) {
    return handleWorklogCommand({
      text:
        `/update ${originalText}`,
      reporter,
      userId,
    });
  }

  // =========================
  // Unknown Command
  // =========================

  return [
    `ไม่เข้าใจคำว่า “${originalText}”`,
    "",
    "ลองพิมพ์:",
    "• เมนู",
    "• บันทึกงาน",
    "• งานของฉัน",
    "• โปรเจกต์ทั้งหมด",
    "• ใช้โปรเจกต์ P50",
    "• สรุปวันนี้",
    "",
    "หรือพิมพ์ /help เพื่อดูวิธีใช้",
  ].join("\n");
}