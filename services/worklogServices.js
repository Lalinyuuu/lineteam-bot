import { SHEETS } from "../config.js";
import {
  getObjects,
  appendRow,
} from "../sheets.js";

// Get All Work Logs

export async function getWorkLogs() {
  return await getObjects(SHEETS.WORKLOG);
}

// Get Logs By Task

export async function getTaskLogs(taskId) {
  const logs = await getWorkLogs();

  return logs.filter(
    (l) => l["Task ID"] === taskId
  );
}

// =========================
// Get Logs By Project
// =========================

export async function getProjectLogs(projectId) {
  const logs = await getWorkLogs();

  return logs.filter(
    (l) => l["Project ID"] === projectId
  );
}

// =========================
// Get Today's Logs
// =========================

export async function getTodayLogs() {
  const today = new Date()
    .toISOString()
    .slice(0, 10);

  const logs = await getWorkLogs();

  return logs.filter(
    (l) => l.Date === today
  );
}

// =========================
// Add Work Log
// =========================

export async function addWorkLog(data) {
  const now = new Date();

  const date = now
    .toISOString()
    .slice(0, 10);

  const time = now
    .toTimeString()
    .slice(0, 8);

  const row = [
    data.logId,
    data.taskId ?? "",
    data.projectId ?? "",
    now.toISOString(),
    date,
    time,
    data.createdBy ?? "",
    data.activityType ?? "",
    data.workType ?? "",
    data.description ?? "",
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

  return true;
}

// =========================
// Summary Today
// =========================

export async function getTodaySummary() {
  const logs = await getTodayLogs();

  const summary = {
    total: logs.length,
    meeting: 0,
    working: 0,
    waiting: 0,
    done: 0,
  };

  for (const log of logs) {
    switch (log["Activity Type"]) {
      case "Meeting":
        summary.meeting++;
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
    }
  }

  return summary;
}