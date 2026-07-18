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
