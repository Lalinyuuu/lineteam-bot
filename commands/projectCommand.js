import {
  getProjects,
  getProject,
  getProjectByCode,
  findProject,
  createProject,
} from "../services/projectService.js";

import {
  getProjectTasks,
} from "../services/taskService.js";

import {
  newId,
} from "../utils/common.js";

import {
  parseFields,
} from "../utils/parser.js";

import {
  formatTasks,
} from "./taskCommand.js";

// =========================
// Helpers
// =========================

function normalize(value) {
  return String(value ?? "").trim();
}

function getProjectDisplayName(project) {
  return (
    normalize(
      project["Project Name TH"]
    ) ||
    normalize(
      project["Project Name EN"]
    ) ||
    normalize(
      project["Project Code"]
    ) ||
    "-"
  );
}

function getProjectSecondaryName(
  project
) {
  const nameTh = normalize(
    project["Project Name TH"]
  );

  const nameEn = normalize(
    project["Project Name EN"]
  );

  if (
    nameTh &&
    nameEn &&
    nameTh !== nameEn
  ) {
    return nameEn;
  }

  return "";
}

// =========================
// Resolve Project
// =========================

export async function resolveProject(
  value
) {
  const normalized =
    normalize(value);

  if (!normalized) {
    return null;
  }

  const byId =
    await getProject(
      normalized
    );

  if (byId) {
    return byId;
  }

  const byCode =
    await getProjectByCode(
      normalized
    );

  if (byCode) {
    return byCode;
  }

  return findProject(
    normalized
  );
}

// =========================
// Format Project
// =========================

function formatProjectDetails(
  project
) {
  const projectCode =
    normalize(
      project["Project Code"]
    ) || "-";

  const projectNameTh =
    normalize(
      project["Project Name TH"]
    );

  const projectNameEn =
    normalize(
      project["Project Name EN"]
    );

  const aliases =
    normalize(
      project.Aliases
    );

  const description =
    normalize(
      project.Description
    ) || "-";

  const manager =
    normalize(
      project["Project Manager"]
    ) || "-";

  const status =
    normalize(
      project.Status
    ) || "-";

  const priority =
    normalize(
      project.Priority
    ) || "-";

  const startDate =
    normalize(
      project["Start Date"]
    ) || "-";

  const endDate =
    normalize(
      project["End Date"]
    ) || "-";

  const lines = [
    `📁 ${getProjectDisplayName(project)}`,
    "",
    `รหัส: ${projectCode}`,
  ];

  if (projectNameTh) {
    lines.push(
      `ชื่อไทย: ${projectNameTh}`
    );
  }

  if (projectNameEn) {
    lines.push(
      `ชื่ออังกฤษ: ${projectNameEn}`
    );
  }

  if (aliases) {
    lines.push(
      `ชื่อเรียกอื่น: ${aliases}`
    );
  }

  lines.push(
    `ผู้ดูแล: ${manager}`,
    `สถานะ: ${status}`,
    `ความสำคัญ: ${priority}`,
    `เริ่ม: ${startDate}`,
    `สิ้นสุด: ${endDate}`,
    "",
    `รายละเอียด: ${description}`
  );

  return lines.join("\n");
}

// =========================
// Command Handler
// =========================

export async function handleProjectCommand(
  text
) {
  const normalizedText =
    normalize(text);

  // =========================
  // List Projects
  // =========================

  if (
    /^\/projects$/i.test(
      normalizedText
    )
  ) {
    const projects =
      await getProjects();

    if (!projects.length) {
      return "ยังไม่มีโปรเจกต์";
    }

    const body = projects
      .map(
        (project, index) => {
          const projectCode =
            normalize(
              project[
                "Project Code"
              ]
            ) || "-";

          const displayName =
            getProjectDisplayName(
              project
            );

          const secondaryName =
            getProjectSecondaryName(
              project
            );

          const status =
            normalize(
              project.Status
            ) || "-";

          return [
            `${index + 1}. ${projectCode} — ${displayName}`,
            secondaryName
              ? `   ${secondaryName}`
              : "",
            `   สถานะ: ${status}`,
          ]
            .filter(Boolean)
            .join("\n");
        }
      )
      .join("\n\n");

    return [
      "📁 โปรเจกต์ทั้งหมด",
      "",
      body,
    ].join("\n");
  }

  // =========================
  // Add Project
  // =========================

  if (
    /^\/project\s+add(?:\s|$)/i.test(
      normalizedText
    )
  ) {
    const fields =
      parseFields(
        normalizedText
      );

    /*
     * รองรับ parser เดิมด้วย
     *
     * Code:
     * Project Code:
     *
     * Name:
     * Project Name TH:
     * Project Name EN:
     */
    const projectCode =
      normalize(
        fields.projectCode ||
        fields.code
      );

    const projectNameTh =
      normalize(
        fields.projectNameTh ||
        fields.nameTh ||
        fields.name
      );

    const projectNameEn =
      normalize(
        fields.projectNameEn ||
        fields.nameEn
      );

    const aliases =
      normalize(
        fields.aliases ||
        fields.alias
      );

    if (!projectCode) {
      return [
        "กรุณาระบุ Project Code",
        "",
        "/project add",
        "Project Code: DDPM001",
        "Project Name TH: ชื่อโปรเจกต์ภาษาไทย",
        "Project Name EN: English Project Name",
        "Aliases: Project 50, ฮะเก๋า, D-EMS",
      ].join("\n");
    }

    if (
      !projectNameTh &&
      !projectNameEn
    ) {
      return [
        "กรุณาระบุชื่อโปรเจกต์อย่างน้อย 1 ภาษา",
        "",
        "Project Name TH: ชื่อภาษาไทย",
        "หรือ",
        "Project Name EN: English Name",
      ].join("\n");
    }

    const existing =
      await getProjectByCode(
        projectCode
      );

    if (existing) {
      return [
        `มี Project Code ${projectCode} อยู่แล้ว`,
        "",
        `📁 ${getProjectDisplayName(existing)}`,
      ].join("\n");
    }

    const projectId =
      newId("PRJ");

    await createProject({
      projectId,
      projectCode,
      projectNameTh,
      projectNameEn,
      aliases,
      description:
        fields.description || "",
      projectManager:
        fields.owner ||
        fields.projectManager ||
        "",
      status:
        fields.status,
      priority:
        fields.priority,
      startDate:
        fields.startDate ||
        fields.start,
      endDate:
        fields.endDate ||
        fields.end,
    });

    const response = [
      "✅ เพิ่มโปรเจกต์แล้ว",
      "",
      `🔖 ${projectCode}`,
    ];

    if (projectNameTh) {
      response.push(
        `🇹🇭 ${projectNameTh}`
      );
    }

    if (projectNameEn) {
      response.push(
        `🌐 ${projectNameEn}`
      );
    }

    if (aliases) {
      response.push(
        `🏷️ ${aliases}`
      );
    }

    response.push(
      `🆔 ${projectId}`
    );

    return response.join("\n");
  }

  // =========================
  // Search Project
  // =========================

  const projectSearch =
    normalizedText.match(
      /^\/project\s+(.+)$/i
    );

  if (projectSearch) {
    const keyword =
      projectSearch[1].trim();

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

    const projectDetails =
      formatProjectDetails(
        project
      );

    const tasks =
      await getProjectTasks(
        project["Project ID"]
      );

    if (!tasks.length) {
      return [
        projectDetails,
        "",
        "📝 ยังไม่มี Task ในโปรเจกต์นี้",
      ].join("\n");
    }

    const taskDetails =
      formatTasks(
        "✅ รายการงาน",
        tasks
      );

    return [
      projectDetails,
      "",
      taskDetails,
    ].join("\n");
  }

  return null;
}