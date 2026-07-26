import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const here=dirname(fileURLToPath(import.meta.url));
const sourcePath=join(here,'pf08a-wf02-browser-smoke.mjs');
const patchedPath=join(here,'.pf08a-wf02-m404-diagnostic-patched.mjs');
let source=readFileSync(sourcePath,'utf8');
const needle="tr.setActive(annaWallet.id);assert(tr.capital().scope==='personal'&&tr.capital().capital===250,'Personal transfer inflow incorrect');tr.setActive(defaultWallet.id);";
const replacement="tr.setActive(annaWallet.id);const personalSnapshot=tr.capital();assert(personalSnapshot.scope==='personal'&&personalSnapshot.capital===250,'Personal transfer inflow incorrect '+JSON.stringify(personalSnapshot));tr.setActive(defaultWallet.id);";
if(!source.includes(needle))throw new Error('WF-02 personal capital assertion was not found');
source=source.replace(needle,replacement);
writeFileSync(patchedPath,source,'utf8');
try{
  await new Promise((resolveRun,rejectRun)=>{
    const child=spawn(process.execPath,[patchedPath],{stdio:'inherit'});
    child.on('error',rejectRun);
    child.on('close',code=>code===0?resolveRun():rejectRun(new Error(`WF-02 M4-04 diagnostic exited ${code}`)));
  });
}finally{
  if(existsSync(patchedPath))rmSync(patchedPath,{force:true});
}
