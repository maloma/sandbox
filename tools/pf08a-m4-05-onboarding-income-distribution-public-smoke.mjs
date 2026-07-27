import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const publicUrl=process.env.PUBLIC_URL||'https://maloma.github.io/sandbox/';
const expectedMain=process.env.EXPECTED_MAIN_M4_05||'5205aad1b9d66a888e5f4b688cae8b95006a028f';
const localSmoke=resolve('tools/pf08a-m4-05-onboarding-income-distribution-browser-smoke-v3.mjs');
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
  ['m403','familypilot-m4-03-savings-accounts.js'],['m403Ui','familypilot-m4-03-savings-accounts-ui.js'],
  ['forecastCorrection','familypilot-m4-03-forecast-correction.js'],['budgetSafety','familypilot-m4-03-budget-safety-correction.js'],
  ['budget','familypilot-m4-03-budget-designer.js'],['budgetUi','familypilot-m4-03-budget-designer-ui.js'],['additiveReserveUi','familypilot-m4-03-additive-reserve-ui.js'],
  ['m404','familypilot-m4-04-money-planning.js'],['m404Ui','familypilot-m4-04-money-planning-ui.js'],
  ['m405','familypilot-m4-05-onboarding-income-distribution.js'],['m405Product','familypilot-m4-05-product-corrections.js'],['m405Activation','familypilot-m4-05-income-activation-correction.js'],
  ['m405Ui','familypilot-m4-05-onboarding-income-distribution-ui.js'],['m405UiCorrections','familypilot-m4-05-ui-corrections.js'],['m405Current','familypilot-m4-05-current-state-actions.js'],
];

function checks(packageFiles){return{
  loader:packageFiles.viewportAnchor.includes('familypilot-m4-05-onboarding-income-distribution.js')&&packageFiles.viewportAnchor.includes('familypilot-m4-05-product-corrections.js')&&packageFiles.viewportAnchor.includes('familypilot-m4-05-income-activation-correction.js')&&packageFiles.viewportAnchor.includes('familypilot-m4-05-current-state-actions.js'),
  onboarding:packageFiles.m405.includes('applyOnboarding')&&packageFiles.m405.includes('onboardingReview')&&packageFiles.m405Product.includes('Первое накопление'),
  wording:packageFiles.m405Ui.includes('Хотите регулярно откладывать часть полученного дохода?')&&packageFiles.m405Ui.includes('Короткий маршрут с дополнительными вопросами'),
  incomeDistribution:packageFiles.m405.includes('incomeDistributionBatches')&&packageFiles.m405Current.includes('Распределить полученный доход')&&packageFiles.m405Current.includes('Выполнено частично')&&packageFiles.m405Current.includes('Другая сумма'),
  reserve:packageFiles.m405.includes("RESERVE_FIXED='fixed_monthly'")&&packageFiles.m405.includes("RESERVE_PERCENT='income_percentage'")&&packageFiles.m405Ui.includes('Резерв (непредвиденные расходы)'),
  activation:packageFiles.m405Activation.includes('incomeRuleActivationSnapshots')&&packageFiles.m405Activation.includes('m405ActionExecutionLedger'),
  giftBridge:packageFiles.m405.includes('giftReserveBridgeProposal')&&packageFiles.m405.includes('applyGiftReserveBridge')&&packageFiles.m405Ui.includes('Временно использовать резерв'),
  currentState:packageFiles.m405Current.includes('recordExecution')&&packageFiles.m405Current.includes('renderHomePrompt'),
  generalSavings:packageFiles.m404.includes("GENERAL_SAVINGS_NAME='Общие накопления'"),
  transferInvariant:packageFiles.m403.includes('internal_transfer')&&packageFiles.transfers.includes('transfer_source')&&packageFiles.transfers.includes('transfer_destination'),
};}

async function fetchPackage(){let last={};for(let attempt=1;attempt<=36;attempt++){
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
}throw new Error(`Published M4-05 package did not become ready: ${JSON.stringify(last)}`)}

function runSmoke(directory){return new Promise((resolveRun,rejectRun)=>{
  const child=spawn(process.execPath,[localSmoke],{cwd:directory,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';
  const timer=setTimeout(()=>{child.kill('SIGKILL');rejectRun(new Error(`M4-05 public smoke timed out\n${stderr.slice(-6000)}`))},180000);
  child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);child.once('error',rejectRun);
  child.once('close',code=>{clearTimeout(timer);if(code)rejectRun(new Error(`${stderr.slice(-12000)}\n${stdout.slice(-12000)}`));else if(!stdout.includes('PF08A_M4_05_ONBOARDING_DISTRIBUTION_PASS'))rejectRun(new Error(`M4-05 marker missing\n${stdout.slice(-12000)}`));else resolveRun(stdout)});
})}

const published=await fetchPackage();
const directory=mkdtempSync(join(tmpdir(),'pf08a-m4-05-public-'));
try{
  for(const[key,path]of files)writeFileSync(join(directory,path||'index.html'),published.packageFiles[key],'utf8');
  const stdout=await runSmoke(directory);
  console.log(JSON.stringify({status:'PASS',public_url:publicUrl,expected_main:expectedMain,publication_attempts:published.attempt,browser_marker:'PF08A_M4_05_ONBOARDING_DISTRIBUTION_PASS',progressive_questionnaire:true,canonical_records_only:true,first_goal:true,actual_income_distribution:true,fixed_reserve_default:true,reserve_percentage_mode:true,partial_then_next_income:true,gift_reserve_bridge:true,reserve_repayment_plan:true,per_item_confirmation:true,ordinary_income_expense_invariant:true,runtime_exceptions:[]},null,2));
  console.log(stdout.trim());
}finally{rmSync(directory,{recursive:true,force:true})}
