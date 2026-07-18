// Run createMaddensForm() once in the Apps Script editor (script.google.com).
// It builds the Google Form from activities.json and logs everything you need
// to paste into config.js. Set ACTIVITIES_URL to your pushed raw file first.
const ACTIVITIES_URL = 'https://raw.githubusercontent.com/pete2786/maddens-2026/main/activities.json';

function createMaddensForm() {
  const data = JSON.parse(UrlFetchApp.fetch(ACTIVITIES_URL).getContentText());

  const form = FormApp.create(data.meta.title);
  form.setDescription(data.meta.dates + ' · check everything you\'d like to do.');
  form.setCollectEmail(false);
  form.setLimitOneResponsePerUser(false);

  // Q1: Name dropdown (order must match config.js: name first)
  form.addListItem()
    .setTitle('Your name')
    .setRequired(true)
    .setChoiceValues(data.roster.map(p => p.name + ' (' + p.family + ')'));

  // One checkbox question per category, in JSON order.
  data.categories.forEach(cat => {
    form.addCheckboxItem()
      .setTitle(cat.label)
      .setChoiceValues(cat.items.map(it => it.label));
  });

  // Linked responses spreadsheet.
  const ss = SpreadsheetApp.create("Madden's 2026 Responses");
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  const formAction = form.getPublishedUrl().replace('/viewform', '/formResponse');

  // Derive entry.XXXX ids via a prefilled URL (ids appear in item order).
  const entryIds = getEntryIds(form);
  const lines = [];
  lines.push('    name:     "' + entryIds[0] + '",');
  data.categories.forEach((cat, i) => {
    lines.push('    ' + cat.id + ': "' + entryIds[i + 1] + '",');
  });

  Logger.log('=== PASTE INTO config.js ===');
  Logger.log('FORM_ACTION: "' + formAction + '"');
  Logger.log('ENTRY:\n' + lines.join('\n'));
  Logger.log('Form edit URL:   ' + form.getEditUrl());
  Logger.log('Responses sheet: ' + ss.getUrl());
}

// Builds a prefilled response touching every item so the prefilled URL exposes
// each field's entry id, in the same order the items were added.
function getEntryIds(form) {
  const fr = form.createResponse();
  form.getItems().forEach(item => {
    const t = item.getType();
    if (t === FormApp.ItemType.LIST) {
      const li = item.asListItem();
      fr.withItemResponse(li.createResponse(li.getChoices()[0].getValue()));
    } else if (t === FormApp.ItemType.CHECKBOX) {
      const ci = item.asCheckboxItem();
      fr.withItemResponse(ci.createResponse([ci.getChoices()[0].getValue()]));
    }
  });
  const url = fr.toPrefilledUrl();
  return url.match(/entry\.\d+/g) || [];
}
