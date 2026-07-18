// Bound to the "Madden's 2026 Responses" spreadsheet.
// buildSummary() rebuilds the Summary tab. Wire onFormSubmitTrigger() to an
// installable onFormSubmit trigger so it refreshes on every submission.

function buildSummary() {
  const ss = SpreadsheetApp.getActive();
  const resp = ss.getSheets()[0]; // Form Responses 1 is the first sheet
  const values = resp.getDataRange().getValues();
  if (values.length < 2) { writeSummary(ss, []); return; }

  const header = values[0];
  const nameIdx = header.indexOf('Your name');
  const catCols = header
    .map((h, i) => i)
    .filter(i => i !== 0 && i !== nameIdx); // skip Timestamp + name

  const tally = {}; // label -> { cat, names: [] }
  for (let r = 1; r < values.length; r++) {
    const person = String(values[r][nameIdx] || '').trim();
    if (!person) continue;
    catCols.forEach(ci => {
      const cell = String(values[r][ci] || '');
      if (!cell) return;
      cell.split(', ').forEach(actRaw => {
        const act = actRaw.trim();
        if (!act) return;
        if (!tally[act]) tally[act] = { cat: header[ci], names: [] };
        if (tally[act].names.indexOf(person) === -1) tally[act].names.push(person);
      });
    });
  }

  const rows = Object.keys(tally).map(a => [a, tally[a].cat, tally[a].names.length, tally[a].names.join(', ')]);
  rows.sort((a, b) => b[2] - a[2] || String(a[1]).localeCompare(String(b[1])) || String(a[0]).localeCompare(String(b[0])));
  writeSummary(ss, rows);
}

function writeSummary(ss, rows) {
  let sheet = ss.getSheetByName('Summary');
  if (!sheet) sheet = ss.insertSheet('Summary', 0);
  sheet.clear();
  sheet.getRange(1, 1, 1, 4).setValues([['Activity', 'Category', '# Interested', 'Who']]).setFontWeight('bold');
  if (rows.length) sheet.getRange(2, 1, rows.length, 4).setValues(rows);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 4);
}

function onFormSubmitTrigger(e) {
  buildSummary();
}
