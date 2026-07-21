import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeSpreadsheetId } from '../sheets.js';

test('normalizeSpreadsheetId extracts the sheet id from a Google Sheets URL', () => {
  const url = 'https://docs.google.com/spreadsheets/d/1Dw9P3NzuPz8PMid8e6Chi44_JQzZocoAaIgZGfTaogE/edit?gid=790928889#gid=790928889';

  assert.equal(normalizeSpreadsheetId(url), '1Dw9P3NzuPz8PMid8e6Chi44_JQzZocoAaIgZGfTaogE');
});

test('normalizeSpreadsheetId leaves a plain spreadsheet id unchanged', () => {
  const spreadsheetId = '1Dw9P3NzuPz8PMid8e6Chi44_JQzZocoAaIgZGfTaogE';

  assert.equal(normalizeSpreadsheetId(spreadsheetId), spreadsheetId);
});
