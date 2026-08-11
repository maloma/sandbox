(()=>{
  'use strict';
  const root=typeof window!=='undefined'?window:globalThis;
  if(root.FamilyPilotAuthoritativeUiMutationController)return;

  const thenable=value=>value&&(typeof value==='object'||typeof value==='function')&&typeof value.then==='function';
  const failure=(error,extra={})=>Object.freeze({ok:false,error,...extra});
  const success=(status,extra={})=>Object.freeze({ok:true,status,...extra});

  function createController(options={}){
    const canonicalSerialize=options.canonicalSerialize;
    const structuralValidate=options.structuralValidate;
    const getCurrentState=options.getCurrentState;
    const replaceCurrentState=options.replaceCurrentState;
    const commitPreCutoverLocal=options.commitPreCutoverLocal;
    const required=[canonicalSerialize,structuralValidate,getCurrentState,replaceCurrentState,commitPreCutoverLocal];
    if(required.some(value=>typeof value!=='function'))throw new TypeError('authoritative_ui_mutation_controller_dependencies_invalid');

    let mode='pre_cutover_local',gateway=null,session=null,householdId=null,status='ready',mutationInProgress=false;
    const isolateCanonical=canonical=>JSON.parse(canonical);
    const canonicalize=value=>{
      let validation;
      try{validation=structuralValidate(value)}catch{return failure('canonical_state_invalid')}
      if(!validation||validation.ok!==true)return failure('canonical_state_invalid');
      try{
        const canonical=canonicalSerialize(value);
        return typeof canonical==='string'?{ok:true,canonical,state:isolateCanonical(canonical)}:failure('canonical_state_serialization_failed');
      }catch{return failure('canonical_state_serialization_failed')}
    };
    const currentCanonical=()=>canonicalize(getCurrentState());
    const getGatewayState=()=>{
      let value;
      try{value=gateway.getCommittedState(session)}catch{return failure('authoritative_state_unavailable')}
      if(value?.ok===false)return failure(value.error||'authoritative_state_unavailable');
      return canonicalize(value);
    };
    const publicStatus=()=>Object.freeze({mode,status:mutationInProgress?'mutation_in_progress':status,householdId,revision:session?.revision??null,schemaVersion:session?.schemaVersion??null});
    const blocked=()=>{
      if(mutationInProgress)return failure('authoritative_mutation_in_progress');
      if(status==='conflict')return failure('authoritative_revision_conflict');
      if(status==='reload_required')return failure('authoritative_reload_required');
      return status==='ready'?null:failure('authoritative_controller_unavailable');
    };
    const adopt=value=>{
      const accepted=canonicalize(value);
      if(!accepted.ok)return accepted;
      try{replaceCurrentState(accepted.state)}catch{return failure('current_state_replace_failed')}
      return accepted;
    };

    async function mutate(mutator){
      const unavailable=blocked();
      if(unavailable)return unavailable;
      if(typeof mutator!=='function')return failure('invalid_authoritative_mutator');
      mutationInProgress=true;
      try{
        if(mode==='pre_cutover_local'){
          const before=currentCanonical();
          if(!before.ok)return before;
          let draft;
          try{draft=isolateCanonical(before.canonical)}catch{return failure('canonical_state_serialization_failed')}
          let returned;
          try{returned=mutator(draft)}catch{return failure('authoritative_mutator_failed')}
          if(thenable(returned))return failure('async_mutator_not_supported');
          const after=canonicalize(draft);
          if(!after.ok)return after;
          if(after.canonical===before.canonical)return success('pre_cutover_mutation_noop');
          let committed;
          try{committed=await commitPreCutoverLocal(after.state)}catch{return failure('pre_cutover_local_commit_failed')}
          if(committed&&committed.ok===false)return failure(committed.error||'pre_cutover_local_commit_failed');
          const adopted=adopt(after.state);
          return adopted.ok?success('pre_cutover_mutation_committed'):adopted;
        }
        let result;
        try{result=await gateway.mutate(session,mutator)}catch{return failure('authoritative_mutation_failed')}
        if(result?.ok===true){
          if(result.status==='authoritative_mutation_noop')return success('authoritative_mutation_noop');
          if(result.status==='authoritative_mutation_committed'||result.status==='authoritative_mutation_committed_reload_required'){
            const committed=getGatewayState();
            if(!committed.ok)return committed;
            const adopted=adopt(committed.state);
            if(!adopted.ok)return adopted;
            if(result.status==='authoritative_mutation_committed_reload_required'){
              status='reload_required';
              return success('remote_committed_local_cache_failed',{requiresReload:true});
            }
            return success('authoritative_mutation_committed');
          }
        }
        if(result?.error==='authoritative_revision_conflict'){status='conflict';return failure('authoritative_revision_conflict')}
        if(result?.error==='authoritative_mutation_reload_required'){status='reload_required';return failure('authoritative_mutation_reload_required')}
        return failure(result?.error||'authoritative_mutation_failed');
      }finally{mutationInProgress=false}
    }

    async function activateAuthoritative(input={}){
      if(mode!=='pre_cutover_local')return failure('authoritative_activation_already_completed');
      if(mutationInProgress)return failure('authoritative_mutation_in_progress');
      const candidateGateway=input.gateway;
      const candidateHouseholdId=typeof input.householdId==='string'?input.householdId.trim():'';
      if(!candidateGateway||typeof candidateGateway.openAuthoritativeSession!=='function'||typeof candidateGateway.getCommittedState!=='function'||typeof candidateGateway.mutate!=='function'||typeof candidateGateway.reloadAuthoritative!=='function'||!candidateHouseholdId)return failure('authoritative_gateway_unavailable');
      const local=currentCanonical();
      if(!local.ok)return local;
      if(local.state?.household?.id!==candidateHouseholdId)return failure('authoritative_household_mismatch');
      let opened;
      try{opened=await candidateGateway.openAuthoritativeSession(candidateHouseholdId)}catch{return failure('authoritative_activation_failed')}
      if(!opened||opened.ok!==true||!opened.session)return failure(opened?.error||'authoritative_activation_failed');
      let remote;
      try{remote=candidateGateway.getCommittedState(opened.session)}catch{return failure('authoritative_activation_failed')}
      const verified=remote?.ok===false?failure(remote.error||'authoritative_activation_failed'):canonicalize(remote);
      if(!verified.ok)return verified;
      if(verified.state?.household?.id!==candidateHouseholdId)return failure('authoritative_household_mismatch');
      if(verified.canonical!==local.canonical)return failure('authoritative_state_mismatch');
      const adopted=adopt(verified.state);
      if(!adopted.ok)return adopted;
      gateway=candidateGateway;session=opened.session;householdId=candidateHouseholdId;mode='remote_authoritative';status='ready';
      return success('authoritative_activated',publicStatus());
    }

    async function reloadAuthoritative(){
      if(mode!=='remote_authoritative')return failure('authoritative_not_activated');
      if(mutationInProgress)return failure('authoritative_mutation_in_progress');
      let result;
      try{result=await gateway.reloadAuthoritative(session)}catch{return failure('authoritative_session_reload_failed')}
      if(!result||result.ok!==true)return failure(result?.error||'authoritative_session_reload_failed');
      const verified=getGatewayState();
      if(!verified.ok)return verified;
      const adopted=adopt(verified.state);
      if(!adopted.ok)return adopted;
      status='ready';
      return success('authoritative_session_reloaded',publicStatus());
    }

    return Object.freeze({mutate,activateAuthoritative,reloadAuthoritative,status:publicStatus});
  }
  root.FamilyPilotAuthoritativeUiMutationController=Object.freeze({createController});
})(typeof window!=='undefined'?window:globalThis);
