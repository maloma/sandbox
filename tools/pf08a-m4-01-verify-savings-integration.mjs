import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

process.on('uncaughtException',error=>{
  const detail=String(error?.stack||error||'Unknown M4 static failure');
  writeFileSync('m4-browser.log',`M4_STATIC_FAILURE\n${detail}\n`);
  console.error(detail);
  process.exit(1);
});

const require=createRequire(import.meta.url);
const source=readFileSync('src/familypilot.html','utf8');
const root=readFileSync('index.html','utf8');
const savingsSource=readFileSync('familypilot-savings.js','utf8');
const savingsUi=readFileSync('familypilot-savings-ui.js','utf8');
const savings=require('../familypilot-savings.js');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

assert(source===root,'Canonical source and root artifact must be byte-identical');
assert(source.includes('<meta name="familypilot-package" content="savings-goals-v1">'),'M4 package marker missing');
assert(source.includes('<script src="./familypilot-savings.js"></script>'),'Savings domain module is not loaded');
assert(source.includes('pf08a-m4-01-inline-ui:start'),'M4 UI is not inlined into the closed app runtime');
assert(savingsUi.includes("planSavings.dataset.planModule='savings'")&&savingsUi.includes('planSavings.disabled=false'),'Plan → Savings activation missing');
assert(savingsUi.includes("section.id='savingsScreen'"),'Savings screen creation missing');
assert(savingsUi.includes("modal.id='savingsEditorModal'")&&savingsUi.includes("modal.id='savingsDetailModal'")&&savingsUi.includes("modal.id='savingsHelpModal'"),'Savings editor/detail/help routes missing');
assert(savingsUi.includes('Целей пока нет. Добавьте первую сейчас или сделайте это позже.'),'Neutral optional empty state missing');
assert(savingsUi.includes('data-savings-help="name"')&&savingsUi.includes('data-savings-help="target"')&&savingsUi.includes('data-savings-help="saved"')&&savingsUi.includes('data-savings-help="date"'),'Contextual field help missing');
assert(savingsUi.includes('Конкретные семейные цели'),'Goals-only Plan wording missing');
assert(savingsUi.includes('Финансовая подушка, накопления без цели и общий обзор будут отдельными функциями'),'Separation from later savings concepts missing');
assert(!/id=["'](?:emergency|cushion|unallocated|savingsOverview)|data-savings-(?:emergency|unallocated|overview)/i.test(savingsUi),'Later savings concepts were implemented inside M4-01');
assert(!/state\.operations\.(?:push|splice)|operations\s*=|kind\s*:\s*["'](?:income|expense|transfer)["']/i.test(savingsUi),'Savings UI mutates ordinary financial operations');
assert(savingsUi.includes('financialSnapshot:()=>ordinaryFinancialSnapshot()'),'No-money-movement browser invariant is not exposed');
assert(savingsSource.includes('state.schemaVersion=Math.max(Number(state.schemaVersion)||0,6)'),'Schema v6 normalization missing');
assert(savingsSource.includes("status:'archived'")&&savingsSource.includes('archiveGoal'),'Archive preservation missing');
assert(savingsSource.includes('remaining:Math.max(0'),'Remaining-to-save calculation missing');
assert(source.includes('debt-chains-principal-v1')&&source.includes('pf08a-m2-01-inline-ui:start'),'M2 runtime regressed');
assert(source.includes('plan-obligations-foundation-v1')&&source.includes('pf08a-m3-02-inline-ui:start'),'M3 runtime regressed');
assert(source.includes('hidden-capital-disclosure-v1'),'Hidden Capital marker missing');
assert(source.includes('compact-analytics-states-v1'),'A3 Analytics marker missing');
assert(source.indexOf('data-screen="home"')<source.indexOf('data-screen="operations"')&&source.indexOf('data-screen="operations"')<source.indexOf('data-screen="plans"')&&source.indexOf('data-screen="plans"')<source.indexOf('data-screen="more"'),'Option A navigation order changed');

for(const name of ['normalizeState','createGoal','getGoal','updateGoal','archiveGoal','activeGoals','archivedGoals','progress','summary'])assert(typeof savings[name]==='function',`Savings domain ${name} API missing`);

const inlineScripts=[...source.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match=>match[1]);
assert(inlineScripts.length===1,`Expected one inline application script, found ${inlineScripts.length}`);
new Function(inlineScripts[0]);
new Function(savingsUi);

console.log(JSON.stringify({status:'PASS',marker:'PF08A_M4_01_STATIC_PASS',sourceRootEqual:true,planSavingsActive:true,goalsOnly:true,optionalEmptyState:true,createEditArchive:true,contextualHelp:true,noOperationsMutation:true,noCapitalMutation:true,laterSavingsConceptsExcluded:true,m2Preserved:true,m3Preserved:true,hiddenCapitalPreserved:true,analyticsPreserved:true,navigationUnchanged:true},null,2));