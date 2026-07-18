# Maddens 2026 Trip Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a static GitHub Pages page where each of 12 people checks the Madden's activities they want to do; submissions flow into a Google Sheet (via a Google Form) with an auto-built Summary tab for spotting overlap.

**Architecture:** Single source of truth `activities.json` (roster + categorized activities). The page (`index.html` + `form.js`) fetches it and renders a name dropdown + checkbox lists, POSTing selections to a Google Form's `formResponse` endpoint. An Apps Script (`CreateForm.gs`) builds that Form from the *same* JSON and prints the field IDs; a second script (`Summary.gs`) tallies responses into a Summary tab on each submit.

**Tech Stack:** Vanilla HTML/CSS/JS (no build step), Google Forms + Sheets, Google Apps Script, GitHub Pages. Node (only for the JSON validator).

## Global Constraints

- No build step, no framework, no npm dependencies in the shipped site — plain static files.
- `activities.json` is the ONLY place activities/roster are defined; page and Apps Script both read it.
- Every activity `label` MUST be unique within its category and MUST NOT contain a comma (Google Forms joins multi-select cells with `, ` and Summary.gs splits on `, `).
- Category ids are exactly: `water`, `land`, `kids`, `evening`, `wellness`, `offsite` — identical across `activities.json`, `config.js`, and `form.js`.
- Roster: 12 people. Peterson: David, Megan, Artie(kid), Matilda(kid), Harald(kid). Udell: Brian, Erin, Evie(kid), Sebastian(kid). Hanrahan: Curt, Sue, Tim.
- Trip label copy: `Sat July 25 – Wed July 29, 2026`.
- Repo/user placeholders in code use the literal token `<USER>` where the GitHub username must later be substituted.

---

### Task 1: Activity dataset + validator

**Files:**
- Create: `activities.json`
- Create: `tools/validate-activities.mjs`

**Interfaces:**
- Produces: `activities.json` with shape `{ meta:{title,dates,rawUrl}, roster:[{name,family,kid}], categories:[{id,label,items:[{label,price?,age?}]}] }`. Category ids in order: `water,land,kids,evening,wellness,offsite`. Consumed by `form.js` (Task 3) and `CreateForm.gs` (Task 4).

- [ ] **Step 1: Write the validator (failing test)**

Create `tools/validate-activities.mjs`:

```js
// Validates activities.json against the plan's Global Constraints.
// Usage: node tools/validate-activities.mjs
import { readFileSync } from 'node:fs';

const EXPECTED_CATS = ['water', 'land', 'kids', 'evening', 'wellness', 'offsite'];
const EXPECTED_ROSTER = 12;

const errors = [];
let data;
try {
  data = JSON.parse(readFileSync(new URL('../activities.json', import.meta.url)));
} catch (e) {
  console.error('FAIL: activities.json is not valid JSON —', e.message);
  process.exit(1);
}

if (!data.meta || !data.meta.dates || !data.meta.rawUrl) errors.push('meta.dates and meta.rawUrl are required');
if (!Array.isArray(data.roster) || data.roster.length !== EXPECTED_ROSTER)
  errors.push(`roster must have ${EXPECTED_ROSTER} people, got ${data.roster && data.roster.length}`);
(data.roster || []).forEach((p, i) => {
  if (!p.name || !p.family || typeof p.kid !== 'boolean') errors.push(`roster[${i}] needs name, family, kid(boolean)`);
});

const ids = (data.categories || []).map(c => c.id);
if (JSON.stringify(ids) !== JSON.stringify(EXPECTED_CATS))
  errors.push(`category ids must be exactly ${EXPECTED_CATS.join(',')} in order, got ${ids.join(',')}`);

(data.categories || []).forEach(cat => {
  if (!cat.label) errors.push(`category ${cat.id} needs a label`);
  const seen = new Set();
  (cat.items || []).forEach((it, i) => {
    if (!it.label) errors.push(`${cat.id}[${i}] needs a label`);
    if (it.label && it.label.includes(',')) errors.push(`${cat.id}: label "${it.label}" contains a comma`);
    if (seen.has(it.label)) errors.push(`${cat.id}: duplicate label "${it.label}"`);
    seen.add(it.label);
    if (it.age && !['kid', '21+'].includes(it.age)) errors.push(`${cat.id}: "${it.label}" has invalid age "${it.age}"`);
  });
  if (!cat.items || cat.items.length === 0) errors.push(`category ${cat.id} has no items`);
});

if (errors.length) {
  console.error('FAIL:\n - ' + errors.join('\n - '));
  process.exit(1);
}
const total = data.categories.reduce((n, c) => n + c.items.length, 0);
console.log(`OK: ${data.roster.length} people, ${data.categories.length} categories, ${total} activities`);
```

- [ ] **Step 2: Run validator to verify it fails (no data file yet)**

Run: `node tools/validate-activities.mjs`
Expected: FAIL — `activities.json is not valid JSON` (file does not exist), exit code 1.

- [ ] **Step 3: Create `activities.json`**

```json
{
  "meta": {
    "title": "Madden's 2026 — What do you want to do?",
    "dates": "Sat July 25 – Wed July 29, 2026",
    "rawUrl": "https://raw.githubusercontent.com/<USER>/maddens-2026/main/activities.json"
  },
  "roster": [
    { "name": "David", "family": "Peterson", "kid": false },
    { "name": "Megan", "family": "Peterson", "kid": false },
    { "name": "Artie", "family": "Peterson", "kid": true },
    { "name": "Matilda", "family": "Peterson", "kid": true },
    { "name": "Harald", "family": "Peterson", "kid": true },
    { "name": "Brian", "family": "Udell", "kid": false },
    { "name": "Erin", "family": "Udell", "kid": false },
    { "name": "Evie", "family": "Udell", "kid": true },
    { "name": "Sebastian", "family": "Udell", "kid": true },
    { "name": "Curt", "family": "Hanrahan", "kid": false },
    { "name": "Sue", "family": "Hanrahan", "kid": false },
    { "name": "Tim", "family": "Hanrahan", "kid": false }
  ],
  "categories": [
    {
      "id": "water",
      "label": "Water",
      "items": [
        { "label": "Pontoon cruise", "price": "$20" },
        { "label": "Banana taxi tubing", "price": "$5" },
        { "label": "Waterskiing lessons" },
        { "label": "Boat tubing" },
        { "label": "Kayak / paddleboard / hydrobike rental" },
        { "label": "Inflatable water park" },
        { "label": "Fishing (self-guided)" },
        { "label": "Guided fishing (Walleye Dan)" },
        { "label": "Swimming pools" },
        { "label": "Beach & hot tub" },
        { "label": "Motorized boat rental" }
      ]
    },
    {
      "id": "land",
      "label": "Land & Sport",
      "items": [
        { "label": "Archery", "price": "$20" },
        { "label": "Trap shooting", "price": "$75" },
        { "label": "Axe throwing" },
        { "label": "Bucket golf", "price": "$20" },
        { "label": "Lawn bowling", "price": "$20" },
        { "label": "Croquet", "price": "$10" },
        { "label": "Pickleball" },
        { "label": "Tennis" },
        { "label": "Championship golf" },
        { "label": "Social 9 family scramble" },
        { "label": "Putting contest" },
        { "label": "Resort lawn games" },
        { "label": "Hiking & biking (resort bikes)" }
      ]
    },
    {
      "id": "kids",
      "label": "Kids & Family",
      "items": [
        { "label": "Build-A-Buddy", "price": "$25", "age": "kid" },
        { "label": "Junior golf", "age": "kid" },
        { "label": "Medallion hunt" },
        { "label": "Photo scavenger hunt" },
        { "label": "Tie dye", "price": "$15" },
        { "label": "Scratch art" },
        { "label": "Pickleball paddle craft", "price": "$25" },
        { "label": "Arcade & game room" },
        { "label": "Bingo", "price": "$1/card" }
      ]
    },
    {
      "id": "evening",
      "label": "Evening",
      "items": [
        { "label": "Trivia" },
        { "label": "Glow golf", "price": "$15" },
        { "label": "Karaoke (21+)", "age": "21+" },
        { "label": "Live entertainment (21+)", "age": "21+" },
        { "label": "Bonfire & s'mores" },
        { "label": "Lakeside happy hour" }
      ]
    },
    {
      "id": "wellness",
      "label": "Wellness",
      "items": [
        { "label": "Yoga", "price": "$15" },
        { "label": "Beach boot camp", "price": "$20" },
        { "label": "Spa services" },
        { "label": "Fitness room" }
      ]
    },
    {
      "id": "offsite",
      "label": "Off-site (Brainerd area)",
      "items": [
        { "label": "Cuyuna mountain biking" },
        { "label": "Zip-lining" },
        { "label": "E-bike rental (Jac's)" }
      ]
    }
  ]
}
```

- [ ] **Step 4: Run validator to verify it passes**

Run: `node tools/validate-activities.mjs`
Expected: PASS — `OK: 12 people, 6 categories, 46 activities`, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add activities.json tools/validate-activities.mjs
git commit -m "feat: add activities.json data source + validator"
```

---

### Task 2: Static page shell (HTML + CSS + config template)

**Files:**
- Create: `index.html`
- Create: `styles.css`
- Create: `config.js`

**Interfaces:**
- Produces: DOM anchors `#name-select`, `#categories`, `#submit-btn`, `#status` consumed by `form.js` (Task 3). `window.MADDENS_CONFIG` global (from `config.js`) with `FORM_ACTION` string and `ENTRY` map keyed by `name,water,land,kids,evening,wellness,offsite`, consumed by `form.js`.

- [ ] **Step 1: Create `config.js` (placeholder to be filled during setup)**

```js
// Filled in during one-time setup — see SETUP.md. Values come from running
// apps-script/CreateForm.gs, which logs the formResponse URL and entry IDs.
window.MADDENS_CONFIG = {
  FORM_ACTION: "https://docs.google.com/forms/d/e/REPLACE_WITH_FORM_ID/formResponse",
  ENTRY: {
    name:     "entry.0000000000",
    water:    "entry.0000000000",
    land:     "entry.0000000000",
    kids:     "entry.0000000000",
    evening:  "entry.0000000000",
    wellness: "entry.0000000000",
    offsite:  "entry.0000000000"
  }
};
```

- [ ] **Step 2: Create `styles.css`**

```css
:root {
  --bg: #0f3d2e; --card: #ffffff; --ink: #1a2b23; --muted: #5c6b63;
  --accent: #d98c2b; --line: #e4e9e6; --pill: #eef3f0;
}
* { box-sizing: border-box; }
body {
  margin: 0; font: 16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: var(--ink); background: var(--bg);
}
header { text-align: center; color: #fff; padding: 28px 16px 8px; }
header h1 { margin: 0 0 4px; font-size: 1.5rem; }
header p { margin: 0; opacity: .85; }
main { max-width: 760px; margin: 0 auto; padding: 16px; }
.card {
  background: var(--card); border-radius: 14px; padding: 20px;
  box-shadow: 0 8px 30px rgba(0,0,0,.18); margin-bottom: 20px;
}
.field label { display: block; font-weight: 600; margin-bottom: 6px; }
select {
  width: 100%; padding: 10px 12px; font-size: 1rem;
  border: 1px solid var(--line); border-radius: 8px; background: #fff;
}
.category { margin-top: 8px; }
.category h2 {
  font-size: 1.05rem; margin: 20px 0 8px; padding-bottom: 6px;
  border-bottom: 2px solid var(--line);
}
.activity {
  display: flex; align-items: center; gap: 10px; padding: 8px 6px;
  border-radius: 8px;
}
.activity:hover { background: var(--pill); }
.activity input { width: 18px; height: 18px; flex: 0 0 auto; }
.activity .label { flex: 1; }
.badge {
  font-size: .72rem; font-weight: 600; padding: 2px 7px; border-radius: 999px;
  background: var(--pill); color: var(--muted);
}
.badge.kid { background: #e7f0ff; color: #275ea8; }
.badge.adult { background: #fbe7e7; color: #a83030; }
.badge.price { background: #fff4e4; color: #a86a1f; }
.actions { margin-top: 24px; display: flex; align-items: center; gap: 14px; }
button {
  background: var(--accent); color: #fff; border: 0; border-radius: 999px;
  padding: 12px 26px; font-size: 1rem; font-weight: 600; cursor: pointer;
}
button:disabled { opacity: .5; cursor: default; }
#status { font-weight: 600; }
#status.ok { color: #1f7a4d; }
#status.err { color: #a83030; }
footer { text-align: center; color: #fff; opacity: .7; font-size: .85rem; padding: 8px 0 30px; }
```

- [ ] **Step 3: Create `index.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Madden's 2026 — What do you want to do?</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header>
    <h1>Madden's on Gull Lake — 2026</h1>
    <p id="subtitle">Sat July 25 – Wed July 29, 2026</p>
  </header>
  <main>
    <div class="card">
      <div class="field">
        <label for="name-select">Who are you?</label>
        <select id="name-select" required>
          <option value="" disabled selected>Pick your name…</option>
        </select>
      </div>
      <div id="categories"></div>
      <div class="actions">
        <button id="submit-btn" type="button" disabled>Submit my picks</button>
        <span id="status"></span>
      </div>
    </div>
  </main>
  <footer>Check everything you'd like to do — pick as many as you want.</footer>
  <script src="config.js"></script>
  <script src="form.js"></script>
</body>
</html>
```

- [ ] **Step 4: Verify the shell loads**

Run: `python3 -m http.server 8765` then open `http://localhost:8765/`.
Expected: green header with title + date subtitle, a "Who are you?" dropdown showing only "Pick your name…", a disabled "Submit my picks" button, no JS console errors (form.js not yet present will 404 — acceptable until Task 3). Stop the server with Ctrl-C.

- [ ] **Step 5: Commit**

```bash
git add index.html styles.css config.js
git commit -m "feat: add static page shell and config template"
```

---

### Task 3: Render + submit logic (`form.js`)

**Files:**
- Create: `form.js`

**Interfaces:**
- Consumes: `activities.json` (Task 1) via fetch; `window.MADDENS_CONFIG` (Task 2); DOM anchors `#name-select`, `#categories`, `#submit-btn`, `#status`, `#subtitle` (Task 2).
- Produces: none (leaf).

- [ ] **Step 1: Create `form.js`**

```js
(function () {
  const cfg = window.MADDENS_CONFIG;
  const nameSel = document.getElementById('name-select');
  const catsEl = document.getElementById('categories');
  const btn = document.getElementById('submit-btn');
  const statusEl = document.getElementById('status');

  const badge = (text, cls) => `<span class="badge ${cls}">${text}</span>`;

  function render(data) {
    document.getElementById('subtitle').textContent = data.meta.dates;

    for (const p of data.roster) {
      const o = document.createElement('option');
      // value MUST match the Google Form's Name choice exactly, or the whole
      // submission is silently rejected (CreateForm.gs uses "Name (Family)").
      o.value = `${p.name} (${p.family})`;
      o.textContent = `${p.name} (${p.family})`;
      nameSel.appendChild(o);
    }

    for (const cat of data.categories) {
      const sec = document.createElement('section');
      sec.className = 'category';
      sec.dataset.catId = cat.id;
      const rows = cat.items.map(it => {
        const badges = [
          it.age === 'kid' ? badge('kid', 'kid') : '',
          it.age === '21+' ? badge('21+', 'adult') : '',
          it.price ? badge(it.price, 'price') : ''
        ].join('');
        return `<label class="activity">
          <input type="checkbox" value="${it.label.replace(/"/g, '&quot;')}" />
          <span class="label">${it.label}</span>${badges}
        </label>`;
      }).join('');
      sec.innerHTML = `<h2>${cat.label}</h2>${rows}`;
      catsEl.appendChild(sec);
    }

    nameSel.addEventListener('change', () => { btn.disabled = !nameSel.value; });
    btn.addEventListener('click', () => submit(data));
  }

  function collect(data) {
    const body = new URLSearchParams();
    body.append(cfg.ENTRY.name, nameSel.value);
    for (const cat of data.categories) {
      const sec = catsEl.querySelector(`[data-cat-id="${cat.id}"]`);
      sec.querySelectorAll('input:checked').forEach(cb => {
        body.append(cfg.ENTRY[cat.id], cb.value);
      });
    }
    return body;
  }

  function submit(data) {
    if (!nameSel.value) return;
    btn.disabled = true;
    statusEl.className = '';
    statusEl.textContent = 'Sending…';
    const body = collect(data);
    // Google Forms formResponse does not send CORS headers; no-cors means we
    // can't read the response, so we treat a completed POST as success.
    fetch(cfg.FORM_ACTION, { method: 'POST', mode: 'no-cors', body })
      .then(() => {
        statusEl.className = 'ok';
        statusEl.textContent = 'Got it — thanks! You can close this or resubmit to change your picks.';
      })
      .catch(() => {
        statusEl.className = 'err';
        statusEl.textContent = 'Something went wrong — please try again.';
        btn.disabled = false;
      });
  }

  fetch('activities.json')
    .then(r => r.json())
    .then(render)
    .catch(() => {
      statusEl.className = 'err';
      statusEl.textContent = 'Could not load activities.json.';
    });
})();
```

- [ ] **Step 2: Verify rendering locally**

Run: `python3 -m http.server 8765` then open `http://localhost:8765/`.
Expected:
- Name dropdown lists all 12 names as `Name (Family)`.
- Six category sections render in order: Water, Land & Sport, Kids & Family, Evening, Wellness, Off-site (Brainerd area).
- Total of **46 checkboxes** across all sections. Verify in the browser console: `document.querySelectorAll('.activity input').length` returns `46`.
- Badges show: `kid` on Build-A-Buddy & Junior golf; `21+` on Karaoke & Live entertainment; price badges (e.g. `$20`) where set.
- Submit button is disabled until a name is chosen, then enables.

- [ ] **Step 3: Verify submit payload shape (without a real form)**

In the browser console, select a name, check two Water items, then run:
```js
new URLSearchParams(
  [...document.querySelectorAll('[data-cat-id="water"] input:checked')].map(c => ['entry.0000000000', c.value])
).toString();
```
Expected: a query string with two `entry.0000000000=<label>` pairs (URL-encoded). Confirms multi-select repeats the same entry key. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add form.js
git commit -m "feat: render activities and submit to Google Form"
```

---

### Task 4: Apps Script — create the Form (`CreateForm.gs`)

**Files:**
- Create: `apps-script/CreateForm.gs`

**Interfaces:**
- Consumes: `activities.json` (Task 1) fetched from its raw GitHub URL.
- Produces: a Google Form + linked Sheet; logs the `formResponse` URL and a ready-to-paste `ENTRY` block whose keys match `config.js` (Task 2).

> Not runnable locally — it uses Google Apps Script globals (`FormApp`, `UrlFetchApp`, `SpreadsheetApp`, `Logger`). Verification is done in the Apps Script editor during setup (Task 6 / SETUP.md).

- [ ] **Step 1: Create `apps-script/CreateForm.gs`**

```js
// Run createMaddensForm() once in the Apps Script editor (script.google.com).
// It builds the Google Form from activities.json and logs everything you need
// to paste into config.js. Set ACTIVITIES_URL to your pushed raw file first.
const ACTIVITIES_URL = 'https://raw.githubusercontent.com/<USER>/maddens-2026/main/activities.json';

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
```

- [ ] **Step 2: Verify by inspection**

Confirm: name question added before category questions (so `entryIds[0]` is the name field); one checkbox item per category using `cat.items` labels; `formAction` derived by swapping `/viewform`→`/formResponse`; logged `ENTRY` block keys are `name` + the six category ids. No syntax errors (paren/brace balance). Runtime verification happens in Task 6 setup.

- [ ] **Step 3: Commit**

```bash
git add apps-script/CreateForm.gs
git commit -m "feat: Apps Script to generate the Google Form and print field IDs"
```

---

### Task 5: Apps Script — Summary tab (`Summary.gs`)

**Files:**
- Create: `apps-script/Summary.gs`

**Interfaces:**
- Consumes: the responses spreadsheet created by Task 4 (this script is bound to that Sheet). Response columns: `Timestamp`, `Your name`, then one column per category label.
- Produces: a `Summary` sheet: `Activity | Category | # Interested | Who`, sorted by count desc.

> Bound to the responses Sheet (Extensions ▸ Apps Script from the Sheet). Not runnable locally.

- [ ] **Step 1: Create `apps-script/Summary.gs`**

```js
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
```

- [ ] **Step 2: Verify by inspection**

Confirm: reads first sheet; finds `Your name` column; treats every other non-timestamp column as a category; splits cells on `', '`; de-dupes names per activity; sorts by count desc; writes 4 columns; `onFormSubmitTrigger` calls `buildSummary`. Depends on Global Constraint that labels contain no commas.

- [ ] **Step 3: Commit**

```bash
git add apps-script/Summary.gs
git commit -m "feat: Apps Script Summary tab tallying interest per activity"
```

---

### Task 6: Docs, `.nojekyll`, and end-to-end setup verification

**Files:**
- Create: `README.md`
- Create: `SETUP.md`
- Create: `.nojekyll`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: setup instructions; live site after the manual steps.

- [ ] **Step 1: Create `.nojekyll`**

Empty file (prevents GitHub Pages from running Jekyll):

```bash
touch .nojekyll
```

- [ ] **Step 2: Create `README.md`**

```markdown
# Madden's 2026 Trip Planner

A one-page site where our 12 travelers check the Madden's on Gull Lake activities they'd
like to do (Sat July 25 – Wed July 29, 2026). Picks flow into a Google Sheet so we can
find overlaps and build a schedule.

Static HTML/CSS/JS on GitHub Pages → a Google Form → a linked Google Sheet with an
auto-built **Summary** tab (activity → how many want it → who).

## Files

- `activities.json` — single source of truth (roster + categorized activities). Edit here.
- `index.html`, `styles.css`, `form.js` — the page.
- `config.js` — Google Form endpoint + field IDs (filled during setup).
- `apps-script/CreateForm.gs` — builds the Google Form from `activities.json`, prints field IDs.
- `apps-script/Summary.gs` — bound to the Sheet; rebuilds the Summary tab on each submit.
- `tools/validate-activities.mjs` — `node tools/validate-activities.mjs` to validate the data.

## Editing activities or the roster

Edit `activities.json`, run the validator, commit, push. If you change activity **labels**
or the roster, re-run `createMaddensForm()` and update `config.js` (labels are the Form's
checkbox options and must match exactly).

## Run locally

`python3 -m http.server 8765` → open <http://localhost:8765/>

See **SETUP.md** for the one-time Google + GitHub Pages setup.
```

- [ ] **Step 3: Create `SETUP.md`**

```markdown
# One-Time Setup

## 1. Push the repo
Create the GitHub repo `maddens-2026`, push `main`. In every file that contains the token
`<USER>` (`activities.json` → `meta.rawUrl`, `apps-script/CreateForm.gs` → `ACTIVITIES_URL`),
replace `<USER>` with your GitHub username. Commit and push so
`https://raw.githubusercontent.com/<USER>/maddens-2026/main/activities.json` loads in a browser.

## 2. Create the Google Form
1. Go to <https://script.google.com> → **New project**.
2. Paste the contents of `apps-script/CreateForm.gs`. Confirm `ACTIVITIES_URL` points at your raw file.
3. Run `createMaddensForm()`. Authorize when prompted.
4. Open **Execution log** (View ▸ Logs). Copy the logged `FORM_ACTION` and `ENTRY` block.

## 3. Fill in `config.js`
Paste `FORM_ACTION` and the `ENTRY` values into `config.js`. Commit and push.

## 4. Add the Summary tab
1. Open the **"Madden's 2026 Responses"** spreadsheet (link is in the execution log).
2. **Extensions ▸ Apps Script**. Paste `apps-script/Summary.gs`. Save.
3. Run `buildSummary()` once (authorize) — creates the empty Summary tab.
4. **Triggers** (clock icon) ▸ **Add Trigger**: function `onFormSubmitTrigger`,
   event source **From spreadsheet**, event type **On form submit**. Save.

## 5. Enable GitHub Pages
Repo **Settings ▸ Pages** ▸ Deploy from branch ▸ `main` / root. Wait for the URL:
`https://<user>.github.io/maddens-2026/`.

## 6. End-to-end test
1. Open the Pages URL. Pick a name, check a few boxes across categories, submit.
   Expect the green "Got it — thanks!" message.
2. Open the responses spreadsheet: **Form Responses 1** has your row; the **Summary** tab
   lists each checked activity with count `1` and your name.
3. Submit again as a different name; confirm counts increment and names accumulate.
4. Share the Pages URL with everyone.
```

- [ ] **Step 4: Final data verification**

Run: `node tools/validate-activities.mjs`
Expected: `OK: 12 people, 6 categories, 46 activities`.

- [ ] **Step 5: Commit**

```bash
git add README.md SETUP.md .nojekyll
git commit -m "docs: add README, SETUP, and .nojekyll for GitHub Pages"
```

---

## Notes for the executor

- Tasks 4 & 5 (Apps Script) cannot run in this environment; their verification is inspection here and manual execution in SETUP.md. Do not block on running them locally.
- The `<USER>` token is intentional and must survive until the human runs setup — do not invent a username.
- Keep `activities.json` labels comma-free and unique per category; the validator enforces this and both the Form and Summary depend on it.
