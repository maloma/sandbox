import{mkdtempSync,rmSync,writeFileSync}from'node:fs';
import{tmpdir}from'node:os';
import{join,resolve}from'node:path';
import{spawn}from'node:child_process';

const publicUrl=process.env.PUBLIC_URL||'https://maloma.github.io/sandbox/';
const expectedMain=process.env.EXPECTED_MAIN_PF08A_WAVE1C||'';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const persistenceSmoke=resolve('tools/pf08a-wave1c-persistence-browser-smoke.mjs');
const compatibilitySmoke=resolve('tools/pf08a-wave1c-compatibility-migration-smoke.mjs');
const integratedSmoke=resolve('tools/pf08a-wave1c-integrated-browser-smoke.mjs');
const files=[
 ['html',''],['scope','familypilot-scope.js'],['persistenceRuntime','familypilot-persistence-runtime.js'],['analytics','familypilot-analytics-state.js'],
 ['obligations','familypilot-obligations.js'],['obligationsUi','familypilot-obligations-ui-v2.js'],['attention','familypilot-payment-attention.js'],['attentionUi','familypilot-payment-attention-ui.js'],['stateUi','familypilot-obligation-state-ui.js'],
 ['removal','familypilot-partial-payment-removal-v2.js'],['partial','familypilot-partial-payments.js'],['walletIsolation','familypilot-obligation-wallet-isolation.js'],['settlement','familypilot-partial-payment-settlement.js'],['renderSync','familypilot-partial-payments-render-sync.js'],['overpayment','familypilot-overpayment-resolution.js'],
 ['entryUi','familypilot-partial-payment-entry-ui.js'],['partialStateVisuals','familypilot-partial-state-visuals.js'],['linkLifecycle','familypilot-payment-link-lifecycle.js'],['linkedOperationLifecycle','familypilot-linked-obligation-operation-lifecycle.js'],['mobileTap','familypilot-mobile-payment-tap.js'],['operationMobile','familypilot-operation-mobile-ui.js'],
 ['datePicker','familypilot-operation-date-picker.js'],['viewportAnchor','familypilot-viewport-anchor.js'],['ruleHistory','familypilot-rule-history.js'],
 ['plannedIncome','familypilot-planned-income.js'],['plannedIncomeAmountModel','familypilot-planned-income-amount-model.js'],['plannedIncomeUi','familypilot-planned-income-ui.js'],['plannedIncomeAmountUi','familypilot-planned-income-amount-ui.js'],
 ['debts','familypilot-debts.js'],['debtsUi','familypilot-debts-ui.js'],['savings','familypilot-savings-goals.js'],['savingsUi','familypilot-savings-goals-ui.js'],
 ['wallets','familypilot-wallet-management.js'],['walletsUi','familypilot-wallet-management-ui.js'],['transfers','familypilot-wallet-transfers.js'],['transfersUi','familypilot-wallet-transfers-ui.js'],
 ['m403','familypilot-m4-03-savings-accounts.js'],['m403Ui','familypilot-m4-03-savings-accounts-ui.js'],['truth','familypilot-pf08a-savings-truth.js'],['truthCorrection','familypilot-pf08a-savings-truth-correction.js'],['truthAccountsBridge','familypilot-pf08a-savings-accounts-bridge.js'],['truthMoneyBridge','familypilot-pf08a-savings-money-bridge.js'],['truthUi','familypilot-pf08a-savings-truth-ui.js'],
 ['forecastCorrection','familypilot-m4-03-forecast-correction.js'],['budgetSafety','familypilot-m4-03-budget-safety-correction.js'],['budget','familypilot-m4-03-budget-designer.js'],['budgetUi','familypilot-m4-03-budget-designer-ui.js'],['additiveReserveUi','familypilot-m4-03-additive-reserve-ui.js'],
 ['m404','familypilot-m4-04-money-planning.js'],['m404Ui','familypilot-m4-04-money-planning-ui.js'],['m405','familypilot-m4-05-onboarding-income-distribution.js'],['m405Product','familypilot-m4-05-product-corrections.js'],['m405Activation','familypilot-m4-05-income-activation-correction.js'],['m405Ui','familypilot-m4-05-onboarding-income-distribution-ui.js'],['m405UiCorrections','familypilot-m4-05-ui-corrections.js'],['m405Current','familypilot-m4-05-current-state-actions.js'],
 ['m406','familypilot-m4-06-what-if.js'],['m406Ui','familypilot-m4-06-what-if-ui.js'],['solver','familypilot-m4-06-goal-deficit-solver.js'],['solverUi','familypilot-m4-06-goal-deficit-solver-ui.js'],['conversion','familypilot-m4-06-scenario-plan-conversion.js'],['conversionUi','familypilot-m4-06-scenario-plan-conversion-ui.js'],['interest','familypilot-m4-06-manual-interest.js'],['interestUi','familypilot-m4-06-manual-interest-ui.js'],['learning','familypilot-m4-07-learning-mode.js'],['learningUi','familypilot-m4-07-learning-mode-ui.js']
];
function checks(pkg){return{
 bootstrap:pkg.scope.includes('FamilyPilotPersistence')&&pkg.scope.includes('CURRENT_SCHEMA=22')&&pkg.scope.includes('familypilot-state-slot-a-v1'),
 preRuntime:pkg.html.indexOf('familypilot-scope.js')>=0&&pkg.html.indexOf('familypilot-scope.js')<pkg.html.indexOf('const APP_KEY'),
 runtime:pkg.persistenceRuntime.includes('pf08a-wave-1c-persistence-recovery-v1')&&pkg.persistenceRuntime.includes('12_global_validation_and_schema_22'),
 statusUi:pkg.persistenceRuntime.includes('Хранение и восстановление данных')&&pkg.persistenceRuntime.includes('Текущая версия хранит данные только в этом браузере'),
 priorTruth:pkg.truth.includes('purposeAllocations')&&pkg.truthUi.includes('Распределить имеющиеся деньги'),
 learningCopy:pkg.learning.includes("title:'Начните с минимума информации'")&&!pkg.learning.includes('Начните с минимальной картины'),
 noNetwork:!/(fetch\(|XMLHttpRequest|sendBeacon|https?:\/\/)/.test(pkg.persistenceRuntime)
}}
async function fetchPackage(){let last={};for(let attempt=1;attempt<=48;attempt++){
 const token=`${expectedMain||'main'}-${attempt}-${Date.now()}`;
 try{const responses=await Promise.all(files.map(([,file])=>fetch(file?new URL(`${file}?v=${encodeURIComponent(token)}`,publicUrl):`${publicUrl}?v=${encodeURIComponent(token)}`,{cache:'no-store',redirect:'follow'})));const bodies=await Promise.all(responses.map(r=>r.text()));const pkg=Object.fromEntries(files.map(([key],i)=>[key,bodies[i]]));const failed=Object.entries(checks(pkg)).filter(([,ok])=>!ok).map(([key])=>key);last={statuses:responses.map(r=>r.status),failed};if(responses.every(r=>r.status===200)&&failed.length===0)return{attempt,pkg}}catch(error){last={error:String(error)}}await sleep(5000)}throw Error('Published Wave 1C package not ready: '+JSON.stringify(last))}
function run(script,cwd,marker,timeout=360000){return new Promise((resolveRun,rejectRun)=>{const child=spawn(process.execPath,[script],{cwd,stdio:['ignore','pipe','pipe']});let out='',err='';const timer=setTimeout(()=>{child.kill('SIGKILL');rejectRun(Error('Smoke timed out '+marker+'\n'+err.slice(-8000)))},timeout);child.stdout.on('data',x=>out+=x);child.stderr.on('data',x=>err+=x);child.once('error',rejectRun);child.once('close',code=>{clearTimeout(timer);if(code)rejectRun(Error(err.slice(-16000)+'\n'+out.slice(-16000)));else if(!out.includes(marker))rejectRun(Error('Marker missing '+marker));else resolveRun(out)})})}
const published=await fetchPackage(),directory=mkdtempSync(join(tmpdir(),'pf08a-wave1c-public-'));
try{for(const[key,file]of files)writeFileSync(join(directory,file||'index.html'),published.pkg[key],'utf8');const a=await run(persistenceSmoke,directory,'PF08A_WAVE1C_PERSISTENCE_PASS');const b=await run(compatibilitySmoke,directory,'PF08A_WAVE1C_COMPAT_MIGRATION_PASS');const c=await run(integratedSmoke,directory,'PF08A_FIRST_VERSION_WAVE1C_INTEGRATED_PASS');console.log(JSON.stringify({status:'PASS',public_url:publicUrl,expected_main:expectedMain,publication_attempts:published.attempt,browser_marker:'PF08A_WAVE1C_PERSISTENCE_PASS',compatibility_marker:'PF08A_WAVE1C_COMPAT_MIGRATION_PASS',integrated_marker:'PF08A_FIRST_VERSION_WAVE1C_INTEGRATED_PASS',persistence_recovery:true,schema_owner:'FamilyPilotPersistence',state_schema_version:22,atomic_double_buffer:true,migration_ordered:true,migration_idempotent:true,pre_migration_snapshot:true,malformed_nonempty_never_silently_reset:true,recovery_status_visible:true,diagnostic_export_private_by_default:true,single_savings_truth:true,visible_module_failure_surface:false,readiness_verdict:'NOT_READY',runtime_exceptions:[]},null,2));console.log(a.trim());console.log(b.trim());console.log(c.trim())}finally{rmSync(directory,{recursive:true,force:true})}
