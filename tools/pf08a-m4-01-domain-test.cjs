'use strict';

const assert=require('node:assert/strict');
const savings=require('../familypilot-savings-goals.js');

const state={
  schemaVersion:5,
  household:{id:'household-test',baseCurrency:'EUR',openingCapital:5000},
  currentMemberId:'member-anna',
  wallets:[{id:'wallet-household-main',type:'household_default',openingBalance:0}],
  categories:[{id:'cat-exp-food',kind:'expense',name:'Продукты'}],
  operations:[{id:'op-existing',kind:'expense',amount:25,walletId:'wallet-household-main',status:'active',links:{}}],
  obligationRules:[{id:'obligation-existing'}],
  obligationOccurrences:[{id:'occurrence-existing'}],
  debtCounterparties:[{id:'counterparty-existing'}],
  debtChains:[{id:'chain-existing'}],
  debtEvents:[{id:'event-existing'}]
};
const protectedSnapshot=()=>JSON.stringify({
  household:state.household,
  wallets:state.wallets,
  categories:state.categories,
  operations:state.operations,
  obligationRules:state.obligationRules,
  obligationOccurrences:state.obligationOccurrences,
  debtCounterparties:state.debtCounterparties,
  debtChains:state.debtChains,
  debtEvents:state.debtEvents
});

const before=protectedSnapshot();
savings.normalizeState(state,1000);
assert.equal(state.schemaVersion,6);
assert.deepEqual(state.savingsGoals,[]);
assert.deepEqual(savings.summary(state),{active:0,archived:0,status:'green',optional:true});
assert.equal(protectedSnapshot(),before,'Savings normalization changed another financial domain');

assert.equal(savings.createGoal(state,{name:'',targetAmount:100,savedAmount:0},'member-anna',1100).ok,false);
assert.equal(savings.createGoal(state,{name:'Отпуск',targetAmount:0,savedAmount:0},'member-anna',1100).ok,false);
assert.equal(savings.createGoal(state,{name:'Отпуск',targetAmount:100,savedAmount:-1},'member-anna',1100).ok,false);
assert.equal(savings.createGoal(state,{name:'Отпуск',targetAmount:100,savedAmount:0,targetDate:'2026-99-99'},'member-anna',1100).ok,false);

const created=savings.createGoal(state,{name:'  Семейный отпуск  ',targetAmount:5000,savedAmount:1200,targetDate:'2027-06-15'},'member-anna',1200);
assert.equal(created.ok,true);
assert.equal(created.goal.name,'Семейный отпуск');
assert.equal(created.goal.scope,'household');
assert.equal(created.goal.householdId,'household-test');
assert.equal(created.goal.targetAmount,5000);
assert.equal(created.goal.savedAmount,1200);
assert.equal(created.goal.targetDate,'2027-06-15');
assert.equal(created.goal.status,'active');
assert.equal(savings.activeGoals(state).length,1);
assert.deepEqual(savings.progress(created.goal),{target:5000,saved:1200,remaining:3800,percent:24});
assert.equal(protectedSnapshot(),before,'Creating a goal invented a money movement or changed another module');

const stableId=created.goal.id;
const updated=savings.updateGoal(state,stableId,{name:'Семейный отпуск',targetAmount:5500,savedAmount:1500,targetDate:''},'member-anna',1300);
assert.equal(updated.ok,true);
assert.equal(updated.goal.id,stableId);
assert.equal(updated.goal.targetAmount,5500);
assert.equal(updated.goal.savedAmount,1500);
assert.equal(updated.goal.targetDate,null);
assert.equal(updated.goal.revisions.length,1);
assert.equal(savings.progress(updated.goal).remaining,4000);
assert.equal(protectedSnapshot(),before,'Editing a goal changed wallet or operation state');

const archived=savings.archiveGoal(state,stableId,'member-anna',1400);
assert.equal(archived.ok,true);
assert.equal(archived.goal.status,'archived');
assert.equal(archived.goal.archivedAt,1400);
assert.equal(savings.activeGoals(state).length,0);
assert.equal(savings.archivedGoals(state).length,1);
assert.equal(state.savingsGoals[0].id,stableId,'Archive deleted or replaced the goal object');
assert.equal(savings.updateGoal(state,stableId,{name:'Нельзя',targetAmount:1,savedAmount:0},'member-anna',1500).ok,false,'Archived goal remained editable');
assert.deepEqual(savings.summary(state),{active:0,archived:1,status:'green',optional:true});
assert.equal(protectedSnapshot(),before,'Archiving a goal changed another financial domain');

const malformed={schemaVersion:2,household:{id:'household-malformed'},savingsGoals:[null,{}, {id:'kept',name:' ',targetAmount:'bad',savedAmount:-10,targetDate:'2026-99-99'}]};
savings.normalizeState(malformed,2000);
assert.equal(malformed.schemaVersion,6);
assert.equal(malformed.savingsGoals.length,2);
assert.ok(malformed.savingsGoals.every(goal=>goal.targetAmount>=0&&goal.savedAmount>=0));
assert.ok(malformed.savingsGoals.every(goal=>goal.targetDate===null));

console.log(JSON.stringify({
  status:'PASS',
  marker:'PF08A_M4_01_DOMAIN_PASS',
  optionalGoals:true,
  stableId:true,
  targetAndSavedDistinct:true,
  editPreservesObject:true,
  archivePreservesObject:true,
  noMoneyMovement:true,
  malformedStateNormalized:true
},null,2));