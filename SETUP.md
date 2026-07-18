# One-Time Setup

## 1. Push the repo — DONE (via `gh`)
Repo: <https://github.com/pete2786/maddens-2026> (public). The `<USER>` token is already set
to `pete2786` in `activities.json` (`meta.rawUrl`) and `apps-script/CreateForm.gs`
(`ACTIVITIES_URL`). The raw file loads at
<https://raw.githubusercontent.com/pete2786/maddens-2026/main/activities.json>.

## 2. Create the Google Form  ← your first manual step
1. Go to <https://script.google.com> → **New project**.
2. Paste the contents of `apps-script/CreateForm.gs`. `ACTIVITIES_URL` is already set.
3. Run `createMaddensForm()`. Authorize when prompted.
4. Open **Execution log** (View ▸ Logs). Copy the logged `FORM_ACTION` and `ENTRY` block.

## 3. Fill in `config.js`
Paste `FORM_ACTION` and the `ENTRY` values into `config.js`. Commit and push
(`git push` — the repo is already wired to `pete2786/maddens-2026`).

## 4. Add the Summary tab
1. Open the **"Madden's 2026 Responses"** spreadsheet (link is in the execution log).
2. **Extensions ▸ Apps Script**. Paste `apps-script/Summary.gs`. Save.
3. Run `buildSummary()` once (authorize) — creates the empty Summary tab.
4. **Triggers** (clock icon) ▸ **Add Trigger**: function `onFormSubmitTrigger`,
   event source **From spreadsheet**, event type **On form submit**. Save.

## 5. Enable GitHub Pages — DONE (via `gh`)
Pages is set to deploy from `main` / root. Live at
<https://pete2786.github.io/maddens-2026/> (allow a minute or two for the first build).

## 6. End-to-end test
1. Open <https://pete2786.github.io/maddens-2026/>. Pick a name, check a few boxes across
   categories, submit. Expect the green "Got it — thanks!" message.
2. Open the responses spreadsheet: **Form Responses 1** has your row; the **Summary** tab
   lists each checked activity with count `1` and your name.
3. Submit again as a different name; confirm counts increment and names accumulate.
4. Share <https://pete2786.github.io/maddens-2026/> with everyone.
