(()=>{
  'use strict';
  const root=typeof window!=='undefined'?window:globalThis;
  if(root.DecisionOSProtectionCoreV1)return;

  const LANES=new Set(['interactive','auth','recovery','batch','sync','system']);
  const METRICS=new Set(['requests','writes','items','bytes']);
  const LIMIT_OUTCOMES=new Set(['RETRY_LATER','REJECT','CHALLENGE']);
  const FAILURE_MODES=new Set(['FAIL_CLOSED','FAIL_OPEN']);
  const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
  const nonBlankString=value=>typeof value==='string'&&value.trim()?value:null;
  const nonNegativeInteger=value=>Number.isSafeInteger(value)&&value>=0;
  const positiveInteger=value=>Number.isSafeInteger(value)&&value>0;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const freezeDecision=(outcome,reasonCode,matchedRuleIds,retryAfterMs,auditClass)=>Object.freeze({
    outcome,
    reasonCode,
    matchedRuleIds:Object.freeze([...matchedRuleIds]),
    ...(retryAfterMs==null?{}:{retryAfterMs}),
    auditClass
  });
  const failure=(error)=>Object.freeze({ok:false,error});

  function normalizeRequest(input){
    if(!input||typeof input!=='object'||Array.isArray(input))return failure('invalid_protection_request');
    const productId=nonBlankString(input.productId),operationClass=nonBlankString(input.operationClass),lane=nonBlankString(input.lane),requestId=nonBlankString(input.requestId);
    if(!productId||!operationClass||!lane||!LANES.has(lane)||!requestId)return failure('invalid_protection_request');
    if(!Array.isArray(input.identities)||!input.identities.length)return failure('invalid_protection_identities');
    const seen=new Set(),identities=[];
    for(const identity of input.identities){
      if(!identity||typeof identity!=='object'||Array.isArray(identity))return failure('invalid_protection_identities');
      const dimension=nonBlankString(identity.dimension),value=nonBlankString(identity.value);
      if(!dimension||!value||seen.has(dimension))return failure('invalid_protection_identities');
      seen.add(dimension);
      identities.push(Object.freeze({dimension,value}));
    }
    const rawCost=input.cost;
    if(!rawCost||typeof rawCost!=='object'||Array.isArray(rawCost))return failure('invalid_protection_cost');
    const cost={
      requests:rawCost.requests,
      writes:rawCost.writes,
      items:rawCost.items,
      bytes:rawCost.bytes
    };
    if(!positiveInteger(cost.requests)||!nonNegativeInteger(cost.writes)||!nonNegativeInteger(cost.items)||!nonNegativeInteger(cost.bytes))return failure('invalid_protection_cost');
    const idempotencyKey=input.idempotencyKey==null?null:nonBlankString(input.idempotencyKey);
    const replayKey=input.replayKey==null?null:nonBlankString(input.replayKey);
    if(input.idempotencyKey!=null&&!idempotencyKey)return failure('invalid_idempotency_key');
    if(input.replayKey!=null&&!replayKey)return failure('invalid_replay_key');
    return Object.freeze({
      ok:true,
      request:Object.freeze({productId,operationClass,lane,identities:Object.freeze(identities),cost:Object.freeze(cost),idempotencyKey,replayKey,requestId})
    });
  }

  function normalizeWindow(window){
    if(!window||typeof window!=='object'||Array.isArray(window))return null;
    if(!positiveInteger(window.ms)||!positiveInteger(window.limit))return null;
    return Object.freeze({ms:window.ms,limit:window.limit});
  }

  function normalizeRule(rule){
    if(!rule||typeof rule!=='object'||Array.isArray(rule))return failure('invalid_protection_rule');
    const ruleId=nonBlankString(rule.ruleId),operationClass=nonBlankString(rule.operationClass),lane=nonBlankString(rule.lane),identityDimension=nonBlankString(rule.identityDimension),metric=nonBlankString(rule.metric),outcomeOnLimit=nonBlankString(rule.outcomeOnLimit),failureMode=nonBlankString(rule.failureMode);
    const shortWindow=normalizeWindow(rule.shortWindow),longWindow=normalizeWindow(rule.longWindow);
    if(!ruleId||!operationClass||!lane||!LANES.has(lane)||!identityDimension||!metric||!METRICS.has(metric)||!shortWindow||!longWindow||!outcomeOnLimit||!LIMIT_OUTCOMES.has(outcomeOnLimit)||!failureMode||!FAILURE_MODES.has(failureMode))return failure('invalid_protection_rule');
    const maxItems=rule.maxItems==null?null:rule.maxItems,maxBytes=rule.maxBytes==null?null:rule.maxBytes;
    if(maxItems!=null&&!nonNegativeInteger(maxItems))return failure('invalid_protection_rule');
    if(maxBytes!=null&&!nonNegativeInteger(maxBytes))return failure('invalid_protection_rule');
    return Object.freeze({ok:true,rule:Object.freeze({ruleId,operationClass,lane,identityDimension,metric,shortWindow,longWindow,outcomeOnLimit,failureMode,maxItems,maxBytes})});
  }

  function compile(requestInput,rulesInput){
    const normalizedRequest=normalizeRequest(requestInput);
    if(!normalizedRequest.ok)return normalizedRequest;
    if(!Array.isArray(rulesInput))return failure('invalid_protection_rules');
    const rules=[],ruleIds=new Set();
    for(const rawRule of rulesInput){
      const normalized=normalizeRule(rawRule);
      if(!normalized.ok)return normalized;
      if(ruleIds.has(normalized.rule.ruleId))return failure('duplicate_protection_rule_id');
      ruleIds.add(normalized.rule.ruleId);
      if(normalized.rule.operationClass===normalizedRequest.request.operationClass&&normalized.rule.lane===normalizedRequest.request.lane)rules.push(normalized.rule);
    }
    if(!rules.length)return failure('protection_policy_missing');
    const identityMap=new Map(normalizedRequest.request.identities.map(identity=>[identity.dimension,identity.value]));
    const checks=[];
    for(const rule of rules){
      const identityValue=identityMap.get(rule.identityDimension);
      if(!identityValue)return failure('required_protection_identity_missing');
      if(rule.maxItems!=null&&normalizedRequest.request.cost.items>rule.maxItems){
        return Object.freeze({ok:true,plan:Object.freeze({request:normalizedRequest.request,rules:Object.freeze(rules),checks:Object.freeze([]),preDecision:freezeDecision('REJECT','hard_item_cap_exceeded',[rule.ruleId],null,'protection_hard_cap')})});
      }
      if(rule.maxBytes!=null&&normalizedRequest.request.cost.bytes>rule.maxBytes){
        return Object.freeze({ok:true,plan:Object.freeze({request:normalizedRequest.request,rules:Object.freeze(rules),checks:Object.freeze([]),preDecision:freezeDecision('REJECT','hard_byte_cap_exceeded',[rule.ruleId],null,'protection_hard_cap')})});
      }
      const amount=normalizedRequest.request.cost[rule.metric];
      if(amount===0)continue;
      checks.push(Object.freeze({
        ruleId:rule.ruleId,
        identityDimension:rule.identityDimension,
        identityValue,
        metric:rule.metric,
        amount,
        shortWindow:rule.shortWindow,
        longWindow:rule.longWindow,
        outcomeOnLimit:rule.outcomeOnLimit,
        failureMode:rule.failureMode,
        budgetKey:`${rule.ruleId}\u0000${rule.identityDimension}\u0000${identityValue}`
      }));
    }
    return Object.freeze({ok:true,plan:Object.freeze({request:normalizedRequest.request,rules:Object.freeze(rules),checks:Object.freeze(checks),preDecision:null})});
  }

  function bucketAfter(bucket,window,amount,nowMs){
    let tokens=window.limit,effectiveNow=nowMs;
    if(bucket!=null){
      if(!bucket||typeof bucket!=='object'||!Number.isFinite(bucket.tokens)||bucket.tokens<0||bucket.tokens>window.limit||!Number.isFinite(bucket.lastMs)||bucket.lastMs<0)return {ok:false};
      effectiveNow=Math.max(nowMs,bucket.lastMs);
      const elapsed=effectiveNow-bucket.lastMs;
      tokens=Math.min(window.limit,bucket.tokens+(elapsed*window.limit/window.ms));
    }
    if(tokens+Number.EPSILON<amount){
      const deficit=amount-tokens;
      return {ok:true,allowed:false,retryAfterMs:Math.max(1,Math.ceil(deficit*window.ms/window.limit)),next:Object.freeze({tokens,lastMs:effectiveNow})};
    }
    return {ok:true,allowed:true,retryAfterMs:0,next:Object.freeze({tokens:tokens-amount,lastMs:effectiveNow})};
  }

  function evaluate(plan,stateInput,nowMs){
    if(!plan||typeof plan!=='object'||!plan.request||!Array.isArray(plan.checks))return failure('invalid_protection_plan');
    if(!Number.isFinite(nowMs)||nowMs<0)return failure('invalid_protection_time');
    if(plan.preDecision)return Object.freeze({ok:true,decision:plan.preDecision,nextState:stateInput&&typeof stateInput==='object'?clone(stateInput):{}});
    const current=stateInput==null?{}:stateInput;
    if(typeof current!=='object'||Array.isArray(current))return failure('invalid_protection_state');
    let working;
    try{working=clone(current)}catch{return failure('invalid_protection_state')}
    const staged=[];
    let limitOutcome=null,reasonCode=null,retryAfterMs=0,limitRules=[];
    for(const check of plan.checks){
      const hasExisting=own(current,check.budgetKey);
      const existing=hasExisting?current[check.budgetKey]:null;
      if(hasExisting&&(
        !existing||typeof existing!=='object'||Array.isArray(existing)||
        !own(existing,'short')||!own(existing,'long')||
        !existing.short||typeof existing.short!=='object'||Array.isArray(existing.short)||
        !existing.long||typeof existing.long!=='object'||Array.isArray(existing.long)
      ))return failure('invalid_protection_state');
      const shortResult=bucketAfter(existing?.short,check.shortWindow,check.amount,nowMs);
      const longResult=bucketAfter(existing?.long,check.longWindow,check.amount,nowMs);
      if(!shortResult.ok||!longResult.ok)return failure('invalid_protection_state');
      if(!shortResult.allowed||!longResult.allowed){
        const thisRetry=Math.max(shortResult.retryAfterMs,longResult.retryAfterMs);
        retryAfterMs=Math.max(retryAfterMs,thisRetry);
        limitRules.push(check.ruleId);
        if(!limitOutcome||check.outcomeOnLimit==='REJECT'||(check.outcomeOnLimit==='CHALLENGE'&&limitOutcome==='RETRY_LATER'))limitOutcome=check.outcomeOnLimit;
        reasonCode='rate_limit_exceeded';
      }
      staged.push([check.budgetKey,Object.freeze({short:shortResult.next,long:longResult.next})]);
    }
    if(limitOutcome){
      return Object.freeze({ok:true,decision:freezeDecision(limitOutcome,reasonCode,limitRules,retryAfterMs,'protection_rate_limit'),nextState:clone(current)});
    }
    for(const [key,value] of staged)working[key]=value;
    return Object.freeze({ok:true,decision:freezeDecision('ALLOW','within_budget',plan.checks.map(check=>check.ruleId),null,'protection_allow'),nextState:working});
  }

  root.DecisionOSProtectionCoreV1=Object.freeze({LANES:Object.freeze([...LANES]),METRICS:Object.freeze([...METRICS]),compile,evaluate});
})(typeof window!=='undefined'?window:globalThis);
