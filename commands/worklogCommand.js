import {
  getProjects,
} from "../services/projectService.js";

import {
  getTodayLogs,
  addWorkLog,
  getTodaySummary,
} from "../services/worklogService.js";

import {
  bangkokDate,
  newId,
} from "../utils/common.js";

import {
  inferActivity,
  normalizeStatus,
} from "../utils/parser.js";

import {
  resolveProject,
} from "./projectCommand.js";

/**
 * ตัดเวลาออกจากต้นข้อความ
 *
 * รองรับ:
 * 09:00 ประชุม...
 * 09.00 ประชุม...
 * 9:30 น. ประชุม...
 */
function extractTime(line) {
  const value = String(line || "").trim();

  const match = value.match(
    /^(\d{1,2})[.:](\d{2})(?:\s*น\.?)?\s*[-–—:]?\s*(.*)$/i
  );

  if (!match) {
    return {
      time: "",
      description: value,
    };
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return {
      time: "",
      description: value,
    };
  }

  return {
    time: `${String(hour).padStart(2, "0")}:${String(
      minute
    ).padStart(2, "0")}`,
    description: match[3].trim(),
  };
}

/**
 * หา Project จากข้อความ
 */
function findProjectFromText(text, projects) {
  const normalizedText = String(text || "")
    .trim()
    .toLowerCase();

  if (!normalizedText) {
    return null;
  }

  return (
    projects.find((item) => {
      const code = String(
        item["Project Code"] || ""
      )
        .trim()
        .toLowerCase();

      const name = String(
        item["Project Name"] || ""
      )
        .trim()
        .toLowerCase();

      return (
        (code &&
          normalizedText.includes(code)) ||
        (name &&
          normalizedText.includes(name))
      );
    }) || null
  );
}

/**
 * แยกข้อความเป็นรายการ WorkLog
 *
 * รองรับทั้ง:
 *
 * /update
 * 09:00 ประชุม
 * 10:00 ประสาน BA
 *
 * และกรณี newline หาย:
 *
 * /update 09:00 ประชุม 10:00 ประสาน BA
 */
function splitWorkLogLines(text) {
  return String(text || "")
    .replace(/\r\n?/g, "\n")
    .replace(
      /\s+(?=\d{1,2}[.:]\d{2}(?:\s*น\.?)?\s+)/g,
      "\n"
    )
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(
      (line) =>
        !/^[-–—=_*#]+$/.test(line)
    );
}

/**
 * กำหนด Work Type จาก Activity Type
 */
function inferWorkType(activityType) {
  const workTypeMap = {
    Meeting: "Meeting",
    Coordinate: "Internal",
    Call: "Internal",
    Email: "Internal",
    Review: "Documentation",
    Working: "Internal",
    Receive: "Internal",
    Waiting: "Internal",
    Done: "Internal",
    Note: "Internal",
  };

  return (
    workTypeMap[activityType] ||
    "Internal"
  );
}

/**
 * สร้าง WorkLog หนึ่งรายการ
 */
async function createWorkLog({
  description,
  time,
  project,
  reporter,
}) {
  const activityType =
    inferActivity(description);

  const statusAfterUpdate =
    normalizeStatus(description);

  await addWorkLog({
    logId: newId("LOG"),

    projectId:
      project?.["Project ID"] || "",

    createdBy: reporter,

    activityType,

    workType:
      inferWorkType(activityType),

    description,

    statusAfterUpdate,

    activityTime: time,
  });

  return {
    time,
    description,
    project,
    activityType,
    statusAfterUpdate,
  };
}

/**
 * บันทึก WorkLog แบบรวดเร็ว
 */
export async function addQuickUpdate(
  text,
  reporter
) {
  const rawText = String(text || "");

  const cleaned = rawText
    .replace(/^\/update(?:\s|$)/i, "")
    .trim();

  console.log(
    "RAW UPDATE:",
    JSON.stringify(rawText)
  );

  console.log(
    "CLEANED UPDATE:",
    JSON.stringify(cleaned)
  );

  if (!cleaned) {
    return [
      "กรุณาพิมพ์รายละเอียดต่อจาก /update",
      "",
      "ตัวอย่าง:",
      "/update",
      "09:00 ประชุมกับพี่บอยเรื่อง Project 50",
      "10:30 รับงาน Oracle จากพี่กบ",
      "",
      "หรือระบุโปรเจกต์ไว้ด้านบน:",
      "/update",
      "Project: P50",
      "09:00 ประชุมกับพี่บอย",
      "13:00 ทำรายงาน",
    ].join("\n");
  }

  const projects = await getProjects();

  let defaultProject = null;
  let content = cleaned;

  /**
   * รองรับ:
   *
   * Project: P50
   * 09:00 ประชุม...
   * 10:00 ทำรายงาน...
   *
   * และ:
   *
   * โปรเจกต์: 69DDPM001
   * 09:00 ประชุม...
   */
  const explicitProjectMatch =
    cleaned.match(
      /^(?:project|โปรเจกต์)\s*[:：]\s*([^\n]+)\n([\s\S]+)$/i
    );

  if (explicitProjectMatch) {
    const projectKeyword =
      explicitProjectMatch[1].trim();

    defaultProject =
      await resolveProject(
        projectKeyword
      );

    if (!defaultProject) {
      return [
        `❌ ไม่พบโปรเจกต์ ${projectKeyword}`,
        "",
        "กรุณาตรวจสอบ Project Code หรือชื่อโปรเจกต์อีกครั้ง",
      ].join("\n");
    }

    content =
      explicitProjectMatch[2].trim();
  }

  const lines =
    splitWorkLogLines(content);

  console.log(
    "WORKLOG LINES:",
    JSON.stringify(lines)
  );

  if (!lines.length) {
    return "ไม่พบรายละเอียดที่ต้องการบันทึก";
  }

  const createdLogs = [];
  const failedLogs = [];

  for (const line of lines) {
    const {
      time,
      description,
    } = extractTime(line);

    if (!description) {
      failedLogs.push({
        line,
        reason: "ไม่มีรายละเอียดงาน",
      });

      continue;
    }

    /**
     * ลำดับการหา Project:
     * 1. Project จากหัวข้อความ
     * 2. Project จากข้อความแต่ละรายการ
     */
    const project =
      defaultProject ||
      findProjectFromText(
        description,
        projects
      );

    try {
      const result =
        await createWorkLog({
          description,
          time,
          project,
          reporter,
        });

      createdLogs.push(result);
    } catch (error) {
      console.error(
        "Create WorkLog failed:",
        {
          line,
          error,
        }
      );

      failedLogs.push({
        line,
        reason:
          error?.message ||
          "บันทึกไม่สำเร็จ",
      });
    }
  }

  if (!createdLogs.length) {
    return [
      "❌ ไม่สามารถบันทึก WorkLog ได้",
      "",
      ...failedLogs.map(
        (item) =>
          `• ${item.line}\n  ${item.reason}`
      ),
    ].join("\n");
  }

  const resultLines =
    createdLogs.map(
      (log, index) => {
        const timeText = log.time
          ? `${log.time} `
          : "";

        const projectText =
          log.project?.[
            "Project Code"
          ] ||
          log.project?.[
            "Project Name"
          ] ||
          "ไม่ระบุโปรเจกต์";

        return [
          `${index + 1}. ${timeText}[${log.activityType}]`,
          `   ${log.description}`,
          `   📁 ${projectText}`,
        ].join("\n");
      }
    );

  const response = [
    `✅ บันทึก WorkLog แล้ว ${createdLogs.length} รายการ`,
    `👤 ${reporter}`,
    "",
    ...resultLines,
  ];

  if (failedLogs.length) {
    response.push(
      "",
      `⚠️ บันทึกไม่สำเร็จ ${failedLogs.length} รายการ`,
      ...failedLogs.map(
        (item) =>
          `• ${item.line}\n  ${item.reason}`
      )
    );
  }

  return response.join("\n");
}

/**
 * จัดการคำสั่ง WorkLog
 */
export async function handleWorklogCommand(
  text,
  reporter
) {
  const normalizedText =
    String(text || "").trim();

  const today = bangkokDate();

  if (
    /^\/update(?:\s|$)/i.test(
      normalizedText
    )
  ) {
    return addQuickUpdate(
      normalizedText,
      reporter
    );
  }

  if (/^\/today$/i.test(normalizedText)) {
    const logs =
      await getTodayLogs();

    if (!logs.length) {
      return [
        `📅 ${today}`,
        "",
        "ยังไม่มี WorkLog วันนี้",
      ].join("\n");
    }

    const body = logs
      .slice(-25)
      .reverse()
      .map((log, index) => {
        const project =
          log["Project ID"]
            ? ` • ${log["Project ID"]}`
            : "";

        const activityTime =
          log["Activity Time"]
            ? `${log["Activity Time"]} `
            : "";

        return [
          `${index + 1}. ${activityTime}[${log["Activity Type"]}] ${log.Description}`,
          `   ${log["Created By"]}${project}`,
        ].join("\n");
      })
      .join("\n\n");

    return [
      `📅 WorkLog วันนี้ ${today}`,
      "",
      body,
    ].join("\n");
  }

  if (
    /^\/summary$/i.test(
      normalizedText
    )
  ) {
    const summary =
      await getTodaySummary();

    return [
      `📊 สรุปวันนี้ ${today}`,
      "",
      `ทั้งหมด ${summary.total || 0}`,
      `📥 Receive ${summary.receive || 0}`,
      `🗓 Meeting ${summary.meeting || 0}`,
      `☎ Coordinate ${summary.coordinate || 0}`,
      `🔄 Working ${summary.working || 0}`,
      `⏳ Waiting ${summary.waiting || 0}`,
      `✅ Done ${summary.done || 0}`,
    ].join("\n");
  }

  return null;
}