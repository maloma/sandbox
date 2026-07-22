import { readFileSync, writeFileSync } from 'node:fs';

const sourcePath = 'src/familypilot.html';
const indexPath = 'index.html';
const sourceScopePath = 'src/familypilot-scope.js';
const rootScopePath = 'familypilot-scope.js';
const sourceAnalyticsPath = 'src/familypilot-analytics-state.js';
const rootAnalyticsPath = 'familypilot-analytics-state.js';

const source = readFileSync(sourcePath, 'utf8');
const scopeModule = readFileSync(sourceScopePath, 'utf8');
const analyticsModule = readFileSync(sourceAnalyticsPath, 'utf8');

if (!source.includes('hidden-capital-disclosure-v1')) throw new Error('Hidden Capital disclosure marker is missing');
if (!source.includes('<script src="./familypilot-scope.js"></script>')) throw new Error('FamilyPilot scope module tag is missing');
if (!source.includes('<script src="./familypilot-analytics-state.js"></script>')) throw new Error('Analytics state module tag is missing');

writeFileSync(indexPath, source, 'utf8');
writeFileSync(rootScopePath, scopeModule, 'utf8');
writeFileSync(rootAnalyticsPath, analyticsModule, 'utf8');

console.log(JSON.stringify({
  status: 'PASS',
  html_artifacts: [sourcePath, indexPath],
  scope_artifacts: [sourceScopePath, rootScopePath],
  analytics_artifacts: [sourceAnalyticsPath, rootAnalyticsPath]
}, null, 2));
