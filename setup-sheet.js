
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Tasks');
  if (!sheet) sheet = ss.insertSheet('Tasks');

  const headers = [
    'Timestamp',
    'Update Date',
    'Reporter',
    'Project',
    'Task / Update',
    'Status',
    'LINE User ID',
    'Raw Message'
  ];

  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.autoResizeColumns(1, headers.length);
}
