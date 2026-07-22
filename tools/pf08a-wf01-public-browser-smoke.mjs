import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const publicUrl=process.env.PUBLIC_URL||'https://maloma.github.io/sandbox/';
const expectedMain=process.env.EXPECTED_MAIN_WF01||'85339932958f58cd416eb966a67e1bb35f56383c';
const evidenceArgument=process.argv.find(argument=>argument.startsWith('--evidence='));
const evidencePath=evidenceArgument?evidenceArgument.slice('--evidence='.length):null;
const localSmoke=resolve('tools/pf08a-wf01-browser-smoke.mjs');
const sha256=value=>createHash('sha256').update(value).digest('hex');
const sleep=milliseconds=>new Promise(resolveSleep=>setTimeout(resolveSleep,milliseconds));

const files=[
  ['html',''],['scope','familypilot-scope.js'],['analytics','familypilot-analytics-state.js'],
  ['obligations','familypilot-obligations.js'],['obligationsUi','familypilot-obligations-ui-v2.js'],
  ['debts','familypilot-debts.js'],['debtsUi','familypilot-debts-ui.js'],
  ['savings','familypilot-savings-goals.js'],['savingsUi','familypilot-savings-goals-ui.js'],
  ['wallets','familypilot-wallet-management.js'],['walletsUi','familypilot-wallet-management-ui.js']
];

async function fetchPublishedPackage(){
  let last={status:0,body:''};
  for(let attempt=1;attempt<=30;attempt+=1){
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
        &&packageFiles.html.includes('base-currency-wallet-management-v1')
        &&packageFiles.html.includes('pf08a-wf01-inline-ui:start')
        &&packageFiles.html.includes('<script src="./familypilot-wallet-management.js"></script>')
        &&packageFiles.scope.includes('FamilyPilotScope')
        &&packageFiles.analytics.includes('FamilyPilotAnalyticsState')
        &&packageFiles.obligations.includes('FamilyPilotObligations')
        &&packageFiles.debts.includes('FamilyPilotDebts')
        &&packageFiles.savings.includes('FamilyPilotSavingsGoals')
        &&packageFiles.wallets.includes('FamilyPilotWalletManagement')
        &&packageFiles.wallets.includes('createWallet')
        &&packageFiles.wallets.includes('setPersonalCapitalInclusion')
        &&!packageFiles.wallets.includes('state.operations.push(')
        &&packageFiles.walletsUi.includes("screen.id='walletManagementScreen'")
        &&packageFiles.walletsUi.includes('id="walletManagementOpen"')
        &&packageFiles.walletsUi.includes('value="household_shared"')
        &&packageFiles.walletsUi.includes('value="personal"')
        &&!packageFiles.walletsUi.includes('walletManagementOpeningBalance')
        &&!packageFiles.walletsUi.includes('walletManagementGrant')
        &&!packageFiles.walletsUi.includes('walletManagementTransfer')
        &&packageFiles.html.includes('savings-goal-config-v1')
        &&packageFiles.html.includes('debt-chains-principal-v1')
        &&packageFiles.html.includes('plan-obligations-foundation-v1')
        &&packageFiles.html.includes('hidden-capital-disclosure-v1')
        &&packageFiles.html.includes('compact-analytics-states-v1')
        &&!packageFiles.html.includes("fetch('./src/familypilot.html")
        &&!packageFiles.html.includes('document.write(source)');
      if(ready)return{attempts:attempt,statuses,...packageFiles};
    }catch(error){last={status:0,body:String(error)}}
    await sleep(10000);
  }
  throw new Error(`Published WF-01 package did not become ready. Last status ${last.status}: ${last.body.slice(0,1200)}`);
}

function runBrowserSmoke(directory){
  return new Promise((resolveRun,rejectRun)=>{
    const child=spawn(process.execPath,[localSmoke],{cwd:directory,stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';
    const timeout=setTimeout(()=>{child.kill('SIGKILL');rejectRun(new Error(`Public WF-01 Chrome smoke timed out. stderr: ${stderr.slice(-3000)}`))},120000);
    child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);
    child.once('error',error=>{clearTimeout(timeout);rejectRun(error)});
    child.once('close',code=>{clearTimeout(timeout);if(code!==0)rejectRun(new Error(`Public WF-01 Chrome smoke exited ${code}. stderr: ${stderr.slice(-5000)} stdout: ${stdout.slice(-5000)}`));else if(!stdout.includes('PF08A_WF01_BROWSER_PASS'))rejectRun(new Error(`Public WF-01 PASS marker missing. stdout: ${stdout.slice(-5000)}`));else resolveRun({stdout,stderr})});
  });
}

const published=await fetchPublishedPackage();
const directory=mkdtempSync(join(tmpdir(),'pf08a-wf01-public-'));
try{
  for(const [key,path] of files)writeFileSync(join(directory,path||'index.html'),published[key],'utf8');
  const browser=await runBrowserSmoke(directory),verifiedAt=new Date().toISOString();
  const result={status:'PASS',verified_at:verifiedAt,public_url:publicUrl,expected_main:expectedMain,publication_attempts:published.attempts,http_status:published.statuses,browser_marker:'PF08A_WF01_BROWSER_PASS',navigation:'Главная · Операции · План · Ещё',default_wallet_preserved:true,shared_create:true,personal_create:true,base_currency_only:true,zero_start:true,stable_rename:true,operation_links_preserved:true,personal_private_default:true,personal_excluded_default:true,capital_inclusion_independent:true,cross_member_isolation:true,selector_updated:true,personal_scope:true,household_scope_restored:true,no_management_operation:true,no_permissions_ui:true,no_fx_or_transfer_ui:true,prior_modules_preserved:true,runtime_exceptions:[]};
  for(const [key] of files)result[`${key}_sha256`]=sha256(published[key]);
  if(evidencePath){const s=published.statuses;const markdown=`# Public Verification — PF-08A-WF01-BASE-CURRENCY-WALLET-MANAGEMENT\n\n**Status:** PASS  \n**Verified At:** ${verifiedAt}  \n**Public URL:** \`${publicUrl}\`  \n**Expected Main Commit:** \`${expectedMain}\`  \n**Publication Attempts:** \`${published.attempts}\`  \n\n## HTTP Status\n\n${files.map(([key,path])=>`- ${path||'index.html'}: \`${s[key]}\``).join('\n')}\n\n## SHA-256\n\n${files.map(([key,path])=>`- ${path||'index.html'}: \`${result[`${key}_sha256`]}\``).join('\n')}\n\n## Assertions\n\n- Wallet Management route and default wallet preservation — PASS;\n- shared and personal base-currency creation with zero start — PASS;\n- stable rename and linked-operation preservation — PASS;\n- personal privacy and household-capital exclusion defaults — PASS;\n- capital inclusion remains independent from access — PASS;\n- cross-member isolation and accessible selector — PASS;\n- personal and household scope switching — PASS;\n- no management Income, Expense or Transfer — PASS;\n- no permission, FX, transfer or destructive controls — PASS;\n- M2, M3, M4, Hidden Capital and compact Analytics — PASS;\n- runtime exceptions — NONE.\n\n## Browser Output\n\n\`\`\`text\n${browser.stdout.trim()}\n\`\`\`\n\n# END OF FILE\n`;writeFileSync(evidencePath,markdown,'utf8')}
  console.log(JSON.stringify(result,null,2));
}finally{rmSync(directory,{recursive:true,force:true})}