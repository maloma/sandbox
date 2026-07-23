import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const publicUrl=process.env.PUBLIC_URL||'https://maloma.github.io/sandbox/';
const expectedMain=process.env.EXPECTED_MAIN_WF02||'4a20cf720314a9d4fe6b8e410d22aa26411c78e1';
const localSmoke=resolve('tools/pf08a-wf02-browser-smoke.mjs');
const sha256=value=>createHash('sha256').update(value).digest('hex');
const sleep=milliseconds=>new Promise(resolveSleep=>setTimeout(resolveSleep,milliseconds));

const files=[
  ['html',''],['scope','familypilot-scope.js'],['analytics','familypilot-analytics-state.js'],
  ['obligations','familypilot-obligations.js'],['obligationsUi','familypilot-obligations-ui-v2.js'],
  ['debts','familypilot-debts.js'],['debtsUi','familypilot-debts-ui.js'],
  ['savings','familypilot-savings-goals.js'],['savingsUi','familypilot-savings-goals-ui.js'],
  ['wallets','familypilot-wallet-management.js'],['walletsUi','familypilot-wallet-management-ui.js'],
  ['transfers','familypilot-wallet-transfers.js'],['transfersUi','familypilot-wallet-transfers-ui.js']
];

async function fetchPublishedPackage(){
  let last={status:0,body:''};
  for(let attempt=1;attempt<=18;attempt+=1){
    const token=`${expectedMain}-${attempt}-${Date.now()}`;
    try{
      const responses=await Promise.all(files.map(([,path])=>path
        ?fetch(new URL(`${path}?v=${encodeURIComponent(token)}`,publicUrl),{redirect:'follow',cache:'no-store'})
        :fetch(`${publicUrl}?v=${encodeURIComponent(token)}`,{redirect:'follow',cache:'no-store'})));
      const bodies=await Promise.all(responses.map(response=>response.text()));
      const packageFiles=Object.fromEntries(files.map(([key],index)=>[key,bodies[index]]));
      const statuses=Object.fromEntries(files.map(([key],index)=>[key,responses[index].status]));
      last={status:statuses.html,body:packageFiles.html};
      const ready=responses.every(response=>response.status===200)
        &&packageFiles.html.includes('pf08a-wf02-runtime-bridge:start')
        &&packageFiles.html.includes('window.__FP_RUNTIME__')
        &&packageFiles.html.includes('base-currency-wallet-management-v1')
        &&packageFiles.scope.includes('__FP_WF02_BOOTSTRAP__')
        &&packageFiles.scope.includes('familypilot-wallet-transfers.js')
        &&packageFiles.scope.includes('familypilot-wallet-transfers-ui.js')
        &&packageFiles.scope.includes('activeMovements')
        &&packageFiles.scope.includes('transferAccessible')
        &&packageFiles.analytics.includes('FamilyPilotAnalyticsState')
        &&packageFiles.obligations.includes('FamilyPilotObligations')
        &&packageFiles.debts.includes('FamilyPilotDebts')
        &&packageFiles.savings.includes('FamilyPilotSavingsGoals')
        &&packageFiles.wallets.includes('FamilyPilotWalletManagement')
        &&packageFiles.transfers.includes("TRANSFER_KIND='transfer'")
        &&packageFiles.transfers.includes('createTransfer')
        &&packageFiles.transfers.includes('correctTransfer')
        &&packageFiles.transfersUi.includes('const runtime=window.__FP_RUNTIME__')
        &&packageFiles.transfersUi.includes('window.__FP_TEST__.transfers')
        &&packageFiles.transfersUi.includes('walletTransferModal')
        &&packageFiles.transfersUi.includes('walletTransferDetailModal')
        &&!packageFiles.transfersUi.toLowerCase().includes('seed phrase')
        &&!packageFiles.transfersUi.toLowerCase().includes('private key')
        &&!packageFiles.transfersUi.toLowerCase().includes('exchange rate input')
        &&packageFiles.html.includes('savings-goal-config-v1')
        &&packageFiles.html.includes('debt-chains-principal-v1')
        &&packageFiles.html.includes('plan-obligations-foundation-v1')
        &&packageFiles.html.includes('hidden-capital-disclosure-v1')
        &&packageFiles.html.includes('compact-analytics-states-v1')
        &&!packageFiles.html.includes("fetch('./src/familypilot.html")
        &&!packageFiles.html.includes('document.write(source)');
      if(ready)return{attempts:attempt,statuses,...packageFiles};
    }catch(error){last={status:0,body:String(error)}}
    await sleep(5000);
  }
  throw new Error(`Published WF-02 package did not become ready. Last status ${last.status}: ${last.body.slice(0,1200)}`);
}

function runBrowserSmoke(directory){
  return new Promise((resolveRun,rejectRun)=>{
    const child=spawn(process.execPath,[localSmoke],{cwd:directory,stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';
    const timeout=setTimeout(()=>{child.kill('SIGKILL');rejectRun(new Error(`Public WF-02 Chrome smoke timed out. stderr: ${stderr.slice(-3000)}`))},120000);
    child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);
    child.once('error',error=>{clearTimeout(timeout);rejectRun(error)});
    child.once('close',code=>{
      clearTimeout(timeout);
      if(code!==0)rejectRun(new Error(`Public WF-02 Chrome smoke exited ${code}. stderr: ${stderr.slice(-5000)} stdout: ${stdout.slice(-5000)}`));
      else if(!stdout.includes('PF08A_WF02_BROWSER_PASS'))rejectRun(new Error(`Public WF-02 PASS marker missing. stdout: ${stdout.slice(-5000)}`));
      else resolveRun({stdout,stderr});
    });
  });
}

const published=await fetchPublishedPackage();
const directory=mkdtempSync(join(tmpdir(),'pf08a-wf02-public-'));
try{
  for(const [key,path] of files)writeFileSync(join(directory,path||'index.html'),published[key],'utf8');
  const browser=await runBrowserSmoke(directory),verifiedAt=new Date().toISOString();
  const result={
    status:'PASS',
    verified_at:verifiedAt,
    public_url:publicUrl,
    expected_main:expectedMain,
    publication_attempts:published.attempts,
    http_status:published.statuses,
    browser_marker:'PF08A_WF02_BROWSER_PASS',
    one_canonical_transfer_event:true,
    two_linked_movements:true,
    stable_transfer_id:true,
    stable_movement_ids:true,
    accessible_wallets_only:true,
    base_currency_only:true,
    no_income_expense:true,
    operations_transfer_presentation:true,
    correction_history:true,
    capital_recalculation:true,
    personal_household_scope:true,
    no_duplicate_reload:true,
    prior_modules_preserved:true,
    runtime_exceptions:[]
  };
  for(const [key] of files)result[`${key}_sha256`]=sha256(published[key]);
  console.log(JSON.stringify(result,null,2));
  console.log(browser.stdout.trim());
}finally{
  rmSync(directory,{recursive:true,force:true});
}
