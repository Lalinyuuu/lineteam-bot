import crypto from "node:crypto";
import { randomUUID } from "node:crypto";

import {
  getProjects,
  getProject,
  getProjectByCode,
  createProject,
} from "../services/projectService.js";

import {
  getMyTasks,
  getWaitingTasks,
  getDoneTasks,
  getProjectTasks,
  createTask,
  updateTaskStatus,
} from "../services/taskService.js";

import {
  getTodayLogs,
  addWorkLog,
  getTodaySummary,
} from "../services/worklogServices.js";

import {
  getContacts,
  findContact,
  createContact,
} from "../services/contactService.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

const LINE_REPLY_URL =
  "https://api.line.me/v2/bot/message/reply";

const TIME_ZONE = "Asia/Bangkok";

// =========================
// Read Raw Body
// =========================

async function readRawBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(
      Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk)
    );
  }

  return Buffer.concat(chunks);
}

// =========================
// Verify LINE Signature
// =========================

function verifyLineSignature(
  rawBody,
  signature
) {
  const secret =
    process.env.LINE_CHANNEL_SECRET;

  if (!secret || !signature) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");

  const expectedBuffer =
    Buffer.from(expected);

  const actualBuffer =
    Buffer.from(signature);

  if (
    expectedBuffer.length !==
    actualBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    expectedBuffer,
    actualBuffer
  );
}

// =========================
// User Display Name
// =========================

function displayName(userId) {
  const users = {
    [process.env.LINE_USER_ID_YUU ||
    "__YUU__"]: "ยู",

    [process.env.LINE_USER_ID_FAI ||
    "__FAI__"]: "ฝ้าย",
  };

  return (
    users[userId] || "ไม่ทราบชื่อ"
  );
}

// =========================
// Bangkok Date
// =========================

function bangkokDate(
  date = new Date()
) {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(date);
}

// =========================
// Generate ID
// =========================

function newId(prefix) {
  return `${prefix}-${Date.now()
    .toString(36)
    .toUpperCase()}-${randomUUID()
    .slice(0, 6)
    .toUpperCase()}`;
}

// =========================
// Limit LINE Text
// =========================

function compact(
  text,
  max = 5000
) {
  const value = String(
    text || ""
  ).trim();

  if (value.length <= max) {
    return value;
  }

  return `${value.slice(
    0,
    max - 20
  )}\n…ข้อความถูกตัด`;
}

// =========================
// Reply LINE Message
// =========================

async function replyText(
  replyToken,
  text,
  quickReplyItems = []
) {
  const token =
    process.env
      .LINE_CHANNEL_ACCESS_TOKEN;

  if (!token) {
    throw new Error(
      "Missing LINE_CHANNEL_ACCESS_TOKEN"
    );
  }

  const message = {
    type: "text",
    text: compact(text),
  };

  if (quickReplyItems.length) {
    message.quickReply = {
      items: quickReplyItems
        .slice(0, 13)
        .map((label) => ({
          type: "action",
          action: {
            type: "message",
            label: label.slice(0, 20),
            text: label,
          },
        })),
    };
  }

  const response = await fetch(
    LINE_REPLY_URL,
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        replyToken,
        messages: [message],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `LINE reply failed: ${
        response.status
      } ${await response.text()}`
    );
  }
}

// =========================
// Parse Fields
// =========================

function parseFields(text) {
  const result = {};

  const aliases = {
    project: "project",
    โปรเจกต์: "project",

    code: "code",
    รหัส: "code",

    name: "name",
    ชื่อ: "name",

    task: "task",
    งาน: "task",

    description: "description",
    รายละเอียด: "description",

    owner: "owner",
    ผู้รับผิดชอบ: "owner",

    requestedby: "requestedBy",
    ผู้มอบหมาย: "requestedBy",

    contact: "contact",
    ผู้ติดต่อ: "contact",

    status: "status",
    สถานะ: "status",

    progress: "progress",
    ความคืบหน้า: "progress",

    priority: "priority",
    ความสำคัญ: "priority",

    due: "dueDate",
    duedate: "dueDate",
    กำหนดส่ง: "dueDate",

    category: "category",
    หมวดหมู่: "category",

    nextstep: "nextStep",
    ขั้นตอนถัดไป: "nextStep",

    waitingfor: "waitingFor",
    รอ: "waitingFor",

    activity: "activityType",
    กิจกรรม: "activityType",

    worktype: "workType",
    ประเภทงาน: "workType",

    from: "fromPerson",
    รับจาก: "fromPerson",

    duration: "duration",
    ระยะเวลา: "duration",

    remark: "remark",
    หมายเหตุ: "remark",

    nickname: "nickname",
    ชื่อเล่น: "nickname",

    team: "team",
    ทีม: "team",

    company: "company",
    บริษัท: "company",

    position: "position",
    ตำแหน่ง: "position",

    phone: "phone",
    โทร: "phone",

    email: "email",

    line: "line",
  };

  for (
    const rawLine of text.split(
      /\r?\n/
    )
  ) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    const match = line.match(
      /^([^:=：]+)\s*[:=：]\s*(.+)$/
    );

    if (!match) {
      continue;
    }

    const rawKey = match[1]
      .replace(/\s+/g, "")
      .toLowerCase();

    const key = aliases[rawKey];

    if (key) {
      result[key] =
        match[2].trim();
    }
  }

  return result;
}

// =========================
// Normalize Status
// =========================

function normalizeStatus(
  text = ""
) {
  const value =
    text.toLowerCase();

  if (
    /done|เสร็จ|เรียบร้อย|100/.test(
      value
    )
  ) {
    return "Done";
  }

  if (
    /waiting|pending|รอ|ติด/.test(
      value
    )
  ) {
    return "Waiting";
  }

  if (
    /doing|in progress|กำลัง|ดำเนิน/.test(
      value
    )
  ) {
    return "Doing";
  }

  if (
    /cancel|ยกเลิก/.test(value)
  ) {
    return "Cancelled";
  }

  return "To Do";
}

// =========================
// Infer Activity Type
// =========================

function inferActivity(
  text = ""
) {
  if (
    /ประชุม|meeting/i.test(text)
  ) {
    return "Meeting";
  }

  if (
    /ประสาน|coordinate|โทรหา|ติดต่อ/i.test(
      text
    )
  ) {
    return "Coordinate";
  }

  if (
    /รอ|waiting|pending/i.test(
      text
    )
  ) {
    return "Waiting";
  }

  if (
    /เสร็จ|done|เรียบร้อย/i.test(
      text
    )
  ) {
    return "Done";
  }

  if (
    /รับเรื่อง|ได้รับ|receive/i.test(
      text
    )
  ) {
    return "Receive";
  }

  return "Working";
}

// =========================
// Resolve Project
// =========================

async function resolveProject(
  value
) {
  if (!value) {
    return null;
  }

  const byId =
    await getProject(value);

  if (byId) {
    return byId;
  }

  const byCode =
    await getProjectByCode(value);

  if (byCode) {
    return byCode;
  }

  const projects =
    await getProjects();

  return (
    projects.find((project) => {
      const name =
        project["Project Name"] ||
        "";

      return (
        name.toLowerCase() ===
          value.toLowerCase() ||
        name
          .toLowerCase()
          .includes(
            value.toLowerCase()
          )
      );
    }) || null
  );
}

// =========================
// Format Task
// =========================

function formatTask(
  task,
  index
) {
  const status =
    task.Status || "To Do";

  let icon = "⬜";

  if (status === "Done") {
    icon = "✅";
  } else if (
    status === "Waiting"
  ) {
    icon = "⏳";
  } else if (
    status === "Doing"
  ) {
    icon = "🔄";
  }

  const progress =
    task["Progress (%)"] !== ""
      ? ` • ${task["Progress (%)"]}%`
      : "";

  const due =
    task["Due Date"]
      ? `\n   📅 ${task["Due Date"]}`
      : "";

  return (
    `${index + 1}. ${icon} ` +
    `${task["Task Name"]}${progress}\n` +
    `   ID: ${task["Task ID"]}` +
    `${due}`
  );
}

// =========================
// Format Task List
// =========================

function formatTasks(
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
// Help Text
// =========================

function helpText() {
  return [
    "🚀 Yuu Checkpoint",
    "",
    "บันทึกงานเร็ว",
    "/update Project 50 วันนี้ประชุมกับพี่บอย รอ BA ส่ง Flow",
    "",
    "เพิ่มงานแบบละเอียด",
    "/task add",
    "Project: P50",
    "Task: สรุปรายงานผลการศึกษา",
    "Owner: ยู",
    "Due: 2026-07-23",
    "Priority: High",
    "",
    "อัปเดตสถานะ",
    "/task update TASK-ID Done 100",
    "",
    "ดูข้อมูล",
    "/today",
    "/my",
    "/waiting",
    "/done",
    "/project P50",
    "/projects",
    "/contacts",
    "/summary",
    "",
    "เพิ่มโปรเจกต์",
    "/project add",
    "",
    "เพิ่มผู้ติดต่อ",
    "/contact add",
  ].join("\n");
}

// =========================
// Add Quick WorkLog
// =========================

async function addQuickUpdate(
  text,
  userId
) {
  const reporter =
    displayName(userId);

  const cleaned = text
    .replace(
      /^\/update\s*/i,
      ""
    )
    .trim();

  if (!cleaned) {
    return "กรุณาพิมพ์รายละเอียดต่อจาก /update";
  }

  const firstLine =
    cleaned
      .split(/\r?\n/)[0]
      .trim();

  let project = null;
  let description = cleaned;

  const explicit =
    cleaned.match(
      /^(?:project|โปรเจกต์)\s*[:：]?\s*([^\n]+)\n?([\s\S]*)$/i
    );

  if (explicit) {
    project =
      await resolveProject(
        explicit[1].trim()
      );

    description =
      explicit[2].trim() ||
      explicit[1].trim();
  } else {
    const projects =
      await getProjects();

    project =
      projects.find(
        (item) => {
          const code =
            item[
              "Project Code"
            ] || "";

          const name =
            item[
              "Project Name"
            ] || "";

          const line =
            firstLine.toLowerCase();

          return (
            (code &&
              line.includes(
                code.toLowerCase()
              )) ||
            (name &&
              line.includes(
                name.toLowerCase()
              ))
          );
        }
      ) || null;
  }

  const activityType =
    inferActivity(description);

  await addWorkLog({
    logId: newId("LOG"),

    projectId:
      project?.[
        "Project ID"
      ] || "",

    createdBy: reporter,

    activityType,

    workType:
      activityType ===
      "Meeting"
        ? "Meeting"
        : "Internal",

    description,

    statusAfterUpdate:
      normalizeStatus(
        description
      ),
  });

  return [
    "✅ บันทึก WorkLog แล้ว",
    `👤 ${reporter}`,
    `📁 ${
      project?.[
        "Project Name"
      ] || "ไม่ระบุโปรเจกต์"
    }`,
    `📝 ${description}`,
  ].join("\n");
}

// =========================
// Handle Commands
// =========================

async function handleCommand(
  text,
  userId
) {
  const reporter =
    displayName(userId);

  const today =
    bangkokDate();

  // Help
  if (/^\/help$/i.test(text)) {
    return helpText();
  }

  // Quick Update
  if (
    /^\/update(?:\s|$)/i.test(
      text
    )
  ) {
    return addQuickUpdate(
      text,
      userId
    );
  }

  // Today WorkLog
  if (/^\/today$/i.test(text)) {
    const logs =
      await getTodayLogs();

    if (!logs.length) {
      return `📅 ${today}\n\nยังไม่มี WorkLog วันนี้`;
    }

    const body = logs
      .slice(-25)
      .reverse()
      .map((log, index) => {
        const project =
          log["Project ID"]
            ? ` • ${log["Project ID"]}`
            : "";

        return (
          `${index + 1}. ` +
          `[${log["Activity Type"]}] ` +
          `${log.Description}\n` +
          `   ${log["Created By"]}` +
          project
        );
      })
      .join("\n\n");

    return (
      `📅 WorkLog วันนี้ ${today}` +
      `\n\n${body}`
    );
  }

  // Summary
  if (
    /^\/summary$/i.test(text)
  ) {
    const summary =
      await getTodaySummary();

    return [
      `📊 สรุปวันนี้ ${today}`,
      "",
      `ทั้งหมด ${summary.total}`,
      `🗓 Meeting ${summary.meeting}`,
      `🔄 Working ${summary.working}`,
      `⏳ Waiting ${summary.waiting}`,
      `✅ Done ${summary.done}`,
    ].join("\n");
  }

  // My Tasks
  if (/^\/my$/i.test(text)) {
    const tasks =
      await getMyTasks(
        reporter
      );

    return formatTasks(
      `👤 งานของ ${reporter}`,
      tasks
    );
  }

  // Waiting Tasks
  if (
    /^\/waiting$/i.test(text)
  ) {
    const tasks =
      await getWaitingTasks();

    return formatTasks(
      "⏳ งานที่รอ",
      tasks
    );
  }

  // Done Tasks
  if (/^\/done$/i.test(text)) {
    const tasks =
      await getDoneTasks();

    return formatTasks(
      "✅ งานที่เสร็จ",
      tasks
    );
  }

  // All Projects
  if (
    /^\/projects$/i.test(text)
  ) {
    const projects =
      await getProjects();

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

  // All Contacts
  if (
    /^\/contacts$/i.test(text)
  ) {
    const contacts =
      await getContacts();

    if (!contacts.length) {
      return "ยังไม่มีผู้ติดต่อ";
    }

    const body = contacts
      .slice(0, 30)
      .map(
        (contact, index) => {
          const nickname =
            contact.Nickname
              ? ` (${contact.Nickname})`
              : "";

          const team =
            contact.Team
              ? ` • ${contact.Team}`
              : "";

          return (
            `${index + 1}. ` +
            `${contact.Name}` +
            `${nickname}${team}`
          );
        }
      )
      .join("\n");

    return `👥 ผู้ติดต่อ\n\n${body}`;
  }

  // Add Project
  if (
    /^\/project\s+add(?:\s|$)/i.test(
      text
    )
  ) {
    const fields =
      parseFields(text);

    if (
      !fields.name ||
      !fields.code
    ) {
      return [
        "กรุณาระบุ Code และ Name",
        "",
        "/project add",
        "Code: P50",
        "Name: Project 50",
        "Owner: ยู",
      ].join("\n");
    }

    const existing =
      await getProjectByCode(
        fields.code
      );

    if (existing) {
      return `มี Project Code ${fields.code} อยู่แล้ว`;
    }

    const projectId =
      newId("PRJ");

    await createProject({
      projectId,

      projectCode:
        fields.code,

      projectName:
        fields.name,

      description:
        fields.description,

      projectManager:
        fields.owner,

      priority:
        fields.priority,
    });

    return [
      "✅ เพิ่มโปรเจกต์แล้ว",
      `${fields.code} — ${fields.name}`,
      `ID: ${projectId}`,
    ].join("\n");
  }

  // Search Project Tasks
  const projectSearch =
    text.match(
      /^\/project\s+(.+)$/i
    );

  if (projectSearch) {
    const project =
      await resolveProject(
        projectSearch[1].trim()
      );

    if (!project) {
      return "ไม่พบโปรเจกต์";
    }

    const tasks =
      await getProjectTasks(
        project["Project ID"]
      );

    return formatTasks(
      `📁 ${project["Project Name"]}`,
      tasks
    );
  }

  // Add Task
  if (
    /^\/task\s+add(?:\s|$)/i.test(
      text
    )
  ) {
    const fields =
      parseFields(text);

    if (
      !fields.task &&
      !fields.name
    ) {
      return [
        "กรุณาระบุ Task",
        "",
        "/task add",
        "Project: P50",
        "Task: สรุป MoM",
        "Owner: ยู",
      ].join("\n");
    }

    const project =
      await resolveProject(
        fields.project
      );

    if (
      fields.project &&
      !project
    ) {
      return `ไม่พบโปรเจกต์ ${fields.project}`;
    }

    const taskId =
      newId("TASK");

    await createTask({
      taskId,

      projectId:
        project?.[
          "Project ID"
        ] || "",

      taskName:
        fields.task ||
        fields.name,

      description:
        fields.description,

      owner:
        fields.owner ||
        reporter,

      requestedBy:
        fields.requestedBy,

      contactPerson:
        fields.contact,

      status:
        normalizeStatus(
          fields.status
        ),

      progress:
        Number.parseInt(
          fields.progress ||
            "0",
          10
        ) || 0,

      priority:
        fields.priority,

      category:
        fields.category,

      nextStep:
        fields.nextStep,

      waitingFor:
        fields.waitingFor,

      dueDate:
        fields.dueDate,

      receivedDate:
        today,

      createdBy:
        reporter,

      updatedBy:
        reporter,
    });

    return [
      "✅ เพิ่มงานแล้ว",
      `📝 ${
        fields.task ||
        fields.name
      }`,
      `👤 ${
        fields.owner ||
        reporter
      }`,
      `📁 ${
        project?.[
          "Project Name"
        ] ||
        "ไม่ระบุโปรเจกต์"
      }`,
      `ID: ${taskId}`,
    ].join("\n");
  }

  // Update Task
  const taskUpdate =
    text.match(
      /^\/task\s+update\s+(\S+)\s+(.+?)(?:\s+(\d{1,3}))?$/i
    );

  if (taskUpdate) {
    const taskId =
      taskUpdate[1];

    const rawStatus =
      taskUpdate[2];

    const rawProgress =
      taskUpdate[3];

    const status =
      normalizeStatus(
        rawStatus
      );

    const progress =
      rawProgress
        ? Math.min(
            100,
            Number(rawProgress)
          )
        : status === "Done"
          ? 100
          : 0;

    const updated =
      await updateTaskStatus(
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

  // Add Contact
  if (
    /^\/contact\s+add(?:\s|$)/i.test(
      text
    )
  ) {
    const fields =
      parseFields(text);

    if (!fields.name) {
      return [
        "กรุณาระบุ Name",
        "",
        "/contact add",
        "Name: พี่บอย",
        "Team: ลูกค้า",
        "Phone: 08x-xxx-xxxx",
      ].join("\n");
    }

    const existing =
      await findContact(
        fields.name
      );

    if (existing) {
      return `มีผู้ติดต่อชื่อ ${fields.name} อยู่แล้ว`;
    }

    const contactId =
      newId("CON");

    await createContact({
      contactId,

      name:
        fields.name,

      nickname:
        fields.nickname,

      team:
        fields.team,

      company:
        fields.company,

      position:
        fields.position,

      phone:
        fields.phone,

      email:
        fields.email,

      line:
        fields.line,

      remark:
        fields.remark,
    });

    return [
      "✅ เพิ่มผู้ติดต่อแล้ว",
      `👤 ${fields.name}`,
      `ID: ${contactId}`,
    ].join("\n");
  }

  return null;
}

// =========================
// Main Webhook Handler
// =========================

export default async function handler(
  req,
  res
) {
  if (
    req.method !== "POST"
  ) {
    return res
      .status(405)
      .send(
        "Method Not Allowed"
      );
  }

  try {
    const rawBody =
      await readRawBody(req);

    const signature =
      req.headers[
        "x-line-signature"
      ];

    const isValid =
      verifyLineSignature(
        rawBody,
        signature
      );

    if (!isValid) {
      return res
        .status(401)
        .send(
          "Invalid signature"
        );
    }

    let body;

    try {
      body = JSON.parse(
        rawBody.toString(
          "utf8"
        )
      );
    } catch {
      return res
        .status(400)
        .send("Invalid JSON");
    }

    for (
      const event of
        body.events || []
    ) {
      const isTextMessage =
        event.type ===
          "message" &&
        event.message?.type ===
          "text" &&
        event.replyToken;

      if (!isTextMessage) {
        continue;
      }

      const text =
        event.message.text.trim();

      const userId =
        event.source?.userId ||
        "";

      try {
        const reply =
          await handleCommand(
            text,
            userId
          );

        if (reply) {
          await replyText(
            event.replyToken,
            reply,
            [
              "/today",
              "/my",
              "/waiting",
              "/summary",
              "/help",
            ]
          );
        } else {
          await replyText(
            event.replyToken,
            "ไม่รู้จักคำสั่งนี้ พิมพ์ /help เพื่อดูวิธีใช้",
            [
              "/help",
              "/today",
              "/my",
            ]
          );
        }
      } catch (eventError) {
        console.error(
          "Event processing failed:",
          eventError
        );

        await replyText(
          event.replyToken,
          `เกิดข้อผิดพลาด: ${
            eventError.message ||
            "กรุณาลองใหม่"
          }`
        ).catch(() => {});
      }
    }

    return res
      .status(200)
      .send("OK");
  } catch (error) {
    console.error(
      "Webhook failed:",
      error
    );

    return res
      .status(500)
      .send(
        "Internal Server Error"
      );
  }
}