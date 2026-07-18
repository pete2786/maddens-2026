# Maddens 2026 Trip Planner — Design

**Date:** 2026-07-17
**Status:** Approved (design), pending implementation plan

## Goal

Collect what each of 12 people wants to do on a family trip to Madden's on Gull Lake
(Brainerd, MN), **Sat July 25 → Wed July 29, 2026** (leaving early Wed), into a Google
Sheet so the organizers can spot overlapping interests and hand-build a schedule.

Three families, 12 people, 5 kids:

- **Peterson:** David (adult), Megan (adult), Artie (kid, 11), Matilda (kid, 8), Harald (kid, 8)
- **Udell:** Brian (adult), Erin (adult), Evie (kid, 14), Sebastian (kid, 11)
- **Hanrahan:** Curt (adult), Sue (adult), Tim (adult)

> Note: "Tim" was written as "Time" in the source message; treated as Tim. Easily
> corrected in the roster if wrong — it appears only in `activities.json` roster + the
> Google Form's Name dropdown.

## Design decisions (from brainstorming)

- **Respondent:** each of the 12 people submits individually; each tagged to a family.
- **Interest scale:** simple checkbox — "I'd like to do this." No rating, no ranking.
- **Timing:** collect WHAT only. Scheduling is done by hand later; no per-timeslot input.
- **Identity:** dropdown of the 12 names (clean data, easy overlap matching).
- **Activity scope:** everything — scheduled/paid activities + drop-in amenities
  (pools, beach, arcade) + off-site (Cuyuna MTB, zip-line, e-bikes) — grouped by category.
- **Results view:** none custom-built. Organizers read overlap in the Google Sheet, aided
  by a script-generated Summary tab and the Google Form's built-in response charts.
- **Submit path:** custom page POSTs to a **Google Form** (matches the world-cup-26 repo
  pattern; the Form's Responses view gives free per-question bar charts).

## Architecture

Static site on **GitHub Pages** (no build step), same spirit as the sibling `world-cup-26`
repo but simpler (no results front-end, no bracket logic).

```
maddens-2026/
  index.html        # styled form: name dropdown + categorized activity checklists
  form.js           # fetches activities.json, renders checklists, POSTs to Google Form
  config.js         # formResponse URL + entry.XXXX field IDs (pasted after setup)
  activities.json   # SINGLE source of truth: roster + categories + items (price, age flag)
  styles.css        # world-cup-inspired styling
  apps-script/
    CreateForm.gs    # builds the Google Form from activities.json, logs formResponse URL + entry IDs
    Summary.gs       # onFormSubmit trigger → rebuilds "Summary" tab (count + names per activity)
  README.md
  SETUP.md
  .nojekyll
```

### Single source of truth

`activities.json` is authoritative. It contains:

- `roster`: the 12 names, each with `family` and `kid: true|false`.
- `categories`: ordered list, each with `id`, `label`, and `items[]`.
- Each item: `label` (exact string used as the Google Form checkbox option — must match
  exactly or Google rejects the submission), optional `price` (display string, e.g. "$20"),
  optional `age` (`"kid"` | `"21+"` | omitted), optional `note`.

Both consumers read the same file:

- The **web page** fetches `activities.json` at runtime to render the checklists.
- **CreateForm.gs** fetches the *same* file from its raw GitHub URL when building the Form,
  so the Form's checkbox options and the page's checkboxes can never drift apart.

### Data flow

1. Organizer authors `activities.json`, commits, pushes → file is live on GitHub Pages / raw GitHub.
2. `CreateForm.gs` (run once) fetches `activities.json`, creates a Google Form:
   - Question 1: **Name** — dropdown (required), the 12 roster names.
   - One **checkbox question per category** (Water, Land/Sport, Kids/Family, Evening,
     Wellness, Off-site), options = that category's item labels.
   - Creates/links a responses Google Sheet.
   - Logs the `formResponse` POST URL and every `entry.XXXX` field ID.
3. Organizer pastes the URL + IDs into `config.js` (maps: name field → entry ID;
   each category id → entry ID).
4. GitHub Pages page renders categories/checkboxes from `activities.json` and POSTs the
   selections to the Google Form's `formResponse` endpoint (submit style mirrors
   world-cup-26 `shared/submit.js`: hidden form / `fetch` with `no-cors`).
5. Responses land in the linked Sheet. `Summary.gs` runs on each submit and rebuilds a
   **Summary** tab: one row per activity → count of interested people + comma-joined names,
   sorted by count so the biggest overlaps float to the top.

### Reading overlap (three free views)

- **Summary tab** — activity × count × who, sorted by popularity. Primary scheduling aid.
- **Google Form Responses view** — built-in bar chart per checkbox question.
- **Raw responses sheet** — one row per person, full detail.

## Activity set (~40 items)

Authored into `activities.json`. Drop-in amenities and off-site adventures included per the
scope decision. Prices from the 2026 sample agenda where known (they are a guide, not a
guarantee). Age flags: `kid` = specifically kid-oriented; `21+` = adults only.

- **Water:** pontoon cruise ($20), banana taxi tubing ($5), waterskiing lessons, boat
  tubing, kayak/paddleboard/hydrobike rental, inflatable water park, self fishing,
  guided fishing (Walleye Dan), swimming pools, beach & hot tub, motorized boat rental
- **Land/Sport:** archery ($20), trap shooting ($75), axe throwing, bucket golf ($20),
  lawn bowling ($20), croquet ($10), pickleball, tennis, championship golf, Social 9
  family scramble, putting contest, resort lawn games, hiking/biking (resort bikes)
- **Kids/Family:** Build-A-Buddy ($25, kid), junior golf (kid), medallion hunt,
  photo scavenger hunt, tie dye ($15), scratch art, pickleball paddle craft ($25),
  arcade / game room, bingo ($1/card)
- **Evening:** trivia, glow golf ($15), karaoke (21+), live entertainment (21+),
  bonfire & s'mores, lakeside happy hour
- **Wellness:** yoga ($15), beach boot camp ($20), spa services, fitness room
- **Off-site (Brainerd area):** Cuyuna mountain biking, zip-lining, e-bike rental (Jac's)

> The 2026 agenda is a day-of-week *sample*; exact times will differ. Activities are
> presented as a "what interests you" checklist, not a fixed schedule.

## Setup (one-time — detailed in SETUP.md)

1. Push the repo so `activities.json` is reachable at its raw GitHub URL.
2. Create a Google Apps Script project; paste `CreateForm.gs` + `Summary.gs`; set the
   raw `activities.json` URL constant.
3. Run `CreateForm.gs` → note the logged `formResponse` URL and `entry.XXXX` IDs.
4. Paste the URL + IDs into `config.js`; commit & push.
5. In the linked Sheet's Apps Script, add an **onFormSubmit** installable trigger for
   `Summary`; run once to seed the Summary tab.
6. Enable **GitHub Pages** (deploy from branch). Page live at
   `https://<user>.github.io/maddens-2026/`.
7. Share the page link with the 12 people.

## Out of scope (YAGNI)

- No custom live results webpage (Sheet + Form charts suffice).
- No automatic scheduling engine and no per-timeslot preference capture.
- No authentication or per-person editing — dropdown name is trust-based; a person can
  resubmit and organizers keep the latest / de-dupe by hand if needed.
- No off-site booking integration; off-site items are interest signals only.

## Testing / verification

- `activities.json` is valid JSON and every item `label` is unique within its category.
- Page renders all categories and checkboxes locally (`python3 -m http.server`).
- A test submission from the page lands a row in the responses Sheet with the correct
  columns, and the Summary tab reflects it.
- Age-gated items (kid / 21+) render with the expected label/badge.
