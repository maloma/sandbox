import { readFileSync, writeFileSync } from 'node:fs';

const path='tools/pf08a-m3-01-browser-smoke.mjs';
let source=readFileSync(path,'utf8');
const corrections=[];

const legacyApi='    api.openPlan();';
const currentApi='    api.obligations.openPlan();';
if(!source.includes('PF08A_M3_02_BROWSER_PASS')){
  if(source.includes(legacyApi)){
    if(source.indexOf(legacyApi)!==source.lastIndexOf(legacyApi))throw new Error('M3 browser test API correction anchor is not unique');
    source=source.replace(legacyApi,currentApi);
    corrections.push('api.obligations.openPlan');
  }else if(!source.includes(currentApi))throw new Error('M3 browser test API correction anchor missing');
}

const originalPlan="    assert(doc.querySelectorAll('#plansScreen .plan-module[disabled]').length===2,'Debts and Savings must remain honest unavailable entries');";
const m2Plan="    const debtPlanModule=doc.querySelector('[data-plan-module=\"debts\"]');assert(debtPlanModule&&!debtPlanModule.disabled,'Debts must remain active after M2 integration');assert(doc.querySelectorAll('#plansScreen .plan-module[disabled]').length===1,'Only Savings must remain unavailable after M2 integration');";
const m4Plan="    const debtPlanModule=doc.querySelector('[data-plan-module=\"debts\"]'),savingsPlanModule=doc.querySelector('[data-plan-module=\"savings\"]');assert(debtPlanModule&&!debtPlanModule.disabled,'Debts must remain active after M2 integration');assert(savingsPlanModule&&!savingsPlanModule.disabled,'Savings must remain active after M4 integration');assert(doc.querySelectorAll('#plansScreen .plan-module[disabled]').length===0,'Obligations, Debts and Savings must all remain active');";

if(source.includes(originalPlan)){
  if(source.indexOf(originalPlan)!==source.lastIndexOf(originalPlan))throw new Error('Original M3 Plan availability correction anchor is not unique');
  source=source.replace(originalPlan,m4Plan);
  corrections.push('M3 regression accepts active Debts and Savings');
}else if(source.includes(m2Plan)){
  if(source.indexOf(m2Plan)!==source.lastIndexOf(m2Plan))throw new Error('M2 Plan availability correction anchor is not unique');
  source=source.replace(m2Plan,m4Plan);
  corrections.push('M3 regression advanced from M2 to M4 navigation');
}else if(!source.includes(m4Plan))throw new Error('M3 Plan availability correction anchor missing');

if(corrections.length)writeFileSync(path,source);
console.log(JSON.stringify({status:corrections.length?'APPLIED':'SKIPPED',corrections,reason:corrections.length?'M3 regression reconciled with current integrated navigation':'M3 regression already current'},null,2));