import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const publicUrl=process.env.PUBLIC_URL||'https://maloma.github.io/sandbox/';
const expectedMain=process.env.EXPECTED_MAIN_M306||'44e9574e909e5fccbfd9cc2d28ff6f632d8d0285';
const localSmoke=resolve('tools/pf08a-m3-06-mobile-ux-browser-smoke.mjs');
const sleep=ms=>new Promise(resolveSleep=>setTimeout(resolveSleep,ms));
const files=[
  ['html',''],['scope','familypilot-scope.js'],['analytics','familypilot-analytics-state.js'],
  ['obligations','familypilot-obligations.js'],['obligationsUi','familypilot-obligations-ui-v2.js'],
  ['attention','familypilot-payment-attention.js'],['attentionUi','familypilot-payment-attention-ui.js'],
  ['stateUi','familypilot-obligation-state-ui.js'],['linkLifecycle','familypilot-payment-link-lifecycle.js'],
  ['mobileTap','familypilot-mobile-payment-tap.js'],['operationMobile','familypilot-operation-mobile-ui.js'],['datePicker','familypilot-operation-date-picker.js'],
  ['debts','familypilot-debts.js'],['debtsUi','familypilot-debts-ui.js'],
  ['savings','familypilot-savings-goals.js'],['savingsUi','familypilot-savings-goals-ui.js'],
  ['wallets','familypilot-wallet-management.js'],['walletsUi','familypilot-wallet-management-ui.js'],
  ['transfers','familypilot-wallet-transfers.js'],['transfersUi','familypilot-wallet-transfers-ui.js']
];

function checks(packageFiles){return{
  scopeLoadsM306:packageFiles.scope.includes('familypilot-mobile-payment-tap.js')&&packageFiles.scope.includes('familypilot-operation-mobile-ui.js')&&packageFiles.scope.includes('familypilot-operation-date-picker.js')&&packageFiles.scope.includes('__FP_M3_06_READY__'),
  mobileTapReady:packageFiles.mobileTap.includes('__FP_MOBILE_PAYMENT_TAP_READY__')&&packageFiles.mobileTap.includes('obligation_skip_unchecked'),
  operationMobileReady:packageFiles.operationMobile.includes('__FP_OPERATION_MOBILE_UI_READY__')&&packageFiles.operationMobile.includes('--fp-fixed-bottom'),
  datePickerReady:packageFiles.datePicker.includes('__FP_OPERATION_DATE_PICKER_READY__')&&packageFiles.datePicker.includes('operationDatePickerModal')&&packageFiles.datePicker.includes('is-today')&&packageFiles.datePicker.includes('is-selected'),
  previousModules:packageFiles.linkLifecycle.includes('__FP_PAYMENT_LINK_LIFECYCLE_READY__')&&packageFiles.stateUi.includes('__FP_OBLIGATION_STATE_UI_READY__')&&packageFiles.attentionUi.includes('planned-payment-attention-v3'),
  noExternalNotifications:!packageFiles.mobileTap.includes('Notification.requestPermission')&&!packageFiles.datePicker.includes('new Notification')
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
  throw new Error(`Published M3-06 package did not become ready: ${JSON.stringify(last)}`);
}

function runSmoke(directory){return new Promise((resolveRun,rejectRun)=>{const child=spawn(process.execPath,[localSmoke],{cwd:directory,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';const timeout=setTimeout(()=>{child.kill('SIGKILL');rejectRun(new Error(`Public M3-06 smoke timed out: ${stderr.slice(-3000)}`))},150000);child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);child.once('error',error=>{clearTimeout(timeout);rejectRun(error)});child.once('close',code=>{clearTimeout(timeout);if(code!==0)rejectRun(new Error(`Public M3-06 smoke exited ${code}: ${stderr.slice(-5000)} ${stdout.slice(-5000)}`));else if(!stdout.includes('PF08A_M3_06_MOBILE_UX_BROWSER_PASS'))rejectRun(new Error(`Public M3-06 marker missing: ${stdout.slice(-5000)}`));else resolveRun(stdout)})})}

const published=await fetchPackage();
const directory=mkdtempSync(join(tmpdir(),'pf08a-m3-06-public-'));
try{
  for(const [key,path] of files)writeFileSync(join(directory,path||'index.html'),published.packageFiles[key],'utf8');
  const stdout=await runSmoke(directory);
  console.log(JSON.stringify({status:'PASS',public_url:publicUrl,expected_main:expectedMain,publication_attempts:published.attempt,browser_marker:'PF08A_M3_06_MOBILE_UX_BROWSER_PASS',full_target_tap:true,history_collapsed:true,dynamic_bottom_spacing:true,manual_expense_link_without_duplicate:true,custom_date_picker:true,runtime_exceptions:[]},null,2));
  console.log(stdout.trim());
}finally{rmSync(directory,{recursive:true,force:true})}
