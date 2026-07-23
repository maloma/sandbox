import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const publicUrl=process.env.PUBLIC_URL||'https://maloma.github.io/sandbox/';
const expectedMain=process.env.EXPECTED_MAIN_M305||'2795ac36d38bfdcbaaeb26a6545565617bf96800';
const localSmoke=resolve('tools/pf08a-m3-05-browser-smoke.mjs');
const sleep=ms=>new Promise(resolveSleep=>setTimeout(resolveSleep,ms));
const files=[
  ['html',''],['scope','familypilot-scope.js'],['analytics','familypilot-analytics-state.js'],
  ['obligations','familypilot-obligations.js'],['obligationsUi','familypilot-obligations-ui-v2.js'],
  ['attention','familypilot-payment-attention.js'],['attentionUi','familypilot-payment-attention-ui.js'],
  ['stateUi','familypilot-obligation-state-ui.js'],['linkLifecycle','familypilot-payment-link-lifecycle.js'],
  ['debts','familypilot-debts.js'],['debtsUi','familypilot-debts-ui.js'],
  ['savings','familypilot-savings-goals.js'],['savingsUi','familypilot-savings-goals-ui.js'],
  ['wallets','familypilot-wallet-management.js'],['walletsUi','familypilot-wallet-management-ui.js'],
  ['transfers','familypilot-wallet-transfers.js'],['transfersUi','familypilot-wallet-transfers-ui.js']
];

function checks(packageFiles){return{
  scopeLoadsLifecycle:packageFiles.scope.includes('familypilot-payment-link-lifecycle.js')&&packageFiles.scope.includes('__FP_M3_05_READY__'),
  lifecycleReady:packageFiles.linkLifecycle.includes('__FP_PAYMENT_LINK_LIFECYCLE_READY__'),
  hiddenMultiFix:packageFiles.linkLifecycle.includes('.obligation-row[hidden]'),
  internalVoid:packageFiles.linkLifecycle.includes("INTERNAL_VOID_STATUS='voided'"),
  unpayChoices:packageFiles.linkLifecycle.includes('Снять отметку и удалить операцию')&&packageFiles.linkLifecycle.includes('Снять отметку, операцию оставить'),
  technicalMigration:packageFiles.linkLifecycle.includes('obligation_payment_unchecked')&&packageFiles.linkLifecycle.includes('obligation_legacy_trash_migrated'),
  previousModules:packageFiles.stateUi.includes('__FP_OBLIGATION_STATE_UI_READY__')&&packageFiles.attentionUi.includes('planned-payment-attention-v3')&&packageFiles.transfers.includes("TRANSFER_KIND='transfer'"),
  noExternalNotifications:!packageFiles.linkLifecycle.includes('Notification.requestPermission')&&!packageFiles.linkLifecycle.includes('new Notification')
}}

async function fetchPackage(){
  let last={};
  for(let attempt=1;attempt<=36;attempt+=1){
    const token=`${expectedMain}-${attempt}-${Date.now()}`;
    try{
      const responses=await Promise.all(files.map(([,path])=>fetch(path?new URL(`${path}?v=${encodeURIComponent(token)}`,publicUrl):`${publicUrl}?v=${encodeURIComponent(token)}`,{redirect:'follow',cache:'no-store'})));
      const bodies=await Promise.all(responses.map(response=>response.text()));
      const packageFiles=Object.fromEntries(files.map(([key],index)=>[key,bodies[index]]));
      const contract=checks(packageFiles),failed=Object.entries(contract).filter(([,ok])=>!ok).map(([key])=>key);
      last={statuses:responses.map(response=>response.status),failed};
      if(responses.every(response=>response.status===200)&&failed.length===0)return{attempt,packageFiles};
    }catch(error){last={error:String(error)}}
    await sleep(5000);
  }
  throw new Error(`Published M3-05 package did not become ready: ${JSON.stringify(last)}`);
}

function runSmoke(directory){return new Promise((resolveRun,rejectRun)=>{const child=spawn(process.execPath,[localSmoke],{cwd:directory,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';const timeout=setTimeout(()=>{child.kill('SIGKILL');rejectRun(new Error(`Public M3-05 smoke timed out: ${stderr.slice(-3000)}`))},120000);child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);child.once('error',error=>{clearTimeout(timeout);rejectRun(error)});child.once('close',code=>{clearTimeout(timeout);if(code!==0)rejectRun(new Error(`Public M3-05 smoke exited ${code}: ${stderr.slice(-5000)} ${stdout.slice(-5000)}`));else if(!stdout.includes('PF08A_M3_05_BROWSER_PASS'))rejectRun(new Error(`Public M3-05 marker missing: ${stdout.slice(-5000)}`));else resolveRun(stdout)})})}

const published=await fetchPackage();
const directory=mkdtempSync(join(tmpdir(),'pf08a-m3-05-public-'));
try{
  for(const [key,path] of files)writeFileSync(join(directory,path||'index.html'),published.packageFiles[key],'utf8');
  const stdout=await runSmoke(directory);
  console.log(JSON.stringify({status:'PASS',public_url:publicUrl,expected_main:expectedMain,publication_attempts:published.attempt,browser_marker:'PF08A_M3_05_BROWSER_PASS',multi_payment_hide:true,user_trash_clean:true,repeated_toggle_reuses_operation:true,three_choice_unpay:true,runtime_exceptions:[]},null,2));
  console.log(stdout.trim());
}finally{rmSync(directory,{recursive:true,force:true})}
