import { SHEETS } from "../config.js";

import {
  getObjects,
  appendRow,
} from "../sheets.js";

import {
  bangkokDate,
} from "../utils/common.js";

// =========================
// Bangkok Date / Time
// =========================

function bangkokDateTime() {
  const now = new Date();

  const parts = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }
  ).formatToParts(now);

  const values = Object.fromEntries(
    parts.map((part) => [
      part.type,
      part.value,
    ])
  );

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}:${values.second}`,
    timestamp:
      `${values.year}-${values.month}-${values.day}` +
      ` ${values.hour}:${values.minute}:${values.second}`,
  };
}

// =========================
// Get All Work Logs
// =========================

export async function getWorkLogs() {
  return getObjects(SHEETS.WORKLOG);
}

// =========================
// Get Logs By Task
// =========================

export async function getTaskLogs(taskId) {
  const logs = await getWorkLogs();

  return logs.filter(
    (log) =>
      String(log["Task ID"] || "") ===
      String(taskId || "")
  );
}

// =========================
// Get Logs By Project
// =========================

export async function getProjectLogs(
  projectId
) {
  const logs = await getWorkLogs();

  return logs.filter(
    (log) =>
      String(log["Project ID"] || "") ===
      String(projectId || "")
  );
}

// =========================
// Get Today's Logs
// =========================

export async function getTodayLogs() {
  const today = bangkokDate();
  const logs = await getWorkLogs();

  return logs.filter(
    (log) =>
      String(log.Date || "").trim() ===
      today
  );
}

// =========================
// Add Work Log
// =========================

export async function addWorkLog(
  data = {}
) {
  if (!data.logId) {
    throw new Error(
      "addWorkLog: logId is required"
    );
  }

  if (!data.description?.trim()) {
    throw new Error(
      "addWorkLog: description is required"
    );
  }

  const now = bangkokDateTime();

  /*
   * ถ้าผู้ใช้พิมพ์เวลา เช่น 09:00
   * จะใช้เวลานั้นแทนเวลาปัจจุบัน
   */
  const activityTime =
    String(data.activityTime || "").trim();

  const time = activityTime
    ? normalizeActivityTime(activityTime)
    : now.time;

  const row = [
    data.logId,
    data.taskId ?? "",
    data.projectId ?? "",
    now.timestamp,
    now.date,
    time,
    data.createdBy ?? "",
    data.activityType ?? "Note",
    data.workType ?? "Internal",
    data.description.trim(),
    data.fromPerson ?? "",
    data.contactPerson ?? "",
    data.statusAfterUpdate ?? "",
    data.progressAfterUpdate ?? "",
    data.duration ?? "",
    data.remark ?? "",
  ];

  await appendRow(
    SHEETS.WORKLOG,
    row
  );

  return {
    success: true,
    logId: data.logId,
    date: now.date,
    time,
  };
}

// =========================
// Normalize Activity Time
// =========================

function normalizeActivityTime(value) {
  const match = String(value).match(
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/
  );

  if (!match) {
    return value;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(
    match[3] || 0
  );

  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return value;
  }

  return [
    String(hour).padStart(2, "0"),
    String(minute).padStart(2, "0"),
    String(second).padStart(2, "0"),
  ].join(":");
}

// =========================
// Summary Today
// =========================

export async function getTodaySummary() {
  const logs = await getTodayLogs();

  const summary = {
    total: logs.length,
    receive: 0,
    meeting: 0,
    coordinate: 0,
    working: 0,
    waiting: 0,
    done: 0,
    note: 0,
    call: 0,
    email: 0,
    review: 0,
  };

  for (const log of logs) {
    const activityType = String(
      log["Activity Type"] || ""
    ).trim();

    switch (activityType) {
      case "Receive":
        summary.receive++;
        break;

      case "Meeting":
        summary.meeting++;
        break;

      case "Coordinate":
        summary.coordinate++;
        break;

      case "Working":
        summary.working++;
        break;

      case "Waiting":
        summary.waiting++;
        break;

      case "Done":
        summary.done++;
        break;

      case "Call":
        summary.call++;
        break;

      case "Email":
        summary.email++;
        break;

      case "Review":
        summary.review++;
        break;

      case "Note":
      default:
        summary.note++;
        break;
    }
  }

  return summary;
}