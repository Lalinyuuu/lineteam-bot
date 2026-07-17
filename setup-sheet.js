import { google } from 'googleapis';
const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'Tasks';
const HEADERS = ['Timestamp','Date','Reporter','Project','Task','Status','UserId','RawText'];
async function main() {
  if (!process.env.GOOGLE_SHEET_ID) throw new Error('Missing GOOGLE_SHEET_ID');
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_JSON');
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({credentials,scopes:['https://www.googleapis.com/auth/spreadsheets']});
  const sheets = google.sheets({version:'v4',auth});
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const spreadsheet = await sheets.spreadsheets.get({spreadsheetId});
  const exists = spreadsheet.data.sheets?.some(s => s.properties?.title === SHEET_NAME);
  if (!exists) await sheets.spreadsheets.batchUpdate({spreadsheetId,requestBody:{requests:[{addSheet:{properties:{title:SHEET_NAME}}}]}});
  await sheets.spreadsheets.values.update({spreadsheetId,range:`${SHEET_NAME}!A1:H1`,valueInputOption:'RAW',requestBody:{values:[HEADERS]}});
  console.log(`Sheet "${SHEET_NAME}" is ready.`);
}
main().catch(e => { console.error(e); process.exit(1); });
