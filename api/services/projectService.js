import { SHEETS, DEFAULTS } from "../config.js";
import {
  getObjects,
  appendRow,
  findRow,
  updateRow,
} from "../sheets.js";

// =========================
// Get All Projects
// =========================

export async function getProjects() {
  return await getObjects(SHEETS.PROJECTS);
}

// =========================
// Get Project By ID
// =========================

export async function getProject(projectId) {
  const projects = await getProjects();

  return (
    projects.find(
      (p) => p["Project ID"] === projectId
    ) || null
  );
}

// =========================
// Find By Project Code
// =========================

export async function getProjectByCode(
  projectCode
) {
  const projects = await getProjects();

  return (
    projects.find(
      (p) => p["Project Code"] === projectCode
    ) || null
  );
}

// =========================
// Create Project
// =========================

export async function createProject(project) {
  const now = new Date().toISOString();

  const row = [
    project.projectId,
    project.projectCode,
    project.projectName,
    project.description ?? "",
    project.projectManager ?? "",
    project.status ??
      DEFAULTS.PROJECT_STATUS,
    project.priority ??
      DEFAULTS.PRIORITY,
    project.startDate ?? "",
    project.endDate ?? "",
    now,
    now,
  ];

  await appendRow(SHEETS.PROJECTS, row);

  return true;
}

// =========================
// Update Project
// =========================

export async function updateProject(
  projectId,
  data
) {
  const result = await findRow(
    SHEETS.PROJECTS,
    "Project ID",
    projectId
  );

  if (!result) return false;

  const row = [...result.row];
  const headers = result.headers;

  function set(name, value) {
    if (value === undefined) return;

    const index = headers.indexOf(name);

    if (index !== -1) {
      row[index] = value;
    }
  }

  set(
    "Project Name",
    data.projectName
  );

  set(
    "Description",
    data.description
  );

  set(
    "Project Manager",
    data.projectManager
  );

  set("Status", data.status);

  set("Priority", data.priority);

  set(
    "Start Date",
    data.startDate
  );

  set(
    "End Date",
    data.endDate
  );

  set(
    "Updated At",
    new Date().toISOString()
  );

  await updateRow(
    SHEETS.PROJECTS,
    result.rowNumber,
    row
  );

  return true;
}

// =========================
// Close Project
// =========================

export async function closeProject(
  projectId
) {
  return updateProject(projectId, {
    status: "Closed",
  });
}