const assert=require('node:assert/strict');
const api=require('../familypilot-savings.js');

const state={schemaVersion:5,household:{baseCurrency:'EUR'},operations:[{id:'op-1',kind:'income',amount:100,status:'active'}]};
api.normalizeState(state);
assert.equal(state.schemaVersion,6);
assert.deepEqual(state.savingsGoals,[]);

const operationSnapshot=JSON.stringify(state.operations);
const first=api.createGoal(state,{name:'Отпуск',targetAmount:2000,savedAmount:250,targetDate:Date.UTC(2027,5,1)},1000);
assert.equal(first.currency,'EUR');
assert.equal(api.progress(first).remaining,1750);
assert.equal(api.progress(first).percent,12.5);
const stableId=first.id;

api.updateGoal(state,stableId,{name:'Большой отпуск',targetAmount:2200,savedAmount:400,targetDate:null},2000);
assert.equal(api.getGoal(state,stableId).id,stableId);
assert.equal(api.getGoal(state,stableId).targetDate,null);
assert.equal(api.progress(api.getGoal(state,stableId)).remaining,1800);

api.createGoal(state,{name:'Техника',targetAmount:100,savedAmount:150},2500);
assert.equal(api.summary(state).count,2);
assert.equal(api.summary(state).remaining,1800);

api.archiveGoal(state,stableId,3000);
assert.equal(api.activeGoals(state).length,1);
assert.equal(api.archivedGoals(state).length,1);
assert.throws(()=>api.updateGoal(state,stableId,{name:'x',targetAmount:1,savedAmount:0}),/Архивную/);
assert.equal(JSON.stringify(state.operations),operationSnapshot,'Savings configuration must not mutate operations');

const roundTrip=JSON.parse(JSON.stringify(state));
api.normalizeState(roundTrip);
assert.equal(roundTrip.savingsGoals.length,2);
assert.equal(roundTrip.savingsGoals[0].id,stableId);

const malformed={schemaVersion:5,household:{baseCurrency:'EUR'},operations:[{id:'keep'}],savingsGoals:'broken'};
api.normalizeState(malformed);
assert.deepEqual(malformed.savingsGoals,[]);
assert.deepEqual(malformed.operations,[{id:'keep'}]);

console.log(JSON.stringify({status:'PASS',marker:'PF08A_M4_01_DOMAIN_PASS',stableId:true,persistence:true,archive:true,noOperationsMutation:true,optionalDate:true,malformedNormalization:true},null,2));