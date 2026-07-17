import crypto from 'node:crypto';
import { google } from 'googleapis';

const LINE_REPLY_URL = 'https://api.line.me/v2/bot/message/reply';

function verifyLineSignature(rawBody, signature, channelSecret) {
  if (!signature || !channelSecret) return false;
  const expected = crypto
    .createHmac('sha256', channelSecret)
    .update(rawBody)
    .digest('base64');

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function displayName(userId) {
  const mapping = {
    [process.env.LINE_USER_ID_YUU || '']: 'ยู',
    [process.env.LINE_USER_ID_FAI || '']: 'ฝ้าย'
  };
  return mapping[userId] || 'ไม่ทราบชื่อ';
}

function formatDateBangkok(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function parseUpdate(text) {
  const cleaned = text.replace(/^\/update\s*/i, '').trim();
  const lines = cleaned.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  const records = [];
  let project = 'ไม่ระบุ Project';

  for (const originalLine of lines) {
    const line = originalLine.replace(/^\*|\*$/g, '').trim();

    // Project heading examples: *Project 50*, Project 50, *Pjoy*
    const isBullet = /^(?:[-•]|\d+[.)])\s*/.test(line);
    const headingCandidate = !isBullet && line.length <= 60;
    const looksLikeDateHeading = /update|ทีมเราวันนี้|\d{1,2}\s+[A-Za-zก-๙]+\s+\d{4}/i.test(line);

    if (headingCandidate && !looksLikeDateHeading) {
      project = line.replace(/^#+\s*/, '').trim();
      continue;
    }

    if (!isBullet) continue;

    const task = line.replace(/^(?:[-•]|\d+[.)])\s*/, '').trim();
    let status = 'อัปเดต';
    if (/☑|✅|เสร็จ|เรียบร้อย|ดำเนินการไปแล้ว|แก้แล้ว/i.test(task)) status = 'เสร็จ/ดำเนินการแล้ว';
    if (/รอ|ยังไม่ได้รับ|ยังไม่คอนเฟิร์ม|waiting|deploy/i.test(task)) status = 'รอดำเนินการ/รอคำตอบ';

    records.push({ project, task, status });
  }

  if (records.length === 0 && cleaned) {
    records.push({ project, task: cleaned, status: 'อัปเดต' });
  }

  return records;
}

async function getSheetsClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return google.sheets({ version: 'v4', auth });
}

async function appendRecords({ records, reporter, userId, rawText }) {
  const sheets = await getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const timestamp = new Date().toISOString();
  const updateDate = formatDateBangkok();

  const values = records.map((record) => [
    timestamp,
    updateDate,
    reporter,
    record.project,
    record.task,
    record.status,
    userId,
    rawText
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Tasks!A:H',
    valueInputOption: 'RAW',
    requestBody: { values }
  });
}

async function replyMessage(replyToken, text) {
  const response = await fetch(LINE_REPLY_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text }]
    })
  });

  if (!response.ok) {
    throw new Error(`LINE reply failed: ${response.status} ${await response.text()}`);
  }
}

function buildConfirmation(reporter, records) {
  const preview = records.slice(0, 8).map((record, index) =>
    `${index + 1}. [${record.project}] ${record.task}\nสถานะ: ${record.status}`
  ).join('\n\n');
  const remaining = records.length > 8 ? `\n\nและอีก ${records.length - 8} รายการ` : '';
  return `✅ บันทึก Daily Update ของ ${reporter} แล้ว ${records.length} รายการ\n\n${preview}${remaining}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  const signature = req.headers['x-line-signature'];

  if (!verifyLineSignature(rawBody, signature, process.env.LINE_CHANNEL_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  res.status(200).send('OK');

  for (const event of payload.events || []) {
    try {
      if (event.type !== 'message' || event.message?.type !== 'text') continue;
      const text = event.message.text.trim();
      if (!/^\/update(?:\s|$)/i.test(text)) continue;

      const userId = event.source?.userId || '';
      const reporter = displayName(userId);
      const records = parseUpdate(text);

      await appendRecords({ records, reporter, userId, rawText: text });
      await replyMessage(event.replyToken, buildConfirmation(reporter, records));
    } catch (error) {
      console.error(error);
      if (event.replyToken) {
        await replyMessage(event.replyToken, 'บันทึกไม่สำเร็จ กรุณาลองส่ง /update ใหม่อีกครั้ง').catch(console.error);
      }
    }
  }
}
