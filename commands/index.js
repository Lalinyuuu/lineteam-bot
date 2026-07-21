import { displayName } from "../utils/common.js";
import { handleWorklogCommand } from "./worklogCommands.js";
import { handleTaskCommand } from "./taskCommands.js";
import { handleProjectCommand } from "./projectCommands.js";
import { handleContactCommand } from "./contactCommands.js";

export function helpText() {
  return [
    "🚀 Yuu Checkpoint",
    "",
    "บันทึกงานเร็ว",
    "/update Project 50 วันนี้ประชุมกับพี่บอย รอ BA ส่ง Flow",
    "",
    "เพิ่มงานแบบละเอียด",
    "/task add",
    "Project: P50",
    "Task: สรุปรายงานผลการศึกษา",
    "Owner: ยู",
    "Due: 2026-07-23",
    "Priority: High",
    "",
    "อัปเดตสถานะ",
    "/task update TASK-ID Done 100",
    "",
    "ดูข้อมูล",
    "/today",
    "/my",
    "/waiting",
    "/done",
    "/project P50",
    "/projects",
    "/contacts",
    "/summary",
    "",
    "เพิ่มโปรเจกต์",
    "/project add",
    "",
    "เพิ่มผู้ติดต่อ",
    "/contact add",
  ].join("\n");
}

export async function handleCommand(text, userId) {
  if (/^\/help$/i.test(text)) {
    return helpText();
  }

  const reporter = displayName(userId);

  return (
    (await handleWorklogCommand(text, reporter)) ||
    (await handleTaskCommand(text, reporter)) ||
    (await handleProjectCommand(text)) ||
    (await handleContactCommand(text)) ||
    null
  );
}
