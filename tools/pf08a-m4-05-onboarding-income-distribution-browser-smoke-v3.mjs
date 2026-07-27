import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const here=dirname(fileURLToPath(import.meta.url));
const sourcePath=join(here,'pf08a-m4-05-onboarding-income-distribution-browser-smoke.mjs');
const patchedPath=join(here,'.pf08a-m4-05-current-state-browser-smoke.mjs');
let source=readFileSync(sourcePath,'utf8');
const replacements=[
  ["if(api?.m405?.applyOnboarding&&api?.moneyPlanning?.complete&&win.__FP_M4_05_UI_CORRECTION_READY__===true)return api","if(api?.m405?.applyOnboarding&&api?.m405Current?.complete&&win.__FP_M4_05_UI_CORRECTION_READY__===true)return api"],
  ["const test=await ready(),doc=frame.contentDocument,runtime=win.__FP_RUNTIME__,state=runtime.state,m405=test.m405,moneyPlanning=test.moneyPlanning,savings=test.savings;","const test=await ready(),doc=frame.contentDocument,runtime=win.__FP_RUNTIME__,state=runtime.state,m405=test.m405,current=test.m405Current,savings=test.savings;"],
  ["m405.batches()","current.batches()"],
  ["m405.seedIncome(","current.seedIncome("],
  ["moneyPlanning.complete(","current.complete("],
  ["m405.configureReserve(","current.configureReserve("],
  ["m405.bridge()","current.bridge()"],
  ["m405.applyBridge(","current.applyBridge("]
];
for(const [needle,replacement] of replacements){if(!source.includes(needle))throw new Error('Expected M4-05 smoke fragment was not found: '+needle);source=source.split(needle).join(replacement)}
writeFileSync(patchedPath,source,'utf8');
try{
  await new Promise((resolveRun,rejectRun)=>{
    const child=spawn(process.execPath,[patchedPath],{stdio:'inherit'});
    child.on('error',rejectRun);
    child.on('close',code=>code===0?resolveRun():rejectRun(new Error(`M4-05 current-state smoke exited ${code}`)));
  });
}finally{if(existsSync(patchedPath))rmSync(patchedPath,{force:true})}
