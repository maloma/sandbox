'use strict';
const assert=require('assert');
require('../decisionos-protection-core-v1.js');
require('../familypilot-protection-v1.js');
const Core=global.DecisionOSProtectionCoreV1;
const FP=global.FamilyPilotProtectionV1;
assert(Core&&FP,'Protection Core and FamilyPilot adapter must load');
assert.equal(FP.POLICY_VERSION,1);
assert.equal(FP.PRODUCT_ID,'familypilot');

const ids={household:'hh-a',account:'acct-a',device:'dev-a',session:'sess-a',source:'src-a',network:'net-a',job:'job-a'};
const build=(operationClass,overrides={})=>FP.buildRequest({
  operationClass,
  identities:{...ids,...(overrides.identities||{})},
  requestId:overrides.requestId||`req-${operationClass}`,
  idempotencyKey:overrides.idempotencyKey===undefined?'idem-1':overrides.idempotencyKey,
  replayKey:overrides.replayKey===undefined?'replay-1':overrides.replayKey,
  writes:overrides.writes,
  items:overrides.items,
  bytes:overrides.bytes
});

assert(Object.values(FP.OPS).every(op=>FP.rulesFor(op).length>0),'every FamilyPilot operation class must have explicit rules');
assert(FP.RULES.every(rule=>rule.identityDimension!=='global'&&rule.identityDimension!=='product'),'no product-global abuse limiter is allowed');
assert(FP.RULES.every(rule=>rule.failureMode==='FAIL_CLOSED'),'FamilyPilot v1 mutation protection policy must fail closed');
assert(String(FP.INTEGRATION_POINTS.authoritativeMutation).includes('prepareCommit/commitAuthoritative'));
assert(String(FP.INTEGRATION_POINTS.authoritativeMutation).includes('browser-only'));

for(const operationClass of [FP.OPS.IMPORT_BATCH,FP.OPS.SYNC_BATCH]){
  const rules=FP.rulesFor(operationClass);
  const spec=FP.SPECS[operationClass];
  assert(rules.some(rule=>rule.metric==='requests'),`${operationClass} must bound request rate`);
  assert(rules.some(rule=>rule.metric==='writes'),`${operationClass} must bound write rate`);
  for(const dimension of spec.required){
    assert(rules.some(rule=>rule.identityDimension===dimension),`${operationClass} must protect required identity ${dimension}`);
  }
  assert(rules.some(rule=>rule.identityDimension==='account'&&rule.metric==='writes'),`${operationClass} must have account-scoped write budget`);
  assert(rules.some(rule=>rule.identityDimension==='household'&&rule.metric==='writes'),`${operationClass} must have household-scoped write budget`);
}

const financial=build(FP.OPS.FINANCIAL_WRITE,{replayKey:null});
assert.equal(financial.ok,true);
assert.equal(financial.request.lane,'interactive');
assert.equal(financial.request.cost.writes,1);
assert(financial.rules.some(rule=>rule.identityDimension==='household'));
assert(financial.rules.some(rule=>rule.identityDimension==='account'));
assert(financial.rules.some(rule=>rule.identityDimension==='session'));

const opaque=build(FP.OPS.SENSITIVE_FINANCIAL_WRITE,{
  identities:{source:' src-a ',session:' sess-a '},
  requestId:' request-id ',
  idempotencyKey:' idem-key ',
  replayKey:' replay-key '
});
assert.equal(opaque.ok,true);
assert.equal(opaque.request.identities.find(identity=>identity.dimension==='source').value,' src-a ');
assert.equal(opaque.request.identities.find(identity=>identity.dimension==='session').value,' sess-a ');
assert.equal(opaque.request.requestId,' request-id ');
assert.equal(opaque.request.idempotencyKey,' idem-key ');
assert.equal(opaque.request.replayKey,' replay-key ');

const missingIdem=build(FP.OPS.FINANCIAL_WRITE,{idempotencyKey:null,replayKey:null});
assert.equal(missingIdem.ok,false);
assert.equal(missingIdem.error,'idempotency_key_required');
const missingReplay=build(FP.OPS.SENSITIVE_FINANCIAL_WRITE,{replayKey:null});
assert.equal(missingReplay.ok,false);
assert.equal(missingReplay.error,'replay_key_required');
const missingTrusted=FP.buildRequest({operationClass:FP.OPS.FINANCIAL_WRITE,identities:{...ids,session:''},requestId:'r',idempotencyKey:'i'});
assert.equal(missingTrusted.ok,false);
assert.equal(missingTrusted.error,'trusted_identity_missing:session');

const importTooLarge=build(FP.OPS.IMPORT_BATCH,{items:501,bytes:1000});
assert.equal(importTooLarge.ok,true);
let compiled=Core.compile(importTooLarge.request,importTooLarge.rules);
assert.equal(compiled.ok,true);
let evaluated=Core.evaluate(compiled.plan,{},1_000);
assert.equal(evaluated.decision.outcome,'REJECT');
assert.equal(evaluated.decision.reasonCode,'hard_item_cap_exceeded');

const syncTooLarge=build(FP.OPS.SYNC_BATCH,{items:200,bytes:1024*1024+1});
compiled=Core.compile(syncTooLarge.request,syncTooLarge.rules);
evaluated=Core.evaluate(compiled.plan,{},1_000);
assert.equal(evaluated.decision.outcome,'REJECT');
assert.equal(evaluated.decision.reasonCode,'hard_byte_cap_exceeded');

for(const operationClass of [FP.OPS.IMPORT_BATCH,FP.OPS.SYNC_BATCH]){
  const hugeWrite=build(operationClass,{writes:1_000_000,items:1,bytes:1,requestId:`huge-write-${operationClass}`});
  assert.equal(hugeWrite.ok,true);
  const c=Core.compile(hugeWrite.request,hugeWrite.rules);
  assert.equal(c.ok,true);
  const before={};
  const r=Core.evaluate(c.plan,before,1_000);
  assert.equal(r.ok,true);
  assert.equal(r.decision.outcome,'RETRY_LATER',`${operationClass} huge write cost must be bounded`);
  assert(r.decision.matchedRuleIds.some(ruleId=>ruleId.includes('.account.writes')),`${operationClass} account write rule must participate in rejection`);
  assert(r.decision.matchedRuleIds.some(ruleId=>ruleId.includes('.household.writes')),`${operationClass} household write rule must participate in rejection`);
  assert.deepStrictEqual(before,{},'huge write rejection must not mutate input state');
  assert.deepStrictEqual(r.nextState,{},'huge write rejection must not partially consume batch/sync budgets');
}

for(const operationClass of [FP.OPS.IMPORT_BATCH,FP.OPS.SYNC_BATCH]){
  const normalBatch=build(operationClass,{writes:10,items:10,bytes:1000,requestId:`normal-batch-${operationClass}`});
  const c=Core.compile(normalBatch.request,normalBatch.rules);
  const r=Core.evaluate(c.plan,{},2_000);
  assert.equal(r.decision.outcome,'ALLOW',`${operationClass} bounded normal work should remain allowed`);
}

let recoveryState={};
for(let i=0;i<3;i++){
  const recovery=FP.buildRequest({operationClass:FP.OPS.ACCESS_RECOVERY,identities:ids,requestId:`recovery-${i}`,replayKey:`recovery-replay-${i}`});
  const c=Core.compile(recovery.request,recovery.rules);
  const r=Core.evaluate(c.plan,recoveryState,10_000);
  assert.equal(r.decision.outcome,'ALLOW');
  recoveryState=r.nextState;
}
const recovery4=FP.buildRequest({operationClass:FP.OPS.ACCESS_RECOVERY,identities:ids,requestId:'recovery-4',replayKey:'recovery-replay-4'});
const recovery4Decision=Core.evaluate(Core.compile(recovery4.request,recovery4.rules).plan,recoveryState,10_000);
assert.equal(recovery4Decision.decision.outcome,'CHALLENGE');
assert.equal(recovery4Decision.decision.reasonCode,'rate_limit_exceeded');

let state={};
let attackerAllowed=0,attackerLimited=0;
for(let i=0;i<10_000;i++){
  const req=FP.buildRequest({
    operationClass:FP.OPS.FINANCIAL_WRITE,
    identities:ids,
    requestId:`attack-${i}`,
    idempotencyKey:`attack-idem-${i}`
  });
  const c=Core.compile(req.request,req.rules);
  const r=Core.evaluate(c.plan,state,20_000);
  if(r.decision.outcome==='ALLOW'){
    attackerAllowed++;
    state=r.nextState;
  }else{
    attackerLimited++;
    assert.equal(r.decision.outcome,'RETRY_LATER');
  }
}
assert.equal(attackerAllowed,60,'single abusive source must be bounded by scoped FamilyPilot budgets');
assert.equal(attackerLimited,9_940);

let normalAllowed=0;
for(let i=0;i<100;i++){
  const normalIds={household:`hh-${i}`,account:`acct-${i}`,device:`dev-${i}`,session:`sess-${i}`,source:`src-${i}`,network:`net-${i}`,job:`job-${i}`};
  const req=FP.buildRequest({operationClass:FP.OPS.FINANCIAL_WRITE,identities:normalIds,requestId:`normal-${i}`,idempotencyKey:`normal-idem-${i}`});
  const c=Core.compile(req.request,req.rules);
  const r=Core.evaluate(c.plan,state,20_000);
  if(r.decision.outcome==='ALLOW'){
    normalAllowed++;
    state=r.nextState;
  }
}
assert.equal(normalAllowed,100,'independent normal users must remain admitted while attacker is limited');

const attackerStateSnapshot=JSON.stringify(state);
const rejectedAgain=FP.buildRequest({operationClass:FP.OPS.FINANCIAL_WRITE,identities:ids,requestId:'attack-final',idempotencyKey:'attack-idem-final'});
const rejectedAgainResult=Core.evaluate(Core.compile(rejectedAgain.request,rejectedAgain.rules).plan,state,20_000);
assert.equal(rejectedAgainResult.decision.outcome,'RETRY_LATER');
assert.equal(JSON.stringify(rejectedAgainResult.nextState),attackerStateSnapshot,'rejected admission must not partially consume budgets');

console.log('FP89_PROTECTION_ADAPTER_V1_PASS');
console.log('FP89_BATCH_SYNC_WRITE_BOUNDARY_PASS');
console.log(`FP89_OVERLOAD_ISOLATION_PASS attacker_allowed=${attackerAllowed} attacker_limited=${attackerLimited} normal_allowed=${normalAllowed}`);
