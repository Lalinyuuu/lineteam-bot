import { SHEETS, DEFAULTS } from "../config.js";
import {
  getObjects,
  appendRow,
  findRow,
  updateRow,
} from "../sheets.js";

// =========================
// Get All Tasks
// =========================

export async function getTasks() {
  return getObjects(SHEETS.TASKS);
}

// =========================
// Find Task By ID
// =========================

export async function getTask(taskId) {
  const tasks = await getTasks();

  return (
    tasks.find(
      (task) => task["Task ID"] === String(taskId)
    ) ?? null
  );
}

// =========================
// My Tasks
// =========================

export async function getMyTasks(owner) {
  const tasks = await getTasks();

  return tasks.filter(
    (task) => task.Owner === owner
  );
}

// =========================
// Waiting Tasks
// =========================

export async function getWaitingTasks() {
  const tasks = await getTasks();

  return tasks.filter(
    (task) => task.Status === "Waiting"
  );
}

// =========================
// Done Tasks
// =========================

export async function getDoneTasks() {
  const tasks = await getTasks();

  return tasks.filter(
    (task) => task.Status === "Done"
  );
}

// =========================
// Project Tasks
// =========================

export async function getProjectTasks(projectId) {
  const tasks = await getTasks();
  const expectedProjectId = String(projectId);

  return tasks.filter(
    (task) =>
      String(task["Project ID"]) ===
      expectedProjectId
  );
}

// =========================
// Create Task
// =========================

export async function createTask(task) {
  if (!task?.taskId) {
    throw new Error(
      "createTask: taskId is required"
    );
  }

  if (!task?.taskName) {
    throw new Error(
      "createTask: taskName is required"
    );
  }

  const now = new Date().toISOString();

  const createdBy =
    task.createdBy ??
    task.owner ??
    "";

  const updatedBy =
    task.updatedBy ??
    createdBy;

  const row = [
    task.taskId,                         // Task ID
    task.projectId ?? "",                // Project ID
    task.parentTaskId ?? "",             // Parent Task ID
    task.taskCode ?? "",                 // Task Code
    task.taskName,                       // Task Name
    task.description ?? "",              // Description
    task.referenceLink ?? "",            // Reference Link
    task.category ?? "",                 // Category
    task.owner ?? "",                    // Owner
    task.requestedBy ?? "",              // Requested By
    task.contactPerson ?? "",            // Contact Person
    task.status ?? DEFAULTS.TASK_STATUS, // Status
    task.progress ?? DEFAULTS.PROGRESS,  // Progress (%)
    task.priority ?? DEFAULTS.PRIORITY,  // Priority
    task.latestUpdate ?? "",             // Latest Update
    task.nextStep ?? "",                 // Next Step
    task.waitingFor ?? "",               // Waiting For
    task.receivedDate ?? "",             // Received Date
    task.dueDate ?? "",                  // Due Date
    task.estimatedHours ?? "",            // Estimated Hours
    task.actualHours ?? "",               // Actual Hours
    now,                                  // Created At
    createdBy,                            // Created By
    now,                                  // Updated At
    updatedBy,                            // Updated By
    "",                                   // Closed At
    "",                                   // Closed By
  ];

  await appendRow(SHEETS.TASKS, row);

  return {
    success: true,
    taskId: task.taskId,
  };
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

  if (!result) {
    return false;
  }

  const row = [...result.row];
  const headers = result.headers;
  const now = new Date().toISOString();

  const setValue = (columnName, value) => {
    const index = headers.indexOf(columnName);

    if (index === -1) {
      throw new Error(
        `Missing column in Tasks sheet: ${columnName}`
      );
    }

    row[index] = value;
  };

  setValue("Status", status);
  setValue("Progress (%)", progress);
  setValue("Updated At", now);
  setValue("Updated By", updatedBy ?? "");

  if (status === "Done") {
    setValue("Closed At", now);
    setValue("Closed By", updatedBy ?? "");
  } else {
    setValue("Closed At", "");
    setValue("Closed By", "");
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