import { readFileSync, writeFileSync } from 'node:fs';

const path = 'tools/pf08a-m3-01-browser-smoke.mjs';
let source = readFileSync(path, 'utf8');
const before = '    api.openPlan();';
const after = '    api.obligations.openPlan();';

if (source.includes(after)) {
  console.log(JSON.stringify({ status: 'SKIPPED', reason: 'browser test API route already corrected' }, null, 2));
  process.exit(0);
}

const first = source.indexOf(before);
if (first < 0) throw new Error('M3 browser test API correction anchor missing');
if (source.indexOf(before, first + before.length) >= 0) throw new Error('M3 browser test API correction anchor is not unique');

source = source.slice(0, first) + after + source.slice(first + before.length);
writeFileSync(path, source);
console.log(JSON.stringify({ status: 'APPLIED', correction: 'api.obligations.openPlan' }, null, 2));
