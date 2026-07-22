import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const sourcePath = 'src/familypilot.html';
const indexPath = 'index.html';
const scopePath = 'src/familypilot-scope.js';
const rootScopePath = 'familypilot-scope.js';
const analyticsPath = 'src/familypilot-analytics-state.js';
const rootAnalyticsPath = 'familypilot-analytics-state.js';

const source = readFileSync(sourcePath, 'utf8');
const index = readFileSync(indexPath, 'utf8');
const scope = readFileSync(scopePath, 'utf8');
const rootScope = readFileSync(rootScopePath, 'utf8');
const analytics = readFileSync(analyticsPath, 'utf8');
const rootAnalytics = readFileSync(rootAnalyticsPath, 'utf8');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const homeStart = source.indexOf('<section id="homeScreen"');
const balanceStart = source.indexOf('<section class="card balance">', homeStart);
assert(homeStart >= 0 && balanceStart > homeStart, 'Main Capital disclosure boundary missing');
const capitalMain = source.slice(homeStart, balanceStart);

const requiredTokens = [
  '<meta name="familypilot-package" content="hidden-capital-disclosure-v1">',
  '<button id="capitalRevealBtn" class="card capital-launch" type="button" aria-haspopup="dialog" aria-controls="capitalInfo" aria-label="Открыть капитал"><strong>Капитал</strong></button>',
  '.capital-launch::after{content:"›"',
  '<div id="capitalInfo" class="overlay"><div class="panel"><div class="panel-head"><h2>Капитал</h2>',
  'class="capital-detail-summary"',
  'class="capital-detail-value"',
  'function renderCapital(){const descriptor=scopeDescriptor()',
  'function openCapitalInfo(){const descriptor=scopeDescriptor(),snapshot=scopedCapitalSnapshot()',
  "$('capitalRevealBtn').onclick=openCapitalInfo;"
];
for (const token of requiredTokens) assert(source.includes(token), `required hidden Capital token missing: ${token}`);

const forbiddenMainTokens = [
  'id="capitalValue"',
  'id="capitalChange"',
  'id="capitalStartDate"',
  'id="capitalEndDate"',
  'id="capitalScopeLabel"',
  'id="capitalTitleText"',
  'id="capitalInfoBtn"',
  'class="spark"',
  'class="capital-value"',
  'class="capital-change"'
];
for (const token of forbiddenMainTokens) assert(!capitalMain.includes(token), `Capital value leaked on Main: ${token}`);

assert(!source.includes("$('capitalValue')"), 'old Main Capital value renderer remains');
assert(!source.includes("$('capitalChange')"), 'old Main Capital change renderer remains');
assert(!source.includes("$('capitalScopeLabel')"), 'old Main Capital scope label renderer remains');
assert(!source.includes("$('capitalTitleText')"), 'old Main Capital title renderer remains');
assert(!source.includes("$('capitalInfoBtn')"), 'old Capital info button binding remains');
assert(!capitalMain.includes('Личный кошелёк'), 'personal wallet name must not be present in Main Capital markup');
assert(!capitalMain.includes('0 €'), 'placeholder Capital value must not be present in Main markup');

assert(source === index, 'index.html must be byte-identical to src/familypilot.html');
assert(scope === rootScope, 'scope modules must be byte-identical');
assert(analytics === rootAnalytics, 'Analytics modules must be byte-identical');
assert(!index.includes("fetch('./src/familypilot.html"), 'old root fetch loader returned');
assert(!index.includes('document.write(source)'), 'old root document.write loader returned');

const inlineScripts = [...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(match => match[1].trim())
  .filter(Boolean);
assert(inlineScripts.length === 1, `expected one inline application script, found ${inlineScripts.length}`);
new vm.Script(inlineScripts[0], { filename: sourcePath });
new vm.Script(scope, { filename: scopePath });
new vm.Script(analytics, { filename: analyticsPath });

execFileSync(process.execPath, ['tools/pf08a-a3-01-verify-compact-analytics-states.mjs'], { stdio: 'inherit' });

console.log(JSON.stringify({
  status: 'PASS',
  main_capital_text: 'Капитал',
  main_capital_values_exposed: false,
  disclosure_surface: 'capitalInfo',
  source_sha256: sha256(source),
  scope_sha256: sha256(scope),
  analytics_sha256: sha256(analytics),
  syntax_validation: 'PASS',
  compact_analytics_regression: 'PASS'
}, null, 2));
