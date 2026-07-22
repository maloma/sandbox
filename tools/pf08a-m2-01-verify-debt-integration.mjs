import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const source=readFileSync('src/familypilot.html','utf8');
const root=readFileSync('index.html','utf8');
const debtSource=readFileSync('familypilot-debts.js','utf8');
const debtUi=readFileSync('familypilot-debts-ui.js','utf8');
const scopeSource=readFileSync('familypilot-scope.js','utf8');
const debt=require('../familypilot-debts.js');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

assert(source===root,'Canonical source and root artifact must be byte-identical');
assert(source.includes('<meta name="familypilot-package" content="debt-chains-principal-v1">'),'M2 package marker missing');
assert(source.includes('<script src="./familypilot-debts.js"></script>'),'Debt domain module is not loaded');
assert(source.includes('pf08a-m2-01-inline-ui:start'),'M2 UI is not inlined into the closed app runtime');
assert(source.includes('data-plan-module="debts"'),'Plan → Debts route missing');
assert(source.includes('id="debtsScreen"'),'Debts screen missing');
assert(source.includes('id="homeDebtReceivableValue"')&&source.includes('id="homeDebtLiabilityValue"'),'Source-derived Home debt totals missing');
assert(source.includes('id="debtEntryModal"')&&source.includes('id="debtChainModal"'),'Debt editor/detail routes missing');
assert(source.includes('data-debt-action="borrow"')&&source.includes('data-debt-action="repay"')&&source.includes('data-debt-action="lend"')&&source.includes('data-debt-action="receive"'),'Four debt actions missing');
assert(source.includes('data-debt-action="opening_liability"')&&source.includes('data-debt-action="opening_receivable"'),'Historical opening actions missing');
assert(!/Interest\s*\/\s*gift|Additional amount above principal|data-debt-overpayment-choice/i.test(source),'Superseded debt UI returned');
assert(!/Interest\s*\/\s*gift|Additional amount above principal|data-debt-overpayment-choice/i.test(debtUi),'Superseded debt UI exists in source module');
assert(debtSource.includes("derivedKind:'reciprocal'"),'Automatic reciprocal debt derivation missing');
assert(debtSource.includes("derivedKind:'offset'"),'Mutual offset derivation missing');
assert(debtSource.includes("derivedKind:'closed'"),'Debt-closed event missing');
assert(debtSource.includes("kind:'debt_inflow'")||debtSource.includes("return'debt_inflow'"),'Debt inflow movement missing');
assert(debtSource.includes("return'debt_outflow'"),'Debt outflow movement missing');
assert(scopeSource.includes("operation?.kind === 'debt_inflow'")&&scopeSource.includes("operation?.kind === 'debt_outflow'"),'Capital does not include debt principal movements');
assert(debtUi.includes("operation.kind==='income'||operation.kind==='expense'"),'Analytics does not explicitly exclude debt principal movements');
assert(debtUi.includes('debtApi.closeChain')&&debtUi.includes('debtApi.keepChainOpen'),'Zero-balance close/keep-open choice missing');
assert(debtUi.includes("chain?.status==='closed'"),'Closed-chain read-only guard missing');
assert(source.includes('plan-obligations-foundation-v1')&&source.includes('pf08a-m3-02-inline-ui:start'),'M3 runtime regressed');
assert(source.includes('hidden-capital-disclosure-v1'),'Hidden Capital marker missing');
assert(source.includes('compact-analytics-states-v1'),'A3 Analytics marker missing');
assert(source.indexOf('data-screen="home"')<source.indexOf('data-screen="operations"')&&source.indexOf('data-screen="operations"')<source.indexOf('data-screen="plans"')&&source.indexOf('data-screen="plans"')<source.indexOf('data-screen="more"'),'Option A navigation order changed');

for(const name of ['normalizeState','createSourceEvent','updateSourceEvent','recalculateChain','closeChain','keepChainOpen','visibleChains','chainHistory','scopeTotals'])assert(typeof debt[name]==='function',`Debt domain ${name} API missing`);

const inlineScripts=[...source.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match=>match[1]);
assert(inlineScripts.length===1,`Expected one inline application script, found ${inlineScripts.length}`);
new Function(inlineScripts[0]);new Function(debtUi);

console.log(JSON.stringify({status:'PASS',marker:'PF08A_M2_01_STATIC_PASS',sourceRootEqual:true,planDebtsRoute:true,homeTotalsSourceDerived:true,historicalOpening:true,fourActions:true,principalMovementKinds:true,capitalIncludesPrincipal:true,analyticsExcludesPrincipal:true,automaticReciprocalDebt:true,mutualOffset:true,sourceEditing:true,closedChainImmutable:true,supersededUiAbsent:true,m3Preserved:true,hiddenCapitalPreserved:true,analyticsPreserved:true,navigationUnchanged:true},null,2));
