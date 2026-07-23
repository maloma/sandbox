import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const publicUrl=process.env.PUBLIC_URL||'https://maloma.github.io/sandbox/';
const expectedMain=process.env.EXPECTED_MAIN_M308||'67026c362456c8e126b8c9a80e47238d2738061e';
const localSmoke=resolve('tools/pf08a-m3-08-rule-history-browser-smoke.mjs');
const sleep=ms=>new Promise(resolveSleep=>setTimeout(resolveSleep,ms));
const files=[
  ['html',''],['scope','familypilot-scope.js'],['analytics','familypilot-analytics-state.js'],
  ['obligations','familypilot-obligations.js'],['obligationsUi','familypilot-obligations-ui-v2.js'],
  ['attention','familypilot-payment-attention.js'],['attentionUi','familypilot-payment-attention-ui.js'],
  ['stateUi','familypilot-obligation-state-ui.js'],['partial','familypilot-partial-payments.js'],
  ['settlement','familypilot-partial-payment-settlement.js'],['renderSync','familypilot-partial-payments-render-sync.js'],
  ['linkLifecycle','familypilot-payment-link-lifecycle.js'],['mobileTap','familypilot-mobile-payment-tap.js'],
  ['operationMobile','familypilot-operation-mobile-ui.js'],['datePicker','familypilot-operation-date-picker.js'],['ruleHistory','familypilot-rule-history.js'],
  ['debts','familypilot-debts.js'],['debtsUi','familypilot-debts-ui.js'],['savings','familypilot-savings-goals.js'],['savingsUi','familypilot-savings-goals-ui.js'],
  ['wallets','familypilot-wallet-management.js'],['walletsUi','familypilot-wallet-management-ui.js'],['transfers','familypilot-wallet-transfers.js'],['transfersUi','familypilot-wallet-transfers-ui.js']
];

function contract(packageFiles){return{
  loader:packageFiles.scope.includes('familypilot-rule-history.js')&&packageFiles.scope.includes('__FP_M3_08_READY__'),
  history:packageFiles.ruleHistory.includes('__FP_RULE_HISTORY_READY__')&&packageFiles.ruleHistory.includes('История платежей'),
  changesCollapsed:packageFiles.ruleHistory.includes('Изменения правила')&&packageFiles.ruleHistory.includes('rule-change-history'),
  operationStates:packageFiles.ruleHistory.includes('Убрана из финансов')&&packageFiles.ruleHistory.includes('Связь снята')&&packageFiles.ruleHistory.includes('Учтена'),
  previousModules:packageFiles.partial.includes('__FP_PARTIAL_PAYMENTS_READY__')&&packageFiles.linkLifecycle.includes('__FP_PAYMENT_LINK_LIFECYCLE_READY__')&&packageFiles.mobileTap.includes('__FP_MOBILE_PAYMENT_TAP_READY__'),
  noNotifications:!packageFiles.ruleHistory.includes('Notification.requestPermission')&&!packageFiles.ruleHistory.includes('new Notification')
}}
async function fetchPackage(){let last={};for(let attempt=1;attempt<=36;attempt+=1){const token=`${expectedMain}-${attempt}-${Date.now()}`;try{const responses=await Promise.all(files.map(([,path])=>fetch(path?new URL(`${path}?v=${encodeURIComponent(token)}`,publicUrl):`${publicUrl}?v=${encodeURIComponent(token)}`,{redirect:'follow',cache:'no-store'})));const bodies=await Promise.all(responses.map(response=>response.text()));const packageFiles=Object.fromEntries(files.map(([key],index)=>[key,bodies[index]]));const checks=contract(packageFiles),failed=Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name);last={statuses:responses.map(response=>response.status),failed};if(responses.every(response=>response.status===200)&&failed.length===0)return{attempt,packageFiles}}catch(error){last={error:String(error)}}await sleep(5000)}throw new Error(`Published M3-08 package did not become ready: ${JSON.stringify(last)}`)}
function runSmoke(directory){return new Promise((resolveRun,rejectRun)=>{const child=spawn(process.execPath,[localSmoke],{cwd:directory,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';const timeout=setTimeout(()=>{child.kill('SIGKILL');rejectRun(new Error(`Public M3-08 smoke timed out: ${stderr.slice(-3000)}`))},150000);child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);child.once('error',error=>{clearTimeout(timeout);rejectRun(error)});child.once('close',code=>{clearTimeout(timeout);if(code!==0)rejectRun(new Error(`Public M3-08 smoke exited ${code}: ${stderr.slice(-5000)} ${stdout.slice(-5000)}`));else if(!stdout.includes('PF08A_M3_08_RULE_HISTORY_BROWSER_PASS'))rejectRun(new Error(`Public M3-08 marker missing: ${stdout.slice(-5000)}`));else resolveRun(stdout)})})}
const published=await fetchPackage();const directory=mkdtempSync(join(tmpdir(),'pf08a-m3-08-public-'));try{for(const [key,path] of files)writeFileSync(join(directory,path||'index.html'),published.packageFiles[key],'utf8');const stdout=await runSmoke(directory);console.log(JSON.stringify({status:'PASS',public_url:publicUrl,expected_main:expectedMain,publication_attempts:published.attempt,browser_marker:'PF08A_M3_08_RULE_HISTORY_BROWSER_PASS',full_history:true,partial_history:true,skipped_history:true,hidden_history:true,operation_lifecycle:true,changes_collapsed:true,old_stats_removed:true,runtime_exceptions:[]},null,2));console.log(stdout.trim())}finally{rmSync(directory,{recursive:true,force:true})}
