import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const here=dirname(fileURLToPath(import.meta.url));
const sourcePath=join(here,'pf08a-m4-05-onboarding-income-distribution-browser-smoke.mjs');
const patchedPath=join(here,'.pf08a-m4-05-browser-smoke-patched.mjs');
let source=readFileSync(sourcePath,'utf8');
const needle="  const beforeIncome=m405.batches();assert(beforeIncome.length===0,'Fixed reserve reminder appeared before actual income');";
const replacement="  const beforeIncome=m405.batches();if(beforeIncome.length)throw new Error('Fixed reserve reminder appeared before actual income: '+JSON.stringify(beforeIncome.map(batch=>({operation:{id:batch.operation.id,amount:batch.operation.amount,occurredAt:batch.operation.occurredAt,createdAt:batch.operation.createdAt},actions:batch.actions.map(action=>({id:action.id,sourceId:action.sourceId,goalId:action.goalId,title:action.title,status:action.status,note:action.note,incomeTriggerOperationId:action.incomeTriggerOperationId}))}))));";
if(!source.includes(needle))throw new Error('Expected assertion was not found');
source=source.replace(needle,replacement);
writeFileSync(patchedPath,source,'utf8');
try{
  await new Promise((resolveRun,rejectRun)=>{
    const child=spawn(process.execPath,[patchedPath],{stdio:'inherit'});
    child.on('error',rejectRun);
    child.on('close',code=>code===0?resolveRun():rejectRun(new Error(`M4-05 diagnostic smoke exited ${code}`)));
  });
}finally{if(existsSync(patchedPath))rmSync(patchedPath,{force:true})}
