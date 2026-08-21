'use strict';
const assert=require('assert');
require('../decisionos-protection-core-v1.js');
const Core=global.DecisionOSProtectionCoreV1;
assert(Core,'Protection Core must load');

const baseRequest={
  productId:'test',operationClass:'write',lane:'interactive',requestId:'r1',
  identities:[{dimension:'account',value:'a1'},{dimension:'source',value:'s1'}],
  cost:{requests:1,writes:1,items:0,bytes:0}
};
const rules=[
  {ruleId:'account-write',operationClass:'write',lane:'interactive',identityDimension:'account',metric:'writes',shortWindow:{ms:60000,limit:2},longWindow:{ms:3600000,limit:10},outcomeOnLimit:'RETRY_LATER',failureMode:'FAIL_CLOSED'},
  {ruleId:'source-write',operationClass:'write',lane:'interactive',identityDimension:'source',metric:'writes',shortWindow:{ms:60000,limit:3},longWindow:{ms:3600000,limit:20},outcomeOnLimit:'REJECT',failureMode:'FAIL_CLOSED'}
];

const compiled=Core.compile(baseRequest,rules);
assert.equal(compiled.ok,true);
const empty={};
const first=Core.evaluate(compiled.plan,empty,1000);
assert.equal(first.ok,true);
assert.equal(first.decision.outcome,'ALLOW');
assert.deepStrictEqual(empty,{},'evaluate must not mutate input state');
const firstState=JSON.parse(JSON.stringify(first.nextState));
const second=Core.evaluate(compiled.plan,first.nextState,1000);
assert.equal(second.decision.outcome,'ALLOW');
const secondState=JSON.parse(JSON.stringify(second.nextState));
const third=Core.evaluate(compiled.plan,second.nextState,1000);
assert.equal(third.decision.outcome,'RETRY_LATER');
assert.deepStrictEqual(third.nextState,secondState,'rate-limit rejection must consume no partial budgets');
assert.notDeepStrictEqual(firstState,secondState);

const missingIdentity=Core.compile({...baseRequest,identities:[{dimension:'account',value:'a1'}]},rules);
assert.equal(missingIdentity.ok,false);
assert.equal(missingIdentity.error,'required_protection_identity_missing');

const capRule=[{ruleId:'cap',operationClass:'batch',lane:'batch',identityDimension:'source',metric:'items',shortWindow:{ms:60000,limit:100},longWindow:{ms:3600000,limit:1000},outcomeOnLimit:'RETRY_LATER',failureMode:'FAIL_CLOSED',maxItems:10,maxBytes:1000}];
const capRequest={productId:'test',operationClass:'batch',lane:'batch',requestId:'b1',identities:[{dimension:'source',value:'s1'}],cost:{requests:1,writes:0,items:11,bytes:10}};
const capCompiled=Core.compile(capRequest,capRule);
assert.equal(capCompiled.ok,true);
const capped=Core.evaluate(capCompiled.plan,{},1000);
assert.equal(capped.decision.outcome,'REJECT');
assert.equal(capped.decision.reasonCode,'hard_item_cap_exceeded');
assert.deepStrictEqual(capped.nextState,{});

const emojiIdentity='device-😀';
const utfRequest={...baseRequest,requestId:'utf',identities:[{dimension:'account',value:'a2'},{dimension:'source',value:emojiIdentity}]};
assert.equal(Core.compile(utfRequest,rules).ok,true,'opaque identity values must survive without normalization');

const plainOpaque=Core.compile({...baseRequest,requestId:' opaque-request ',idempotencyKey:' idem ',replayKey:' replay ',identities:[{dimension:'account',value:'a2'},{dimension:'source',value:'src'}]},rules);
const spacedOpaque=Core.compile({...baseRequest,requestId:' opaque-request ',idempotencyKey:' idem ',replayKey:' replay ',identities:[{dimension:'account',value:'a2'},{dimension:'source',value:' src '}]},rules);
assert.equal(plainOpaque.ok,true);
assert.equal(spacedOpaque.ok,true);
assert.equal(spacedOpaque.plan.request.requestId,' opaque-request ');
assert.equal(spacedOpaque.plan.request.idempotencyKey,' idem ');
assert.equal(spacedOpaque.plan.request.replayKey,' replay ');
assert.equal(spacedOpaque.plan.request.identities.find(identity=>identity.dimension==='source').value,' src ');
assert.notEqual(
  plainOpaque.plan.checks.find(check=>check.identityDimension==='source').budgetKey,
  spacedOpaque.plan.checks.find(check=>check.identityDimension==='source').budgetKey,
  'distinct opaque identity values must not collapse through normalization'
);

const rollbackRule=[{ruleId:'rollback-source',operationClass:'write',lane:'interactive',identityDimension:'source',metric:'writes',shortWindow:{ms:1000,limit:2},longWindow:{ms:1000,limit:2},outcomeOnLimit:'RETRY_LATER',failureMode:'FAIL_CLOSED'}];
const rollbackCompiled=Core.compile({...baseRequest,identities:[{dimension:'source',value:'rollback'}]},rollbackRule);
assert.equal(rollbackCompiled.ok,true);
const rollbackFirst=Core.evaluate(rollbackCompiled.plan,{},1000);
assert.equal(rollbackFirst.decision.outcome,'ALLOW');
const rollbackSecond=Core.evaluate(rollbackCompiled.plan,rollbackFirst.nextState,0);
assert.equal(rollbackSecond.decision.outcome,'ALLOW');
const rollbackKey=rollbackCompiled.plan.checks[0].budgetKey;
assert.equal(rollbackSecond.nextState[rollbackKey].short.lastMs,1000,'clock rollback must not regress stored short-window time');
assert.equal(rollbackSecond.nextState[rollbackKey].long.lastMs,1000,'clock rollback must not regress stored long-window time');
const rollbackThird=Core.evaluate(rollbackCompiled.plan,rollbackSecond.nextState,500);
assert.equal(rollbackThird.decision.outcome,'RETRY_LATER','clock rollback followed by recovery must not create artificial refill');

const invalidState=Core.evaluate(compiled.plan,{[compiled.plan.checks[0].budgetKey]:{short:{tokens:'bad',lastMs:0},long:{tokens:1,lastMs:0}}},1000);
assert.equal(invalidState.ok,false);
assert.equal(invalidState.error,'invalid_protection_state');

const activeBudgetKey=compiled.plan.checks[0].budgetKey;
const validSubbucket={tokens:1,lastMs:0};
const incompleteStates=[
  {},
  {short:validSubbucket},
  {long:validSubbucket},
  null,
  {short:null,long:validSubbucket},
  {short:undefined,long:validSubbucket},
  {short:validSubbucket,long:null},
  {short:validSubbucket,long:undefined},
  {short:[],long:validSubbucket},
  {short:validSubbucket,long:[]}
];
for(const incomplete of incompleteStates){
  const invalid=Core.evaluate(compiled.plan,{[activeBudgetKey]:incomplete},1000);
  assert.equal(invalid.ok,false,'incomplete or malformed persisted budget state must fail closed');
  assert.equal(invalid.error,'invalid_protection_state');
}

const absentBudget=Core.evaluate(compiled.plan,{},1000);
assert.equal(absentBudget.ok,true,'a truly absent budget key may initialize fresh capacity');
assert.equal(absentBudget.decision.outcome,'ALLOW');

const invalidRule=Core.compile(baseRequest,[{...rules[0],ruleId:'x',shortWindow:{ms:0,limit:2}}]);
assert.equal(invalidRule.ok,false);
assert.equal(invalidRule.error,'invalid_protection_rule');

console.log('FP89_PROTECTION_CORE_V1_PASS');
console.log('FP89_INCOMPLETE_STATE_FAIL_CLOSED_PASS');
console.log('FP89_MALFORMED_SUBBUCKET_FAIL_CLOSED_PASS');
