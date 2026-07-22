import { readFileSync, writeFileSync } from 'node:fs';

const sourceFile = 'src/familypilot.html';
const publishedFile = 'index.html';
const uiFile = 'familypilot-obligations-ui-v2.js';
const startMarker = '/* pf08a-m3-02-inline-ui:start */';
const endMarker = '/* pf08a-m3-02-inline-ui:end */';
const anchor = '\nsyncCategoryVisualViewport();\nrenderAll();\n})();';

let html = readFileSync(sourceFile, 'utf8');
const ui = readFileSync(uiFile, 'utf8').trim();

if (!html.includes('plan-obligations-foundation-v1')) {
  throw new Error('Obligations package marker is missing');
}

const block = `${startMarker}\n${ui}\n${endMarker}`;
const start = html.indexOf(startMarker);
const end = html.indexOf(endMarker);

if (start >= 0 || end >= 0) {
  if (start < 0 || end < 0 || end < start) throw new Error('M3-02 inline UI markers are inconsistent');
  const after = end + endMarker.length;
  html = html.slice(0, start) + block + html.slice(after);
} else {
  const first = html.indexOf(anchor);
  if (first < 0) throw new Error('Canonical app finalization anchor is missing');
  if (html.indexOf(anchor, first + anchor.length) >= 0) throw new Error('Canonical app finalization anchor is not unique');
  html = html.slice(0, first) + `\n${block}\n` + html.slice(first);
}

writeFileSync(sourceFile, html);
writeFileSync(publishedFile, html);
console.log(JSON.stringify({
  status: 'PASS',
  sourceFile,
  publishedFile,
  uiFile,
  inlineUi: true,
  bytes: Buffer.byteLength(html)
}, null, 2));
