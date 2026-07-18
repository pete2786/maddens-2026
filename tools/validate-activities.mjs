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
