import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

process.on('uncaughtException',error=>{
  const detail=String(error?.stack||error||'Unknown M2 static failure');
  writeFileSync('m2-browser.log',`M2_STATIC_FAILURE\n${detail}\n`);
  console.error(detail);
  process.exit(1);
});

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
assert(source.includes('id="homeDebtReceivableValue"')&&source.includes('id="homeDebtLiabilityValue"'),'Stable source-derived Home debt mount missing');
assert(source.includes('data-debt-filter="receivable"')&&source.includes('data-debt-filter="liability"'),'Home debt routes missing');
assert(!source.includes('>180 €</strong>')&&!source.includes('>420 €</strong>'),'Fabricated Home debt fixtures remain');
assert(debtUi.includes("section.id='debtsScreen'"),'Debts screen creation missing');
assert(debtUi.includes("modal.id='debtEntryModal'")&&debtUi.includes("modal.id='debtChainModal'"),'Debt editor/detail routes missing');
assert(debtUi.includes("planDebt.dataset.planModule='debts'")&&debtUi.includes("planDebt.disabled=false"),'Plan → Debts activation missing');
assert(debtUi.includes('data-debt-action="borrow"')&&debtUi.includes('data-debt-action="repay"')&&debtUi.includes('data-debt-action="lend"')&&debtUi.includes('data-debt-action="receive"'),'Four debt actions missing');
assert(debtUi.includes('data-debt-action="opening_liability"')&&debtUi.includes('data-debt-action="opening_receivable"'),'Historical opening actions missing');
assert(!/Additional amount above principal|data-debt-overpayment-choice\s*=|<label[^>]*>[^<]*(Interest|Gift|Процент|Подар|Комисс)/i.test(debtUi),'Superseded debt-entry field or overpayment controls exist in UI markup');
assert(debtSource.includes("derivedKind:'reciprocal'"),'Automatic reciprocal debt derivation missing');
assert(debtSource.includes("derivedKind:'offset'"),'Mutual offset derivation missing');
assert(debtSource.includes("derivedKind:'closed'"),'Debt-closed event missing');
assert(debtSource.includes("return'debt_inflow'")&&debtSource.includes("return'debt_outflow'"),'Debt principal movement kinds missing');
assert(/operation\?\.kind\s*===\s*['"]debt_inflow['"]/.test(scopeSource)&&/operation\?\.kind\s*===\s*['"]debt_outflow['"]/.test(scopeSource),'Capital does not include debt principal movements');
assert(debtUi.includes("operation.kind==='income'||operation.kind==='expense'"),'Analytics does not explicitly exclude debt principal movements');
assert(debtUi.includes('debtApi.closeChain')&&debtUi.includes('debtApi.keepChainOpen'),'Zero-balance close/keep-open choice missing');
assert(debtUi.includes("chain?.status==='closed'"),'Closed-chain read-only guard missing');
assert(source.includes('plan-obligations-foundation-v1')&&source.includes('pf08a-m3-02-inline-ui:start'),'M3 runtime regressed');
assert(source.includes('hidden-capital-disclosure-v1'),'Hidden Capital marker missing');
assert(source.includes('compact-analytics-states-v1'),'A3 Analytics marker missing');
assert(source.indexOf('data-screen="home"')<source.indexOf('data-screen="operations"')&&source.indexOf('data-screen="operations"')<source.indexOf('data-screen="plans"')&&source.indexOf('data-screen="plans"')<source.indexOf('data-screen="more"'),'Option A navigation order changed');

for(const name of ['normalizeState','createSourceEvent','updateSourceEvent','recalculateChain','closeChain','keepChainOpen','visibleChains','chainHistory','scopeTotals','scopePlanning','setChainExpectedDueAt'])assert(typeof debt[name]==='function',`Debt domain ${name} API missing`);

function verifyDebtPlanning(){
  const AT=new Date(2026,0,31,12,0,0,0).getTime();
  const state={schemaVersion:5,currentMemberId:'member-anna',activeWalletId:'wallet-household-main',wallets:[{id:'wallet-household-main',type:'household_default',name:'Семейный кошелёк',nativeCurrency:'EUR',archivedAt:null}],operations:[],debtCounterparties:[],debtChains:[],debtEvents:[]};
  debt.normalizeState(state,AT);
  const allowed=new Set(['wallet-household-main']);
  const due=(year,month,day)=>new Date(year,month-1,day,12,0,0,0).getTime();
  const ids={};
  const add=(key,action,amount,expectedDueAt)=>{
    const result=debt.createSourceEvent(state,{counterpartyName:key,counterpartyKind:'person',action,amount,scopeWalletId:'wallet-household-main',currency:'EUR',occurredAt:AT-1000},'member-anna',AT-500);
    assert(result.ok,`Fixture ${key} could not be created: ${result.error||'unknown error'}`);
    ids[key]=result.chain.id;
    if(expectedDueAt!==undefined){const set=debt.setChainExpectedDueAt(state,result.chain.id,expectedDueAt,'member-anna',AT);assert(set.ok,`Fixture ${key} due date could not be set`)}
    return result.chain.id;
  };
  add('R14','opening_receivable',101,due(2026,2,7));add('L14','opening_liability',51,due(2026,2,7));
  add('R1M','opening_receivable',102,due(2026,2,20));add('L1M','opening_liability',52,due(2026,2,20));
  add('R3M','opening_receivable',103,due(2026,4,1));add('L3M','opening_liability',53,due(2026,4,1));
  add('R1Y','opening_receivable',104,due(2026,9,1));add('L1Y','opening_liability',54,due(2026,9,1));
  add('ROVER','opening_receivable',105,due(2026,1,30));add('LOVER','opening_liability',55,due(2026,1,30));
  add('RNONE','opening_receivable',106);add('LNONE','opening_liability',56);
  const zeroId=add('ZERO','opening_receivable',10,due(2026,2,7));
  let chain=state.debtChains.find(item=>item.id===zeroId);let result=debt.createSourceEvent(state,{counterpartyId:chain.counterpartyId,action:'receive',amount:10,scopeWalletId:'wallet-household-main',walletId:'wallet-household-main',currency:'EUR',occurredAt:AT},'member-anna',AT+1);assert(result.ok&&result.zero,'ZERO fixture did not reach zero');
  const closedId=add('CLOSED','opening_receivable',12,due(2026,2,7));
  chain=state.debtChains.find(item=>item.id===closedId);result=debt.createSourceEvent(state,{counterpartyId:chain.counterpartyId,action:'receive',amount:12,scopeWalletId:'wallet-household-main',walletId:'wallet-household-main',currency:'EUR',occurredAt:AT},'member-anna',AT+2);assert(result.ok&&result.zero,'CLOSED fixture did not reach zero');const closed=debt.closeChain(state,closedId,'member-anna',AT+3);assert(closed.ok&&closed.chain.status==='closed','CLOSED fixture did not close');
  const setOf=group=>new Set(group.chains.map(item=>item.id)),has=(group,key)=>setOf(group).has(ids[key]);
  const p14=debt.scopePlanning(state,allowed,{horizon:'14d',at:AT}),p1m=debt.scopePlanning(state,allowed,{horizon:'1m',at:AT}),p3m=debt.scopePlanning(state,allowed,{horizon:'3m',at:AT}),p1y=debt.scopePlanning(state,allowed,{horizon:'1y',at:AT});
  for(const key of ['R14','L14'])assert(has(p14.dueInPeriod,key),`${key} missing from 14d horizon`);for(const key of ['R1M','L1M','R3M','L3M','R1Y','L1Y'])assert(!has(p14.dueInPeriod,key),`${key} leaked into 14d horizon`);
  for(const key of ['R14','L14','R1M','L1M'])assert(has(p1m.dueInPeriod,key),`${key} missing from 1m horizon`);for(const key of ['R3M','L3M','R1Y','L1Y'])assert(!has(p1m.dueInPeriod,key),`${key} leaked into 1m horizon`);
  for(const key of ['R14','L14','R1M','L1M','R3M','L3M'])assert(has(p3m.dueInPeriod,key),`${key} missing from 3m horizon`);for(const key of ['R1Y','L1Y'])assert(!has(p3m.dueInPeriod,key),`${key} leaked into 3m horizon`);
  for(const key of ['R14','L14','R1M','L1M','R3M','L3M','R1Y','L1Y'])assert(has(p1y.dueInPeriod,key),`${key} missing from 1y horizon`);
  for(const planning of [p14,p1m,p3m,p1y]){assert(has(planning.overdue,'ROVER')&&has(planning.overdue,'LOVER'),'Overdue receivable/liability not separated');assert(has(planning.noDueDate,'RNONE')&&has(planning.noDueDate,'LNONE'),'No-date receivable/liability not separated');for(const excluded of [zeroId,closedId])for(const group of [planning.overdue,planning.dueInPeriod,planning.noDueDate])assert(!group.chains.some(item=>item.id===excluded),'Zero/closed chain leaked into planning')}
  const totals=debt.scopeTotals(state,allowed),planningTotals=debt.scopePlanning(state,allowed,{horizon:'1y',at:AT});assert(totals.receivable===621&&totals.liability===321&&totals.net===300,'Canonical debt totals fixture changed unexpectedly');assert(planningTotals.receivable===totals.receivable&&planningTotals.liability===totals.liability&&planningTotals.net===totals.net,'Planning totals diverge from canonical scopeTotals');
  const noDateChain=state.debtChains.find(item=>item.id===ids.RNONE);assert(noDateChain.expectedDueAt===null,'Missing explicit date was inferred');
  const cleared=debt.setChainExpectedDueAt(state,ids.R14,null,'member-anna',AT+4);assert(cleared.ok&&cleared.chain.expectedDueAt===null,'Clearing expected date failed');const afterClear=debt.scopePlanning(state,allowed,{horizon:'14d',at:AT});assert(has(afterClear.noDueDate,'R14')&&!has(afterClear.dueInPeriod,'R14'),'Cleared date did not move chain to noDueDate');
  const labels={borrow:'Мне дали',repay:'Я вернул',lend:'Я дал',receive:'Мне вернули'};for(const [action,label] of Object.entries(labels)){assert(debt.actionLabel(action)===label,`Domain action label mismatch for ${action}`);assert(debtUi.includes(`data-debt-action="${action}">${label}</button>`),`UI action label mismatch for ${action}`)}assert(!debtUi.includes('Я занял')&&!debtUi.includes('Я одолжил'),'Superseded debt action wording remains');
  for(const marker of ['debtPlanningHorizon','debtOverdueList','debtDueInPeriodList','debtNoDueDateList','debtExpectedDueAt'])assert(debtUi.includes(marker),`Debt planning UI marker missing: ${marker}`);assert(debtUi.includes('debtApi.scopePlanning')&&debtUi.includes('debtApi.setChainExpectedDueAt'),'Debt planning UI bypasses canonical domain APIs');
  return{status:'PASS',marker:'FP_DEBT_PLAN_01_PASS',horizons:['14d','1m','3m','1y'],canonicalTotals:totals,closedExcluded:true,zeroExcluded:true,noDateExplicitOnly:true,labelsExact:true};
}

const debtPlanning=verifyDebtPlanning();
const inlineScripts=[...source.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match=>match[1]);
assert(inlineScripts.length===1,`Expected one inline application script, found ${inlineScripts.length}`);
new Function(inlineScripts[0]);new Function(debtUi);

console.log(JSON.stringify({status:'PASS',marker:'PF08A_M2_01_STATIC_PASS',sourceRootEqual:true,stableHomeMount:true,homeFixturesRemoved:true,planDebtsRoute:true,dynamicDebtRoutesVerifiedFromUiSource:true,historicalOpening:true,fourActions:true,principalMovementKinds:true,capitalIncludesPrincipal:true,analyticsExcludesPrincipal:true,automaticReciprocalDebt:true,mutualOffset:true,sourceEditing:true,closedChainImmutable:true,supersededUiAbsent:true,m3Preserved:true,hiddenCapitalPreserved:true,analyticsPreserved:true,navigationUnchanged:true,debtPlanning},null,2));
