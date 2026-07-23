import {
  getProjects,
} from "../services/projectService.js";

import {
  getTodayLogs,
  addWorkLog,
  getTodaySummary,
} from "../services/worklogService.js";

import {
  getUserContext,
} from "./contextCommand.js";

import {
  bangkokDate,
  newId,
} from "../utils/common.js";

import {
  inferActivity,
  normalizeStatus,
} from "../utils/parser.js";

import {
  resolveProject,
} from "./projectCommand.js";

// =========================
// Helpers
// =========================

function normalize(value) {
  return String(value ?? "")
    .trim();
}

function normalizeLower(value) {
  return normalize(value)
    .toLowerCase();
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
    ) ||
    ""
  );
}

function getProjectDisplay(project) {
  return (
    getProjectCode(project) ||
    getProjectName(project)
  );
}

// =========================
// Extract Time
// =========================

function extractTime(line) {
  const value =
    normalize(line);

  const match = value.match(
    /^(\d{1,2})[.:](\d{2})(?:\s*น\.?)?\s*[-–—:]?\s*(.*)$/i
  );

  if (!match) {
    return {
      time: "",
      description: value,
    };
  }

  const hour =
    Number(match[1]);

  const minute =
    Number(match[2]);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return {
      time: "",
      description: value,
    };
  }

  return {
    time: `${String(hour).padStart(
      2,
      "0"
    )}:${String(minute).padStart(
      2,
      "0"
    )}`,

    description:
      normalize(match[3]),
  };
}

// =========================
// Project Matching
// =========================

function getProjectAliases(project) {
  return normalize(
    project?.Aliases
  )
    .split(/[,|;/]+/)
    .map((alias) =>
      normalizeLower(alias)
    )
    .filter(Boolean);
}

function findProjectFromText(
  text,
  projects
) {
  const normalizedText =
    normalizeLower(text);

  if (!normalizedText) {
    return null;
  }

  return (
    projects.find((project) => {
      const values = [
        project["Project ID"],
        project["Project Code"],
        project["Project Name TH"],
        project["Project Name EN"],
        project["Project Name"],
        ...getProjectAliases(
          project
        ),
      ]
        .map((value) =>
          normalizeLower(value)
        )
        .filter(Boolean);

      return values.some(
        (value) =>
          normalizedText.includes(
            value
          )
      );
    }) || null
  );
}

function findProjectFromContext(
  context,
  projects
) {
  if (!context) {
    return null;
  }

  const currentProjectId =
    normalize(
      context[
        "Current Project ID"
      ]
    );

  const currentProjectCode =
    normalizeLower(
      context[
        "Current Project Code"
      ]
    );

  const currentProjectName =
    normalizeLower(
      context[
        "Current Project Name"
      ]
    );

  if (
    !currentProjectId &&
    !currentProjectCode &&
    !currentProjectName
  ) {
    return null;
  }

  const matched =
    projects.find((project) => {
      const projectId =
        normalize(
          project["Project ID"]
        );

      const projectCode =
        normalizeLower(
          project["Project Code"]
        );

      const projectNames = [
        project[
          "Project Name TH"
        ],
        project[
          "Project Name EN"
        ],
        project[
          "Project Name"
        ],
      ]
        .map((value) =>
          normalizeLower(value)
        )
        .filter(Boolean);

      return (
        (
          currentProjectId &&
          projectId ===
            currentProjectId
        ) ||
        (
          currentProjectCode &&
          projectCode ===
            currentProjectCode
        ) ||
        (
          currentProjectName &&
          projectNames.includes(
            currentProjectName
          )
        )
      );
    });

  if (matched) {
    return matched;
  }

  /*
   * Fallback:
   * หาก Context มี Project ID แต่หาใน Projects ไม่เจอ
   * ยังสามารถใช้ข้อมูลจาก Context บันทึก WorkLog ได้
   */
  if (currentProjectId) {
    return {
      "Project ID":
        currentProjectId,

      "Project Code":
        normalize(
          context[
            "Current Project Code"
          ]
        ),

      "Project Name TH":
        normalize(
          context[
            "Current Project Name"
          ]
        ),
    };
  }

  return null;
}

// =========================
// Split WorkLog Lines
// =========================

function splitWorkLogLines(text) {
  return String(text || "")
    .replace(/\r\n?/g, "\n")
    .replace(
      /\s+(?=\d{1,2}[.:]\d{2}(?:\s*น\.?)?\s+)/g,
      "\n"
    )
    .split("\n")
    .map((line) =>
      line.trim()
    )
    .filter(Boolean)
    .filter(
      (line) =>
        !/^[-–—=_*#]+$/.test(
          line
        )
    );
}

// =========================
// Work Type
// =========================

function inferWorkType(
  activityType
) {
  const workTypeMap = {
    Meeting: "Meeting",
    Coordinate: "Internal",
    Call: "Internal",
    Email: "Internal",
    Review: "Documentation",
    Working: "Internal",
    Receive: "Internal",
    Waiting: "Internal",
    Done: "Internal",
    Note: "Internal",
  };

  return (
    workTypeMap[
      activityType
    ] ||
    "Internal"
  );
}

// =========================
// Create WorkLog
// =========================

async function createWorkLog({
  description,
  time,
  project,
  reporter,
}) {
  const activityType =
    inferActivity(
      description
    );

  const statusAfterUpdate =
    normalizeStatus(
      description
    );

  await addWorkLog({
    logId:
      newId("LOG"),

    projectId:
      normalize(
        project?.[
          "Project ID"
        ]
      ),

    createdBy:
      reporter,

    activityType,

    workType:
      inferWorkType(
        activityType
      ),

    description,

    statusAfterUpdate,

    activityTime:
      time,
  });

  return {
    time,
    description,
    project,
    activityType,
    statusAfterUpdate,
  };
}

// =========================
// Quick Update
// =========================

export async function addQuickUpdate({
  text,
  reporter,
  userId,
}) {
  const rawText =
    String(text || "");

  const cleaned = rawText
    .replace(
      /^\/update(?:\s|$)/i,
      ""
    )
    .trim();

  if (!cleaned) {
    return [
      "กรุณาพิมพ์รายละเอียดต่อจาก /update",
      "",
      "ตัวอย่าง:",
      "/update",
      "09:00 ประชุมกับพี่บอย",
      "10:30 รับงานจากพี่กบ",
      "",
      "หากตั้งโปรเจกต์ปัจจุบันไว้แล้ว",
      "ไม่ต้องระบุ Project ซ้ำ",
    ].join("\n");
  }

  const projects =
    await getProjects();

  let context = null;

  if (normalize(userId)) {
    try {
      context =
        await getUserContext(
          userId
        );
    } catch (error) {
      console.error(
        "Get UserContext failed:",
        error
      );
    }
  }

  const contextProject =
    findProjectFromContext(
      context,
      projects
    );

  console.log(
    "USER CONTEXT:",
    context
  );

  console.log(
    "CONTEXT PROJECT:",
    contextProject
  );

  let explicitProject =
    null;

  let content =
    cleaned;

  /*
   * รองรับ:
   *
   * Project: P50
   * โปรเจกต์: 69DDPM001
   * โปรเจ็ค: P50
   */
  const explicitProjectMatch =
    cleaned.match(
      /^(?:project|โปรเจกต์|โปรเจ็ค|โปรเจค)\s*[:：]\s*([^\n]+)(?:\n([\s\S]*))?$/i
    );

  if (
    explicitProjectMatch
  ) {
    const projectKeyword =
      normalize(
        explicitProjectMatch[1]
      );

    explicitProject =
      await resolveProject(
        projectKeyword
      );

    if (!explicitProject) {
      return [
        `❌ ไม่พบโปรเจกต์ ${projectKeyword}`,
        "",
        "กรุณาตรวจสอบ Project Code ชื่อ หรือ Alias",
      ].join("\n");
    }

    content =
      normalize(
        explicitProjectMatch[2]
      );
  }

  const lines =
    splitWorkLogLines(
      content
    );

  if (!lines.length) {
    return "ไม่พบรายละเอียดที่ต้องการบันทึก";
  }

  const createdLogs = [];
  const failedLogs = [];

  for (
    const line of lines
  ) {
    const {
      time,
      description,
    } =
      extractTime(line);

    if (!description) {
      failedLogs.push({
        line,
        reason:
          "ไม่มีรายละเอียดงาน",
      });

      continue;
    }

    /*
     * ลำดับ Project:
     * 1. Project: ที่ระบุหัวข้อความ
     * 2. Project ที่พบในแต่ละบรรทัด
     * 3. Current Project จาก UserContext
     */
    const projectFromLine =
      findProjectFromText(
        description,
        projects
      );

    const project =
      explicitProject ||
      projectFromLine ||
      contextProject ||
      null;

    try {
      const result =
        await createWorkLog({
          description,
          time,
          project,
          reporter,
        });

      createdLogs.push(
        result
      );
    } catch (error) {
      console.error(
        "Create WorkLog failed:",
        {
          line,
          error,
        }
      );

      failedLogs.push({
        line,
        reason:
          error?.message ||
          "บันทึกไม่สำเร็จ",
      });
    }
  }

  if (!createdLogs.length) {
    return [
      "❌ ไม่สามารถบันทึก WorkLog ได้",
      "",
      ...failedLogs.map(
        (item) =>
          `• ${item.line}\n  ${item.reason}`
      ),
    ].join("\n");
  }

  const resultLines =
    createdLogs.map(
      (log, index) => {
        const timeText =
          log.time
            ? `${log.time} `
            : "";

        const projectText =
          getProjectDisplay(
            log.project
          );

        return [
          `${index + 1}. ${timeText}[${log.activityType}]`,
          `   ${log.description}`,
          `   📁 ${projectText}`,
        ].join("\n");
      }
    );

  const response = [
    `✅ บันทึก WorkLog แล้ว ${createdLogs.length} รายการ`,
    `👤 ${reporter}`,
    "",
    ...resultLines,
  ];

  if (failedLogs.length) {
    response.push(
      "",
      `⚠️ บันทึกไม่สำเร็จ ${failedLogs.length} รายการ`,
      ...failedLogs.map(
        (item) =>
          `• ${item.line}\n  ${item.reason}`
      )
    );
  }

  return response.join("\n");
}

// =========================
// Command Handler
// =========================

export async function handleWorklogCommand({
  text,
  reporter,
  userId,
}) {
  const normalizedText =
    String(text || "")
      .replace(/\r\n?/g, "\n")
      .trim();

  const today =
    bangkokDate();

  if (
    /^\/update(?:\s|$)/i.test(
      normalizedText
    )
  ) {
    return addQuickUpdate({
      text: normalizedText,
      reporter,
      userId,
    });
  }

  if (
    /^\/today$/i.test(
      normalizedText
    )
  ) {
    const logs =
      await getTodayLogs();

    if (!logs.length) {
      return [
        `📅 ${today}`,
        "",
        "ยังไม่มี WorkLog วันนี้",
      ].join("\n");
    }

    const body = logs
      .slice(-25)
      .reverse()
      .map(
        (log, index) => {
          const project =
            log["Project ID"]
              ? ` • ${log["Project ID"]}`
              : "";

          const activityTime =
            log["Time"] ||
            log[
              "Activity Time"
            ] ||
            "";

          const timeText =
            activityTime
              ? `${activityTime} `
              : "";

          return [
            `${index + 1}. ${timeText}[${log["Activity Type"]}] ${log.Description}`,
            `   ${log["Created By"]}${project}`,
          ].join("\n");
        }
      )
      .join("\n\n");

    return [
      `📅 WorkLog วันนี้ ${today}`,
      "",
      body,
    ].join("\n");
  }

  if (
    /^\/summary$/i.test(
      normalizedText
    )
  ) {
    const summary =
      await getTodaySummary();

    return [
      `📊 สรุปวันนี้ ${today}`,
      "",
      `ทั้งหมด ${summary.total || 0}`,
      `📥 Receive ${summary.receive || 0}`,
      `🗓 Meeting ${summary.meeting || 0}`,
      `☎ Coordinate ${summary.coordinate || 0}`,
      `🔄 Working ${summary.working || 0}`,
      `⏳ Waiting ${summary.waiting || 0}`,
      `✅ Done ${summary.done || 0}`,
    ].join("\n");
  }

  return null;
}