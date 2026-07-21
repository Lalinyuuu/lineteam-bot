import {
  getMyTasks,
  getWaitingTasks,
  getDoneTasks,
  createTask,
  updateTaskStatus,
} from "../services/taskService.js";

import {
  bangkokDate,
  newId,
} from "../utils/common.js";

import {
  parseFields,
  normalizeStatus,
} from "../utils/parser.js";

import { resolveProject } from "./projectCommands.js";

export function formatTask(task, index) {
  const status = task.Status || "To Do";

  let icon = "⬜";

  if (status === "Done") {
    icon = "✅";
  } else if (status === "Waiting") {
    icon = "⏳";
  } else if (status === "Doing") {
    icon = "🔄";
  }

  const progress =
    task["Progress (%)"] !== ""
      ? ` • ${task["Progress (%)"]}%`
      : "";

  const due = task["Due Date"]
    ? `\n   📅 ${task["Due Date"]}`
    : "";

  return (
    `${index + 1}. ${icon} ` +
    `${task["Task Name"]}${progress}\n` +
    `   ID: ${task["Task ID"]}` +
    `${due}`
  );
}

export function formatTasks(title, tasks) {
  if (!tasks.length) {
    return `${title}\n\nไม่พบรายการงาน`;
  }

  const shown = tasks.slice(-20).reverse();

  const body = shown
    .map(formatTask)
    .join("\n\n");

  const more =
    tasks.length > 20
      ? `\n\nแสดง 20 จาก ${tasks.length} รายการ`
      : "";

  return `${title}\n\n${body}${more}`;
}

export async function handleTaskCommand(
  text,
  reporter
) {
  if (/^\/my$/i.test(text)) {
    const tasks = await getMyTasks(reporter);
    return formatTasks(`👤 งานของ ${reporter}`, tasks);
  }

  if (/^\/waiting$/i.test(text)) {
    const tasks = await getWaitingTasks();
    return formatTasks("⏳ งานที่รอ", tasks);
  }

  if (/^\/done$/i.test(text)) {
    const tasks = await getDoneTasks();
    return formatTasks("✅ งานที่เสร็จ", tasks);
  }

  if (/^\/task\s+add(?:\s|$)/i.test(text)) {
    const fields = parseFields(text);

    if (!fields.task && !fields.name) {
      return [
        "กรุณาระบุ Task",
        "",
        "/task add",
        "Project: P50",
        "Task: สรุป MoM",
        "Owner: ยู",
      ].join("\n");
    }

    const project = await resolveProject(fields.project);

    if (fields.project && !project) {
      return `ไม่พบโปรเจกต์ ${fields.project}`;
    }

    const taskId = newId("TASK");

    await createTask({
      taskId,
      projectId: project?.["Project ID"] || "",
      taskName: fields.task || fields.name,
      description: fields.description,
      owner: fields.owner || reporter,
      requestedBy: fields.requestedBy,
      contactPerson: fields.contact,
      status: normalizeStatus(fields.status),
      progress:
        Number.parseInt(fields.progress || "0", 10) || 0,
      priority: fields.priority,
      category: fields.category,
      nextStep: fields.nextStep,
      waitingFor: fields.waitingFor,
      dueDate: fields.dueDate,
      receivedDate: bangkokDate(),
      createdBy: reporter,
      updatedBy: reporter,
    });

    return [
      "✅ เพิ่มงานแล้ว",
      `📝 ${fields.task || fields.name}`,
      `👤 ${fields.owner || reporter}`,
      `📁 ${project?.["Project Name"] || "ไม่ระบุโปรเจกต์"}`,
      `ID: ${taskId}`,
    ].join("\n");
  }

  const taskUpdate = text.match(
    /^\/task\s+update\s+(\S+)\s+(.+?)(?:\s+(\d{1,3}))?$/i
  );

  if (taskUpdate) {
    const taskId = taskUpdate[1];
    const rawStatus = taskUpdate[2];
    const rawProgress = taskUpdate[3];

    const status = normalizeStatus(rawStatus);

    const progress = rawProgress
      ? Math.min(100, Number(rawProgress))
      : status === "Done"
        ? 100
        : 0;

    const updated = await updateTaskStatus(
      taskId,
      status,
      progress,
      reporter
    );

    if (!updated) {
      return `ไม่พบ Task ID ${taskId}`;
    }

    return [
      `✅ อัปเดต ${taskId}`,
      `สถานะ: ${status}`,
      `ความคืบหน้า: ${progress}%`,
    ].join("\n");
  }

  return null;
}
