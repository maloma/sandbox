(()=>{
  'use strict';
  const root=typeof window!=='undefined'?window:globalThis;
  if(root.FamilyPilotProtectionV1)return;

  const POLICY_VERSION=1;
  const PRODUCT_ID='familypilot';
  const MiB=1024*1024;
  const OPS=Object.freeze({
    AUTH_LOGIN:'auth.login',
    ACCESS_RECOVERY:'auth.recovery',
    FINANCIAL_WRITE:'financial.write',
    SENSITIVE_FINANCIAL_WRITE:'financial.sensitive_write',
    IMPORT_BATCH:'data.import_batch',
    SYNC_BATCH:'data.sync_batch',
    DESTRUCTIVE_WRITE:'data.destructive_write',
    SYSTEM_WRITE:'system.write'
  });
  const opSet=new Set(Object.values(OPS));
  const nonBlankString=value=>typeof value==='string'&&value.trim()?value:null;
  const nonNegativeInteger=value=>Number.isSafeInteger(value)&&value>=0;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const freeze=value=>Object.freeze(value);
  const failure=error=>freeze({ok:false,error});
  const w=(ms,limit)=>freeze({ms,limit});
  const rule=(ruleId,operationClass,lane,identityDimension,metric,shortWindow,longWindow,outcomeOnLimit,failureMode='FAIL_CLOSED',caps={})=>freeze({
    ruleId,operationClass,lane,identityDimension,metric,shortWindow,longWindow,outcomeOnLimit,failureMode,
    ...(caps.maxItems==null?{}:{maxItems:caps.maxItems}),
    ...(caps.maxBytes==null?{}:{maxBytes:caps.maxBytes})
  });

  const RULES=freeze([
    rule('fp.auth.source',OPS.AUTH_LOGIN,'auth','source','requests',w(60_000,10),w(3_600_000,40),'CHALLENGE'),
    rule('fp.auth.device',OPS.AUTH_LOGIN,'auth','device','requests',w(60_000,15),w(3_600_000,90),'CHALLENGE'),
    rule('fp.auth.network',OPS.AUTH_LOGIN,'auth','network','requests',w(60_000,60),w(3_600_000,600),'CHALLENGE'),

    rule('fp.recovery.source',OPS.ACCESS_RECOVERY,'recovery','source','requests',w(900_000,3),w(3_600_000,8),'CHALLENGE'),
    rule('fp.recovery.device',OPS.ACCESS_RECOVERY,'recovery','device','requests',w(900_000,5),w(3_600_000,15),'CHALLENGE'),
    rule('fp.recovery.network',OPS.ACCESS_RECOVERY,'recovery','network','requests',w(900_000,20),w(3_600_000,120),'CHALLENGE'),

    rule('fp.financial.household',OPS.FINANCIAL_WRITE,'interactive','household','writes',w(60_000,60),w(3_600_000,1000),'RETRY_LATER'),
    rule('fp.financial.account',OPS.FINANCIAL_WRITE,'interactive','account','writes',w(60_000,60),w(3_600_000,1000),'RETRY_LATER'),
    rule('fp.financial.device',OPS.FINANCIAL_WRITE,'interactive','device','writes',w(60_000,90),w(3_600_000,1500),'RETRY_LATER'),
    rule('fp.financial.session',OPS.FINANCIAL_WRITE,'interactive','session','writes',w(60_000,120),w(3_600_000,1800),'RETRY_LATER'),
    rule('fp.financial.source',OPS.FINANCIAL_WRITE,'interactive','source','writes',w(60_000,120),w(3_600_000,2000),'RETRY_LATER'),

    rule('fp.sensitive.household',OPS.SENSITIVE_FINANCIAL_WRITE,'interactive','household','writes',w(60_000,20),w(3_600_000,200),'REJECT'),
    rule('fp.sensitive.account',OPS.SENSITIVE_FINANCIAL_WRITE,'interactive','account','writes',w(60_000,20),w(3_600_000,200),'REJECT'),
    rule('fp.sensitive.session',OPS.SENSITIVE_FINANCIAL_WRITE,'interactive','session','writes',w(60_000,30),w(3_600_000,300),'REJECT'),
    rule('fp.sensitive.source',OPS.SENSITIVE_FINANCIAL_WRITE,'interactive','source','writes',w(60_000,30),w(3_600_000,300),'REJECT'),

    rule('fp.import.job.requests',OPS.IMPORT_BATCH,'batch','job','requests',w(60_000,10),w(3_600_000,300),'RETRY_LATER','FAIL_CLOSED',{maxItems:500,maxBytes:2*MiB}),
    rule('fp.import.source.requests',OPS.IMPORT_BATCH,'batch','source','requests',w(60_000,10),w(3_600_000,300),'RETRY_LATER','FAIL_CLOSED',{maxItems:500,maxBytes:2*MiB}),
    rule('fp.import.job.items',OPS.IMPORT_BATCH,'batch','job','items',w(60_000,5000),w(3_600_000,100000),'RETRY_LATER','FAIL_CLOSED',{maxItems:500,maxBytes:2*MiB}),
    rule('fp.import.household.items',OPS.IMPORT_BATCH,'batch','household','items',w(60_000,5000),w(3_600_000,100000),'RETRY_LATER','FAIL_CLOSED',{maxItems:500,maxBytes:2*MiB}),
    rule('fp.import.account.items',OPS.IMPORT_BATCH,'batch','account','items',w(60_000,5000),w(3_600_000,100000),'RETRY_LATER','FAIL_CLOSED',{maxItems:500,maxBytes:2*MiB}),
    rule('fp.import.job.writes',OPS.IMPORT_BATCH,'batch','job','writes',w(60_000,5000),w(3_600_000,100000),'RETRY_LATER','FAIL_CLOSED',{maxItems:500,maxBytes:2*MiB}),
    rule('fp.import.household.writes',OPS.IMPORT_BATCH,'batch','household','writes',w(60_000,5000),w(3_600_000,100000),'RETRY_LATER','FAIL_CLOSED',{maxItems:500,maxBytes:2*MiB}),
    rule('fp.import.account.writes',OPS.IMPORT_BATCH,'batch','account','writes',w(60_000,5000),w(3_600_000,100000),'RETRY_LATER','FAIL_CLOSED',{maxItems:500,maxBytes:2*MiB}),
    rule('fp.import.source.writes',OPS.IMPORT_BATCH,'batch','source','writes',w(60_000,5000),w(3_600_000,100000),'RETRY_LATER','FAIL_CLOSED',{maxItems:500,maxBytes:2*MiB}),

    rule('fp.sync.job.requests',OPS.SYNC_BATCH,'sync','job','requests',w(60_000,30),w(3_600_000,600),'RETRY_LATER','FAIL_CLOSED',{maxItems:200,maxBytes:MiB}),
    rule('fp.sync.source.requests',OPS.SYNC_BATCH,'sync','source','requests',w(60_000,30),w(3_600_000,600),'RETRY_LATER','FAIL_CLOSED',{maxItems:200,maxBytes:MiB}),
    rule('fp.sync.job.items',OPS.SYNC_BATCH,'sync','job','items',w(60_000,2000),w(3_600_000,30000),'RETRY_LATER','FAIL_CLOSED',{maxItems:200,maxBytes:MiB}),
    rule('fp.sync.household.items',OPS.SYNC_BATCH,'sync','household','items',w(60_000,2000),w(3_600_000,30000),'RETRY_LATER','FAIL_CLOSED',{maxItems:200,maxBytes:MiB}),
    rule('fp.sync.account.items',OPS.SYNC_BATCH,'sync','account','items',w(60_000,2000),w(3_600_000,30000),'RETRY_LATER','FAIL_CLOSED',{maxItems:200,maxBytes:MiB}),
    rule('fp.sync.job.writes',OPS.SYNC_BATCH,'sync','job','writes',w(60_000,2000),w(3_600_000,30000),'RETRY_LATER','FAIL_CLOSED',{maxItems:200,maxBytes:MiB}),
    rule('fp.sync.household.writes',OPS.SYNC_BATCH,'sync','household','writes',w(60_000,2000),w(3_600_000,30000),'RETRY_LATER','FAIL_CLOSED',{maxItems:200,maxBytes:MiB}),
    rule('fp.sync.account.writes',OPS.SYNC_BATCH,'sync','account','writes',w(60_000,2000),w(3_600_000,30000),'RETRY_LATER','FAIL_CLOSED',{maxItems:200,maxBytes:MiB}),
    rule('fp.sync.source.writes',OPS.SYNC_BATCH,'sync','source','writes',w(60_000,2000),w(3_600_000,30000),'RETRY_LATER','FAIL_CLOSED',{maxItems:200,maxBytes:MiB}),

    rule('fp.destructive.household',OPS.DESTRUCTIVE_WRITE,'interactive','household','writes',w(600_000,4),w(3_600_000,12),'CHALLENGE'),
    rule('fp.destructive.account',OPS.DESTRUCTIVE_WRITE,'interactive','account','writes',w(600_000,4),w(3_600_000,12),'CHALLENGE'),
    rule('fp.destructive.session',OPS.DESTRUCTIVE_WRITE,'interactive','session','writes',w(600_000,5),w(3_600_000,15),'CHALLENGE'),
    rule('fp.destructive.source',OPS.DESTRUCTIVE_WRITE,'interactive','source','writes',w(600_000,5),w(3_600_000,15),'CHALLENGE'),

    rule('fp.system.household',OPS.SYSTEM_WRITE,'system','household','writes',w(60_000,120),w(3_600_000,3000),'RETRY_LATER'),
    rule('fp.system.source',OPS.SYSTEM_WRITE,'system','source','writes',w(60_000,120),w(3_600_000,3000),'RETRY_LATER')
  ]);

  const SPECS=freeze({
    [OPS.AUTH_LOGIN]:freeze({lane:'auth',required:['source','device','network'],idempotency:false,replay:false}),
    [OPS.ACCESS_RECOVERY]:freeze({lane:'recovery',required:['source','device','network'],idempotency:false,replay:true}),
    [OPS.FINANCIAL_WRITE]:freeze({lane:'interactive',required:['household','account','device','session','source'],idempotency:true,replay:false}),
    [OPS.SENSITIVE_FINANCIAL_WRITE]:freeze({lane:'interactive',required:['household','account','session','source'],idempotency:true,replay:true}),
    [OPS.IMPORT_BATCH]:freeze({lane:'batch',required:['household','account','job','source'],idempotency:true,replay:true}),
    [OPS.SYNC_BATCH]:freeze({lane:'sync',required:['household','account','job','source'],idempotency:true,replay:true}),
    [OPS.DESTRUCTIVE_WRITE]:freeze({lane:'interactive',required:['household','account','session','source'],idempotency:true,replay:true}),
    [OPS.SYSTEM_WRITE]:freeze({lane:'system',required:['household','source'],idempotency:true,replay:false})
  });

  const INTEGRATION_POINTS=freeze({
    authoritativeMutation:'trusted server/edge admission immediately before authoritative prepareCommit/commitAuthoritative; browser-only checks are advisory only',
    auth:'trusted auth boundary before credential verification amplification/session issuance',
    recovery:'trusted recovery boundary before recovery-token/challenge issuance',
    import:'hard byte/item cap before expensive import processing, then batch admission before authoritative mutation commit',
    sync:'trusted sync worker/edge admission before authoritative mutation commit',
    destructive:'trusted mutation boundary before reset/privacy/destructive canonical state change'
  });

  function rulesFor(operationClass){
    if(!opSet.has(operationClass))return [];
    return RULES.filter(rule=>rule.operationClass===operationClass).map(clone);
  }

  function buildRequest(input={}){
    const operationClass=nonBlankString(input.operationClass);
    if(!operationClass||!opSet.has(operationClass))return failure('unknown_family_protection_operation');
    const spec=SPECS[operationClass];
    const identitiesInput=input.identities;
    if(!identitiesInput||typeof identitiesInput!=='object'||Array.isArray(identitiesInput))return failure('trusted_protection_identities_required');
    const identities=[];
    for(const dimension of spec.required){
      const value=nonBlankString(identitiesInput[dimension]);
      if(!value)return failure(`trusted_identity_missing:${dimension}`);
      identities.push(freeze({dimension,value}));
    }
    const requestId=nonBlankString(input.requestId);
    if(!requestId)return failure('trusted_request_id_required');
    const idempotencyKey=input.idempotencyKey==null?null:nonBlankString(input.idempotencyKey);
    const replayKey=input.replayKey==null?null:nonBlankString(input.replayKey);
    if(spec.idempotency&&!idempotencyKey)return failure('idempotency_key_required');
    if(spec.replay&&!replayKey)return failure('replay_key_required');
    const writes=input.writes==null?(operationClass===OPS.AUTH_LOGIN||operationClass===OPS.ACCESS_RECOVERY?0:1):input.writes;
    const items=input.items==null?0:input.items;
    const bytes=input.bytes==null?0:input.bytes;
    if(!nonNegativeInteger(writes)||!nonNegativeInteger(items)||!nonNegativeInteger(bytes))return failure('invalid_family_protection_cost');
    const request=freeze({
      productId:PRODUCT_ID,
      operationClass,
      lane:spec.lane,
      identities:freeze(identities),
      cost:freeze({requests:1,writes,items,bytes}),
      idempotencyKey,
      replayKey,
      requestId
    });
    return freeze({ok:true,request,rules:freeze(rulesFor(operationClass))});
  }

  root.FamilyPilotProtectionV1=freeze({POLICY_VERSION,PRODUCT_ID,OPS,RULES,SPECS,INTEGRATION_POINTS,rulesFor,buildRequest});
})(typeof window!=='undefined'?window:globalThis);
