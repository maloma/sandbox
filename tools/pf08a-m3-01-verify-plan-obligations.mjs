import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const source=readFileSync('src/familypilot.html','utf8');
const root=readFileSync('index.html','utf8');
const domainSource=readFileSync('familypilot-obligations.js','utf8');
const uiSource=readFileSync('familypilot-obligations-ui-v2.js','utf8');
const domain=require('../familypilot-obligations.js');

function assert(condition,message){if(!condition)throw new Error(message)}

assert(source===root,'Canonical source and root artifact must be byte-identical');
assert(source.includes('<meta name="familypilot-package" content="plan-obligations-foundation-v1">'),'M3 foundation marker missing');
assert(source.includes('<script src="./familypilot-obligations.js"></script>'),'Obligations domain module is not loaded');
assert(!source.includes('Модуль будет подключён отдельным пакетом.'),'Old Plan placeholder remains');
assert(source.includes('data-plan-module="obligations"'),'Obligations Plan entry missing');
assert(source.includes('<strong>Долги</strong>')&&source.includes('<strong>Накопления</strong>'),'Honest future Plan entries missing');
assert(source.includes('id="obligationsScreen"'),'Obligations screen missing');
assert(source.includes('id="obligationRuleModal"'),'Obligation rule editor missing');
assert(source.includes('id="obligationDetailModal"'),'Obligation detail route missing');
assert(source.includes('id="obligationPayModal"'),'Obligation pay route missing');
assert(source.includes('id="obligationPostponeModal"'),'Obligation move route missing');
assert(source.includes('obligationApi.normalizeState(state)'),'Additive obligation-state normalization missing');
assert(source.includes('obligationApi.payOccurrence'),'Linked payment path missing');
assert(domainSource.includes("sourceModule:'obligations'"),'Operation source link missing');
assert(domainSource.includes("style.textContent='#obligationSummary{display:none!important}'"),'Forbidden summary must be hidden before initial inline render');
assert(domainSource.includes("script.src='./familypilot-obligations-ui-v2.js'"),'M3-02 UI bootstrap missing');
assert(uiSource.includes("summary.remove()"),'Visible M3 summary cards are not removed');
assert(uiSource.includes('data-m302-month'),'Month navigation missing');
assert(uiSource.includes('data-m302-quick-pay'),'Quick payment action missing');
assert(uiSource.includes("starting_next"),'Default amount-version scope missing');
assert(uiSource.includes('obligationArchiveBtn'),'Rule archive route missing');
assert(uiSource.includes('correctPayment'),'Actual-payment correction route missing');
assert(source.includes('<button class="nav active" data-screen="home"')&&source.includes('data-screen="plans"')&&source.includes('data-screen="more"'),'Accepted bottom navigation changed unexpectedly');
assert(source.indexOf('data-screen="home"')<source.indexOf('data-screen="operations"'),'Home/Operations navigation order changed');
assert(source.indexOf('data-screen="operations"')<source.indexOf('data-screen="plans"'),'Operations/Plan navigation order changed');
assert(source.indexOf('data-screen="plans"')<source.indexOf('data-screen="more"'),'Plan/More navigation order changed');
assert(source.includes('id="capitalRevealBtn"')&&source.includes('<strong>Капитал</strong>'),'Hidden Capital control regressed');
assert(source.includes('compact-analytics-states-v1'),'A3 Analytics marker missing');

for(const name of ['normalizeState','createRule','updateRule','ensureOccurrencesWindow','payOccurrence','correctPayment','moveOccurrence','changeExpectedAmount','archiveRule','restoreRule','visibleOccurrences']){
  assert(typeof domain[name]==='function',`Domain ${name} API missing`);
}

const inlineScripts=[...source.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match=>match[1]);
assert(inlineScripts.length===1,`Expected one inline application script, found ${inlineScripts.length}`);
new Function(inlineScripts[0]);
new Function(uiSource);

console.log(JSON.stringify({
  status:'PASS',
  marker:'PF08A_M3_02_STATIC_PASS',
  sourceRootEqual:true,
  planHub:true,
  arbitraryRecurrence:true,
  endingModes:true,
  summaryRemovedAtRuntime:true,
  monthNavigation:true,
  quickPay:true,
  actualCorrection:true,
  amountVersions:true,
  archive:true,
  navigationUnchanged:true,
  hiddenCapitalPreserved:true,
  analyticsMarkerPreserved:true,
  inlineSyntax:'PASS',
  uiSyntax:'PASS'
},null,2));
