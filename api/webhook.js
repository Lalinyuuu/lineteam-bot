import crypto from 'node:crypto';
import { google } from 'googleapis';

export const config = { api: { bodyParser: false } };

const LINE_REPLY_URL = 'https://api.line.me/v2/bot/message/reply';
const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'Tasks';
const EXPECTED_HEADERS = ['Timestamp','Date','Reporter','Project','Task','Status','UserId','RawText'];

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function verifyLineSignature(rawBodyBuffer, signature, channelSecret) {
  if (!signature || !channelSecret) return false;
  const expected = crypto.createHmac('sha256', channelSecret).update(rawBodyBuffer).digest('base64');
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
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(date);
}

function normalizeStatus(task) {
  if (/☑|✅|done|เสร็จ|เรียบร้อย|ดำเนินการแล้ว|แก้แล้ว/i.test(task)) return 'Done';
  if (/รอ|waiting|ยังไม่ได้รับ|ยังไม่คอนเฟิร์ม|ติด vendor|ติดลูกค้า/i.test(task)) return 'Waiting';
  if (/กำลัง|doing|in progress|ดำเนินการ|อยู่ระหว่าง/i.test(task)) return 'In Progress';
  return 'To Do';
}

function parseUpdate(text) {
  const cleaned = text.replace(/^\/update\s*/i, '').trim();
  const lines = cleaned.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  const records = [];
  let project = 'ไม่ระบุ Project';

  for (const originalLine of lines) {
    const line = originalLine.replace(/^\*|\*$/g, '').trim();
    const isBullet = /^(?:[-•]|\d+[.)])\s*/.test(line);
    const looksLikeHeading = !isBullet && line.length <= 80 &&
      !/update|ทีมเราวันนี้|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/i.test(line);

    if (looksLikeHeading) {
      project = line.replace(/^#+\s*/, '').trim();
      continue;
    }
    if (!isBullet) continue;
    const task = line.replace(/^(?:[-•]|\d+[.)])\s*/, '').trim();
    if (task) records.push({ project, task, status: normalizeStatus(task) });
  }

  if (!records.length && cleaned) {
    records.push({ project, task: cleaned, status: normalizeStatus(cleaned) });
  }
  return records;
}

async function getSheetsClient() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_JSON');
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return google.sheets({ version: 'v4', auth });
}

async function ensureSheetAndHeaders(sheets) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error('Missing GOOGLE_SHEET_ID');
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = spreadsheet.data.sheets?.some(s => s.properties?.title === SHEET_NAME);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: SHEET_NAME } } }] }
    });
  }
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_NAME}!A1:H1`,
    valueInputOption: 'RAW',
    requestBody: { values: [EXPECTED_HEADERS] }
  });
}

async function appendRecords({ records, reporter, userId, rawText }) {
  const sheets = await getSheetsClient();
  await ensureSheetAndHeaders(sheets);
  const timestamp = new Date().toISOString();
  const updateDate = formatDateBangkok();
  const values = records.map(r => [timestamp, updateDate, reporter, r.project, r.task, r.status, userId, rawText]);
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAME}!A:H`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values }
  });
}

async function getTaskRows() {
  const sheets = await getSheetsClient();
  await ensureSheetAndHeaders(sheets);
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAME}!A2:H`
  });
  return (result.data.values || []).map(row => ({
    timestamp: row[0] || '', date: row[1] || '', reporter: row[2] || '',
    project: row[3] || '', task: row[4] || '', status: row[5] || '',
    userId: row[6] || '', rawText: row[7] || ''
  }));
}

function statusIcon(status) {
  return status === 'Done' ? '✅' : status === 'Waiting' ? '⏳' : status === 'In Progress' ? '🔄' : '⬜';
}

function formatRows(title, rows) {
  if (!rows.length) return `${title}\n\nไม่พบข้อมูล`;
  const limited = rows.slice(-30).reverse();
  const body = limited.map((r,i) => `${i+1}. ${statusIcon(r.status)} [${r.project}] ${r.task}\n   ${r.reporter} • ${r.date}`).join('\n\n');
  const more = rows.length > 30 ? `\n\nแสดง 30 จากทั้งหมด ${rows.length} รายการ` : '';
  return `${title}\n\n${body}${more}`;
}

function buildSummary(rows, label='ทั้งหมด') {
  const out = [`📊 สรุปงาน ${label}`];
  for (const user of ['ยู','ฝ้าย']) {
    const u = rows.filter(r => r.reporter === user);
    out.push(`\n👤 ${user}`,
      `✅ Done ${u.filter(r => r.status === 'Done').length}`,
      `🔄 In Progress ${u.filter(r => r.status === 'In Progress').length}`,
      `⏳ Waiting ${u.filter(r => r.status === 'Waiting').length}`,
      `⬜ To Do ${u.filter(r => r.status === 'To Do').length}`);
  }
  out.push(`\nรวมทั้งหมด ${rows.length} รายการ`);
  return out.join('\n');
}

async function replyMessage(replyToken, text) {
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) throw new Error('Missing LINE_CHANNEL_ACCESS_TOKEN');
  const response = await fetch(LINE_REPLY_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ replyToken, messages: [{ type: 'text', text: text.slice(0,5000) }] })
  });
  if (!response.ok) throw new Error(`LINE reply failed: ${response.status} ${await response.text()}`);
}

function buildConfirmation(reporter, records) {
  const preview = records.slice(0,10).map((r,i) => `${i+1}. ${statusIcon(r.status)} [${r.project}] ${r.task}`).join('\n');
  const remaining = records.length > 10 ? `\nและอีก ${records.length-10} รายการ` : '';
  return `✅ บันทึก Daily Update ของ ${reporter} แล้ว ${records.length} รายการ\n\n${preview}${remaining}`;
}

function helpText() {
  return ['📌 คำสั่งที่ใช้ได้','','/update บันทึกงาน','/today ดูงานวันนี้','/my ดูงานของฉัน','/waiting ดูงานที่รอ','/done ดูงานที่เสร็จ','/project ชื่อโปรเจกต์','/summary สรุปงานวันนี้','/help ดูคำสั่ง','','ตัวอย่าง','/update','Pjoy','- สรุป MoM เสร็จแล้ว','- รอลูกค้าคอนเฟิร์มวันประชุม'].join('\n');
}

async function handleCommand(text, userId) {
  if (/^\/help$/i.test(text)) return helpText();
  const rows = await getTaskRows();
  const today = formatDateBangkok();
  if (/^\/today$/i.test(text)) return formatRows(`📅 งานวันนี้ ${today}`, rows.filter(r => r.date === today));
  if (/^\/my$/i.test(text)) return formatRows(`👤 งานของ ${displayName(userId)}`, rows.filter(r => r.userId === userId));
  if (/^\/waiting$/i.test(text)) return formatRows('⏳ งานที่กำลังรอ', rows.filter(r => r.status === 'Waiting'));
  if (/^\/done$/i.test(text)) return formatRows('✅ งานที่เสร็จแล้ว', rows.filter(r => r.status === 'Done'));
  if (/^\/summary$/i.test(text)) return buildSummary(rows.filter(r => r.date === today), today);
  const m = text.match(/^\/project(?:\s+(.+))?$/i);
  if (m) {
    const keyword = (m[1] || '').trim();
    if (!keyword) return 'กรุณาระบุชื่อโปรเจกต์ เช่น /project Pjoy';
    return formatRows(`📁 Project: ${keyword}`, rows.filter(r => r.project.toLowerCase().includes(keyword.toLowerCase())));
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  try {
    const rawBodyBuffer = await readRawBody(req);
    const rawBody = rawBodyBuffer.toString('utf8');
    if (!verifyLineSignature(rawBodyBuffer, req.headers['x-line-signature'], process.env.LINE_CHANNEL_SECRET)) {
      return res.status(401).send('Invalid signature');
    }
    let payload;
    try { payload = JSON.parse(rawBody); } catch { return res.status(400).send('Invalid JSON'); }

    for (const event of payload.events || []) {
      if (event.type !== 'message' || event.message?.type !== 'text' || !event.replyToken) continue;
      const text = event.message.text.trim();
      const userId = event.source?.userId || '';
      try {
        if (/^\/update(?:\s|$)/i.test(text)) {
          const reporter = displayName(userId);
          const records = parseUpdate(text);
          if (!records.length) {
            await replyMessage(event.replyToken, 'ไม่พบรายการงาน กรุณาใส่งานหลัง /update');
            continue;
          }
          await appendRecords({ records, reporter, userId, rawText: text });
          await replyMessage(event.replyToken, buildConfirmation(reporter, records));
          continue;
        }
        const reply = await handleCommand(text, userId);
        if (reply) await replyMessage(event.replyToken, reply);
      } catch (eventError) {
        console.error('Event processing failed:', eventError);
        await replyMessage(event.replyToken, 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง').catch(() => {});
      }
    }
    return res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).send('Internal Server Error');
  }
}
