'use strict';
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const truth=require('../familypilot-pf08a-savings-truth.js');
const money=require('../familypilot-m4-04-money-planning.js');
const bridgeSource=readFileSync(require.resolve('../familypilot-pf08a-savings-money-bridge.js'),'utf8');
const assert=(value,message)=>{if(!value)throw new Error(message)};
const round=value=>Math.round((Number(value)||0)*100)/100;

function wallet(id,balance=500,moneyForm='bank'){
  return{id,type:'household_shared',name:id,openingBalance:balance,nativeCurrency:'EUR',includedInHouseholdCapital:true,archivedAt:null,moneyForm,psychologicalProtection:'logical'};
}
function goal(id){return{id,name:id,targetAmount:1000,savedAmount:0,targetDate:'',status:'active',createdAt:1,createdByMemberId:'member-anna',updatedAt:1,updatedByMemberId:'member-anna'};}
function stateOf(wallets=[wallet('w1')],goals=[goal('g1')]){
  return{schemaVersion:22,currentMemberId:'member-anna',household:{baseCurrency:'EUR'},wallets,operations:[],transfers:[],walletMovements:[],walletTransfers:[],balanceAdjustments:[],savingsTransfers:[],purposeAllocations:[],purposeAllocationEvents:[],purposeLocationAssignments:[],savingsLegacyReconciliationIssues:[],savingsPurposeMigrationResults:[],savingsPurposeMigrationSnapshots:[],savingsGoals:goals,savingsRules:[],savingsActionOccurrences:[],birthdayEvents:[],giftFundSettings:{},investmentLocationAssignments:[]};
}
function walletBalance(state,id){
  const w=state.wallets.find(item=>item.id===id);let value=round(w?.openingBalance||0);
  for(const op of state.operations||[]){if(op?.status!=='active'||op.walletId!==id)continue;const amount=round(op.amount);if(op.kind==='income'||op.kind==='debt_inflow')value=round(value+amount);if(op.kind==='expense'||op.kind==='debt_outflow')value=round(value-amount)}
  for(const adj of state.balanceAdjustments||[])if(adj?.status!=='inactive'&&adj.walletId===id)value=round(value+round(adj.delta));
  return value;
}
function loadApi(truthApi=truth){
  const scope={walletCapitalSnapshot:(state,id)=>({capital:walletBalance(state,id)}),capitalSnapshot:state=>({capital:state.wallets.reduce((sum,item)=>sum+walletBalance(state,item.id),0)})};
  const runtime={scopeApi:scope};
  const window={FamilyPilotMoneyPlanning:money,FamilyPilotSavingsTruth:truthApi,FamilyPilotSavingsAccounts:{},__FP_RUNTIME__:runtime,FamilyPilotWalletManagement:null,FamilyPilotWalletTransfers:null,FamilyPilotSavingsGoals:null};
  const context={window,console,Date,Math,JSON,Object,Array,String,Number,Boolean,Error,Set,Map};
  vm.runInNewContext(bridgeSource,context,{filename:'familypilot-pf08a-savings-money-bridge.js'});
  return{api:window.FamilyPilotMoneyPlanning,scope};
}

// Branch A: already-counted cash does not change real balance/capital and only classifies existing money.
{
  const state=stateOf([wallet('cash',500,'cash')]);const {api}=loadApi();const before=walletBalance(state,'cash');
  const result=api.reconcileGoalSavedAmount(state,{goalId:'g1',desiredSavedAmount:120,mode:'already_counted',locationId:'cash'},'member-anna',{},100);
  assert(result.ok,'A cash reconciliation failed');assert(walletBalance(state,'cash')===before,'A cash changed wallet balance');assert(state.balanceAdjustments.length===0,'A cash created balance adjustment');assert(state.operations.length===0,'A cash created operation');assert(truth.actualSaved(state,'g1')===120&&state.savingsGoals[0].savedAmount===120,'A cash saved amount mismatch');
}

// Branch A: already-counted bank follows the same invariant.
{
  const state=stateOf([wallet('bank',700,'bank')]);const {api}=loadApi();const before=walletBalance(state,'bank');
  const result=api.reconcileGoalSavedAmount(state,{goalId:'g1',desiredSavedAmount:90,mode:'already_counted',locationId:'bank'},'member-anna',{},110);
  assert(result.ok&&walletBalance(state,'bank')===before,'A bank changed real balance');assert(state.balanceAdjustments.length===0&&state.operations.length===0,'A bank created economic movement');assert(truth.actualSaved(state,'g1')===90,'A bank allocation mismatch');
}

// Branch B: forgotten cash is a neutral balance correction plus equal purpose allocation, never Income.
{
  const state=stateOf([wallet('cash',300,'cash')]);const {api}=loadApi();
  const result=api.reconcileGoalSavedAmount(state,{goalId:'g1',desiredSavedAmount:75,mode:'forgotten_balance',locationId:'cash'},'member-anna',{},120);
  assert(result.ok,'B cash reconciliation failed');assert(state.balanceAdjustments.length===1&&state.balanceAdjustments[0].delta===75,'B cash neutral adjustment mismatch');assert(walletBalance(state,'cash')===375,'B cash real balance mismatch');assert(truth.actualSaved(state,'g1')===75,'B cash allocation mismatch');assert(state.operations.length===0,'B cash fabricated Income/Expense');
}

// Branch B: forgotten bank follows the same invariant.
{
  const state=stateOf([wallet('bank',450,'bank')]);const {api}=loadApi();
  const result=api.reconcileGoalSavedAmount(state,{goalId:'g1',desiredSavedAmount:130,mode:'forgotten_balance',locationId:'bank'},'member-anna',{},130);
  assert(result.ok&&state.balanceAdjustments.length===1&&state.balanceAdjustments[0].delta===130,'B bank adjustment mismatch');assert(walletBalance(state,'bank')===580,'B bank real balance mismatch');assert(truth.actualSaved(state,'g1')===130&&state.operations.length===0,'B bank truth mismatch');
}

// Multiple goals cannot classify the same free money twice.
{
  const state=stateOf([wallet('bank',500,'bank')],[goal('g1'),goal('g2')]);const {api}=loadApi();
  assert(api.reconcileGoalSavedAmount(state,{goalId:'g1',desiredSavedAmount:400,mode:'already_counted',locationId:'bank'},'member-anna',{},140).ok,'Multiple goals seed failed');
  const result=api.reconcileGoalSavedAmount(state,{goalId:'g2',desiredSavedAmount:200,mode:'already_counted',locationId:'bank'},'member-anna',{},150);
  assert(!result.ok,'Multiple goals overallocated one balance');assert(truth.actualSaved(state,'g1')===400&&truth.actualSaved(state,'g2')===0,'Multiple goals rollback mismatch');assert(truth.audit(state).overallocated.length===0,'Multiple goals produced over-allocation');
}

// A failure after forgotten-balance adjustment must roll back the neutral adjustment and goal cache.
{
  const failingTruth={...truth,allocateExisting:()=>({ok:false,error:'forced_allocation_failure'})};const state=stateOf([wallet('bank',500,'bank')]);const {api}=loadApi(failingTruth);
  const before=JSON.stringify(state);const result=api.reconcileGoalSavedAmount(state,{goalId:'g1',desiredSavedAmount:100,mode:'forgotten_balance',locationId:'bank'},'member-anna',{},160);
  assert(!result.ok&&result.error==='forced_allocation_failure','Rollback fixture did not fail at allocation');assert(state.balanceAdjustments.length===0,'Rollback left balance adjustment');assert(truth.actualSaved(state,'g1')===0&&state.savingsGoals[0].savedAmount===0,'Rollback left saved allocation/cache');assert(state.operations.length===0,'Rollback created operation');assert(JSON.parse(before).wallets[0].openingBalance===state.wallets[0].openingBalance,'Rollback changed opening balance');
}

// Lowering desired saved amount releases classification without changing real money.
{
  const state=stateOf([wallet('bank',500,'bank')]);const {api}=loadApi();assert(api.reconcileGoalSavedAmount(state,{goalId:'g1',desiredSavedAmount:180,mode:'already_counted',locationId:'bank'},'member-anna',{},170).ok,'Decrease seed failed');const before=walletBalance(state,'bank');
  const result=api.reconcileGoalSavedAmount(state,{goalId:'g1',desiredSavedAmount:50,mode:'already_counted',locationId:'bank'},'member-anna',{},180);
  assert(result.ok&&truth.actualSaved(state,'g1')===50,'Decrease did not set desired saved total');assert(walletBalance(state,'bank')===before,'Decrease changed real wallet balance');assert(state.operations.length===0&&state.balanceAdjustments.length===0,'Decrease created economic movement');
}

const auditCases=[
  stateOf([wallet('audit',200,'bank')])
];
for(const state of auditCases){const {api}=loadApi();assert(api.reconcileGoalSavedAmount(state,{goalId:'g1',desiredSavedAmount:80,mode:'already_counted',locationId:'audit'},'member-anna',{},190).ok,'Audit seed failed');const audit=truth.audit(state);assert(audit.singleTruth&&audit.overallocated.length===0,'SavingsTruth audit failed after #84 reconciliation');}

console.log(JSON.stringify({status:'PASS',marker:'FP84_GOAL_RECONCILIATION_DOMAIN_PASS',alreadyCountedCash:true,alreadyCountedBank:true,forgottenCash:true,forgottenBank:true,noIncomeCreated:true,multipleGoalsProtected:true,atomicRollback:true,decreaseRelease:true,singleTruthAudit:true},null,2));
console.log('FP84_GOAL_RECONCILIATION_DOMAIN_PASS');
