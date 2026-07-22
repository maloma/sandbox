import { readFileSync, writeFileSync } from 'node:fs';

const sourcePath = 'src/familypilot.html';
const indexPath = 'index.html';
const sourceScopePath = 'src/familypilot-scope.js';
const rootScopePath = 'familypilot-scope.js';

let source = readFileSync(sourcePath, 'utf8');
const oldTag = '<script src="./src/familypilot-scope.js"></script>';
const finalTag = '<script src="./familypilot-scope.js"></script>';

if (!source.includes(finalTag)) {
  const count = source.split(oldTag).length - 1;
  if (count !== 1) throw new Error(`scope script path: expected one old tag, found ${count}`);
  source = source.replace(oldTag, finalTag);
}

const scopeModule = readFileSync(sourceScopePath, 'utf8');
writeFileSync(sourcePath, source, 'utf8');
writeFileSync(indexPath, source, 'utf8');
writeFileSync(rootScopePath, scopeModule, 'utf8');

console.log(JSON.stringify({
  status: 'PASS',
  html_artifacts: [sourcePath, indexPath],
  scope_artifacts: [sourceScopePath, rootScopePath],
  scope_script: './familypilot-scope.js'
}, null, 2));
