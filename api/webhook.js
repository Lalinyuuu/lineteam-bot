import crypto from 'node:crypto';
import { google } from 'googleapis';

export const config = {
  api: {
    bodyParser: false
  }
};

const LINE_REPLY_URL = 'https://api.line.me/v2/bot/message/reply';
const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'Tasks';

const EXPECTED_HEADERS = [
  'Timestamp',
  'Date',
  'Reporter',
  'Project',
  'Task',
  'Status',
  'UserId',
  'RawText'
];

async function readRawBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

function verifyLineSignature(rawBodyBuffer, signature, channelSecret) {
  if (!signature || !channelSecret) return false;

  const expected = crypto
    .createHmac('sha256', channelSecret)
    .update(rawBodyBuffer)
    .digest('base64');

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== actualBuffer.length) return false;

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
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

function normalizeStatus(task) {
  const text = task.toLowerCase();

  // Waiting มาก่อน เพราะข้อความหนึ่งอาจมีทั้ง "คอนเฟิร์มแล้ว" และ "ยังขาด..."
  if (
    /⏳|รอ|ขาดแต่|ยังขาด|ยังไม่ได้|ยังไม่ครบ|pending|waiting|ติดลูกค้า|ติด vendor|รอคอนเฟิร์ม|รออนุมัติ/i.test(
      text
    )
  ) {
    return 'Waiting';
  }

  if (
    /🔄|กำลัง|อยู่ระหว่าง|กำลังดำเนินการ|กำลังทำ|doing|in progress/i.test(
      text
    )
  ) {
    return 'In Progress';
  }

  if (
    /✅|☑|เสร็จแล้ว|เรียบร้อยแล้ว|ส่งแล้ว|อัปแล้ว|อัปเดตแล้ว|ดำเนินการแล้ว|คอนเฟิร์มครบแล้ว|done|completed/i.test(
      text
    )
  ) {
    return 'Done';
  }

  return 'To Do';
}

function parseUpdate(text) {
  const cleaned = text.replace(/^\/update\s*/i, '').trim();

  const lines = cleaned
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const records = [];

  let currentProject = 'ไม่ระบุ Project';
  let currentTask = null;
  let hasFoundFirstProject = false;

  function saveCurrentTask() {
    if (!currentTask) return;

    const task = currentTask.lines
      .map((line) => line.trim())
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (task) {
      records.push({
        project: currentProject,
        task,
        status: normalizeStatus(task)
      });
    }

    currentTask = null;
  }

  function isTaskStart(line) {
    return /^(?:\d+[.)]|[-•*])\s*(.+)$/.test(line);
  }

  function extractTaskText(line) {
    const match = line.match(/^(?:\d+[.)]|[-•*])\s*(.+)$/);
    return match ? match[1].trim() : '';
  }

  function extractProject(line) {
    const explicitProject =
      line.match(/^(?:project|โปรเจกต์)\s*[:：]\s*(.+)$/i) ||
      line.match(/^\[(.+)]$/);

    if (explicitProject) {
      return explicitProject[1].trim();
    }

    return null;
  }

  for (const line of lines) {
    const explicitProject = extractProject(line);

    if (explicitProject) {
      saveCurrentTask();
      currentProject = explicitProject;
      hasFoundFirstProject = true;
      continue;
    }

    if (
      !hasFoundFirstProject &&
      !currentTask &&
      records.length === 0 &&
      !isTaskStart(line)
    ) {
      currentProject = line;
      hasFoundFirstProject = true;
      continue;
    }

    if (isTaskStart(line)) {
      saveCurrentTask();

      currentTask = {
        lines: [extractTaskText(line)]
      };

      continue;
    }

    if (currentTask) {
      currentTask.lines.push(line);
      continue;
    }

    currentTask = {
      lines: [line]
    };
  }

  saveCurrentTask();

  if (records.length === 0 && cleaned) {
    records.push({
      project: currentProject,
      task: cleaned,
      status: normalizeStatus(cleaned)
    });
  }

  return records;
}

async function getSheetsClient() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_JSON');
  }

  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  return google.sheets({
    version: 'v4',
    auth
  });
}

async function ensureSheetAndHeaders(sheets) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId) {
    throw new Error('Missing GOOGLE_SHEET_ID');
  }

  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId
  });

  const exists = spreadsheet.data.sheets?.some(
    (sheet) => sheet.properties?.title === SHEET_NAME
  );

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: SHEET_NAME
              }
            }
          }
        ]
      }
    });
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_NAME}!A1:H1`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [EXPECTED_HEADERS]
    }
  });
}

async function appendRecords({
  records,
  reporter,
  userId,
  rawText
}) {
  const sheets = await getSheetsClient();

  await ensureSheetAndHeaders(sheets);

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
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAME}!A:H`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values
    }
  });
}

async function getTaskRows() {
  const sheets = await getSheetsClient();

  await ensureSheetAndHeaders(sheets);

  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAME}!A2:H`
  });

  return (result.data.values || []).map((row) => ({
    timestamp: row[0] || '',
    date: row[1] || '',
    reporter: row[2] || '',
    project: row[3] || '',
    task: row[4] || '',
    status: row[5] || '',
    userId: row[6] || '',
    rawText: row[7] || ''
  }));
}

function statusIcon(status) {
  if (status === 'Done') return '✅';
  if (status === 'Waiting') return '⏳';
  if (status === 'In Progress') return '🔄';

  return '⬜';
}

function formatRows(title, rows) {
  if (!rows.length) {
    return `${title}\n\nไม่พบข้อมูล`;
  }

  const limited = rows.slice(-30).reverse();

  const body = limited
    .map(
      (row, index) =>
        `${index + 1}. ${statusIcon(row.status)} [${row.project}] ${row.task}\n` +
        `   ${row.reporter} • ${row.date}`
    )
    .join('\n\n');

  const more =
    rows.length > 30
      ? `\n\nแสดง 30 จากทั้งหมด ${rows.length} รายการ`
      : '';

  return `${title}\n\n${body}${more}`;
}

function buildSummary(rows, dateLabel = 'ทั้งหมด') {
  const users = ['ยู', 'ฝ้าย'];
  const lines = [`📊 สรุปงาน ${dateLabel}`];

  for (const user of users) {
    const userRows = rows.filter((row) => row.reporter === user);
    const done = userRows.filter((row) => row.status === 'Done').length;
    const doing = userRows.filter(
      (row) => row.status === 'In Progress'
    ).length;
    const waiting = userRows.filter(
      (row) => row.status === 'Waiting'
    ).length;
    const todo = userRows.filter((row) => row.status === 'To Do').length;

    lines.push(
      `\n👤 ${user}`,
      `✅ Done ${done}`,
      `🔄 In Progress ${doing}`,
      `⏳ Waiting ${waiting}`,
      `⬜ To Do ${todo}`
    );
  }

  lines.push(`\nรวมทั้งหมด ${rows.length} รายการ`);

  return lines.join('\n');
}

async function replyMessage(replyToken, text) {
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    throw new Error('Missing LINE_CHANNEL_ACCESS_TOKEN');
  }

  const response = await fetch(LINE_REPLY_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      replyToken,
      messages: [
        {
          type: 'text',
          text: text.slice(0, 5000)
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(
      `LINE reply failed: ${response.status} ${await response.text()}`
    );
  }
}

function buildConfirmation(reporter, records) {
  const preview = records
    .slice(0, 10)
    .map(
      (record, index) =>
        `${index + 1}. ${statusIcon(record.status)} [${record.project}] ${record.task}`
    )
    .join('\n');

  const remaining =
    records.length > 10
      ? `\nและอีก ${records.length - 10} รายการ`
      : '';

  return `✅ บันทึก Daily Update ของ ${reporter} แล้ว ${records.length} รายการ\n\n${preview}${remaining}`;
}

function helpText() {
  return [
    '📌 คำสั่งที่ใช้ได้',
    '',
    '/update บันทึกงาน',
    '/today ดูงานวันนี้',
    '/my ดูงานของฉัน',
    '/waiting ดูงานที่รอ',
    '/done ดูงานที่เสร็จ',
    '/project ชื่อโปรเจกต์',
    '/summary สรุปงานวันนี้',
    '/help ดูคำสั่ง',
    '',
    'ตัวอย่าง',
    '/update',
    'Project 50',
    '1. Online Meeting วันที่ 20 July 2026',
    'อัป calendar แล้ว',
    '2. รายงานผลการศึกษา',
    'ยังขาดผู้เข้าร่วม 1 คน',
    '',
    'กรณีมีหลาย Project ให้เขียนแบบนี้',
    'Project: Project 50',
    '1. งานแรก',
    '2. งานที่สอง',
    'Project: Oracle',
    '1. งาน Oracle'
  ].join('\n');
}

async function handleCommand(text, userId) {
  const rows = await getTaskRows();
  const today = formatDateBangkok();

  if (/^\/today$/i.test(text)) {
    return formatRows(
      `📅 งานวันนี้ ${today}`,
      rows.filter((row) => row.date === today)
    );
  }

  if (/^\/my$/i.test(text)) {
    return formatRows(
      `👤 งานของ ${displayName(userId)}`,
      rows.filter((row) => row.userId === userId)
    );
  }

  if (/^\/waiting$/i.test(text)) {
    return formatRows(
      '⏳ งานที่กำลังรอ',
      rows.filter((row) => row.status === 'Waiting')
    );
  }

  if (/^\/done$/i.test(text)) {
    return formatRows(
      '✅ งานที่เสร็จแล้ว',
      rows.filter((row) => row.status === 'Done')
    );
  }

  if (/^\/summary$/i.test(text)) {
    return buildSummary(
      rows.filter((row) => row.date === today),
      today
    );
  }

  const projectMatch = text.match(/^\/project(?:\s+(.+))?$/i);

  if (projectMatch) {
    const keyword = (projectMatch[1] || '').trim();

    if (!keyword) {
      return 'กรุณาระบุชื่อโปรเจกต์ เช่น /project Project 50';
    }

    return formatRows(
      `📁 Project: ${keyword}`,
      rows.filter((row) =>
        row.project.toLowerCase().includes(keyword.toLowerCase())
      )
    );
  }

  if (/^\/help$/i.test(text)) {
    return helpText();
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const rawBodyBuffer = await readRawBody(req);
    const rawBody = rawBodyBuffer.toString('utf8');
    const signature = req.headers['x-line-signature'];

    const isValidSignature = verifyLineSignature(
      rawBodyBuffer,
      signature,
      process.env.LINE_CHANNEL_SECRET
    );

    if (!isValidSignature) {
      return res.status(401).send('Invalid signature');
    }

    let payload;

    try {
      payload = JSON.parse(rawBody);
    } catch {
      return res.status(400).send('Invalid JSON');
    }

    for (const event of payload.events || []) {
      const isTextMessage =
        event.type === 'message' &&
        event.message?.type === 'text' &&
        event.replyToken;

      if (!isTextMessage) {
        continue;
      }

      const text = event.message.text.trim();
      const userId = event.source?.userId || '';

      try {
        if (/^\/update(?:\s|$)/i.test(text)) {
          const reporter = displayName(userId);
          const records = parseUpdate(text);

          if (!records.length) {
            await replyMessage(
              event.replyToken,
              'ไม่พบรายการงาน กรุณาใส่งานหลัง /update'
            );

            continue;
          }

          await appendRecords({
            records,
            reporter,
            userId,
            rawText: text
          });

          await replyMessage(
            event.replyToken,
            buildConfirmation(reporter, records)
          );

          continue;
        }

        const reply = await handleCommand(text, userId);

        if (reply) {
          await replyMessage(event.replyToken, reply);
        }
      } catch (eventError) {
        console.error('Event processing failed:', eventError);

        await replyMessage(
          event.replyToken,
          'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
        ).catch(() => {});
      }
    }

    return res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);

    return res.status(500).send('Internal Server Error');
  }
}
