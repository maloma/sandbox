import { readFileSync, writeFileSync } from 'node:fs';

const sourceFile = 'src/familypilot.html';
const publishedFile = 'index.html';
const html = readFileSync(sourceFile, 'utf8');

if (!html.includes('plan-obligations-foundation-v1')) {
  throw new Error('Obligations package marker is missing');
}

writeFileSync(publishedFile, html);
console.log(JSON.stringify({ status: 'PASS', sourceFile, publishedFile, bytes: Buffer.byteLength(html) }, null, 2));
