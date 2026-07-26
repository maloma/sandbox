import { mkdtempSync,rmSync,writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import { spawn } from 'node:child_process';

const publicUrl=process.env.PUBLIC_URL||'https://maloma.github.io/sandbox/';
const expectedMain=process.env.EXPECTED_MAIN_M4_03||'fbff7ad5ad0df724a8d2d350c7035af5885b28e6';
const localSmoke=resolve('tools/pf08a-m4-03-savings-accounts-forecast-browser-smoke.mjs');
const sleep=ms=>new Promise(resolveSleep=>setTimeout(resolveSleep,ms));
const files=[
 ['html',''],['scope','familypilot-scope.js'],['analytics','familypilot-analytics-state.js'],
 ['obligations','familypilot-obligations.js'],['obligationsUi','familypilot-obligations-ui-v2.js'],
 ['attention','familypilot-payment-attention.js'],['attentionUi','familypilot-payment-attention-ui.js'],['stateUi','familypilot-obligation-state-ui.js'],
 ['removal','familypilot-partial-payment-removal-v2.js'],['partial','familypilot-partial-payments.js'],['walletIsolation','familypilot-obligation-wallet-isolation.js'],
 ['settlement','familypilot-partial-payment-settlement.js'],['renderSync','familypilot-partial-payments-render-sync.js'],['overpayment','familypilot-overpayment-resolution.js'],
 ['entryUi','familypilot-partial-payment-entry-ui.js'],['partialStateVisuals','familypilot-partial-state-visuals.js'],['linkLifecycle','familypilot-payment-link-lifecycle.js'],
 ['linkedOperationLifecycle','familypilot-linked-obligation-operation-lifecycle.js'],['mobileTap','familypilot-mobile-payment-tap.js'],['operationMobile','familypilot-operation-mobile-ui.js'],
 ['datePicker','familypilot-operation-date-picker.js'],['viewportAnchor','familypilot-viewport-anchor.js'],['ruleHistory','familypilot-rule-history.js'],
 ['plannedIncome','familypilot-planned-income.js'],['plannedIncomeAmountModel','familypilot-planned-income-amount-model.js'],['plannedIncomeUi','familypilot-planned-income-ui.js'],
 ['plannedIncomeAmountUi','familypilot-planned-income-amount-ui.js'],['debts','familypilot-debts.js'],['debtsUi','familypilot-debts-ui.js'],
 ['savings','familypilot-savings-goals.js'],['savingsUi','familypilot-savings-goals-ui.js'],['wallets','familypilot-wallet-management.js'],['walletsUi','familypilot-wallet-management-ui.js'],
 ['transfers','familypilot-wallet-transfers.js'],['transfersUi','familypilot-wallet-transfers-ui.js'],
 ['m403','familypilot-m4-03-savings-accounts.js'],['m403Ui','familypilot-m4-03-savings-accounts-ui.js']
];

function checks(packageFiles){
 return{
  loader:packageFiles.scope.includes('familypilot-m4-03-savings-accounts.js')&&packageFiles.scope.includes('familypilot-m4-03-savings-accounts-ui.js')&&packageFiles.scope.includes('loadM403'),
  domain:packageFiles.m403.includes('FamilyPilotSavingsAccounts')&&packageFiles.m403.includes('internal_transfer')&&packageFiles.m403.includes('fixed_contribution'),
  ui:packageFiles.m403Ui.includes("content='m4-03-savings-accounts-forecast-v1'")||packageFiles.m403Ui.includes("content='m4-03-savings-accounts-forecast-v1'"),
  title:packageFiles.savingsUi.includes('<h1>Накопления</h1>'),
  legacy:packageFiles.savings.includes('FamilyPilotSavingsGoals')&&packageFiles.savingsUi.includes('__FP_M4_01_UI__'),
  transferRetired:packageFiles.scope.includes("productState='hidden-superseded'")
 };
}

async function fetchPackage(){
 let last={};
 for(let attempt=1;attempt<=36;attempt++){
  const token=`${expectedMain}-${attempt}-${Date.now()}`;
  try{
   const responses=await Promise.all(files.map(([,path])=>fetch(path?new URL(`${path}?v=${encodeURIComponent(token)}`,publicUrl):`${publicUrl}?v=${encodeURIComponent(token)}`,{redirect:'follow',cache:'no-store'})));
   const bodies=await Promise.all(responses.map(response=>response.text()));
   const packageFiles=Object.fromEntries(files.map(([key],index)=>[key,bodies[index]]));
   const failed=Object.entries(checks(packageFiles)).filter(([,ok])=>!ok).map(([key])=>key);
   last={statuses:responses.map(response=>response.status),failed};
   if(responses.every(response=>response.status===200)&&!failed.length)return{attempt,packageFiles};
  }catch(error){last={error:String(error)}}
  await sleep(5000);
 }
 throw new Error(`Published M4-03 package did not become ready: ${JSON.stringify(last)}`);
}

function runSmoke(directory){
 return new Promise((resolveRun,rejectRun)=>{
  const child=spawn(process.execPath,[localSmoke],{cwd:directory,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';
  const timer=setTimeout(()=>{child.kill('SIGKILL');rejectRun(new Error(`M4-03 public smoke timed out\n${stderr.slice(-4000)}`))},180000);
  child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);child.once('error',rejectRun);
  child.once('close',code=>{clearTimeout(timer);if(code)rejectRun(new Error(`${stderr.slice(-6000)}\n${stdout.slice(-6000)}`));else if(!stdout.includes('PF08A_M4_03_BROWSER_PASS'))rejectRun(new Error(`M4-03 marker missing\n${stdout.slice(-6000)}`));else resolveRun(stdout)});
 });
}

const published=await fetchPackage();
const directory=mkdtempSync(join(tmpdir(),'pf08a-m4-03-public-'));
try{
 for(const [key,path] of files)writeFileSync(join(directory,path||'index.html'),published.packageFiles[key],'utf8');
 const stdout=await runSmoke(directory);
 console.log(JSON.stringify({status:'PASS',public_url:publicUrl,expected_main:expectedMain,publication_attempts:published.attempt,browser_marker:'PF08A_M4_03_BROWSER_PASS',module_title:'Накопления',account_logic:true,internal_transfers:true,investment_valuation:true,forecast_30_90:true,legacy_savings_contract:true,runtime_exceptions:[]},null,2));
 console.log(stdout.trim());
}finally{rmSync(directory,{recursive:true,force:true})}
