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

import { resolveProject } from "./projectCommand.js";

export async function addQuickUpdate(
  text,
  reporter
) {
  const cleaned = text
    .replace(/^\/update\s*/i, "")
    .trim();

  if (!cleaned) {
    return "กรุณาพิมพ์รายละเอียดต่อจาก /update";
  }

  const firstLine = cleaned
    .split(/\r?\n/)[0]
    .trim();

  let project = null;
  let description = cleaned;

  const explicit = cleaned.match(
    /^(?:project|โปรเจกต์)\s*[:：]?\s*([^\n]+)\n?([\s\S]*)$/i
  );

  if (explicit) {
    project = await resolveProject(
      explicit[1].trim()
    );

    description =
      explicit[2].trim() ||
      explicit[1].trim();
  } else {
    const projects = await getProjects();

    project =
      projects.find((item) => {
        const code = item["Project Code"] || "";
        const name = item["Project Name"] || "";
        const line = firstLine.toLowerCase();

        return (
          (code &&
            line.includes(code.toLowerCase())) ||
          (name &&
            line.includes(name.toLowerCase()))
        );
      }) || null;
  }

  const activityType = inferActivity(description);

  await addWorkLog({
    logId: newId("LOG"),
    projectId: project?.["Project ID"] || "",
    createdBy: reporter,
    activityType,
    workType:
      activityType === "Meeting"
        ? "Meeting"
        : "Internal",
    description,
    statusAfterUpdate:
      normalizeStatus(description),
  });

  return [
    "✅ บันทึก WorkLog แล้ว",
    `👤 ${reporter}`,
    `📁 ${project?.["Project Name"] || "ไม่ระบุโปรเจกต์"}`,
    `📝 ${description}`,
  ].join("\n");
}

export async function handleWorklogCommand(
  text,
  reporter
) {
  const today = bangkokDate();

  if (/^\/update(?:\s|$)/i.test(text)) {
    return addQuickUpdate(text, reporter);
  }

  if (/^\/today$/i.test(text)) {
    const logs = await getTodayLogs();

    if (!logs.length) {
      return `📅 ${today}\n\nยังไม่มี WorkLog วันนี้`;
    }

    const body = logs
      .slice(-25)
      .reverse()
      .map((log, index) => {
        const project = log["Project ID"]
          ? ` • ${log["Project ID"]}`
          : "";

        return (
          `${index + 1}. ` +
          `[${log["Activity Type"]}] ` +
          `${log.Description}\n` +
          `   ${log["Created By"]}` +
          project
        );
      })
      .join("\n\n");

    return `📅 WorkLog วันนี้ ${today}\n\n${body}`;
  }

  if (/^\/summary$/i.test(text)) {
    const summary = await getTodaySummary();

    return [
      `📊 สรุปวันนี้ ${today}`,
      "",
      `ทั้งหมด ${summary.total}`,
      `🗓 Meeting ${summary.meeting}`,
      `🔄 Working ${summary.working}`,
      `⏳ Waiting ${summary.waiting}`,
      `✅ Done ${summary.done}`,
    ].join("\n");
  }

  return null;
}
