import { randomUUID } from "node:crypto";

export const TIME_ZONE = "Asia/Bangkok";

export function displayName(userId) {
  const users = {
    [process.env.LINE_USER_ID_YUU || "__YUU__"]: "ยู",
    [process.env.LINE_USER_ID_FAI || "__FAI__"]: "ฝ้าย",
  };

  return users[userId] || "ไม่ทราบชื่อ";
}

export function bangkokDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function newId(prefix) {
  return `${prefix}-${Date.now()
    .toString(36)
    .toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

export function compact(text, max = 5000) {
  const value = String(text || "").trim();

  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max - 20)}\n…ข้อความถูกตัด`;
}
