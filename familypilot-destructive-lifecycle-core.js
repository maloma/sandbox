(function installFamilyPilotDestructiveLifecycleCore(root){
  'use strict';
  if(!root||root.FamilyPilotDestructiveLifecycleCore)return;

  const PLAN_VERSION=1;
  const DAY=24*60*60*1000;
  const FIXED_RETENTION_DAYS=45;
  const RETENTION_PROVENANCE_VERSION=1;
  const ACTIONS=Object.freeze(['trash','restore_from_trash','expire_trash','reset_application','irreversible_privacy_erase']);
  const registeredPlans=new WeakSet();
  const planInternals=new WeakMap();
  const confirmations=new WeakMap();

  const persistence=()=>root.FamilyPilotPersistence;
  function api(){const value=persistence();if(!value)throw new Error('persistence_unavailable');return value}
  function deepFreeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const item of Object.values(value))deepFreeze(item)}return value}
  function clone(value){return JSON.parse(api().canonicalSerialize(value))}
  function error(code,extra={}){return{ok:false,error:code,...extra}}
  function stateFingerprint(state){return api().fnv1a32(api().canonicalSerialize(state))}
  function validCurrentState(state){
    const p=api(),validation=p.structuralValidate(state);
    if(!validation.ok)return error(validation.error);
    const schema=Number(state?.schemaVersion??0);
    if(schema!==p.CURRENT_STATE_SCHEMA_VERSION)return error(schema>p.CURRENT_STATE_SCHEMA_VERSION?'future_schema':'unsupported_schema');
    return{ok:true};
  }
  function lifecycle(plan,outcome,extra={}){
    return{action:plan.action,timestamp:Date.now(),outcome,stateSchemaVersion:plan.schemaVersion,target:plan.target,retentionPolicy:plan.retentionPolicy,reversible:plan.reversible,irreversible:plan.irreversible,backupOfferRequired:plan.backupOfferRequired,fingerprint:plan.fingerprint,...extra};
  }
  const POLICY=deepFreeze({
    version:PLAN_VERSION,
    uiWiringPresent:false,
    actions:{
      trash:{reversible:true,explicitConfirmationRequired:true,backupOfferRequired:false,mayRunWhileRecoveryLocked:false,mayTriggerAutomatically:false,mayTouchCanonicalFinancialHistory:true,uiWiringPresent:false},
      restore_from_trash:{reversible:true,explicitConfirmationRequired:true,backupOfferRequired:false,mayRunWhileRecoveryLocked:false,mayTriggerAutomatically:false,mayTouchCanonicalFinancialHistory:true,uiWiringPresent:false},
      expire_trash:{reversible:false,explicitConfirmationRequired:false,backupOfferRequired:false,mayRunWhileRecoveryLocked:false,mayTriggerAutomatically:true,mayTouchCanonicalFinancialHistory:true,uiWiringPresent:false},
      reset_application:{reversible:false,explicitConfirmationRequired:true,strongConfirmationRequired:true,backupOfferRequired:true,mayRunWhileRecoveryLocked:false,mayTriggerAutomatically:false,mayTouchCanonicalFinancialHistory:true,uiWiringPresent:false},
      irreversible_privacy_erase:{reversible:false,explicitConfirmationRequired:true,strongConfirmationRequired:true,backupOfferRequired:true,mayRunWhileRecoveryLocked:false,mayTriggerAutomatically:false,mayTouchCanonicalFinancialHistory:true,uiWiringPresent:false}
    }
  });

  function policy(){return POLICY}
  function retentionPolicy(state){
    const config=state?.config;
    if(config?.trashRetentionEnabled===false)return{classification:'DISABLED',enabled:false,days:null,valid:true};
    if(config?.trashRetentionEnabled!==true)return{classification:'INVALID_FAIL_CLOSED',enabled:false,days:null,valid:false};
    const days=config.trashRetentionDays;
    if(typeof days!=="number"||!Number.isFinite(days)||!Number.isInteger(days)||days!==FIXED_RETENTION_DAYS)return{classification:'INVALID_FAIL_CLOSED',enabled:true,days:null,valid:false};
    return{classification:'ENABLED_FIXED_45',enabled:true,days:FIXED_RETENTION_DAYS,valid:true};
  }
  function trashEntryRetention(state,deletedAt){
    const retention=retentionPolicy(state),timestamp=Number(deletedAt);
    if(retention.classification!=='ENABLED_FIXED_45'||!Number.isFinite(timestamp))return{trashExpiresAt:null,trashRetentionProvenance:null};
    return{trashExpiresAt:timestamp+FIXED_RETENTION_DAYS*DAY,trashRetentionProvenance:{version:RETENTION_PROVENANCE_VERSION,kind:'fixed_45_day_trash_retention',enabledAtDeletion:true,daysAtDeletion:FIXED_RETENTION_DAYS}};
  }
  function hasEligibleRetention(operation){
    const deletedAt=Number(operation?.deletedAt),expiresAt=Number(operation?.trashExpiresAt),provenance=operation?.trashRetentionProvenance;
    return Number.isFinite(deletedAt)&&Number.isFinite(expiresAt)&&provenance&&typeof provenance==='object'&&
      provenance.version===RETENTION_PROVENANCE_VERSION&&provenance.kind==='fixed_45_day_trash_retention'&&
      provenance.enabledAtDeletion===true&&provenance.daysAtDeletion===FIXED_RETENTION_DAYS&&
      expiresAt===deletedAt+FIXED_RETENTION_DAYS*DAY;
  }
  function targetFor(request){return{entityType:String(request?.entityType||''),id:String(request?.id||'')}}
  function supportedOperation(state,target,requiredStatus){
    if(target.entityType!=='operation')return error('unsupported_entity_lifecycle');
    const operation=(Array.isArray(state?.operations)?state.operations:[]).find(item=>item&&String(item.id)===target.id);
    if(!operation)return error('target_not_found');
    if(operation.status!==requiredStatus)return error(requiredStatus==='active'?'target_not_active':'target_not_in_trash');
    return{ok:true,operation};
  }
  function isLinkedObligationOperation(operation){
    const links=operation?.links;
    return Boolean(links&&(links.obligationOccurrenceId||links.obligationAllocationOccurrenceId||links.obligationRuleId));
  }
  function currentOperationActor(state){
    return typeof state?.currentMemberId==='string'?state.currentMemberId.trim():'';
  }
  function appendOperationStatusRevision(operation,action,actor,now,oldValue,newValue,source='user'){
    if(operation.revisions!=null&&!Array.isArray(operation.revisions))return error('operation_revision_history_invalid');
    const revisions=operation.revisions||[],sequence=revisions.length+1;
    const id=`operation-status-${api().fnv1a32(`${action}|${operation.id}|${now}|${sequence}`)}`;
    revisions.push({id,sequence,changedByMemberId:actor,changedAt:now,source,batchId:`operation-status-batch-${api().fnv1a32(`${action}|${operation.id}|${now}|${sequence}`)}`,changes:[{field:'status',oldValue,newValue}]});
    operation.revisions=revisions;
    return{ok:true};
  }
  function safeStorageClasses(){
    const classes=api().lifecyclePolicy().classes||[];
    return classes.map(entry=>String(entry.name)).filter(name=>['active_confirmed','temporary','migration_recovery','quarantine'].includes(name));
  }
  function makePlan(state,action,target,retention,candidate,summary,extra={}){
    const p=api(),entry=POLICY.actions[action],preconditionFingerprint=stateFingerprint(state);
    const plan=deepFreeze({
      kind:'FamilyPilotDestructiveLifecyclePlan',planVersion:PLAN_VERSION,action,schemaVersion:p.CURRENT_STATE_SCHEMA_VERSION,
      target:deepFreeze(target),retentionPolicy:deepFreeze(retention),preconditionFingerprint,backupOfferRequired:entry.backupOfferRequired,
      reversible:entry.reversible,irreversible:!entry.reversible,automaticEligible:entry.mayTriggerAutomatically===true&&retention.enabled===true&&retention.valid===true,
      uiWiringPresent:false,summary:deepFreeze(summary),storageClasses:deepFreeze(extra.storageClasses||[])
    });
    const fingerprint=p.fnv1a32(p.canonicalSerialize({kind:plan.kind,planVersion:plan.planVersion,action:plan.action,schemaVersion:plan.schemaVersion,target:plan.target,retentionPolicy:plan.retentionPolicy,preconditionFingerprint:plan.preconditionFingerprint,backupOfferRequired:plan.backupOfferRequired,reversible:plan.reversible,irreversible:plan.irreversible,automaticEligible:plan.automaticEligible,storageClasses:plan.storageClasses}));
    const registered=deepFreeze({...plan,fingerprint});
    registeredPlans.add(registered);planInternals.set(registered,{candidate});
    return{ok:true,plan:registered,lifecycle:lifecycle(registered,'planned')};
  }
  function prepare(state,request={}){
    const current=validCurrentState(state);if(!current.ok)return current;
    const action=String(request.action||'');if(!ACTIONS.includes(action))return error('unsupported_action_kind');
    const now=Number.isFinite(Number(request.now))?Number(request.now):Date.now();
    const target=targetFor(request),retention=retentionPolicy(state);
    if(action==='trash'){
      const supported=supportedOperation(state,target,'active');if(!supported.ok)return supported;
      if(isLinkedObligationOperation(supported.operation))return error('linked_operation_lifecycle_adapter_required');
      const actor=currentOperationActor(state);if(!actor)return error('operation_actor_unavailable');
      if(supported.operation.revisions!=null&&!Array.isArray(supported.operation.revisions))return error('operation_revision_history_invalid');
      const candidate=clone(state),operation=candidate.operations.find(item=>String(item.id)===target.id),entryRetention=trashEntryRetention(state,now);
      const revision=appendOperationStatusRevision(operation,action,actor,now,'active','trash');if(!revision.ok)return revision;
      operation.status='trash';operation.deletedAt=now;operation.deletedByMemberId=actor;operation.trashExpiresAt=entryRetention.trashExpiresAt;operation.trashRetentionProvenance=entryRetention.trashRetentionProvenance;operation.lastEditedByMemberId=actor;operation.lastEditedAt=now;
      return makePlan(state,action,target,retention,deepFreeze(candidate),{type:'operation',id:target.id,message:'Operation will move to Trash without a duplicate record.'});
    }
    if(action==='restore_from_trash'){
      const supported=supportedOperation(state,target,'trash');if(!supported.ok)return supported;
      if(isLinkedObligationOperation(supported.operation))return error('linked_operation_lifecycle_adapter_required');
      const actor=currentOperationActor(state);if(!actor)return error('operation_actor_unavailable');
      if(supported.operation.revisions!=null&&!Array.isArray(supported.operation.revisions))return error('operation_revision_history_invalid');
      const candidate=clone(state),operation=candidate.operations.find(item=>String(item.id)===target.id);
      const revision=appendOperationStatusRevision(operation,action,actor,now,'trash','active');if(!revision.ok)return revision;
      operation.status='active';operation.deletedAt=null;operation.deletedByMemberId=null;operation.trashExpiresAt=null;operation.trashRetentionProvenance=null;operation.lastEditedByMemberId=actor;operation.lastEditedAt=now;
      return makePlan(state,action,target,retention,deepFreeze(candidate),{type:'operation',id:target.id,message:'The same operation identity will be restored from Trash.'});
    }
    if(action==='expire_trash'){
      if(retention.classification==='DISABLED')return error('retention_policy_disabled',{eligibleIds:[],count:0});
      if(retention.classification!=='ENABLED_FIXED_45')return error('invalid_retention_policy',{eligibleIds:[],count:0});
      const eligibleIds=[];
      for(const operation of Array.isArray(state.operations)?state.operations:[]){
        if(!operation||operation.status!=='trash')continue;
        if(hasEligibleRetention(operation)&&Number(operation.trashExpiresAt)<=now)eligibleIds.push(String(operation.id));
      }
      const candidate=clone(state);
      for(const id of eligibleIds){
        const operation=candidate.operations.find(item=>String(item.id)===id);
        if(!operation||!hasEligibleRetention(operation))return error('invalid_expiry_target',{eligibleIds:[],count:0});
        const revision=appendOperationStatusRevision(operation,action,null,now,'trash','expired','retention_policy');if(!revision.ok)return revision;
        operation.status='expired';operation.expiredAt=now;operation.lastEditedByMemberId=null;operation.lastEditedAt=now;
      }
      return makePlan(state,action,{entityType:'operation',count:eligibleIds.length,ids:eligibleIds},retention,deepFreeze(candidate),{type:'operation',count:eligibleIds.length,ids:eligibleIds,message:'Expiry preserves the canonical operation and only ends recoverability.'});
    }
    if(action==='reset_application'){
      return makePlan(state,action,{scope:'canonical_application_state'},retention,null,{scope:'canonical_application_state',candidateStatus:'unavailable',reason:'reset_candidate_builder_unavailable',message:'Application reset remains plan-only until a canonical reset initializer is available.'});
    }
    return makePlan(state,action,{scope:'controlled_adapter_surface'},retention,null,{scope:'controlled_adapter_surface',storageClasses:safeStorageClasses(),unknownStorage:'not_deleted',externalStorage:'not_deleted',message:'Erase is bounded to adapter-controlled storage; unknown and external storage are excluded.'},{storageClasses:safeStorageClasses()});
  }
  function validatePlan(plan,state){
    if(!plan||typeof plan!=='object'||!registeredPlans.has(plan)||plan.kind!=='FamilyPilotDestructiveLifecyclePlan'||!ACTIONS.includes(plan.action))return error('invalid_destructive_plan');
    let fingerprint;try{fingerprint=stateFingerprint(state)}catch{return error('invalid_current_state')}
    if(fingerprint!==plan.preconditionFingerprint)return error('stale_destructive_plan');
    return{ok:true};
  }
  function confirm(plan,acknowledgement={}){
    if(!plan||!registeredPlans.has(plan))return error('invalid_destructive_plan');
    if(acknowledgement.action!==plan.action||acknowledgement.acknowledged!==true)return error('action_bound_confirmation_required');
    if(POLICY.actions[plan.action].strongConfirmationRequired===true&&acknowledgement.strong!==true)return error('strong_confirmation_required');
    const confirmation=deepFreeze({kind:'FamilyPilotDestructiveLifecycleConfirmation',action:plan.action,planFingerprint:plan.fingerprint,confirmedAt:Number.isFinite(Number(acknowledgement.confirmedAt))?Number(acknowledgement.confirmedAt):Date.now()});
    confirmations.set(confirmation,plan);return{ok:true,confirmation};
  }
  function validConfirmation(plan,confirmation){return confirmation&&typeof confirmation==='object'&&confirmations.get(confirmation)===plan&&confirmation.action===plan.action&&confirmation.planFingerprint===plan.fingerprint}
  function apply(plan,confirmation,state){
    const p=api();
    if(p.isRecoveryLocked())return error('recovery_locked');
    const valid=validatePlan(plan,state);if(!valid.ok)return valid;
    if(!validConfirmation(plan,confirmation))return error('invalid_action_bound_confirmation');
    const internal=planInternals.get(plan);
    if(plan.action==='irreversible_privacy_erase')return error('erase_adapter_authority_required',{lifecycle:lifecycle(plan,'blocked',{boundedEraseSurface:'adapter_authority_not_exposed'})});
    if(plan.action==='reset_application')return error('reset_candidate_builder_unavailable',{lifecycle:lifecycle(plan,'blocked',{reason:'reset_candidate_builder_unavailable'})});
    if(plan.action==='expire_trash'&&plan.target.count===0)return{ok:true,status:'no_eligible_expiry',requiresReload:false,lifecycle:lifecycle(plan,'no_eligible_expiry')};
    if(!internal?.candidate)return error('destructive_candidate_unavailable');
    try{
      const committed=p.commitState(internal.candidate);
      return{ok:true,status:'applied',requiresReload:true,revision:committed.revision,activeSlot:committed.activeSlot,lifecycle:lifecycle(plan,'applied',{revision:committed.revision})};
    }catch(err){return error(String(err?.code||err?.message||'destructive_apply_failed'),{lifecycle:lifecycle(plan,'failed')})}
  }
  function applyToDraft(plan,confirmation,draftState){
    const p=api();
    if(p.isRecoveryLocked())return error('recovery_locked');
    const current=validCurrentState(draftState);if(!current.ok)return current;
    const valid=validatePlan(plan,draftState);if(!valid.ok)return valid;
    if(!validConfirmation(plan,confirmation))return error('invalid_action_bound_confirmation');
    if(plan.action==='irreversible_privacy_erase')return error('erase_adapter_authority_required',{lifecycle:lifecycle(plan,'blocked',{boundedEraseSurface:'adapter_authority_not_exposed'})});
    if(plan.action==='reset_application')return error('reset_candidate_builder_unavailable',{lifecycle:lifecycle(plan,'blocked',{reason:'reset_candidate_builder_unavailable'})});
    if(plan.action==='expire_trash'&&plan.target.count===0)return{ok:true,status:'no_eligible_expiry',requiresReload:false,lifecycle:lifecycle(plan,'no_eligible_expiry')};
    const internal=planInternals.get(plan);
    if(!internal?.candidate)return error('destructive_candidate_unavailable');
    let candidate;
    try{candidate=JSON.parse(p.canonicalSerialize(internal.candidate))}catch{return error('destructive_draft_serialization_failed',{lifecycle:lifecycle(plan,'failed')})}
    try{
      for(const key of Reflect.ownKeys(draftState))delete draftState[key];
      for(const key of Object.keys(candidate))draftState[key]=candidate[key];
      return{ok:true,status:'applied_to_draft',requiresReload:false,lifecycle:lifecycle(plan,'applied_to_draft')};
    }catch(err){return error(String(err?.code||err?.message||'destructive_draft_apply_failed'),{lifecycle:lifecycle(plan,'failed')})}
  }
  function candidateDescriptor(plan){
    if(!plan||!registeredPlans.has(plan))return error('invalid_destructive_plan');
    const candidate=planInternals.get(plan)?.candidate;
    if(!candidate)return{ok:true,available:false};
    const contract=api().financialStateContract(),collections={};
    for(const key of contract.collectionKeys)collections[key]=Array.isArray(candidate[key])?candidate[key].length:0;
    return{ok:true,available:true,collections};
  }

  root.FamilyPilotDestructiveLifecycleCore=Object.freeze({PLAN_VERSION,DAY,FIXED_RETENTION_DAYS,RETENTION_PROVENANCE_VERSION,ACTIONS,policy,prepare,validatePlan,confirm,apply,applyToDraft,candidateDescriptor,retentionPolicy,trashEntryRetention,hasEligibleRetention});
})(typeof window!=='undefined'?window:globalThis);
