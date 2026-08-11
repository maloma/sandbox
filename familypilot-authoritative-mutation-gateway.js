(()=>{
  'use strict';
  const root=typeof window!=='undefined'?window:globalThis;
  if(root.FamilyPilotAuthoritativeMutationGateway)return;

  const FORMAT_VERSION=1;
  const SESSION_KIND='familypilot_authoritative_session';
  const result=(status,extra={})=>Object.freeze({ok:true,...extra,status});
  const failure=(error,extra={})=>Object.freeze({ok:false,error,...extra});
  const thenable=value=>value&&((typeof value==='object'||typeof value==='function')&&typeof value.then==='function');

  function createGateway(options={}){
    const persistence=options.persistence||root.FamilyPilotPersistence;
    const adapter=options.adapter;
    const sessions=new WeakSet();
    const details=new WeakMap();

    const persistenceReady=()=>persistence&&typeof persistence.canonicalSerialize==='function'&&typeof persistence.structuralValidate==='function'&&Number.isInteger(persistence.CURRENT_STATE_SCHEMA_VERSION);
    const adapterReady=()=>adapter&&typeof adapter.readAuthoritative==='function'&&typeof adapter.prepareCommit==='function'&&typeof adapter.commitAuthoritative==='function';
    const serialize=value=>persistence.canonicalSerialize(value);
    const isolatedFromCanonical=canonical=>JSON.parse(canonical);
    const sessionSnapshot=detail=>Object.freeze({householdId:detail.householdId,revision:detail.revision,schemaVersion:detail.schemaVersion,status:detail.mutationInProgress?'mutation_in_progress':detail.status});
    const sessionFailure=(session,allowClosed=false)=>{
      if(!session||typeof session!=='object'||!sessions.has(session))return failure('invalid_authoritative_session');
      const detail=details.get(session);
      if(!detail||(!allowClosed&&detail.closed))return failure(detail?.closed?'authoritative_session_closed':'invalid_authoritative_session');
      return null;
    };
    const makeHandle=detail=>{
      const handle={};
      Object.defineProperties(handle,{
        kind:{enumerable:true,get:()=>SESSION_KIND},
        formatVersion:{enumerable:true,get:()=>FORMAT_VERSION},
        householdId:{enumerable:true,get:()=>detail.householdId},
        revision:{enumerable:true,get:()=>detail.revision},
        schemaVersion:{enumerable:true,get:()=>detail.schemaVersion},
        status:{enumerable:true,get:()=>detail.mutationInProgress?'mutation_in_progress':detail.status}
      });
      sessions.add(handle);
      details.set(handle,detail);
      return Object.freeze(handle);
    };
    const validateAndIsolate=state=>{
      if(!persistenceReady())return failure('authoritative_persistence_unavailable');
      let validation;
      try{validation=persistence.structuralValidate(state)}catch{return failure('authoritative_state_invalid')}
      if(!validation||validation.ok!==true)return failure('authoritative_state_invalid');
      if(!Number.isInteger(state?.schemaVersion)||state.schemaVersion!==persistence.CURRENT_STATE_SCHEMA_VERSION)return failure('authoritative_state_invalid');
      let canonical;
      try{canonical=serialize(state)}catch{return failure('authoritative_state_serialization_failed')}
      try{return{ok:true,canonical,state:isolatedFromCanonical(canonical)}}catch{return failure('authoritative_state_serialization_failed')}
    };
    const acceptRead=async(householdId)=>{
      if(!adapterReady())return failure('authoritative_adapter_unavailable');
      let read;
      try{read=await adapter.readAuthoritative(householdId)}catch{return failure('authoritative_session_open_failed')}
      if(!read||read.ok!==true){
        return failure(read?.error==='remote_state_not_found'?'authoritative_state_not_seeded':'authoritative_session_open_failed');
      }
      if(read.householdId!==householdId||!Number.isInteger(read.revision)||read.revision<1)return failure('authoritative_session_open_failed');
      const accepted=validateAndIsolate(read.state);
      if(!accepted.ok)return failure('authoritative_session_open_failed');
      if(read.stateSchemaVersion!==persistence.CURRENT_STATE_SCHEMA_VERSION)return failure('authoritative_session_open_failed');
      return{ok:true,state:accepted.state,canonical:accepted.canonical,revision:read.revision,schemaVersion:read.stateSchemaVersion};
    };
    const mutationBlocked=detail=>{
      if(detail.mutationInProgress)return failure('authoritative_mutation_in_progress');
      if(detail.status==='conflict')return failure('authoritative_revision_conflict');
      if(detail.status==='reload_required')return failure('authoritative_reload_required');
      return detail.status==='ready'?null:failure('authoritative_session_closed');
    };

    async function openAuthoritativeSession(householdId){
      if(typeof householdId!=='string'||!householdId.trim())return failure('authoritative_session_open_failed');
      const normalized=householdId.trim();
      const accepted=await acceptRead(normalized);
      if(!accepted.ok)return accepted;
      const detail={householdId:normalized,revision:accepted.revision,schemaVersion:accepted.schemaVersion,state:accepted.state,canonical:accepted.canonical,status:'ready',mutationInProgress:false,closed:false};
      const session=makeHandle(detail);
      return result('authoritative_session_opened',{session,...sessionSnapshot(detail)});
    }
    function getCommittedState(session){
      const invalid=sessionFailure(session);
      if(invalid)return invalid;
      const detail=details.get(session);
      try{return isolatedFromCanonical(detail.canonical)}catch{return failure('authoritative_state_serialization_failed')}
    }
    async function mutate(session,mutator){
      const invalid=sessionFailure(session);
      if(invalid)return invalid;
      const detail=details.get(session),blocked=mutationBlocked(detail);
      if(blocked)return blocked;
      if(typeof mutator!=='function')return failure('invalid_authoritative_mutator');
      detail.mutationInProgress=true;
      try{
        let draft;
        try{draft=isolatedFromCanonical(detail.canonical)}catch{return failure('authoritative_state_serialization_failed')}
        let mutatorReturn;
        try{mutatorReturn=mutator(draft)}catch{return failure('authoritative_mutator_failed')}
        if(thenable(mutatorReturn))return failure('async_mutator_not_supported');
        const accepted=validateAndIsolate(draft);
        if(!accepted.ok)return failure(accepted.error==='authoritative_state_serialization_failed'?'authoritative_mutation_serialization_failed':'authoritative_mutation_invalid_draft');
        if(accepted.canonical===detail.canonical)return result('authoritative_mutation_noop',sessionSnapshot(detail));
        let prepared;
        try{prepared=await adapter.prepareCommit(accepted.state,{expectedRevision:detail.revision})}catch{return failure('authoritative_mutation_prepare_failed')}
        if(!prepared||prepared.ok!==true)return failure('authoritative_mutation_prepare_failed');
        let committed;
        try{committed=await adapter.commitAuthoritative(prepared.plan,accepted.state)}catch{return failure('authoritative_mutation_commit_failed')}
        if(committed?.ok===true&&(committed.status==='remote_committed'||committed.status==='remote_committed_local_cache_failed')){
          if(!Number.isInteger(committed.revision)||committed.revision!==detail.revision+1)return failure('authoritative_mutation_commit_failed');
          detail.state=accepted.state;
          detail.canonical=accepted.canonical;
          detail.revision=committed.revision;
          detail.schemaVersion=committed.stateSchemaVersion;
          if(committed.status==='remote_committed_local_cache_failed'){
            detail.status='reload_required';
            return result('authoritative_mutation_committed_reload_required',sessionSnapshot(detail));
          }
          return result('authoritative_mutation_committed',sessionSnapshot(detail));
        }
        if(committed?.error==='revision_conflict'){
          detail.status='conflict';
          return failure('authoritative_revision_conflict',sessionSnapshot(detail));
        }
        if(committed?.error==='remote_commit_readback_mismatch'||committed?.remoteOutcome==='uncertain'||committed?.requiresReload===true){
          detail.status='reload_required';
          return failure('authoritative_mutation_reload_required',sessionSnapshot(detail));
        }
        return failure('authoritative_mutation_commit_failed');
      }finally{detail.mutationInProgress=false}
    }
    async function reloadAuthoritative(session){
      const invalid=sessionFailure(session);
      if(invalid)return invalid;
      const detail=details.get(session);
      if(detail.mutationInProgress)return failure('authoritative_mutation_in_progress');
      const accepted=await acceptRead(detail.householdId);
      if(!accepted.ok)return failure('authoritative_session_reload_failed');
      detail.state=accepted.state;
      detail.canonical=accepted.canonical;
      detail.revision=accepted.revision;
      detail.schemaVersion=accepted.schemaVersion;
      detail.status='ready';
      return result('authoritative_session_reloaded',sessionSnapshot(detail));
    }
    function status(session){
      const invalid=sessionFailure(session);
      return invalid||sessionSnapshot(details.get(session));
    }
    function close(session){
      const invalid=sessionFailure(session,true);
      if(invalid)return invalid;
      const detail=details.get(session);
      if(detail.closed)return failure('authoritative_session_closed');
      detail.closed=true;
      detail.status='closed';
      detail.state=null;
      detail.canonical='';
      return result('authoritative_session_closed');
    }
    return Object.freeze({openAuthoritativeSession,getCommittedState,mutate,reloadAuthoritative,status,close});
  }
  root.FamilyPilotAuthoritativeMutationGateway=Object.freeze({createGateway});
})(typeof window!=='undefined'?window:globalThis);
