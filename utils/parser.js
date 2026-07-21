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
      result[key] = match[2].trim();
    }
  }

  return result;
}

export function normalizeStatus(text = "") {
  const value = String(text)
    .trim()
    .toLowerCase();

  if (
    value === "done" ||
    /เสร็จ|เรียบร้อย|เสร็จแล้ว/.test(value)
  ) {
    return "Done";
  }

  if (
    value === "waiting" ||
    value === "pending" ||
    /รอ|ติด/.test(value)
  ) {
    return "Waiting";
  }

  if (
    value === "doing" ||
    value === "in progress" ||
    /กำลัง|ดำเนิน/.test(value)
  ) {
    return "Doing";
  }

  if (
    value === "cancelled" ||
    value === "canceled" ||
    /ยกเลิก/.test(value)
  ) {
    return "Cancelled";
  }

  return "To Do";
}

export function normalizePriority(text = "") {
  const value = String(text)
    .trim()
    .toLowerCase();

  if (
    value === "critical" ||
    /ด่วนมาก|เร่งด่วนมาก|วิกฤต/.test(value)
  ) {
    return "Critical";
  }

  if (
    value === "high" ||
    /สำคัญมาก|ความสำคัญสูง|ด่วน|สูง/.test(value)
  ) {
    return "High";
  }

  if (
    value === "low" ||
    /ความสำคัญต่ำ|ไม่เร่ง|ต่ำ/.test(value)
  ) {
    return "Low";
  }

  return "Medium";
}

export function normalizeCategory(text = "") {
  const value = String(text)
    .trim()
    .toLowerCase();

  const categories = {
    meeting: "Meeting",
    ประชุม: "Meeting",

    report: "Report",
    รายงาน: "Report",

    ba: "BA",
    businessanalysis: "BA",
    วิเคราะห์ธุรกิจ: "BA",

    sa: "SA",
    systemanalysis: "SA",
    วิเคราะห์ระบบ: "SA",

    development: "Development",
    develop: "Development",
    dev: "Development",
    พัฒนา: "Development",

    testing: "Testing",
    test: "Testing",
    ทดสอบ: "Testing",

    deployment: "Deployment",
    deploy: "Deployment",
    ติดตั้ง: "Deployment",

    coordination: "Coordination",
    coordinate: "Coordination",
    ประสานงาน: "Coordination",

    document: "Document",
    เอกสาร: "Document",

    oracle: "Oracle",

    infrastructure: "Infrastructure",
    infra: "Infrastructure",
    โครงสร้างพื้นฐาน: "Infrastructure",

    "focus group": "Focus Group",
    focusgroup: "Focus Group",
    โฟกัสกรุ๊ป: "Focus Group",
    โฟกัสกรุ๊ป: "Focus Group",

    support: "Support",
    สนับสนุน: "Support",

    other: "Other",
    อื่นๆ: "Other",
    อื่น: "Other",
  };

  const compactValue = value.replace(/\s+/g, "");

  return (
    categories[value] ||
    categories[compactValue] ||
    "Other"
  );
}

export function inferActivity(text = "") {
  if (/ประชุม|meeting/i.test(text)) {
    return "Meeting";
  }

  if (
    /ประสาน|coordinate|โทรหา|ติดต่อ/i.test(text)
  ) {
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