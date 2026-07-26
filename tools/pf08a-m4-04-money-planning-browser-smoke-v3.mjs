import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const here=dirname(fileURLToPath(import.meta.url));
const sourcePath=join(here,'pf08a-m4-04-money-planning-browser-smoke.mjs');
const patchedPath=join(here,'.pf08a-m4-04-money-planning-browser-smoke-v3-patched.mjs');
let source=readFileSync(sourcePath,'utf8');
const patches=[
  [
    "if (test?.moneyPlanning?.capital && win.__FP_M4_04_READY__ === true) return test;",
    "if (test?.moneyPlanning?.capital && win.__FP_M4_04_READY__ === true && win.__FP_M4_04_PACKAGE_LOADED__ === true) return test;"
  ],
  [
    "    assert(moneyText.includes('Корректировка остатка'), 'Neutral adjustment UI is missing');",
    "    assert(moneyText.includes('Сверка остатков') && doc.getElementById('m404AdjustmentModal')?.textContent.includes('Корректировка остатка'), 'Neutral adjustment UI is missing');"
  ]
];
for(const[needle,replacement]of patches){
  if(!source.includes(needle))throw new Error(`Expected M4-04 smoke fragment not found: ${needle}`);
  source=source.replace(needle,replacement);
}
writeFileSync(patchedPath,source,'utf8');
try{
  await new Promise((resolveRun,rejectRun)=>{
    const child=spawn(process.execPath,[patchedPath],{stdio:'inherit'});
    child.on('error',rejectRun);
    child.on('close',code=>code===0?resolveRun():rejectRun(new Error(`M4-04 v3 smoke exited ${code}`)));
  });
}finally{
  if(existsSync(patchedPath))rmSync(patchedPath,{force:true});
}
