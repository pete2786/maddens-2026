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
