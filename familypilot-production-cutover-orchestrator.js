(()=>{
  'use strict';
  const root=typeof window!=='undefined'?window:globalThis;
  if(root.FamilyPilotProductionCutoverOrchestrator)return;

  const MAX_TIMESTAMP=9007199254740991;
  const SHA256_HEX=/^[a-f0-9]{64}$/;
  const PLAN_KIND='FamilyPilotProductionCutoverPlan';
  const safeNow=clock=>{
    const value=Math.floor(Number(clock()));
    return Number.isFinite(value)?Math.max(0,Math.min(MAX_TIMESTAMP,value)):0;
  };
  const usableId=value=>typeof value==='string'&&value.trim().length>0;
  const validRevision=value=>Number.isInteger(value)&&value>=1;
  const deepFreeze=value=>{
    if(value&&typeof value==='object'&&!Object.isFrozen(value)){
      for(const key of Reflect.ownKeys(value))deepFreeze(value[key]);
      Object.freeze(value);
    }
    return value;
  };
  const failedLocal=()=>Object.freeze({status:'cutover_local_preflight_failed'});
  const failedRemote=(local,reason)=>Object.freeze({status:'cutover_remote_preflight_failed',householdId:local.householdId,localSha256:local.canonicalSha256,reason});

  function createOrchestrator(options={}){
    const persistence=options.persistence||root.FamilyPilotPersistence;
    const adapter=options.adapter;
    const clock=typeof options.now==='function'?options.now:()=>Date.now();
    const plans=new WeakSet();
    const planDetails=new WeakMap();
    const dependenciesReady=()=>Boolean(
      persistence&&
      typeof persistence.structuralValidate==='function'&&
      typeof persistence.canonicalSerialize==='function'&&
      typeof persistence.isRecoveryLocked==='function'&&
      Number.isInteger(persistence.CURRENT_STATE_SCHEMA_VERSION)&&
      adapter&&
      typeof adapter.sha256Hex==='function'&&
      typeof adapter.readAuthoritative==='function'&&
      typeof adapter.prepareCommit==='function'
    );
    const publicLocal=internal=>deepFreeze({
      status:'local_state_assessed',
      householdId:internal.householdId,
      actor:internal.currentMemberId,
      currentMemberId:internal.currentMemberId,
      schemaVersion:internal.schemaVersion,
      canonicalSha256:internal.canonicalSha256,
      canonicalTextLength:internal.canonicalTextLength,
      canonicalByteLength:internal.canonicalByteLength,
      assessedAt:internal.assessedAt,
    });
    async function assessInternal(state){
      if(!dependenciesReady())return null;
      try{if(persistence.isRecoveryLocked())return null}catch{return null}
      let validation;
      try{validation=persistence.structuralValidate(state)}catch{return null}
      if(!validation||validation.ok!==true)return null;
      if(!state||typeof state!=='object'||state.schemaVersion!==persistence.CURRENT_STATE_SCHEMA_VERSION)return null;
      if(!usableId(state.household?.id)||!usableId(state.currentMemberId))return null;
      let canonical,digest,bytes;
      try{
        canonical=persistence.canonicalSerialize(state);
        if(typeof canonical!=='string'||typeof TextEncoder==='undefined')return null;
        bytes=new TextEncoder().encode(canonical).length;
        digest=await adapter.sha256Hex(canonical);
      }catch{return null}
      if(!SHA256_HEX.test(digest))return null;
      return{
        householdId:state.household.id.trim(),
        currentMemberId:state.currentMemberId.trim(),
        schemaVersion:state.schemaVersion,
        canonical,
        canonicalSha256:digest,
        canonicalTextLength:canonical.length,
        canonicalByteLength:bytes,
        assessedAt:safeNow(clock),
      };
    }
    async function assessLocalState(state){
      const local=await assessInternal(state);
      return local?publicLocal(local):failedLocal();
    }
    async function inspectRemoteInternal(state){
      const local=await assessInternal(state);
      if(!local)return{result:failedLocal()};
      let remote;
      try{remote=await adapter.readAuthoritative(local.householdId)}catch{return{result:failedRemote(local,'remote_read_failed')}}
      if(remote&&remote.error==='remote_state_not_found')return{local,result:deepFreeze({status:'remote_absent',householdId:local.householdId,localSha256:local.canonicalSha256,eligibleForInitialSeed:true,eligibleForAttach:false})};
      if(!remote||remote.ok!==true||!remote.state||!validRevision(remote.revision))return{local,result:failedRemote(local,'remote_read_failed')};
      let remoteCanonical,remoteSha256;
      try{
        remoteCanonical=persistence.canonicalSerialize(remote.state);
        remoteSha256=await adapter.sha256Hex(remoteCanonical);
      }catch{return{local,result:failedRemote(local,'remote_integrity_failed')}}
      if(typeof remoteCanonical!=='string'||!SHA256_HEX.test(remoteSha256))return{local,result:failedRemote(local,'remote_integrity_failed')};
      if(remoteCanonical===local.canonical&&remoteSha256===local.canonicalSha256)return{local,result:deepFreeze({status:'remote_matches_local',householdId:local.householdId,localSha256:local.canonicalSha256,remoteSha256,remoteRevision:remote.revision,eligibleForInitialSeed:false,eligibleForAttach:true})};
      return{local,result:deepFreeze({status:'cutover_remote_conflict',householdId:local.householdId,localSha256:local.canonicalSha256,remoteSha256,remoteRevision:remote.revision})};
    }
    async function inspectRemote(state){
      return(await inspectRemoteInternal(state)).result;
    }
    const registered=plan=>Boolean(plan&&typeof plan==='object'&&plans.has(plan)&&planDetails.has(plan));
    const invalidPlan=()=>Object.freeze({status:'invalid_cutover_plan'});
    async function prepareCutover(state){
      const inspected=await inspectRemoteInternal(state),result=inspected.result,local=inspected.local;
      if(!local)return result;
      let plan,privatePlan=null;
      if(result.status==='remote_absent'){
        let prepared;
        try{prepared=await adapter.prepareCommit(state,{expectedRevision:0})}catch{return failedRemote(local,'remote_prepare_failed')}
        if(!prepared||prepared.ok!==true||!prepared.plan)return failedRemote(local,'remote_prepare_failed');
        privatePlan=prepared.plan;
        plan=deepFreeze({kind:PLAN_KIND,formatVersion:1,mode:'initial_seed',householdId:local.householdId,schemaVersion:local.schemaVersion,localSha256:local.canonicalSha256,localAssessedAt:local.assessedAt,preparedAt:safeNow(clock),expectedRemoteRevision:0,proposedRemoteRevision:1,liveMutationAuthorized:false,runtimeAuthoritySwitchAuthorized:false});
      }else if(result.status==='remote_matches_local'){
        plan=deepFreeze({kind:PLAN_KIND,formatVersion:1,mode:'attach_existing',householdId:local.householdId,schemaVersion:local.schemaVersion,localSha256:local.canonicalSha256,localAssessedAt:local.assessedAt,preparedAt:safeNow(clock),remoteRevision:result.remoteRevision,liveMutationAuthorized:false,runtimeAuthoritySwitchAuthorized:false});
      }else return result;
      plans.add(plan);
      planDetails.set(plan,Object.freeze({householdId:local.householdId,currentMemberId:local.currentMemberId,schemaVersion:local.schemaVersion,localSha256:local.canonicalSha256,mode:plan.mode,remoteRevision:plan.remoteRevision??0,privatePlan}));
      return plan;
    }
    async function validatePlanFreshness(plan,currentState){
      if(!registered(plan))return invalidPlan();
      const details=planDetails.get(plan),local=await assessInternal(currentState);
      if(!local||local.householdId!==details.householdId||local.currentMemberId!==details.currentMemberId||local.schemaVersion!==details.schemaVersion||local.canonicalSha256!==details.localSha256)return Object.freeze({status:'stale_cutover_plan'});
      return deepFreeze({status:'cutover_plan_fresh',mode:details.mode,householdId:details.householdId,localSha256:details.localSha256});
    }
    async function dryRunCutover(plan,currentState){
      if(!registered(plan))return invalidPlan();
      const fresh=await validatePlanFreshness(plan,currentState);
      if(fresh.status!=='cutover_plan_fresh')return fresh;
      const details=planDetails.get(plan),inspected=await inspectRemoteInternal(currentState),result=inspected.result;
      const ready=details.mode==='initial_seed'
        ?result.status==='remote_absent'
        :result.status==='remote_matches_local'&&result.remoteRevision===details.remoteRevision&&result.localSha256===details.localSha256;
      if(!ready)return Object.freeze({status:'cutover_remote_changed_since_plan',mode:details.mode,householdId:details.householdId,localSha256:details.localSha256});
      return deepFreeze({status:'cutover_dry_run_ready',mode:details.mode,householdId:details.householdId,localSha256:details.localSha256,expectedRemoteRevision:details.mode==='initial_seed'?0:details.remoteRevision,proposedRemoteRevision:details.mode==='initial_seed'?1:details.remoteRevision,authoritativeWritePerformed:false,localWritePerformed:false,runtimeAuthorityChanged:false,liveExecutionAuthorized:false,requiresFounderAuthorization:true,requiresProtectedBackup:true,requiresLiveProviderPreflight:true,requiresExactRemoteReread:true,requiresExactRemoteReadbackAfterWrite:true,requiresRuntimeSwitchAfterVerifiedRemote:true,localRoleAfterCutover:'verified_recovery_cache'});
    }
    function liveCutoverChecklist(plan){
      if(!registered(plan))return invalidPlan();
      const steps=Object.freeze([
        'founder authorize live infrastructure + cutover',
        'provision exact Supabase project/region',
        'apply accepted P4B/P4C2 SQL + private bucket contract',
        'verify Auth/RLS/Storage provider preflight',
        'create + verify protected user-controlled backup',
        'freeze local authoritative mutations',
        'reassess local canonical state/digest',
        're-read remote authoritative state',
        'initial_seed: CAS expected revision 0→1; OR attach_existing: verify exact remote state with no write',
        'exact remote readback',
        'switch runtime authority to remote',
        'mark browser persistence verified_recovery_cache',
        'reload from remote authority',
        'verify post-cutover read/write/conflict/backup/restore smokes',
        'unfreeze user mutations',
        'record cutover receipt + rollback boundary',
      ].map((control,index)=>Object.freeze({order:index+1,control})));
      return deepFreeze({status:'cutover_live_checklist_ready',mode:plan.mode,householdId:plan.householdId,steps,protectedBackupBeforeFirstAuthoritativeRemoteMutation:true,exactRemoteReadbackBeforeRuntimeAuthoritySwitch:true,conflictOutcome:'stop_fail_closed',localDeleteOrResetAuthorized:false,automaticRollbackOverwriteAuthorized:false,localRoleAfterCutover:'verified_recovery_cache',executable:false});
    }
    return Object.freeze({assessLocalState,inspectRemote,prepareCutover,validatePlanFreshness,dryRunCutover,liveCutoverChecklist});
  }
  root.FamilyPilotProductionCutoverOrchestrator=Object.freeze({createOrchestrator});
})(typeof window!=='undefined'?window:globalThis);
