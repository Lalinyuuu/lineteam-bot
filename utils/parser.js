export function parseFields(text) {
  const result = {};

  const aliases = {
    // =========================
    // Project
    // =========================

    project: "project",
    โปรเจกต์: "project",

    code: "code",
    projectcode: "projectCode",
    รหัส: "code",
    รหัสโปรเจกต์: "projectCode",

    name: "name",
    ชื่อ: "name",

    projectnameth: "projectNameTh",
    nameth: "projectNameTh",
    ชื่อโปรเจกต์ภาษาไทย: "projectNameTh",
    ชื่อโปรเจกต์ไทย: "projectNameTh",
    ชื่อภาษาไทย: "projectNameTh",

    projectnameen: "projectNameEn",
    nameen: "projectNameEn",
    ชื่อโปรเจกต์ภาษาอังกฤษ: "projectNameEn",
    ชื่อโปรเจกต์อังกฤษ: "projectNameEn",
    ชื่อภาษาอังกฤษ: "projectNameEn",

    aliases: "aliases",
    alias: "aliases",
    ชื่ออื่น: "aliases",
    ชื่อเรียกอื่น: "aliases",
    ชื่อเรียก: "aliases",
    ชื่อย่อ: "aliases",
    ชื่อเล่นโปรเจกต์: "aliases",

    // =========================
    // Task
    // =========================

    task: "task",
    งาน: "task",

    description: "description",
    รายละเอียด: "description",

    owner: "owner",
    projectmanager: "projectManager",
    ผู้รับผิดชอบ: "owner",
    ผู้ดูแล: "projectManager",
    ผู้จัดการโครงการ: "projectManager",

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

    start: "startDate",
    startdate: "startDate",
    วันที่เริ่ม: "startDate",
    วันเริ่ม: "startDate",

    end: "endDate",
    enddate: "endDate",
    วันที่สิ้นสุด: "endDate",
    วันสิ้นสุด: "endDate",

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

    // =========================
    // Contact
    // =========================

    nickname: "nickname",
    ชื่อเล่น: "nickname",

    team: "team",
    ทีม: "team",

    company: "company",
    บริษัท: "company",
    หน่วยงาน: "company",

    position: "position",
    ตำแหน่ง: "position",

    phone: "phone",
    tel: "phone",
    telephone: "phone",
    mobile: "phone",
    โทร: "phone",
    เบอร์: "phone",
    เบอร์โทร: "phone",
    โทรศัพท์: "phone",

    email: "email",
    อีเมล: "email",
    เมล: "email",

    line: "line",
    lineid: "line",
    ไลน์: "line",
    ไอดีไลน์: "line",
  };

  for (
    const rawLine of String(text || "")
      .replace(/\r\n?/g, "\n")
      .split("\n")
  ) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    const match = line.match(
      /^([^:=：]+)\s*[:=：]\s*(.*)$/
    );

    if (!match) {
      continue;
    }

    const rawKey = match[1]
      .replace(/\s+/g, "")
      .toLowerCase();

    const key = aliases[rawKey];

    if (!key) {
      continue;
    }

    result[key] = match[2].trim();
  }

  return result;
}

export function normalizeStatus(text = "") {
  const value = String(text)
    .trim()
    .toLowerCase();

  if (
    value === "done" ||
    /เสร็จ|เรียบร้อย|เสร็จแล้ว|ส่งแล้ว|ปิดงาน/.test(
      value
    )
  ) {
    return "Done";
  }

  if (
    value === "waiting" ||
    value === "pending" ||
    /รอ|ติด|รอข้อมูล|รอเอกสาร|รอการตอบกลับ/.test(
      value
    )
  ) {
    return "Waiting";
  }

  if (
    value === "doing" ||
    value === "in progress" ||
    /กำลัง|ดำเนิน|อยู่ระหว่างทำ/.test(
      value
    )
  ) {
    return "Doing";
  }

  if (
    value === "review" ||
    /ตรวจสอบ|ตรวจทาน|รอตรวจ|พิจารณา/.test(
      value
    )
  ) {
    return "Review";
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

export function normalizePriority(
  text = ""
) {
  const value = String(text)
    .trim()
    .toLowerCase();

  if (
    value === "critical" ||
    /ด่วนมาก|เร่งด่วนมาก|วิกฤต/.test(
      value
    )
  ) {
    return "Critical";
  }

  if (
    value === "high" ||
    /สำคัญมาก|ความสำคัญสูง|ด่วน|สูง/.test(
      value
    )
  ) {
    return "High";
  }

  if (
    value === "low" ||
    /ความสำคัญต่ำ|ไม่เร่ง|ต่ำ/.test(
      value
    )
  ) {
    return "Low";
  }

  return "Medium";
}

export function normalizeCategory(
  text = ""
) {
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
    โครงสร้างพื้นฐาน:
      "Infrastructure",

    "focus group": "Focus Group",
    focusgroup: "Focus Group",
    โฟกัสกรุ๊ป: "Focus Group",

    support: "Support",
    สนับสนุน: "Support",

    training: "Training",
    อบรม: "Training",

    research: "Research",
    ศึกษา: "Research",
    วิจัย: "Research",

    other: "Other",
    อื่นๆ: "Other",
    อื่น: "Other",
  };

  const compactValue =
    value.replace(/\s+/g, "");

  return (
    categories[value] ||
    categories[compactValue] ||
    "Other"
  );
}

export function inferActivity(
  text = ""
) {
  const value = String(text)
    .toLowerCase()
    .trim();

  if (
    /รับงาน|ได้รับมอบหมาย|มอบหมายงาน|รับเรื่อง|ได้รับเรื่อง|ส่งงานมา|ได้รับข้อมูล|ได้รับเอกสาร/.test(
      value
    )
  ) {
    return "Receive";
  }

  if (
    /ประสาน|ประสานงาน|ติดต่อ|ตามงาน|ติดตามงาน|สอบถาม|แจ้งให้|คุยกับ|ขอข้อมูล|นัดหมาย|ยืนยันนัด|เช็กคิว|เช็คคิว|จองห้อง|จองสถานที่/.test(
      value
    )
  ) {
    return "Coordinate";
  }

  if (
    /รอ|waiting|pending|อยู่ระหว่างรอ|รอผล|รอข้อมูล|รอเอกสาร|รอการตอบกลับ/.test(
      value
    )
  ) {
    return "Waiting";
  }

  if (
    /เสร็จแล้ว|เสร็จเรียบร้อย|เรียบร้อยแล้ว|ดำเนินการแล้ว|ดำเนินการเสร็จ|ส่งแล้ว|ส่งเรียบร้อย|ปิดงาน|แล้วเสร็จ|\bdone\b/.test(
      value
    )
  ) {
    return "Done";
  }

  if (
    /โทรหา|โทรคุย|โทรศัพท์|โทรประสาน|\bcall\b/.test(
      value
    )
  ) {
    return "Call";
  }

  if (
    /ส่งอีเมล|ส่งเมล|ตอบอีเมล|ตอบเมล|อีเมล|\bemail\b/.test(
      value
    )
  ) {
    return "Email";
  }

  if (
    /ตรวจสอบ|ตรวจทาน|ทบทวน|พิจารณา|เช็กเอกสาร|เช็คเอกสาร|\breview\b/.test(
      value
    )
  ) {
    return "Review";
  }

  if (
    /^(ประชุม|เข้าประชุม|ร่วมประชุม|นัดประชุม|หารือ)|ประชุมกับ|ประชุมเรื่อง|ประชุมร่วม|เข้าร่วมประชุม|\bmeeting\b/.test(
      value
    )
  ) {
    return "Meeting";
  }

  if (
    /จัดทำ|ทำรายงาน|ทำเอกสาร|แก้ไข|ปรับแก้|เตรียม|รวบรวม|ศึกษา|ดำเนินการ|เขียน|สรุป|ออกแบบ|พัฒนา|\bworking\b/.test(
      value
    )
  ) {
    return "Working";
  }

  return "Note";
}