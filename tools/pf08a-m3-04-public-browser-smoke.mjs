import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const publicUrl=process.env.PUBLIC_URL||'https://maloma.github.io/sandbox/';
const expectedMain=process.env.EXPECTED_MAIN_M304||'8cfcbe8060647bfc50d576ab32120baeb65fb7ed';
const localSmoke=resolve('tools/pf08a-m3-04-browser-smoke.mjs');
const sha256=value=>createHash('sha256').update(value).digest('hex');
const sleep=milliseconds=>new Promise(resolveSleep=>setTimeout(resolveSleep,milliseconds));

const files=[
  ['html',''],['scope','familypilot-scope.js'],['analytics','familypilot-analytics-state.js'],
  ['obligations','familypilot-obligations.js'],['obligationsUi','familypilot-obligations-ui-v2.js'],
  ['attention','familypilot-payment-attention.js'],['attentionUi','familypilot-payment-attention-ui.js'],
  ['stateUi','familypilot-obligation-state-ui.js'],
  ['debts','familypilot-debts.js'],['debtsUi','familypilot-debts-ui.js'],
  ['savings','familypilot-savings-goals.js'],['savingsUi','familypilot-savings-goals-ui.js'],
  ['wallets','familypilot-wallet-management.js'],['walletsUi','familypilot-wallet-management-ui.js'],
  ['transfers','familypilot-wallet-transfers.js'],['transfersUi','familypilot-wallet-transfers-ui.js']
];

function packageChecks(packageFiles){
  return{
    runtimeBridge:packageFiles.html.includes('window.__FP_RUNTIME__'),
    scopeLoadsStateUi:packageFiles.scope.includes('familypilot-obligation-state-ui.js')&&packageFiles.scope.includes('__FP_M3_04_READY__'),
    statePackage:packageFiles.stateUi.includes('__FP_OBLIGATION_STATE_UI_READY__'),
    hiddenStorage:packageFiles.stateUi.includes('hiddenObligationOccurrencesById'),
    hiddenSection:packageFiles.stateUi.includes('Скрытые платежи')&&packageFiles.stateUi.includes('Показать снова'),
    hideInsteadOfDelete:packageFiles.stateUi.includes('data-payment-context-action="hide"'),
    shortTapUnskip:packageFiles.stateUi.includes('obligation_skip_unchecked'),
    backdropClose:packageFiles.stateUi.includes(".modal.open,.overlay.open"),
    todayBlue:packageFiles.stateUi.includes('.obligation-row--due')&&packageFiles.stateUi.includes('var(--blue)'),
    skippedGray:packageFiles.stateUi.includes('.obligation-row--skipped')&&packageFiles.stateUi.includes('var(--muted)'),
    priorAttention:packageFiles.attentionUi.includes('planned-payment-attention-v3'),
    priorModules:packageFiles.analytics.includes('FamilyPilotAnalyticsState')&&packageFiles.debts.includes('FamilyPilotDebts')&&packageFiles.savings.includes('FamilyPilotSavingsGoals')&&packageFiles.wallets.includes('FamilyPilotWalletManagement')&&packageFiles.transfers.includes("TRANSFER_KIND='transfer'"),
    noExternalNotifications:!packageFiles.stateUi.includes('Notification.requestPermission')&&!packageFiles.stateUi.includes('new Notification')&&!packageFiles.stateUi.includes('PushManager')
  };
}

async function fetchPublishedPackage(){
  let last={statuses:{},failedChecks:['not_checked']};
  for(let attempt=1;attempt<=36;attempt+=1){
    const token=`${expectedMain}-${attempt}-${Date.now()}`;
    try{
      const responses=await Promise.all(files.map(([,path])=>path
        ?fetch(new URL(`${path}?v=${encodeURIComponent(token)}`,publicUrl),{redirect:'follow',cache:'no-store'})
        :fetch(`${publicUrl}?v=${encodeURIComponent(token)}`,{redirect:'follow',cache:'no-store'})));
      const bodies=await Promise.all(responses.map(response=>response.text()));
      const packageFiles=Object.fromEntries(files.map(([key],index)=>[key,bodies[index]]));
      const statuses=Object.fromEntries(files.map(([key],index)=>[key,responses[index].status]));
      const checks=packageChecks(packageFiles);
      const failedChecks=Object.entries(checks).filter(([,passed])=>!passed).map(([name])=>name);
      last={statuses,failedChecks};
      if(responses.every(response=>response.status===200)&&failedChecks.length===0)return{attempts:attempt,statuses,...packageFiles};
    }catch(error){last={statuses:{network:0},failedChecks:[String(error)]}}
    await sleep(5000);
  }
  throw new Error(`Published M3-04 package did not become ready: ${JSON.stringify(last)}`);
}

function runBrowserSmoke(directory){
  return new Promise((resolveRun,rejectRun)=>{
    const child=spawn(process.execPath,[localSmoke],{cwd:directory,stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';
    const timeout=setTimeout(()=>{child.kill('SIGKILL');rejectRun(new Error(`Public M3-04 Chrome smoke timed out. stderr: ${stderr.slice(-3000)}`))},120000);
    child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);
    child.once('error',error=>{clearTimeout(timeout);rejectRun(error)});
    child.once('close',code=>{
      clearTimeout(timeout);
      if(code!==0)rejectRun(new Error(`Public M3-04 Chrome smoke exited ${code}. stderr: ${stderr.slice(-5000)} stdout: ${stdout.slice(-5000)}`));
      else if(!stdout.includes('PF08A_M3_04_BROWSER_PASS'))rejectRun(new Error(`Public M3-04 PASS marker missing. stdout: ${stdout.slice(-5000)}`));
      else resolveRun({stdout,stderr});
    });
  });
}

const published=await fetchPublishedPackage();
const directory=mkdtempSync(join(tmpdir(),'pf08a-m3-04-public-'));
try{
  for(const [key,path] of files)writeFileSync(join(directory,path||'index.html'),published[key],'utf8');
  const browser=await runBrowserSmoke(directory);
  const result={status:'PASS',verified_at:new Date().toISOString(),public_url:publicUrl,expected_main:expectedMain,publication_attempts:published.attempts,http_status:published.statuses,browser_marker:'PF08A_M3_04_BROWSER_PASS',backdrop_close:true,large_context_targets:true,short_tap_unskip:true,current_state_disabled:true,hide_instead_of_delete:true,hidden_section:true,hidden_attention_excluded:true,show_again:true,no_cancelled_occurrences:true,today_blue:true,skipped_gray:true,prior_modules_preserved:true,runtime_exceptions:[]};
  for(const [key] of files)result[`${key}_sha256`]=sha256(published[key]);
  console.log(JSON.stringify(result,null,2));
  console.log(browser.stdout.trim());
}finally{
  rmSync(directory,{recursive:true,force:true});
}
