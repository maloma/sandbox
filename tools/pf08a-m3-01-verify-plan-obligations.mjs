import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const source = readFileSync('src/familypilot.html', 'utf8');
const root = readFileSync('index.html', 'utf8');
const domain = require('../familypilot-obligations.js');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(source === root, 'Canonical source and root artifact must be byte-identical');
assert(source.includes('<meta name="familypilot-package" content="plan-obligations-foundation-v1">'), 'M3 package marker missing');
assert(source.includes('<script src="./familypilot-obligations.js"></script>'), 'Obligations domain module is not loaded');
assert(!source.includes('Модуль будет подключён отдельным пакетом.'), 'Old Plan placeholder remains');
assert(source.includes('data-plan-module="obligations"'), 'Obligations Plan entry missing');
assert(source.includes('<strong>Долги</strong>') && source.includes('<strong>Накопления</strong>'), 'Honest future Plan entries missing');
assert(source.includes('id="obligationsScreen"'), 'Obligations screen missing');
assert(source.includes('id="obligationRuleModal"'), 'Obligation rule editor missing');
assert(source.includes('id="obligationDetailModal"'), 'Obligation detail route missing');
assert(source.includes('id="obligationPayModal"'), 'Obligation pay route missing');
assert(source.includes('id="obligationPostponeModal"'), 'Obligation postpone route missing');
assert(source.includes('obligationApi.normalizeState(state)'), 'Additive obligation-state normalization missing');
assert(source.includes('obligationApi.payOccurrence'), 'Linked payment path missing');
assert(source.includes("sourceModule:'obligations'") || readFileSync('familypilot-obligations.js','utf8').includes("sourceModule:'obligations'"), 'Operation source link missing');
assert(source.includes("<button class=\"nav active\" data-screen=\"home\"") && source.includes('data-screen="plans"') && source.includes('data-screen="more"'), 'Accepted bottom navigation changed unexpectedly');
assert(source.indexOf('data-screen="home"') < source.indexOf('data-screen="operations"'), 'Home/Operations navigation order changed');
assert(source.indexOf('data-screen="operations"') < source.indexOf('data-screen="plans"'), 'Operations/Plan navigation order changed');
assert(source.indexOf('data-screen="plans"') < source.indexOf('data-screen="more"'), 'Plan/More navigation order changed');
assert(source.includes('id="capitalRevealBtn"') && source.includes('<strong>Капитал</strong>'), 'Hidden Capital control regressed');
assert(source.includes('compact-analytics-states-v1'), 'A3 Analytics marker missing');
assert(typeof domain.normalizeState === 'function', 'Domain normalizeState API missing');
assert(typeof domain.createRule === 'function', 'Domain createRule API missing');
assert(typeof domain.payOccurrence === 'function', 'Domain payOccurrence API missing');
assert(typeof domain.postponeOccurrence === 'function', 'Domain postponeOccurrence API missing');
assert(typeof domain.skipOccurrence === 'function', 'Domain skipOccurrence API missing');

const inlineScripts = [...source.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
assert(inlineScripts.length === 1, `Expected one inline application script, found ${inlineScripts.length}`);
new Function(inlineScripts[0]);

console.log(JSON.stringify({
  status: 'PASS',
  sourceRootEqual: true,
  planHub: true,
  obligationsRoutes: true,
  oneFactLink: true,
  navigationUnchanged: true,
  hiddenCapitalPreserved: true,
  analyticsMarkerPreserved: true,
  inlineSyntax: 'PASS'
}, null, 2));
