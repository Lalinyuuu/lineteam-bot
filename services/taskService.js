import { SHEETS, DEFAULTS } from "../api/config.js";
import {
  getObjects,
  appendRow,
  findRow,
  updateRow,
} from "../api/sheets.js";

// =========================
// Get All Tasks
// =========================

export async function getTasks() {
  return await getObjects(SHEETS.TASKS);
}

// =========================
// Find Task By ID
// =========================

export async function getTask(taskId) {
  const tasks = await getTasks();

  return tasks.find((t) => t["Task ID"] === taskId) || null;
}

// =========================
// My Tasks
// =========================

export async function getMyTasks(owner) {
  const tasks = await getTasks();

  return tasks.filter((t) => t.Owner === owner);
}

// =========================
// Waiting Tasks
// =========================

export async function getWaitingTasks() {
  const tasks = await getTasks();

  return tasks.filter(
    (t) => t.Status === "Waiting"
  );
}

// =========================
// Done Tasks
// =========================

export async function getDoneTasks() {
  const tasks = await getTasks();

  return tasks.filter(
    (t) => t.Status === "Done"
  );
}

// =========================
// Project Tasks
// =========================

export async function getProjectTasks(projectId) {
  const tasks = await getTasks();

  return tasks.filter(
    (t) => t["Project ID"] === projectId
  );
}

// =========================
// Create Task
// =========================

export async function createTask(task) {
  const now = new Date().toISOString();

  const row = [
    task.taskId,
    task.projectId ?? "",
    task.parentTaskId ?? "",
    task.taskCode ?? "",
    task.taskName,
    task.description ?? "",
    task.referenceLink ?? "",
    task.category ?? "",
    task.owner ?? "",
    task.requestedBy ?? "",
    task.contactPerson ?? "",
    task.status ?? DEFAULTS.TASK_STATUS,
    task.progress ?? DEFAULTS.PROGRESS,
    task.priority ?? DEFAULTS.PRIORITY,
    task.latestUpdate ?? "",
    task.nextStep ?? "",
    task.waitingFor ?? "",
    task.receivedDate ?? "",
    task.dueDate ?? "",
    task.estimatedHours ?? "",
    task.actualHours ?? "",
    now,
    task.createdBy ?? "",
    now,
    task.updatedBy ?? "",
    "",
    "",
  ];

  await appendRow(SHEETS.TASKS, row);

  return true;
}

// =========================
// Update Task Status
// =========================

export async function updateTaskStatus(
  taskId,
  status,
  progress,
  updatedBy
) {
  const result = await findRow(
    SHEETS.TASKS,
    "Task ID",
    taskId
  );

  if (!result) return false;

  const row = [...result.row];
  const headers = result.headers;

  row[headers.indexOf("Status")] = status;
  row[headers.indexOf("Progress (%)")] = progress;
  row[headers.indexOf("Updated At")] =
    new Date().toISOString();
  row[headers.indexOf("Updated By")] =
    updatedBy;

  if (status === "Done") {
    row[headers.indexOf("Closed At")] =
      new Date().toISOString();

    row[headers.indexOf("Closed By")] =
      updatedBy;
  }

  await updateRow(
    SHEETS.TASKS,
    result.rowNumber,
    row
  );

  return true;
}

// =========================
// Close Task
// =========================

export async function closeTask(
  taskId,
  user
) {
  return updateTaskStatus(
    taskId,
    "Done",
    100,
    user
  );
}