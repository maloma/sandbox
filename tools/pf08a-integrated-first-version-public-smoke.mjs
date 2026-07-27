import {mkdtempSync,rmSync,writeFileSync} from'node:fs';
import {tmpdir}from'node:os';
import {join,resolve}from'node:path';
import {spawn}from'node:child_process';

const publicUrl=process.env.PUBLIC_URL||'https://maloma.github.io/sandbox/';
const expectedMain=process.env.EXPECTED_MAIN_PF08A_INTEGRATED||'462445e2a75fa5b573fb31255e7dacba2ead153e';
const localSmoke=resolve('tools/pf08a-integrated-first-version-browser-smoke.mjs');
const sleep=ms=>new Promise(resolveSleep=>setTimeout(resolveSleep,ms));
const files=[['html',''],['scope','familypilot-scope.js'],['analytics','familypilot-analytics-state.js'],['obligations','familypilot-obligations.js'],['obligationsUi','familypilot-obligations-ui-v2.js'],['attention','familypilot-payment-attention.js'],['attentionUi','familypilot-payment-attention-ui.js'],['stateUi','familypilot-obligation-state-ui.js'],['removal','familypilot-partial-payment-removal-v2.js'],['partial','familypilot-partial-payments.js'],['walletIsolation','familypilot-obligation-wallet-isolation.js'],['settlement','familypilot-partial-payment-settlement.js'],['renderSync','familypilot-partial-payments-render-sync.js'],['overpayment','familypilot-overpayment-resolution.js'],['entryUi','familypilot-partial-payment-entry-ui.js'],['partialStateVisuals','familypilot-partial-state-visuals.js'],['linkLifecycle','familypilot-payment-link-lifecycle.js'],['linkedOperationLifecycle','familypilot-linked-obligation-operation-lifecycle.js'],['mobileTap','familypilot-mobile-payment-tap.js'],['operationMobile','familypilot-operation-mobile-ui.js'],['datePicker','familypilot-operation-date-picker.js'],['viewportAnchor','familypilot-viewport-anchor.js'],['ruleHistory','familypilot-rule-history.js'],['plannedIncome','familypilot-planned-income.js'],['plannedIncomeAmountModel','familypilot-planned-income-amount-model.js'],['plannedIncomeUi','familypilot-planned-income-ui.js'],['plannedIncomeAmountUi','familypilot-planned-income-amount-ui.js'],['debts','familypilot-debts.js'],['debtsUi','familypilot-debts-ui.js'],['savings','familypilot-savings-goals.js'],['savingsUi','familypilot-savings-goals-ui.js'],['wallets','familypilot-wallet-management.js'],['walletsUi','familypilot-wallet-management-ui.js'],['transfers','familypilot-wallet-transfers.js'],['transfersUi','familypilot-wallet-transfers-ui.js'],['m403','familypilot-m4-03-savings-accounts.js'],['m403Ui','familypilot-m4-03-savings-accounts-ui.js'],['forecastCorrection','familypilot-m4-03-forecast-correction.js'],['budgetSafety','familypilot-m4-03-budget-safety-correction.js'],['budget','familypilot-m4-03-budget-designer.js'],['budgetUi','familypilot-m4-03-budget-designer-ui.js'],['additiveReserveUi','familypilot-m4-03-additive-reserve-ui.js'],['m404','familypilot-m4-04-money-planning.js'],['m404Ui','familypilot-m4-04-money-planning-ui.js'],['m405','familypilot-m4-05-onboarding-income-distribution.js'],['m405Product','familypilot-m4-05-product-corrections.js'],['m405Activation','familypilot-m4-05-income-activation-correction.js'],['m405Ui','familypilot-m4-05-onboarding-income-distribution-ui.js'],['m405UiCorrections','familypilot-m4-05-ui-corrections.js'],['m405Current','familypilot-m4-05-current-state-actions.js'],['m406','familypilot-m4-06-what-if.js'],['m406Ui','familypilot-m4-06-what-if-ui.js'],['solver','familypilot-m4-06-goal-deficit-solver.js'],['solverUi','familypilot-m4-06-goal-deficit-solver-ui.js'],['conversion','familypilot-m4-06-scenario-plan-conversion.js'],['conversionUi','familypilot-m4-06-scenario-plan-conversion-ui.js'],['interest','familypilot-m4-06-manual-interest.js'],['interestUi','familypilot-m4-06-manual-interest-ui.js'],['learning','familypilot-m4-07-learning-mode.js'],['learningUi','familypilot-m4-07-learning-mode-ui.js']];

function checks(pkg){return{
 loader:pkg.viewportAnchor.includes('familypilot-m4-07-learning-mode.js')&&pkg.viewportAnchor.includes('familypilot-m4-07-learning-mode-ui.js'),
 correctedCopy:pkg.learning.includes("title:'Начните с минимума информации'")&&!pkg.learning.includes('Начните с минимальной картины'),
 learning:pkg.learning.includes("id:'minimum_start'")&&pkg.learningUi.includes('Как пользоваться FamilyPilot'),
 integratedModules:pkg.m405.includes('applyOnboarding')&&pkg.m404.includes('configureIncomeSavingsRule')&&pkg.m406.includes('evaluateScenario')&&pkg.solver.includes('solveGoal')&&pkg.interest.includes('whatIfInterestSimulations'),
 knownSavingsBlocker:pkg.savingsUi.includes('savingsGoalSaved')&&pkg.m404Ui.includes('item.savedAmount'),
 noLearningNetwork:!/(fetch\(|XMLHttpRequest|sendBeacon|https?:\/\/)/.test(pkg.learning+pkg.learningUi)
}}

async function fetchPackage(){let last={};for(let attempt=1;attempt<=36;attempt++){
 const token=`${expectedMain}-${attempt}-${Date.now()}`;
 try{
  const responses=await Promise.all(files.map(([,file])=>fetch(file?new URL(`${file}?v=${encodeURIComponent(token)}`,publicUrl):`${publicUrl}?v=${encodeURIComponent(token)}`,{redirect:'follow',cache:'no-store'})));
  const bodies=await Promise.all(responses.map(response=>response.text()));
  const pkg=Object.fromEntries(files.map(([key],index)=>[key,bodies[index]]));
  const failed=Object.entries(checks(pkg)).filter(([,ok])=>!ok).map(([key])=>key);
  last={statuses:responses.map(response=>response.status),failed};
  if(responses.every(response=>response.status===200)&&!failed.length)return{attempt,pkg};
 }catch(error){last={error:String(error)}}
 await sleep(5000);
}throw Error(`Published PF-08A integrated package did not become ready: ${JSON.stringify(last)}`)}

function runSmoke(directory){return new Promise((resolveRun,rejectRun)=>{
 const child=spawn(process.execPath,[localSmoke],{cwd:directory,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';
 const timer=setTimeout(()=>{child.kill('SIGKILL');rejectRun(Error(`Integrated public smoke timed out\n${stderr.slice(-6000)}`))},210000);
 child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);child.once('error',rejectRun);
 child.once('close',code=>{clearTimeout(timer);if(code)rejectRun(Error(`${stderr.slice(-12000)}\n${stdout.slice(-12000)}`));else if(!stdout.includes('PF08A_FIRST_VERSION_INTEGRATED_GATE_PASS'))rejectRun(Error('Integrated marker missing'));else resolveRun(stdout)})
})}

const published=await fetchPackage();
const directory=mkdtempSync(join(tmpdir(),'pf08a-integrated-public-'));
try{
 for(const[key,file]of files)writeFileSync(join(directory,file||'index.html'),published.pkg[key],'utf8');
 const stdout=await runSmoke(directory);
 console.log(JSON.stringify({status:'PASS',public_url:publicUrl,expected_main:expectedMain,publication_attempts:published.attempt,browser_marker:'PF08A_FIRST_VERSION_INTEGRATED_GATE_PASS',learning_copy_corrected:true,primary_navigation:true,reload_persistence:true,hypothetical_isolation:true,single_savings_truth:false,visible_module_failure_surface:false,readiness_verdict:'NOT_READY',runtime_exceptions:[]},null,2));
 console.log(stdout.trim());
}finally{rmSync(directory,{recursive:true,force:true})}
