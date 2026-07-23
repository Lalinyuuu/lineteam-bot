import {
  getObjects,
  appendRow,
  findRow,
  updateRow,
} from "../sheets.js";

import { SHEETS } from "../config.js";
import { resolveProject } from "./projectCommand.js";

const USER_CONTEXT_SHEET =
  SHEETS.USER_CONTEXT || "UserContext";

// =========================
// Helpers
// =========================

function normalize(value) {
  return String(value ?? "").trim();
}

function getProjectName(project) {
  return (
    normalize(project?.["Project Name TH"]) ||
    normalize(project?.["Project Name EN"]) ||
    normalize(project?.["Project Name"]) ||
    normalize(project?.["Project Code"]) ||
    "-"
  );
}

function getProjectCode(project) {
  return (
    normalize(project?.["Project Code"]) ||
    "-"
  );
}

function setRowValue(
  row,
  headers,
  headerName,
  value
) {
  const index = headers.indexOf(
    headerName
  );

  if (index !== -1) {
    row[index] = value ?? "";
  }
}

// =========================
// Get User Context
// =========================

export async function getUserContext(
  userId
) {
  const normalizedUserId =
    normalize(userId);

  if (!normalizedUserId) {
    return null;
  }

  const contexts =
    await getObjects(
      USER_CONTEXT_SHEET
    );

  return (
    contexts.find(
      (context) =>
        normalize(
          context["User ID"]
        ) === normalizedUserId
    ) || null
  );
}

// =========================
// Set Current Project
// =========================

export async function setUserContext({
  userId,
  displayName,
  project,
}) {
  const normalizedUserId =
    normalize(userId);

  if (!normalizedUserId) {
    throw new Error(
      "setUserContext: userId is required"
    );
  }

  if (!project) {
    throw new Error(
      "setUserContext: project is required"
    );
  }

  const projectId =
    normalize(
      project["Project ID"]
    );

  const projectCode =
    normalize(
      project["Project Code"]
    );

  const projectName =
    getProjectName(project);

  const updatedAt =
    new Date().toISOString();

  const result =
    await findRow(
      USER_CONTEXT_SHEET,
      "User ID",
      normalizedUserId
    );

  // =========================
  // Create New Context
  // =========================

  if (!result) {
    /*
     * Header:
     *
     * 1. User ID
     * 2. Display Name
     * 3. Current Project ID
     * 4. Current Project Code
     * 5. Current Project Name
     * 6. Current Task ID
     * 7. Current Task Name
     * 8. Current Contact
     * 9. Current Status
     * 10. Last Activity
     * 11. Updated At
     */

    await appendRow(
      USER_CONTEXT_SHEET,
      [
        normalizedUserId,
        normalize(displayName),
        projectId,
        projectCode,
        projectName,
        "",
        "",
        "",
        "Project Selected",
        `เลือกโปรเจกต์ ${projectCode}`,
        updatedAt,
      ]
    );

    return true;
  }

  // =========================
  // Update Existing Context
  // =========================

  const row = [...result.row];
  const headers = result.headers;

  setRowValue(
    row,
    headers,
    "Display Name",
    normalize(displayName) ||
      result.object?.[
        "Display Name"
      ] ||
      ""
  );

  setRowValue(
    row,
    headers,
    "Current Project ID",
    projectId
  );

  setRowValue(
    row,
    headers,
    "Current Project Code",
    projectCode
  );

  setRowValue(
    row,
    headers,
    "Current Project Name",
    projectName
  );

  /*
   * เมื่อเปลี่ยนโปรเจกต์
   * ให้ล้าง Current Task เดิม
   * เพราะ Task อาจเป็นของอีกโปรเจกต์
   */

  setRowValue(
    row,
    headers,
    "Current Task ID",
    ""
  );

  setRowValue(
    row,
    headers,
    "Current Task Name",
    ""
  );

  setRowValue(
    row,
    headers,
    "Current Status",
    "Project Selected"
  );

  setRowValue(
    row,
    headers,
    "Last Activity",
    `เลือกโปรเจกต์ ${projectCode}`
  );

  setRowValue(
    row,
    headers,
    "Updated At",
    updatedAt
  );

  await updateRow(
    USER_CONTEXT_SHEET,
    result.rowNumber,
    row
  );

  return true;
}

// =========================
// Set Current Task
// =========================

export async function setCurrentTask({
  userId,
  displayName,
  task,
}) {
  const normalizedUserId =
    normalize(userId);

  if (
    !normalizedUserId ||
    !task
  ) {
    return false;
  }

  const result =
    await findRow(
      USER_CONTEXT_SHEET,
      "User ID",
      normalizedUserId
    );

  if (!result) {
    return false;
  }

  const row = [...result.row];
  const headers = result.headers;

  const taskId =
    normalize(task["Task ID"]);

  const taskName =
    normalize(task["Task Name"]);

  setRowValue(
    row,
    headers,
    "Display Name",
    normalize(displayName)
  );

  setRowValue(
    row,
    headers,
    "Current Task ID",
    taskId
  );

  setRowValue(
    row,
    headers,
    "Current Task Name",
    taskName
  );

  setRowValue(
    row,
    headers,
    "Current Status",
    normalize(task.Status) ||
      "Task Selected"
  );

  setRowValue(
    row,
    headers,
    "Last Activity",
    `เลือก Task ${taskName}`
  );

  setRowValue(
    row,
    headers,
    "Updated At",
    new Date().toISOString()
  );

  await updateRow(
    USER_CONTEXT_SHEET,
    result.rowNumber,
    row
  );

  return true;
}

// =========================
// Update Context Activity
// =========================

export async function updateContextActivity({
  userId,
  displayName,
  contact,
  status,
  activity,
}) {
  const normalizedUserId =
    normalize(userId);

  if (!normalizedUserId) {
    return false;
  }

  const result =
    await findRow(
      USER_CONTEXT_SHEET,
      "User ID",
      normalizedUserId
    );

  if (!result) {
    return false;
  }

  const row = [...result.row];
  const headers = result.headers;

  if (displayName !== undefined) {
    setRowValue(
      row,
      headers,
      "Display Name",
      normalize(displayName)
    );
  }

  if (contact !== undefined) {
    setRowValue(
      row,
      headers,
      "Current Contact",
      normalize(contact)
    );
  }

  if (status !== undefined) {
    setRowValue(
      row,
      headers,
      "Current Status",
      normalize(status)
    );
  }

  if (activity !== undefined) {
    setRowValue(
      row,
      headers,
      "Last Activity",
      normalize(activity)
    );
  }

  setRowValue(
    row,
    headers,
    "Updated At",
    new Date().toISOString()
  );

  await updateRow(
    USER_CONTEXT_SHEET,
    result.rowNumber,
    row
  );

  return true;
}

// =========================
// Clear Current Task
// =========================

export async function clearCurrentTask({
  userId,
}) {
  const normalizedUserId =
    normalize(userId);

  if (!normalizedUserId) {
    return false;
  }

  const result =
    await findRow(
      USER_CONTEXT_SHEET,
      "User ID",
      normalizedUserId
    );

  if (!result) {
    return false;
  }

  const row = [...result.row];
  const headers = result.headers;

  setRowValue(
    row,
    headers,
    "Current Task ID",
    ""
  );

  setRowValue(
    row,
    headers,
    "Current Task Name",
    ""
  );

  setRowValue(
    row,
    headers,
    "Current Status",
    "Task Cleared"
  );

  setRowValue(
    row,
    headers,
    "Last Activity",
    "ล้าง Task ปัจจุบัน"
  );

  setRowValue(
    row,
    headers,
    "Updated At",
    new Date().toISOString()
  );

  await updateRow(
    USER_CONTEXT_SHEET,
    result.rowNumber,
    row
  );

  return true;
}

// =========================
// Clear Current Project
// =========================

export async function clearUserContext({
  userId,
  displayName,
}) {
  const normalizedUserId =
    normalize(userId);

  if (!normalizedUserId) {
    return false;
  }

  const result =
    await findRow(
      USER_CONTEXT_SHEET,
      "User ID",
      normalizedUserId
    );

  if (!result) {
    return false;
  }

  const row = [...result.row];
  const headers = result.headers;

  setRowValue(
    row,
    headers,
    "Display Name",
    normalize(displayName)
  );

  setRowValue(
    row,
    headers,
    "Current Project ID",
    ""
  );

  setRowValue(
    row,
    headers,
    "Current Project Code",
    ""
  );

  setRowValue(
    row,
    headers,
    "Current Project Name",
    ""
  );

  setRowValue(
    row,
    headers,
    "Current Task ID",
    ""
  );

  setRowValue(
    row,
    headers,
    "Current Task Name",
    ""
  );

  setRowValue(
    row,
    headers,
    "Current Contact",
    ""
  );

  setRowValue(
    row,
    headers,
    "Current Status",
    "Context Cleared"
  );

  setRowValue(
    row,
    headers,
    "Last Activity",
    "ล้างโปรเจกต์ปัจจุบัน"
  );

  setRowValue(
    row,
    headers,
    "Updated At",
    new Date().toISOString()
  );

  await updateRow(
    USER_CONTEXT_SHEET,
    result.rowNumber,
    row
  );

  return true;
}

// =========================
// Format Current Context
// =========================

function formatCurrentContext(
  context
) {
  if (
    !context ||
    !normalize(
      context["Current Project ID"]
    )
  ) {
    return [
      "📂 ยังไม่ได้เลือกโปรเจกต์ปัจจุบัน",
      "",
      "เลือกโปรเจกต์ด้วยคำสั่ง:",
      "/use 69DDPM001",
      "/use Chapanakit",
      "/use ฮะเก๋า",
    ].join("\n");
  }

  const projectName =
    normalize(
      context["Current Project Name"]
    ) || "-";

  const projectCode =
    normalize(
      context["Current Project Code"]
    ) || "-";

  const taskName =
    normalize(
      context["Current Task Name"]
    );

  const contact =
    normalize(
      context["Current Contact"]
    );

  const status =
    normalize(
      context["Current Status"]
    );

  const lastActivity =
    normalize(
      context["Last Activity"]
    );

  const lines = [
    "📌 Context ปัจจุบัน",
    "",
    `📁 ${projectName}`,
    `🔖 ${projectCode}`,
  ];

  if (taskName) {
    lines.push(
      `📝 ${taskName}`
    );
  }

  if (contact) {
    lines.push(
      `👤 ${contact}`
    );
  }

  if (status) {
    lines.push(
      `📊 ${status}`
    );
  }

  if (lastActivity) {
    lines.push(
      `🕘 ${lastActivity}`
    );
  }

  return lines.join("\n");
}

// =========================
// Command Handler
// =========================

export async function handleContextCommand({
  text,
  userId,
  displayName,
}) {
  const normalizedText =
    normalize(text);

  if (!normalizedText) {
    return null;
  }

  // =========================
  // Show Current Context
  // =========================

  if (
    /^\/(?:current|context)$/i.test(
      normalizedText
    ) ||
    /^(โปรเจกต์ปัจจุบัน|โปรเจ็คปัจจุบัน|ตอนนี้อยู่โปรเจกต์ไหน|ดูบริบทปัจจุบัน)$/i.test(
      normalizedText
    )
  ) {
    const context =
      await getUserContext(userId);

    return formatCurrentContext(
      context
    );
  }

  // =========================
  // Clear Task
  // =========================

  if (
    /^\/cleartask$/i.test(
      normalizedText
    ) ||
    /^(ล้างงานปัจจุบัน|ล้าง task|ยกเลิก task ปัจจุบัน)$/i.test(
      normalizedText
    )
  ) {
    const cleared =
      await clearCurrentTask({
        userId,
      });

    if (!cleared) {
      return "ยังไม่มี Context สำหรับผู้ใช้นี้";
    }

    return "✅ ล้าง Task ปัจจุบันแล้ว";
  }

  // =========================
  // Clear Project Context
  // =========================

  if (
    /^\/(?:clearproject|clear-context)$/i.test(
      normalizedText
    ) ||
    /^(ล้างโปรเจกต์|ยกเลิกโปรเจกต์ปัจจุบัน|ออกจากโปรเจกต์)$/i.test(
      normalizedText
    )
  ) {
    const cleared =
      await clearUserContext({
        userId,
        displayName,
      });

    if (!cleared) {
      return "ยังไม่ได้เลือกโปรเจกต์ปัจจุบัน";
    }

    return [
      "✅ ล้าง Context ปัจจุบันแล้ว",
      "",
      "WorkLog ครั้งถัดไปต้องเลือกหรือระบุโปรเจกต์ใหม่",
    ].join("\n");
  }

  // =========================
  // Set Current Project
  // =========================

  const useMatch =
    normalizedText.match(
      /^\/use\s+(.+)$/i
    ) ||
    normalizedText.match(
      /^\/project\s+use\s+(.+)$/i
    ) ||
    normalizedText.match(
      /^(?:ใช้โปรเจกต์|เลือกโปรเจกต์|ตั้งโปรเจกต์)\s+(.+)$/i
    );

  if (useMatch) {
    if (!normalize(userId)) {
      return "ไม่พบ LINE User ID";
    }

    const keyword =
      normalize(useMatch[1]);

    const project =
      await resolveProject(
        keyword
      );

    if (!project) {
      return [
        `ไม่พบโปรเจกต์ “${keyword}”`,
        "",
        "ค้นหาได้จาก:",
        "• Project Code",
        "• ชื่อภาษาไทย",
        "• ชื่อภาษาอังกฤษ",
        "• Alias",
      ].join("\n");
    }

    await setUserContext({
      userId,
      displayName,
      project,
    });

    return [
      "✅ ตั้งโปรเจกต์ปัจจุบันแล้ว",
      "",
      `📁 ${getProjectName(project)}`,
      `🔖 ${getProjectCode(project)}`,
      "",
      "WorkLog ต่อจากนี้ไม่ต้องระบุโปรเจกต์ทุกครั้ง",
    ].join("\n");
  }

  return null;
}