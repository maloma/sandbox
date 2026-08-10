(()=>{
  'use strict';
  const root=typeof window!=='undefined'?window:globalThis;
  if(root.FamilyPilotProductionPersistenceAdapter)return;

  const policy=Object.freeze({
    remoteAuthority:'authoritative',
    localPersistenceRole:'verified_recovery_cache',
    offlineReadsAllowed:true,
    offlineAuthoritativeWritesAllowed:false,
    automaticConflictMerge:false,
    lastWriteWins:false,
    integrityAlgorithm:'SHA-256',
    revisionMode:'expected_revision_compare_and_swap',
    providerNetworkEnabled:false,
  });
  const MAX_TIMESTAMP=9007199254740991;
  const SHA256_HEX=/^[a-f0-9]{64}$/;
  const usableId=value=>typeof value==='string'&&value.trim().length>0;
  const validRevision=value=>Number.isInteger(value)&&value>=0;
  const validSchema=value=>Number.isInteger(value)&&value>=0;
  const validTimestamp=value=>Number.isSafeInteger(value)&&value>=0&&value<=MAX_TIMESTAMP;
  const deepFreeze=value=>{
    if(value&&typeof value==='object'&&!Object.isFrozen(value)){
      for(const key of Reflect.ownKeys(value))deepFreeze(value[key]);
      Object.freeze(value);
    }
    return value;
  };
  const error=(code,extra={})=>Object.freeze({ok:false,error:code,...extra});
  const safeNow=clock=>{
    const value=Math.floor(Number(typeof clock==='function'?clock():Date.now()));
    return Number.isFinite(value)?Math.max(0,Math.min(MAX_TIMESTAMP,value)):0;
  };
  const digestError=()=>{
    const failure=new Error('secure_digest_unavailable');
    failure.code='secure_digest_unavailable';
    return failure;
  };
  async function sha256Hex(text,cryptoSource){
    const cryptoApi=cryptoSource===undefined?root.crypto:cryptoSource;
    if(typeof text!=='string'||!cryptoApi||!cryptoApi.subtle||typeof cryptoApi.subtle.digest!=='function'||typeof TextEncoder==='undefined')throw digestError();
    let bytes;
    try{bytes=new TextEncoder().encode(text);const digest=await cryptoApi.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('')}
    catch(cause){if(cause&&cause.code==='secure_digest_unavailable')throw cause;throw digestError()}
  }
  function createAdapter(options={}){
    const persistence=options.persistence||root.FamilyPilotPersistence;
    const transport=options.transport||{};
    const cryptoApi=options.crypto===undefined?root.crypto:options.crypto;
    const clock=typeof options.now==='function'?options.now:()=>Date.now();
    const plans=new WeakSet();
    const planDetails=new WeakMap();
    const persistenceReady=()=>persistence&&typeof persistence.canonicalSerialize==='function'&&typeof persistence.structuralValidate==='function'&&Number.isInteger(persistence.CURRENT_STATE_SCHEMA_VERSION)&&typeof persistence.commitState==='function'&&typeof persistence.isRecoveryLocked==='function';
    const stateIdentity=state=>{
      if(!state||typeof state!=='object'||!usableId(state.household?.id))return error('household_identity_unavailable');
      if(!usableId(state.currentMemberId))return error('remote_actor_unavailable');
      return{ok:true,householdId:state.household.id.trim(),updatedBy:state.currentMemberId.trim()};
    };
    const validateState=state=>{
      if(!persistenceReady())return error('persistence_unavailable');
      let validation;
      try{validation=persistence.structuralValidate(state)}catch{return error('state_validation_failed')}
      if(!validation||validation.ok!==true)return error(validation?.error||'state_validation_failed');
      if(!validSchema(state?.schemaVersion)||state.schemaVersion!==persistence.CURRENT_STATE_SCHEMA_VERSION)return error('unsupported_state_schema');
      return stateIdentity(state);
    };
    const validateRowShape=(row,householdId)=>{
      if(!row||typeof row!=='object'||Array.isArray(row))return error('remote_row_invalid');
      if(!usableId(row.householdId)||row.householdId.trim()!==householdId)return error('remote_household_mismatch');
      if(!Number.isInteger(row.revision)||row.revision<1)return error('remote_row_invalid');
      if(!validSchema(row.stateSchemaVersion))return error('remote_row_invalid');
      if(row.stateSchemaVersion>persistence.CURRENT_STATE_SCHEMA_VERSION)return error('remote_future_schema');
      if(row.stateSchemaVersion!==persistence.CURRENT_STATE_SCHEMA_VERSION)return error('remote_state_schema_unsupported');
      if(typeof row.payload!=='string'||!SHA256_HEX.test(row.payloadSha256||''))return error('remote_row_invalid');
      if(!validTimestamp(row.updatedAt)||!usableId(row.updatedBy))return error('remote_row_invalid');
      return{ok:true};
    };
    const validateAuthoritativeRow=async(row,householdId)=>{
      const shape=validateRowShape(row,householdId);
      if(!shape.ok)return shape;
      let digest;
      try{digest=await sha256Hex(row.payload,cryptoApi)}catch(failure){return error(failure.code||'secure_digest_unavailable')}
      if(digest!==row.payloadSha256)return error('remote_payload_integrity_failed');
      let state;
      try{state=JSON.parse(row.payload)}catch{return error('remote_payload_malformed_json')}
      const valid=validateState(state);
      if(!valid.ok)return error('remote_state_invalid');
      if(valid.householdId!==householdId)return error('remote_household_mismatch');
      return{ok:true,state,revision:row.revision,stateSchemaVersion:row.stateSchemaVersion,payloadSha256:row.payloadSha256};
    };
    async function prepareCommit(state,options={}){
      const valid=validateState(state);
      if(!valid.ok)return valid;
      const expectedRevision=options.expectedRevision;
      if(!validRevision(expectedRevision))return error('invalid_expected_revision');
      let payload,digest;
      try{payload=persistence.canonicalSerialize(state);digest=await sha256Hex(payload,cryptoApi)}catch(failure){return error(failure.code||'serialization_failed')}
      const plan=deepFreeze({householdId:valid.householdId,expectedRevision,revision:expectedRevision+1,stateSchemaVersion:persistence.CURRENT_STATE_SCHEMA_VERSION,payload,payloadSha256:digest,updatedAt:safeNow(clock),updatedBy:valid.updatedBy});
      plans.add(plan);planDetails.set(plan,plan);
      return deepFreeze({ok:true,status:'remote_commit_prepared',plan,householdId:plan.householdId,expectedRevision:plan.expectedRevision,revision:plan.revision,stateSchemaVersion:plan.stateSchemaVersion,payloadSha256:plan.payloadSha256});
    }
    async function readAuthoritative(householdId){
      if(!usableId(householdId))return error('household_identity_unavailable');
      if(typeof transport.read!=='function')return error('remote_read_failed');
      let response;
      try{response=await transport.read(householdId.trim())}catch{return error('remote_read_failed')}
      if(!response||response.ok!==true)return error('remote_read_failed');
      if(response.row===null)return error('remote_state_not_found',{householdId:householdId.trim()});
      const checked=await validateAuthoritativeRow(response.row,householdId.trim());
      return checked.ok?deepFreeze({ok:true,status:'remote_state_read',state:checked.state,householdId:householdId.trim(),revision:checked.revision,stateSchemaVersion:checked.stateSchemaVersion,payloadSha256:checked.payloadSha256}):checked;
    }
    async function commitAuthoritative(plan,currentState){
      if(!plan||typeof plan!=='object'||!plans.has(plan)||planDetails.get(plan)!==plan)return error('invalid_remote_commit_plan');
      const valid=validateState(currentState);
      if(!valid.ok)return error('stale_remote_commit_plan');
      let payload,digest;
      try{payload=persistence.canonicalSerialize(currentState);digest=await sha256Hex(payload,cryptoApi)}catch{return error('stale_remote_commit_plan')}
      if(valid.householdId!==plan.householdId||valid.updatedBy!==plan.updatedBy||currentState.schemaVersion!==plan.stateSchemaVersion||payload!==plan.payload||digest!==plan.payloadSha256)return error('stale_remote_commit_plan');
      if(persistence.isRecoveryLocked())return error('recovery_locked');
      if(typeof transport.compareAndSwap!=='function')return error('remote_commit_failed');
      let response;
      try{response=await transport.compareAndSwap(plan)}catch{return error('remote_commit_failed')}
      if(!response||response.ok!==true){
        if(response?.error==='revision_conflict')return error('revision_conflict',{householdId:plan.householdId,expectedRevision:plan.expectedRevision,currentRemoteRevision:validRevision(response.currentRevision)?response.currentRevision:null});
        return error('remote_commit_failed');
      }
      const row=response.row;
      const checked=await validateAuthoritativeRow(row,plan.householdId);
      const exact=checked.ok&&row.revision===plan.revision&&row.stateSchemaVersion===plan.stateSchemaVersion&&row.payload===plan.payload&&row.payloadSha256===plan.payloadSha256&&row.updatedAt===plan.updatedAt&&row.updatedBy===plan.updatedBy;
      if(!exact)return error('remote_commit_readback_mismatch',{householdId:plan.householdId,expectedRevision:plan.expectedRevision,remoteOutcome:'uncertain'});
      try{
        const local=persistence.commitState(currentState);
        if(local&&local.ok===false)throw new Error('local_cache_write_failed');
      }catch{
        return deepFreeze({ok:true,status:'remote_committed_local_cache_failed',householdId:plan.householdId,revision:plan.revision,stateSchemaVersion:plan.stateSchemaVersion,payloadSha256:plan.payloadSha256,requiresReload:true,warningCode:'local_recovery_cache_update_failed'});
      }
      return deepFreeze({ok:true,status:'remote_committed',householdId:plan.householdId,revision:plan.revision,stateSchemaVersion:plan.stateSchemaVersion,payloadSha256:plan.payloadSha256,localPersistenceRole:policy.localPersistenceRole});
    }
    return Object.freeze({policy,prepareCommit,readAuthoritative,commitAuthoritative,sha256Hex:text=>sha256Hex(text,cryptoApi)});
  }
  root.FamilyPilotProductionPersistenceAdapter=Object.freeze({policy,createAdapter,sha256Hex});
})(typeof window!=='undefined'?window:globalThis);
