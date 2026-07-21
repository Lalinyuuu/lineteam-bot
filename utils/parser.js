export function parseFields(text) {
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

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    const match = line.match(/^([^:=：]+)\s*[:=：]\s*(.+)$/);

    if (!match) {
      continue;
    }

    const rawKey = match[1]
      .replace(/\s+/g, "")
      .toLowerCase();

    const key = aliases[rawKey];

    if (key) {
      result[key] = match[2].trim();
    }
  }

  return result;
}

export function normalizeStatus(text = "") {
  const value = text.toLowerCase();

  if (/done|เสร็จ|เรียบร้อย|100/.test(value)) {
    return "Done";
  }

  if (/waiting|pending|รอ|ติด/.test(value)) {
    return "Waiting";
  }

  if (/doing|in progress|กำลัง|ดำเนิน/.test(value)) {
    return "Doing";
  }

  if (/cancel|ยกเลิก/.test(value)) {
    return "Cancelled";
  }

  return "To Do";
}

export function inferActivity(text = "") {
  if (/ประชุม|meeting/i.test(text)) {
    return "Meeting";
  }

  if (/ประสาน|coordinate|โทรหา|ติดต่อ/i.test(text)) {
    return "Coordinate";
  }

  if (/รอ|waiting|pending/i.test(text)) {
    return "Waiting";
  }

  if (/เสร็จ|done|เรียบร้อย/i.test(text)) {
    return "Done";
  }

  if (/รับเรื่อง|ได้รับ|receive/i.test(text)) {
    return "Receive";
  }

  return "Working";
}
