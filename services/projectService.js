import {
  SHEETS,
  DEFAULTS,
} from "../config.js";

import {
  getObjects,
  appendRow,
  findRow,
  updateRow,
} from "../sheets.js";

// =========================
// Helpers
// =========================

function normalize(value) {
  return String(value ?? "").trim();
}

function normalizeLower(value) {
  return normalize(value).toLowerCase();
}

function parseAliases(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalize(item))
      .filter(Boolean);
  }

  return normalize(value)
    .split(/[,，;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * ตรวจสอบว่า Project ตรงกับคำค้นหรือไม่
 *
 * รองรับ:
 * - Project ID
 * - Project Code
 * - ชื่อไทย
 * - ชื่ออังกฤษ
 * - Alias ทุกชื่อ
 */
function matchesProject(project, keyword) {
  const search =
    normalizeLower(keyword);

  if (!search) {
    return false;
  }

  const exactValues = [
    project["Project ID"],
    project["Project Code"],
    project["Project Name TH"],
    project["Project Name EN"],
  ]
    .map(normalizeLower)
    .filter(Boolean);

  const aliases =
    parseAliases(project.Aliases)
      .map(normalizeLower);

  return (
    exactValues.includes(search) ||
    aliases.includes(search)
  );
}

// =========================
// Get All Projects
// =========================

export async function getProjects() {
  return getObjects(
    SHEETS.PROJECTS
  );
}

// =========================
// Get Project By ID
// =========================

export async function getProject(
  projectId
) {
  const projects =
    await getProjects();

  const expectedId =
    normalize(projectId);

  return (
    projects.find(
      (project) =>
        normalize(
          project["Project ID"]
        ) === expectedId
    ) || null
  );
}

// =========================
// Find Project
// =========================

/**
 * ค้นหาโปรเจกต์จาก ID, Code, ชื่อไทย,
 * ชื่ออังกฤษ หรือ Alias
 */
export async function findProject(
  keyword
) {
  const projects =
    await getProjects();

  return (
    projects.find((project) =>
      matchesProject(
        project,
        keyword
      )
    ) || null
  );
}

// =========================
// Find By Project Code
// =========================

export async function getProjectByCode(
  projectCode
) {
  const projects =
    await getProjects();

  const expectedCode =
    normalizeLower(projectCode);

  return (
    projects.find(
      (project) =>
        normalizeLower(
          project["Project Code"]
        ) === expectedCode
    ) || null
  );
}

// =========================
// Find Project From Text
// =========================

/**
 * ใช้สำหรับค้นหาโปรเจกต์จากประโยค WorkLog
 *
 * ตัวอย่าง:
 * "ประชุมเรื่องฮะเก๋า"
 * "ทำรายงาน D-EMS"
 */
export async function findProjectFromText(
  text
) {
  const projects =
    await getProjects();

  const normalizedText =
    normalizeLower(text);

  if (!normalizedText) {
    return null;
  }

  /*
   * เรียงคำค้นจากยาวไปสั้น
   * ป้องกัน Alias สั้นไปจับผิดก่อน
   */
  const candidates =
    projects.flatMap((project) => {
      const values = [
        project["Project ID"],
        project["Project Code"],
        project["Project Name TH"],
        project["Project Name EN"],
        ...parseAliases(
          project.Aliases
        ),
      ]
        .map(normalizeLower)
        .filter(Boolean);

      return values.map((value) => ({
        project,
        value,
      }));
    });

  candidates.sort(
    (a, b) =>
      b.value.length -
      a.value.length
  );

  const matched =
    candidates.find(
      ({ value }) =>
        normalizedText.includes(value)
    );

  return matched?.project || null;
}

// =========================
// Create Project
// =========================

export async function createProject(
  project
) {
  const now =
    new Date().toISOString();

  const projectId =
    normalize(project.projectId);

  const projectCode =
    normalize(project.projectCode);

  const projectNameTh =
    normalize(
      project.projectNameTh
    );

  const projectNameEn =
    normalize(
      project.projectNameEn
    );

  const aliases =
    parseAliases(project.aliases)
      .join(", ");

  if (!projectId) {
    throw new Error(
      "createProject: projectId is required"
    );
  }

  if (!projectCode) {
    throw new Error(
      "createProject: projectCode is required"
    );
  }

  if (
    !projectNameTh &&
    !projectNameEn
  ) {
    throw new Error(
      "createProject: projectNameTh or projectNameEn is required"
    );
  }

  const existingByCode =
    await getProjectByCode(
      projectCode
    );

  if (existingByCode) {
    throw new Error(
      `Project Code ${projectCode} already exists`
    );
  }

  const row = [
    projectId,
    projectCode,
    projectNameTh,
    projectNameEn,
    aliases,
    normalize(
      project.description
    ),
    normalize(
      project.projectManager
    ),
    normalize(project.status) ||
      DEFAULTS.PROJECT_STATUS,
    normalize(project.priority) ||
      DEFAULTS.PRIORITY,
    normalize(project.startDate),
    normalize(project.endDate),
    now,
    now,
  ];

  await appendRow(
    SHEETS.PROJECTS,
    row
  );

  return {
    projectId,
    projectCode,
    projectNameTh,
    projectNameEn,
    aliases,
    createdAt: now,
  };
}

// =========================
// Update Project
// =========================

export async function updateProject(
  projectId,
  data
) {
  const result =
    await findRow(
      SHEETS.PROJECTS,
      "Project ID",
      projectId
    );

  if (!result) {
    return false;
  }

  const row = [
    ...result.row,
  ];

  const headers =
    result.headers;

  function set(
    headerName,
    value
  ) {
    if (value === undefined) {
      return;
    }

    const index =
      headers.indexOf(
        headerName
      );

    if (index === -1) {
      return;
    }

    row[index] =
      value ?? "";
  }

  set(
    "Project Code",
    data.projectCode !== undefined
      ? normalize(
          data.projectCode
        )
      : undefined
  );

  set(
    "Project Name TH",
    data.projectNameTh !== undefined
      ? normalize(
          data.projectNameTh
        )
      : undefined
  );

  set(
    "Project Name EN",
    data.projectNameEn !== undefined
      ? normalize(
          data.projectNameEn
        )
      : undefined
  );

  set(
    "Aliases",
    data.aliases !== undefined
      ? parseAliases(
          data.aliases
        ).join(", ")
      : undefined
  );

  set(
    "Description",
    data.description !== undefined
      ? normalize(
          data.description
        )
      : undefined
  );

  set(
    "Project Manager",
    data.projectManager !== undefined
      ? normalize(
          data.projectManager
        )
      : undefined
  );

  set(
    "Status",
    data.status !== undefined
      ? normalize(data.status)
      : undefined
  );

  set(
    "Priority",
    data.priority !== undefined
      ? normalize(
          data.priority
        )
      : undefined
  );

  set(
    "Start Date",
    data.startDate !== undefined
      ? normalize(
          data.startDate
        )
      : undefined
  );

  set(
    "End Date",
    data.endDate !== undefined
      ? normalize(
          data.endDate
        )
      : undefined
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
  return updateProject(
    projectId,
    {
      status: "Closed",
    }
  );
}