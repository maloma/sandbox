import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const here=dirname(fileURLToPath(import.meta.url));
const sourcePath=join(here,'pf08a-m4-05-onboarding-income-distribution-browser-smoke.mjs');
const patchedPath=join(here,'.pf08a-m4-05-browser-smoke-patched.mjs');
let source=readFileSync(sourcePath,'utf8');
const replacements=[
  ["  const beforeIncome=m405.batches();assert(beforeIncome.length===0,'Fixed reserve reminder appeared before actual income');","  const beforeIncome=m405.batches();if(beforeIncome.length)throw new Error('Fixed reserve reminder appeared before actual income: '+JSON.stringify({batches:beforeIncome,reserveRules:state.reserveContributionRules,snapshots:state.incomeRuleActivationSnapshots}));"],
  ["  const partial=moneyPlanning.complete(reserveAction.id,{outcome:'partial',amount:20,sourceLocationId:main.id,destinationLocationId:main.id,effectiveDate:Date.now()+30});assert(partial.ok,'Partial reserve confirmation failed: '+partial.error);","  const partial=moneyPlanning.complete(reserveAction.id,{outcome:'partial',amount:20,sourceLocationId:main.id,destinationLocationId:main.id,effectiveDate:Date.now()+30});assert(partial.ok,'Partial reserve confirmation failed: '+partial.error);const persistedPartial=state.savingsActionOccurrences.find(item=>item.id===reserveAction.id);if(!(persistedPartial&&persistedPartial.status==='partial'&&Math.abs(persistedPartial.actualAmount-20)<.01))throw new Error('Partial reserve state did not persist: '+JSON.stringify({partial,persistedPartial,matching:state.savingsActionOccurrences.filter(item=>item.goalId===reserveAction.goalId)}));"],
  ["  const reserveRemainder=batch2.actions.find(item=>item.id===reserveAction.id);assert(reserveRemainder&&Math.abs((reserveRemainder.plannedAmount-reserveRemainder.actualAmount)-30)<.01,'Remaining fixed reserve amount was not offered after next income');","  const reserveRemainder=batch2.actions.find(item=>item.id===reserveAction.id);if(!(reserveRemainder&&Math.abs((reserveRemainder.plannedAmount-reserveRemainder.actualAmount)-30)<.01))throw new Error('Remaining fixed reserve amount was not offered after next income: '+JSON.stringify({income1,income2,reserveAction,batches:m405.batches(),actions:state.savingsActionOccurrences.filter(item=>item.goalId===reserveAction.goalId),snapshots:state.incomeRuleActivationSnapshots}));"]
];
for(const [needle,replacement] of replacements){if(!source.includes(needle))throw new Error('Expected assertion was not found: '+needle);source=source.replace(needle,replacement)}
writeFileSync(patchedPath,source,'utf8');
try{
  await new Promise((resolveRun,rejectRun)=>{
    const child=spawn(process.execPath,[patchedPath],{stdio:'inherit'});
    child.on('error',rejectRun);
    child.on('close',code=>code===0?resolveRun():rejectRun(new Error(`M4-05 diagnostic smoke exited ${code}`)));
  });
}finally{if(existsSync(patchedPath))rmSync(patchedPath,{force:true})}
