const assert=require('node:assert/strict');
const {writeFileSync}=require('node:fs');
const obligations=require('../familypilot-obligations.js');

process.on('uncaughtException',error=>{
  writeFileSync('m3-browser.log',String(error&&error.stack||error),'utf8');
  console.error(error);
  process.exit(1);
});

const NOW=new Date('2026-07-22T12:00:00Z').getTime();
const DAY=86400000;

function stateFixture(){
  return{
    schemaVersion:2,
    currentMemberId:'member-anna',
    activeWalletId:'wallet-household-main',
    wallets:[
      {id:'wallet-household-main',type:'household_default',name:'Семейный кошелёк',nativeCurrency:'EUR'},
      {id:'wallet-personal-anna',type:'personal',name:'Личный кошелёк Анны',nativeCurrency:'EUR'}
    ],
    categories:[{id:'cat-rent',kind:'expense',name:'Жильё'}],
    operations:[]
  };
}

const state=stateFixture();
obligations.normalizeState(state,NOW);
assert.equal(state.schemaVersion,4,'schema must upgrade additively to v4');
assert.deepEqual(state.obligationRules,[]);
assert.deepEqual(state.obligationOccurrences,[]);

// M3-01 compatibility: one fact creates exactly one Expense and Trash/restore recalculates.
const oneTime=obligations.createRule(state,{name:'Аренда',amount:700,dueAt:NOW,cadence:'once',walletId:'wallet-household-main',categoryId:'cat-rent',currency:'EUR'},'member-anna',NOW);
assert.equal(oneTime.ok,true);
assert.equal(oneTime.occurrence.sequence,1);
assert.equal(obligations.occurrenceDisplayStatus(oneTime.occurrence,NOW),'due');
const payment=obligations.payOccurrence(state,oneTime.occurrence.id,{amount:690,occurredAt:NOW},'member-anna',NOW);
assert.equal(payment.ok,true);
assert.equal(payment.operation.kind,'expense');
assert.equal(payment.operation.links.obligationOccurrenceId,oneTime.occurrence.id);
assert.equal(state.operations.length,1);
assert.equal(obligations.payOccurrence(state,oneTime.occurrence.id,{amount:690,occurredAt:NOW},'member-anna',NOW).ok,false);
payment.operation.status='trash';
obligations.syncPaymentLinks(state,NOW+DAY);
assert.notEqual(oneTime.occurrence.status,'paid');
payment.operation.status='active';
obligations.syncPaymentLinks(state,NOW+DAY);
assert.equal(oneTime.occurrence.status,'paid');

// Actual payment correction must preserve the same operation id.
const originalOperationId=payment.operation.id;
const corrected=obligations.correctPayment(state,oneTime.occurrence.id,{amount:688.5,occurredAt:NOW-DAY},'member-anna',NOW);
assert.equal(corrected.ok,true);
assert.equal(corrected.operation.id,originalOperationId);
assert.equal(corrected.operation.amount,688.5);
assert.equal(oneTime.occurrence.actualAmount,688.5);

// Arbitrary recurrence: every three months, exact count eleven, idempotent generation.
const finite=obligations.createRule(state,{name:'Страховка',amount:120,dueAt:new Date(2026,6,25).getTime(),cadence:'recurring',intervalValue:3,intervalUnit:'month',endingMode:'count',paymentCount:11,walletId:'wallet-household-main',categoryId:'cat-rent',currency:'EUR'},'member-anna',NOW+1);
assert.equal(finite.ok,true);
obligations.ensureOccurrencesWindow(state,-Infinity,new Date(2030,0,1).getTime(),NOW);
let finiteOccurrences=state.obligationOccurrences.filter(item=>item.ruleId===finite.rule.id).sort((a,b)=>a.sequence-b.sequence);
assert.equal(finiteOccurrences.length,11);
assert.deepEqual(finiteOccurrences.map(item=>item.sequence),[1,2,3,4,5,6,7,8,9,10,11]);
assert.deepEqual(finiteOccurrences.slice(0,4).map(item=>{const d=new Date(item.scheduledDueAt);return[d.getFullYear(),d.getMonth()+1,d.getDate()]}),[[2026,7,25],[2026,10,25],[2027,1,25],[2027,4,25]]);
obligations.normalizeState(state,NOW);
assert.equal(state.obligationOccurrences.filter(item=>item.ruleId===finite.rule.id).length,11,'re-normalization must not duplicate occurrences');

// Month-end anchoring must preserve intended day instead of drifting after February.
const monthEndState=stateFixture();
const monthEnd=obligations.createRule(monthEndState,{name:'31 число',amount:30,dueAt:new Date(2026,0,31).getTime(),cadence:'recurring',intervalValue:1,intervalUnit:'month',endingMode:'count',paymentCount:4,walletId:'wallet-household-main',categoryId:'cat-rent',currency:'EUR'},'member-anna',new Date(2026,0,1).getTime());
obligations.ensureOccurrencesWindow(monthEndState,-Infinity,new Date(2026,6,1).getTime(),NOW);
assert.deepEqual(monthEndState.obligationOccurrences.filter(item=>item.ruleId===monthEnd.rule.id).sort((a,b)=>a.sequence-b.sequence).map(item=>new Date(item.scheduledDueAt).getDate()),[31,28,31,30]);

// Overdue and later planned occurrences must coexist.
const overdueState=stateFixture();
const overdue=obligations.createRule(overdueState,{name:'Просроченная подписка',amount:20,dueAt:new Date(2026,4,1).getTime(),cadence:'recurring',intervalValue:1,intervalUnit:'month',endingMode:'count',paymentCount:4,walletId:'wallet-household-main',categoryId:'cat-rent',currency:'EUR'},'member-anna',NOW);
obligations.ensureOccurrencesWindow(overdueState,-Infinity,new Date(2026,10,1).getTime(),NOW);
const overdueOccurrences=overdueState.obligationOccurrences.filter(item=>item.ruleId===overdue.rule.id).sort((a,b)=>a.sequence-b.sequence);
assert.ok(overdueOccurrences.some(item=>obligations.occurrenceDisplayStatus(item,NOW)==='overdue'));
assert.ok(overdueOccurrences.some(item=>obligations.occurrenceDisplayStatus(item,NOW)==='planned'));

// Moving one occurrence must not rewrite adjacent occurrences or the schedule.
finiteOccurrences=state.obligationOccurrences.filter(item=>item.ruleId===finite.rule.id).sort((a,b)=>a.sequence-b.sequence);
const second=finiteOccurrences[1],third=finiteOccurrences[2],thirdDueBefore=third.dueAt,ruleScheduleBefore=JSON.stringify(finite.rule.scheduleVersions);
const moved=obligations.moveOccurrence(state,second.id,second.dueAt+5*DAY,'member-anna',NOW+2);
assert.equal(moved.ok,true);
assert.equal(third.dueAt,thirdDueBefore);
assert.equal(JSON.stringify(finite.rule.scheduleVersions),ruleScheduleBefore);

// Amount versions: default scope starts with the next occurrence; one-occurrence override remains local.
const first=finiteOccurrences[0];
assert.equal(obligations.changeExpectedAmount(state,first.id,150,'starting_next','member-anna',NOW+3).ok,true);
assert.equal(first.expectedAmount,120);
assert.equal(second.expectedAmount,150);
assert.equal(third.expectedAmount,150);
assert.equal(obligations.changeExpectedAmount(state,second.id,145,'only_this','member-anna',NOW+4).ok,true);
assert.equal(second.expectedAmount,145);
assert.equal(third.expectedAmount,150);

// Legacy monthly input remains readable and becomes recurring schema-v4 state.
const legacyState=stateFixture();
legacyState.obligationRules=[{id:'legacy',name:'Legacy',cadence:'monthly',nextDueAt:new Date(2026,6,1).getTime(),amount:15,currency:'EUR',walletId:'wallet-household-main',categoryId:'cat-rent',status:'active'}];
legacyState.obligationOccurrences=[{id:'legacy-occ',ruleId:'legacy',scheduledDueAt:new Date(2026,6,1).getTime(),dueAt:new Date(2026,6,1).getTime(),expectedAmount:15,currency:'EUR',walletId:'wallet-household-main',categoryId:'cat-rent',status:'planned'}];
obligations.normalizeState(legacyState,NOW);
assert.equal(legacyState.obligationRules[0].cadence,'recurring');
assert.equal(legacyState.obligationRules[0].intervalUnit,'month');
assert.equal(legacyState.obligationOccurrences[0].sequence,1);

// Archive stops generation but preserves all existing occurrences and linked facts.
const archiveState=stateFixture();
const archive=obligations.createRule(archiveState,{name:'Архив',amount:10,dueAt:new Date(2026,6,23).getTime(),cadence:'recurring',intervalValue:1,intervalUnit:'month',endingMode:'unlimited',walletId:'wallet-household-main',categoryId:'cat-rent',currency:'EUR'},'member-anna',NOW);
const archiveCount=archiveState.obligationOccurrences.length;
assert.equal(obligations.archiveRule(archiveState,archive.rule.id,'member-anna',NOW).ok,true);
obligations.ensureOccurrencesWindow(archiveState,-Infinity,new Date(2035,0,1).getTime(),NOW);
assert.equal(archiveState.obligationOccurrences.length,archiveCount);
assert.equal(archive.rule.status,'archived');
assert.equal(obligations.restoreRule(archiveState,archive.rule.id,'member-anna',NOW).ok,true);

// Scope isolation remains intact.
const personal=obligations.createRule(state,{name:'Личная подписка',amount:12,dueAt:NOW+DAY,cadence:'recurring',intervalValue:1,intervalUnit:'month',endingMode:'count',paymentCount:3,walletId:'wallet-personal-anna',categoryId:'cat-rent',currency:'EUR'},'member-anna',NOW+5);
assert.equal(personal.ok,true);
const householdVisible=obligations.visibleRules(state,new Set(['wallet-household-main']));
const personalVisible=obligations.visibleRules(state,new Set(['wallet-personal-anna']));
assert.ok(!householdVisible.some(rule=>rule.id===personal.rule.id));
assert.ok(personalVisible.some(rule=>rule.id===personal.rule.id));

console.log(JSON.stringify({
  status:'PASS',
  marker:'PF08A_M3_02_DOMAIN_PASS',
  schemaV4:true,
  oneFactOneExpense:true,
  duplicatePaymentRejected:true,
  stableOperationCorrection:true,
  arbitraryRecurrence:true,
  exactCount:true,
  idempotentGeneration:true,
  monthEndAnchoring:true,
  overdueCoexists:true,
  oneOccurrenceMove:true,
  amountVersions:true,
  legacyReadable:true,
  archiveHistory:true,
  scopeIsolation:true
},null,2));
