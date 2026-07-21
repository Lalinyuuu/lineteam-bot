import {
  getProjects,
  getProject,
  getProjectByCode,
  createProject,
} from "../services/projectServices.js";

import { getProjectTasks } from "../services/taskService.js";
import { newId } from "../utils/common.js";
import { parseFields } from "../utils/parser.js";
import { formatTasks } from "./taskCommands.js";

export async function resolveProject(value) {
  if (!value) {
    return null;
  }

  const normalized = String(value).trim();

  const byId = await getProject(normalized);
  if (byId) {
    return byId;
  }

  const byCode = await getProjectByCode(normalized);
  if (byCode) {
    return byCode;
  }

  const projects = await getProjects();
  const search = normalized.toLowerCase();

  return (
    projects.find((project) => {
      const code = String(
        project["Project Code"] || ""
      ).toLowerCase();

      const name = String(
        project["Project Name"] || ""
      ).toLowerCase();

      return (
        code === search ||
        code === `p${search}` ||
        name === search ||
        name.includes(search)
      );
    }) || null
  );
}

export async function handleProjectCommand(text) {
  if (/^\/projects$/i.test(text)) {
    const projects = await getProjects();

    if (!projects.length) {
      return "ยังไม่มีโปรเจกต์";
    }

    const body = projects
      .map(
        (project, index) =>
          `${index + 1}. ` +
          `${project["Project Code"]} — ` +
          `${project["Project Name"]} ` +
          `(${project.Status})`
      )
      .join("\n");

    return `📁 โปรเจกต์ทั้งหมด\n\n${body}`;
  }

  if (/^\/project\s+add(?:\s|$)/i.test(text)) {
    const fields = parseFields(text);

    if (!fields.name || !fields.code) {
      return [
        "กรุณาระบุ Code และ Name",
        "",
        "/project add",
        "Code: P50",
        "Name: Project 50",
        "Owner: ยู",
      ].join("\n");
    }

    const existing = await getProjectByCode(fields.code);

    if (existing) {
      return `มี Project Code ${fields.code} อยู่แล้ว`;
    }

    const projectId = newId("PRJ");

    await createProject({
      projectId,
      projectCode: fields.code,
      projectName: fields.name,
      description: fields.description,
      projectManager: fields.owner,
      priority: fields.priority,
    });

    return [
      "✅ เพิ่มโปรเจกต์แล้ว",
      `${fields.code} — ${fields.name}`,
      `ID: ${projectId}`,
    ].join("\n");
  }

  const projectSearch = text.match(/^\/project\s+(.+)$/i);

  if (projectSearch) {
    const project = await resolveProject(
      projectSearch[1].trim()
    );

    if (!project) {
      return "ไม่พบโปรเจกต์";
    }

    const tasks = await getProjectTasks(
      project["Project ID"]
    );

    return formatTasks(
      `📁 ${project["Project Name"]}`,
      tasks
    );
  }

  return null;
}
