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
  normalizePriority,
  normalizeCategory,
} from "../utils/parser.js";

import {
  resolveProject,
} from "./projectCommand.js";

import {
  getUserContext,
} from "./contextCommand.js";

// =========================
// Helpers
// =========================

function normalize(value) {
  return String(value ?? "").trim();
}

function getProjectName(project) {
  return (
    normalize(
      project?.["Project Name TH"]
    ) ||
    normalize(
      project?.["Project Name EN"]
    ) ||
    normalize(
      project?.["Project Name"]
    ) ||
    normalize(
      project?.["Project Code"]
    ) ||
    "ไม่ระบุโปรเจกต์"
  );
}

function getProjectCode(project) {
  return (
    normalize(
      project?.["Project Code"]
    ) || ""
  );
}

function parseProgress(value) {
  const parsed = Number.parseInt(
    String(value ?? "0"),
    10
  );

  if (Number.isNaN(parsed)) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, parsed)
  );
}

// =========================
// Format Task
// =========================

export function formatTask(
  task,
  index
) {
  const status =
    task.Status || "To Do";

  let icon = "⬜";

  if (status === "Done") {
    icon = "✅";
  } else if (status === "Waiting") {
    icon = "⏳";
  } else if (status === "Doing") {
    icon = "🔄";
  } else if (status === "Cancelled") {
    icon = "❌";
  }

  const rawProgress =
    task["Progress (%)"];

  const progress =
    rawProgress !== "" &&
    rawProgress !== undefined &&
    rawProgress !== null
      ? ` • ${rawProgress}%`
      : "";

  const due = normalize(
    task["Due Date"]
  )
    ? `\n   📅 ${task["Due Date"]}`
    : "";

  const priority = normalize(
    task.Priority
  )
    ? `\n   🔥 ${task.Priority}`
    : "";

  return (
    `${index + 1}. ${icon} ` +
    `${task["Task Name"]}${progress}\n` +
    `   ID: ${task["Task ID"]}` +
    `${due}` +
    `${priority}`
  );
}

export function formatTasks(
  title,
  tasks
) {
  if (!tasks.length) {
    return `${title}\n\nไม่พบรายการงาน`;
  }

  const shown = tasks
    .slice(-20)
    .reverse();

  const body = shown
    .map(formatTask)
    .join("\n\n");

  const more =
    tasks.length > 20
      ? `\n\nแสดง 20 จาก ${tasks.length} รายการ`
      : "";

  return `${title}\n\n${body}${more}`;
}

// =========================
// Resolve Task Project
// =========================

async function resolveTaskProject({
  fields,
  userId,
}) {
  const explicitProject =
    normalize(
      fields.project
    ) ||
    normalize(
      fields.projectCode
    ) ||
    normalize(
      fields.projectName
    );

  // ผู้ใช้ระบุ Project ในข้อความ
  if (explicitProject) {
    const project =
      await resolveProject(
        explicitProject
      );

    return {
      project,
      explicitProject,
      source: "explicit",
    };
  }

  // ไม่ได้ระบุ Project
  // ให้ดึงจาก UserContext
  if (normalize(userId)) {
    const context =
      await getUserContext(
        userId
      );

    const contextProjectId =
      normalize(
        context?.[
          "Current Project ID"
        ]
      );

    const contextProjectCode =
      normalize(
        context?.[
          "Current Project Code"
        ]
      );

    const contextProjectName =
      normalize(
        context?.[
          "Current Project Name"
        ]
      );

    if (
      contextProjectId ||
      contextProjectCode
    ) {
      let project = null;

      if (contextProjectCode) {
        project =
          await resolveProject(
            contextProjectCode
          );
      }

      /*
       * กรณี resolveProject หาไม่เจอ
       * แต่ UserContext มี Project ID อยู่
       * ให้สร้าง object ชั่วคราวเพื่อใช้งานต่อ
       */
      if (!project && contextProjectId) {
        project = {
          "Project ID":
            contextProjectId,
          "Project Code":
            contextProjectCode,
          "Project Name TH":
            contextProjectName,
        };
      }

      return {
        project,
        explicitProject: "",
        source: "context",
      };
    }
  }

  return {
    project: null,
    explicitProject: "",
    source: "none",
  };
}

// =========================
// Command Handler
// =========================

export async function handleTaskCommand({
  text,
  reporter,
  userId,
}) {
  const normalizedText =
    normalize(text);

  const normalizedReporter =
    normalize(reporter) || "ไม่ระบุ";

  if (!normalizedText) {
    return null;
  }

  // =========================
  // My Tasks
  // =========================

  if (
    /^\/my$/i.test(
      normalizedText
    )
  ) {
    const tasks =
      await getMyTasks(
        normalizedReporter
      );

    return formatTasks(
      `👤 งานของ ${normalizedReporter}`,
      tasks
    );
  }

  // =========================
  // Waiting Tasks
  // =========================

  if (
    /^\/waiting$/i.test(
      normalizedText
    )
  ) {
    const tasks =
      await getWaitingTasks();

    return formatTasks(
      "⏳ งานที่รอ",
      tasks
    );
  }

  // =========================
  // Done Tasks
  // =========================

  if (
    /^\/done$/i.test(
      normalizedText
    )
  ) {
    const tasks =
      await getDoneTasks();

    return formatTasks(
      "✅ งานที่เสร็จ",
      tasks
    );
  }

  // =========================
  // Show Add Task Form
  // =========================

  if (
    /^\/task\s+add$/i.test(
      normalizedText
    )
  ) {
    return [
      "📝 เพิ่มงานใหม่",
      "",
      "คัดลอกแบบฟอร์มนี้แล้วกรอกข้อมูล:",
      "",
      "/task add",
      "Project: ",
      "Task: ",
      "Description: ",
      "Category: ",
      "Owner: ",
      "Requested By: ",
      "Contact: ",
      "Status: To Do",
      "Progress: 0",
      "Priority: Medium",
      "Next Step: ",
      "Waiting For: ",
      "Due Date: ",
      "",
      "หมายเหตุ:",
      "ถ้าเลือกโปรเจกต์ด้วย /use แล้ว",
      "สามารถเว้น Project ได้",
    ].join("\n");
  }

  // =========================
  // Add Task
  // =========================

  if (
    /^\/task\s+add(?:\s|$)/i.test(
      normalizedText
    )
  ) {
    const fields =
      parseFields(
        normalizedText
      );

    const taskName =
      normalize(fields.task) ||
      normalize(fields.name) ||
      normalize(fields.taskName);

    if (!taskName) {
      return [
        "กรุณาระบุชื่อ Task",
        "",
        "ตัวอย่าง:",
        "/task add",
        "Task: สรุป MoM",
        "Category: Report",
        "Owner: ยู",
        "Status: To Do",
        "Priority: High",
      ].join("\n");
    }

    const {
      project,
      explicitProject,
      source,
    } =
      await resolveTaskProject({
        fields,
        userId,
      });

    if (
      explicitProject &&
      !project
    ) {
      return [
        `ไม่พบโปรเจกต์ “${explicitProject}”`,
        "",
        "ลองค้นหาจาก:",
        "• Project Code",
        "• ชื่อภาษาไทย",
        "• ชื่อภาษาอังกฤษ",
        "• Alias",
      ].join("\n");
    }

    const projectId =
      normalize(
        project?.["Project ID"]
      );

    if (!projectId) {
      return [
        "ยังไม่พบโปรเจกต์สำหรับ Task นี้",
        "",
        "เลือกโปรเจกต์ก่อนด้วย:",
        "/use DDPM001",
        "",
        "หรือระบุในคำสั่ง:",
        "Project: DDPM001",
      ].join("\n");
    }

    const taskId =
      newId("TASK");

    const progress =
      parseProgress(
        fields.progress
      );

    const status =
      progress === 100
        ? "Done"
        : normalizeStatus(
            fields.status
          );

    const priority =
      normalizePriority(
        fields.priority
      );

    const category =
      normalizeCategory(
        fields.category
      );

    const owner =
      normalize(fields.owner) ||
      normalizedReporter;

    await createTask({
      taskId,

      projectId,

      parentTaskId:
        normalize(
          fields.parentTaskId
        ),

      taskCode:
        normalize(
          fields.taskCode
        ),

      taskName,

      description:
        normalize(
          fields.description
        ),

      referenceLink:
        normalize(
          fields.referenceLink
        ),

      category,

      owner,

      requestedBy:
        normalize(
          fields.requestedBy
        ),

      contactPerson:
        normalize(
          fields.contact
        ) ||
        normalize(
          fields.contactPerson
        ),

      status,

      progress,

      priority,

      latestUpdate:
        normalize(
          fields.latestUpdate
        ),

      nextStep:
        normalize(
          fields.nextStep
        ),

      waitingFor:
        normalize(
          fields.waitingFor
        ),

      receivedDate:
        normalize(
          fields.receivedDate
        ) ||
        bangkokDate(),

      dueDate:
        normalize(
          fields.dueDate
        ),

      estimatedHours:
        normalize(
          fields.estimatedHours
        ),

      actualHours:
        normalize(
          fields.actualHours
        ),

      createdBy:
        normalizedReporter,

      updatedBy:
        normalizedReporter,
    });

    const projectDisplayName =
      getProjectName(project);

    const projectCode =
      getProjectCode(project);

    return [
      "✅ เพิ่มงานแล้ว",
      "",
      `📝 ${taskName}`,
      `👤 ${owner}`,
      `📁 ${projectDisplayName}`,
      projectCode
        ? `🔖 ${projectCode}`
        : "",
      `🏷 ${category}`,
      `📌 ${status} • ${progress}%`,
      `🔥 ${priority}`,
      source === "context"
        ? "📍 ใช้โปรเจกต์จาก Context"
        : "",
      `ID: ${taskId}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  // =========================
  // Update Task Status
  // =========================

  const taskUpdate =
    normalizedText.match(
      /^\/task\s+update\s+(\S+)\s+(To Do|Doing|Waiting|Done|Cancelled)(?:\s+(\d{1,3}))?\s*$/i
    );

  if (taskUpdate) {
    const taskId =
      taskUpdate[1];

    const status =
      normalizeStatus(
        taskUpdate[2]
      );

    const rawProgress =
      taskUpdate[3];

    let progress;

    if (
      rawProgress !== undefined
    ) {
      progress = Math.min(
        100,
        Math.max(
          0,
          Number(rawProgress)
        )
      );
    } else if (
      status === "Done"
    ) {
      progress = 100;
    } else {
      progress = 0;
    }

    const updated =
      await updateTaskStatus(
        taskId,
        status,
        progress,
        normalizedReporter
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

  // =========================
  // Invalid Update Format
  // =========================

  if (
    /^\/task\s+update(?:\s|$)/i.test(
      normalizedText
    )
  ) {
    return [
      "รูปแบบคำสั่งไม่ถูกต้อง",
      "",
      "/task update TASK-ID Doing 50",
      "/task update TASK-ID Waiting 50",
      "/task update TASK-ID Done 100",
      "",
      "Status ที่ใช้ได้:",
      "To Do, Doing, Waiting, Done, Cancelled",
    ].join("\n");
  }

  return null;
}