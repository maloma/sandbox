(function installFamilyPilotPersistence(root){
  'use strict';
  if(!root||typeof root.localStorage==='undefined'||root.FamilyPilotPersistence)return;

  const CURRENT_SCHEMA=22;
  const CURRENT_STATE_SCHEMA_VERSION=CURRENT_SCHEMA;
  const ENVELOPE_VERSION=1;
  const query=new URLSearchParams(root.location?.search||'');
  const testMode=query.has('test');
  const rawToken=query.get('persistenceTest')||'';
  const testToken=rawToken.replace(/[^a-zA-Z0-9._-]/g,'-').slice(0,96);
  const storageNamespace=testToken?`familypilot-test-${testToken}-`:'familypilot-';
  const productionKeys=Object.freeze({
    compatibility:'familypilot-state-v3',
    head:'familypilot-state-head-v1',
    slotA:'familypilot-state-slot-a-v1',
    slotB:'familypilot-state-slot-b-v1',
    candidate:'familypilot-state-bootstrap-candidate-v1',
    snapshots:'familypilot-state-snapshots-v1',
    quarantine:'familypilot-state-quarantine-v1',
    status:'familypilot-state-recovery-status-v1'
  });
  const keys=Object.freeze({
    compatibility:testToken?`${storageNamespace}state-v3`:productionKeys.compatibility,
    head:testToken?`${storageNamespace}state-head-v1`:productionKeys.head,
    slotA:testToken?`${storageNamespace}state-slot-a-v1`:productionKeys.slotA,
    slotB:testToken?`${storageNamespace}state-slot-b-v1`:productionKeys.slotB,
    candidate:testToken?`${storageNamespace}state-bootstrap-candidate-v1`:productionKeys.candidate,
    snapshots:testToken?`${storageNamespace}state-snapshots-v1`:productionKeys.snapshots,
    quarantine:testToken?`${storageNamespace}state-quarantine-v1`:productionKeys.quarantine,
    status:testToken?`${storageNamespace}state-recovery-status-v1`:productionKeys.status
  });
  const BASE_STATE_KEYS=new Set(['familypilot.operations.foundation.v2','familypilot-state-v3']);
  const LEGACY_STATE_KEYS=new Set(['familypilot.main.v7','family-finance-state']);
  const protectedPhysicalKeys=new Set(Object.values(keys));
  const storage=root.localStorage;
  const proto=Object.getPrototypeOf(storage);
  const original={getItem:proto.getItem,setItem:proto.setItem,removeItem:proto.removeItem,clear:proto.clear,key:proto.key};
  const nativeGetItem=key=>original.getItem.call(storage,String(key));
  const nativeSetItem=(key,value)=>original.setItem.call(storage,String(key),String(value));
  const nativeRemoveItem=key=>original.removeItem.call(storage,String(key));
  const nativeKey=index=>original.key.call(storage,index);
  const nativeLength=()=>storage.length;
  const installedAt=Date.now();
  let firstOwnedReadAt=null;
  let bootstrapStatus='pending';
  let selectedPayload=null;
  let selectedSource='none';
  let recoveryLocked=false;
  let currentStatusValue={status:'migration_pending',source:'none',revision:0,stateSchemaVersion:0,messageCode:'bootstrap_pending',occurredAt:installedAt,acknowledgedAt:null,quarantineIds:[],snapshotIds:[]};
  let pendingCandidate=null;
  let failNext='';
  let lastFinalizeResult={ok:false,error:'not_finalized'};
  let networkRequests=0;

  function markOwnedRead(){if(firstOwnedReadAt===null)firstOwnedReadAt=Date.now()}
  function isPlainObject(value){if(value===null||typeof value!=='object')return false;if(Object.prototype.toString.call(value)!=='[object Object]')return false;const p=Object.getPrototypeOf(value);return p===null||typeof p==='object'}
  function canonicalSerialize(value){
    const seen=new Set();
    function normalize(input){
      if(input===null||typeof input==='string'||typeof input==='boolean')return input;
      if(typeof input==='number'){if(!Number.isFinite(input))throw new TypeError('serialization_failed_non_finite');return input}
      if(typeof input==='undefined'||typeof input==='function'||typeof input==='symbol'||typeof input==='bigint')throw new TypeError('serialization_failed_unsupported');
      if(typeof input!=='object')throw new TypeError('serialization_failed_unsupported');
      if(seen.has(input))throw new TypeError('serialization_failed_cycle');
      seen.add(input);
      let output;
      if(Array.isArray(input))output=input.map(normalize);
      else{
        if(!isPlainObject(input))throw new TypeError('serialization_failed_non_plain_object');
        output={};
        for(const key of Object.keys(input).sort())output[key]=normalize(input[key]);
      }
      seen.delete(input);
      return output;
    }
    return JSON.stringify(normalize(value));
  }
  function fnv1a32(text){let hash=0x811c9dc5;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,0x01000193)}return(hash>>>0).toString(16).padStart(8,'0')}
  function clone(value){return JSON.parse(canonicalSerialize(value))}
  function parseObject(raw){if(typeof raw!=='string'||!raw.trim())return{ok:false,empty:true,error:'empty'};try{const value=JSON.parse(raw);return isPlainObject(value)?{ok:true,value}:{ok:false,error:'root_not_object'}}catch{return{ok:false,error:'malformed_json'}}}
  const criticalArrayKeys=['wallets','operations','walletMovements','transfers','purposeAllocations','savingsTransfers','obligationRules','obligationOccurrences'];
  function structuralValidate(state){
    if(!isPlainObject(state))return{ok:false,error:'root_not_object'};
    const schema=Number(state.schemaVersion??0);
    if(!Number.isFinite(schema)||schema<0)return{ok:false,error:'invalid_schema_version'};
    if(schema>CURRENT_SCHEMA)return{ok:false,error:'future_schema'};
    for(const key of criticalArrayKeys)if(state[key]!==undefined&&!Array.isArray(state[key]))return{ok:false,error:`invalid_collection_${key}`};
    for(const key of criticalArrayKeys){
      const list=Array.isArray(state[key])?state[key]:[];
      const ids=new Set();
      for(const item of list){
        if(!isPlainObject(item))return{ok:false,error:`invalid_record_${key}`};
        if(item.id!=null){const id=String(item.id);if(ids.has(id))return{ok:false,error:`duplicate_id_${key}`};ids.add(id)}
      }
    }
    const financialKeys=new Set(['amount','openingBalance','openingCapital','expectedAmount','actualAmount','savedAmount','targetAmount','bookAmount','currentValue','delta']);
    const stack=[state],seen=new Set();
    while(stack.length){
      const value=stack.pop();
      if(!value||typeof value!=='object'||seen.has(value))continue;
      seen.add(value);
      if(Array.isArray(value)){for(const item of value)stack.push(item);continue}
      for(const [key,item]of Object.entries(value)){
        if(financialKeys.has(key)&&item!=null&&!Number.isFinite(Number(item)))return{ok:false,error:`non_finite_${key}`};
        stack.push(item);
      }
    }
    for(const allocation of Array.isArray(state.purposeAllocations)?state.purposeAllocations:[])if(Number(allocation.amount)<0)return{ok:false,error:'negative_purpose_allocation'};
    return{ok:true};
  }
  function envelopeWithoutChecksum(envelope){const copy={...envelope};delete copy.envelopeChecksum;return copy}
  function makeEnvelope(state,revision){
    const payload=canonicalSerialize(state);
    const envelope={envelopeVersion:ENVELOPE_VERSION,revision,stateSchemaVersion:Number(state.schemaVersion)||CURRENT_SCHEMA,writtenAt:Date.now(),payload,payloadLength:payload.length,checksumAlgorithm:'fnv1a32',checksum:fnv1a32(payload),status:'committed'};
    envelope.envelopeChecksum=fnv1a32(canonicalSerialize(envelopeWithoutChecksum(envelope)));
    return envelope;
  }
  function inspectSlot(key){
    const raw=nativeGetItem(key);
    if(!raw)return{ok:false,empty:true,key};
    let envelope;try{envelope=JSON.parse(raw)}catch{return{ok:false,error:'slot_envelope_malformed',key,rawLength:raw.length}}
    if(!isPlainObject(envelope)||envelope.envelopeVersion!==ENVELOPE_VERSION||envelope.status!=='committed'||!Number.isInteger(envelope.revision)||envelope.revision<1||typeof envelope.payload!=='string')return{ok:false,error:'slot_envelope_invalid',key};
    if(envelope.payloadLength!==envelope.payload.length)return{ok:false,error:'slot_readback_mismatch',key};
    if(envelope.checksumAlgorithm!=='fnv1a32'||envelope.checksum!==fnv1a32(envelope.payload))return{ok:false,error:'slot_checksum_mismatch',key};
    const expectedEnvelopeChecksum=fnv1a32(canonicalSerialize(envelopeWithoutChecksum(envelope)));
    if(envelope.envelopeChecksum!==expectedEnvelopeChecksum)return{ok:false,error:'envelope_checksum_mismatch',key};
    const parsed=parseObject(envelope.payload);if(!parsed.ok)return{ok:false,error:'slot_payload_invalid',key};
    const validation=structuralValidate(parsed.value);if(!validation.ok)return{ok:false,error:validation.error,key,state:parsed.value};
    return{ok:true,key,envelope,state:parsed.value,raw};
  }
  function inspectHead(){
    const raw=nativeGetItem(keys.head);if(!raw)return null;
    try{const head=JSON.parse(raw);if(!isPlainObject(head)||!['a','b'].includes(head.activeSlot)||!Number.isInteger(head.revision)||head.revision<1||typeof head.envelopeChecksum!=='string')return null;return head}catch{return null}
  }
  function inspectSlots(){return{head:inspectHead(),a:inspectSlot(keys.slotA),b:inspectSlot(keys.slotB)}}
  function validSource(raw,source){
    if(typeof raw!=='string'||!raw.trim())return{ok:false,empty:true,source};
    const parsed=parseObject(raw);if(!parsed.ok)return{ok:false,source,error:parsed.error,raw};
    const schema=Number(parsed.value.schemaVersion??0);if(Number.isFinite(schema)&&schema>CURRENT_SCHEMA)return{ok:false,source,error:'future_schema',raw,state:parsed.value};
    const validation=structuralValidate(parsed.value);
    return validation.ok?{ok:true,source,raw,state:parsed.value}:{ok:false,source,error:validation.error,raw,state:parsed.value};
  }
  function loadArray(key){try{const raw=nativeGetItem(key),parsed=raw?JSON.parse(raw):[];return Array.isArray(parsed)?parsed:[]}catch{return[]}}
  function storeArray(key,list){nativeSetItem(key,JSON.stringify(list))}
  function persistStatus(){try{nativeSetItem(keys.status,JSON.stringify(currentStatusValue))}catch{}try{root.dispatchEvent(new CustomEvent('familypilot:persistence-status',{detail:clone(currentStatusValue)}))}catch{}}
  function updateStatus(status,extra={}){
    currentStatusValue={status,source:extra.source||selectedSource,revision:Number(extra.revision??currentStatusValue.revision)||0,stateSchemaVersion:Number(extra.stateSchemaVersion??currentStatusValue.stateSchemaVersion)||0,messageCode:extra.messageCode||status,occurredAt:Date.now(),acknowledgedAt:null,quarantineIds:[...(extra.quarantineIds||currentStatusValue.quarantineIds||[])],snapshotIds:[...(extra.snapshotIds||currentStatusValue.snapshotIds||[])]};
    persistStatus();return currentStatusValue;
  }
  function retain(list,max){if(list.length<=max)return list;const protectedItems=list.filter(item=>item.protected===true),unprotected=list.filter(item=>item.protected!==true).sort((a,b)=>(a.capturedAt||0)-(b.capturedAt||0));while(protectedItems.length+unprotected.length>max&&unprotected.length)unprotected.shift();return[...protectedItems,...unprotected].sort((a,b)=>(a.capturedAt||0)-(b.capturedAt||0))}
  function quarantineRaw(source,raw,reasonCode,protectedRecord=true){let list=loadArray(keys.quarantine);const id=`quarantine-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;list.push({id,source,collection:null,recordId:null,reasonCode,capturedAt:Date.now(),rawLength:String(raw||'').length,rawChecksum:fnv1a32(String(raw||'')),rawPayload:String(raw||''),protected:protectedRecord});list=retain(list,20);storeArray(keys.quarantine,list);return id}
  function captureSnapshot(raw,source,fromVersion,toVersion){if(typeof raw!=='string'||!raw.trim())return null;let list=loadArray(keys.snapshots);const checksum=fnv1a32(raw),existing=list.find(item=>item.sourceChecksum===checksum&&item.targetSchemaVersion===toVersion);if(existing)return existing.id;const id=`snapshot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;list.push({id,sourcePayload:raw,sourceChecksum:checksum,sourceSchemaVersion:Number(fromVersion)||0,targetSchemaVersion:toVersion,migrationSetFingerprint:'pf08a-wave1c-v1',capturedAt:Date.now(),source,protected:false});list=retain(list,3);storeArray(keys.snapshots,list);return id}
  function selectLoadSource(){
    const slots=inspectSlots(),valid=[slots.a,slots.b].filter(item=>item.ok).sort((x,y)=>y.envelope.revision-x.envelope.revision);
    if(valid.length){
      let chosen=valid[0],status='healthy';
      if(slots.head){const pointed=slots.head.activeSlot==='a'?slots.a:slots.b;if(pointed.ok&&pointed.envelope.revision===slots.head.revision&&pointed.envelope.envelopeChecksum===slots.head.envelopeChecksum)chosen=pointed;else status='recovered_from_secondary_slot'}else status='recovered_from_secondary_slot';
      selectedPayload=chosen.envelope.payload;selectedSource=`slot_${chosen===slots.a?'a':'b'}`;recoveryLocked=false;
      updateStatus(status,{revision:chosen.envelope.revision,stateSchemaVersion:chosen.envelope.stateSchemaVersion,source:selectedSource});
      return{ok:true,source:selectedSource,payload:selectedPayload,state:chosen.state,raw:selectedPayload};
    }
    const currentCandidates=[{source:'compatibility_payload',raw:nativeGetItem(keys.compatibility)},...(!testToken?[{source:'legacy_runtime_key',raw:nativeGetItem('familypilot.operations.foundation.v2')}]:[])];
    for(const candidate of currentCandidates){
      if(candidate.raw==null||candidate.raw==='')continue;
      const result=validSource(candidate.raw,candidate.source);
      if(result.ok){selectedPayload=result.raw;selectedSource=candidate.source;recoveryLocked=false;updateStatus('recovered_from_compatibility_payload',{source:selectedSource,stateSchemaVersion:Number(result.state.schemaVersion)||0});return result}
      const q=quarantineRaw(candidate.source,candidate.raw,result.error,true);selectedSource=candidate.source;selectedPayload=null;recoveryLocked=true;const status=result.error==='future_schema'?'future_schema_blocked':'recovery_locked';updateStatus(status,{source:selectedSource,stateSchemaVersion:Number(result.state?.schemaVersion)||0,quarantineIds:[q],messageCode:result.error});return{ok:false,locked:true,error:result.error};
    }
    const legacyCandidates=[{source:'legacy_key',raw:testToken?nativeGetItem(`${storageNamespace}legacy-v1`):nativeGetItem('family-finance-state')},{source:'legacy_main_v7',raw:testToken?null:nativeGetItem('familypilot.main.v7')}];
    for(const candidate of legacyCandidates){
      if(candidate.raw==null||candidate.raw==='')continue;
      const result=validSource(candidate.raw,candidate.source);
      if(result.ok){selectedPayload=result.raw;selectedSource=candidate.source;recoveryLocked=false;updateStatus('recovered_from_legacy_key',{source:selectedSource,stateSchemaVersion:Number(result.state.schemaVersion)||0});return result}
      const q=quarantineRaw(candidate.source,candidate.raw,result.error,true);selectedSource=candidate.source;recoveryLocked=true;updateStatus(result.error==='future_schema'?'future_schema_blocked':'recovery_locked',{source:selectedSource,stateSchemaVersion:Number(result.state?.schemaVersion)||0,quarantineIds:[q],messageCode:result.error});return{ok:false,locked:true,error:result.error};
    }
    selectedPayload=null;selectedSource='none';recoveryLocked=false;updateStatus('migration_pending',{source:'none',stateSchemaVersion:0,messageCode:'no_persisted_state'});return{ok:false,empty:true};
  }
  function recoveryShell(){return{schemaVersion:CURRENT_SCHEMA,persistenceRecoveryLock:true,persistenceRecoveryStatus:clone(currentStatusValue),household:{id:'recovery-shell',baseCurrency:'EUR',openingCapital:0},currentMemberId:'member-anna',activeWalletId:null,config:{trashRetentionEnabled:true,trashRetentionDays:45,quickCategoryIds:{expense:[],income:[]}},members:[],wallets:[],categories:[],operations:[],transfers:[],walletMovements:[],purposeAllocations:[],savingsGoals:[],savingsTransfers:[]}}
  function preferencePhysicalKey(key){return testToken?`${storageNamespace}pref-${encodeURIComponent(key)}`:key}
  function routeGetItem(key){const text=String(key);if(BASE_STATE_KEYS.has(text)){markOwnedRead();if(recoveryLocked)return JSON.stringify(recoveryShell());return selectedPayload}if(LEGACY_STATE_KEYS.has(text)){markOwnedRead();if(recoveryLocked)return null;return selectedPayload||nativeGetItem(testToken?`${storageNamespace}legacy-v1`:text)}if(text.startsWith('familypilot-')||text.startsWith('familypilot.')){markOwnedRead();return nativeGetItem(preferencePhysicalKey(text))}return nativeGetItem(text)}
  function classifyStorageError(error,fallback){const name=String(error?.name||'');if(name==='QuotaExceededError')return'storage_quota_exceeded';if(name==='SecurityError')return'storage_unavailable';return fallback}
  function writeNative(key,value,point){if(failNext===point){failNext='';throw Object.assign(new Error(point),{code:point})}try{nativeSetItem(key,value)}catch(error){throw Object.assign(error,{code:classifyStorageError(error,point)})}}
  function commitState(state){
    if(recoveryLocked||bootstrapStatus==='locked')throw Object.assign(new Error('recovery_locked'),{code:'recovery_locked'});
    const validation=structuralValidate(state);if(!validation.ok)throw Object.assign(new Error(validation.error),{code:validation.error});
    let envelope;const slots=inspectSlots(),currentRevision=Math.max(slots.a.ok?slots.a.envelope.revision:0,slots.b.ok?slots.b.envelope.revision:0);
    try{envelope=makeEnvelope(state,currentRevision+1)}catch(error){updateStatus('write_failed',{messageCode:error.message||'serialization_failed'});throw error}
    const active=slots.head?.activeSlot||(slots.a.ok&&(!slots.b.ok||slots.a.envelope.revision>=slots.b.envelope.revision)?'a':'b'),next=active==='a'?'b':'a',slotKey=next==='a'?keys.slotA:keys.slotB;
    try{
      writeNative(slotKey,JSON.stringify(envelope),'slot_write');
      const verified=inspectSlot(slotKey);if(!verified.ok||verified.envelope.envelopeChecksum!==envelope.envelopeChecksum)throw Object.assign(new Error('slot_readback_mismatch'),{code:'slot_readback_mismatch'});
      const head={envelopeVersion:ENVELOPE_VERSION,activeSlot:next,revision:envelope.revision,envelopeChecksum:envelope.envelopeChecksum,updatedAt:Date.now()};
      writeNative(keys.head,JSON.stringify(head),'head_write');
      const readHead=inspectHead();if(!readHead||readHead.activeSlot!==next||readHead.revision!==envelope.revision||readHead.envelopeChecksum!==envelope.envelopeChecksum)throw Object.assign(new Error('head_readback_mismatch'),{code:'head_readback_mismatch'});
      let compatibilityWarning=null;try{writeNative(keys.compatibility,envelope.payload,'compatibility_write')}catch(error){compatibilityWarning=error.code||'compatibility_write_warning'}
      try{nativeRemoveItem(keys.candidate)}catch{}
      selectedPayload=envelope.payload;selectedSource=`slot_${next}`;
      updateStatus('healthy',{source:selectedSource,revision:envelope.revision,stateSchemaVersion:envelope.stateSchemaVersion,messageCode:compatibilityWarning||'healthy'});
      return{ok:true,revision:envelope.revision,activeSlot:next,warning:compatibilityWarning};
    }catch(error){updateStatus('write_failed',{source:selectedSource,revision:currentRevision,stateSchemaVersion:Number(state.schemaVersion)||0,messageCode:error.code||error.message||'write_failed'});throw error}
  }
  function routeSetItem(key,value){const text=String(key),raw=String(value);if(BASE_STATE_KEYS.has(text)){if(bootstrapStatus==='pending'||bootstrapStatus==='locked'){pendingCandidate=raw;try{writeNative(keys.candidate,raw,'candidate_write')}catch{}return}const parsed=parseObject(raw);if(!parsed.ok)throw Object.assign(new Error('serialization_failed'),{code:'serialization_failed'});commitState(parsed.value);return}if(LEGACY_STATE_KEYS.has(text)){if(bootstrapStatus==='pending'){pendingCandidate=raw;return}return}if(text.startsWith('familypilot-')||text.startsWith('familypilot.')){writeNative(preferencePhysicalKey(text),raw,'preference_write');return}return original.setItem.call(storage,text,raw)}
  function isProtectedKey(key){return protectedPhysicalKeys.has(key)||(!testToken&&Object.values(productionKeys).includes(key))}
  function routeRemoveItem(key){const text=String(key);if(BASE_STATE_KEYS.has(text)){nativeRemoveItem(keys.compatibility);return}const physical=(text.startsWith('familypilot-')||text.startsWith('familypilot.'))?preferencePhysicalKey(text):text;if(isProtectedKey(physical)&&!testMode)return;nativeRemoveItem(physical)}
  function routeClear(){const remove=[];for(let i=0;i<nativeLength();i++){const key=nativeKey(i);if(!key)continue;if(isProtectedKey(key)||key.startsWith('familypilot-state-')||key.startsWith('familypilot-')||key.startsWith('familypilot.'))continue;remove.push(key)}for(const key of remove)nativeRemoveItem(key)}
  proto.getItem=function(key){return this===storage?routeGetItem(key):original.getItem.call(this,key)};
  proto.setItem=function(key,value){return this===storage?routeSetItem(key,value):original.setItem.call(this,key,value)};
  proto.removeItem=function(key){return this===storage?routeRemoveItem(key):original.removeItem.call(this,key)};
  proto.clear=function(){return this===storage?routeClear():original.clear.call(this)};
  proto.key=function(index){return original.key.call(this,index)};

  function migrationLedger(state){if(!Array.isArray(state.persistenceMigrationLedger))state.persistenceMigrationLedger=[];return state.persistenceMigrationLedger}
  function finalizeBootstrap(state,descriptors){
    if(recoveryLocked){bootstrapStatus='locked';lastFinalizeResult={ok:false,error:'recovery_locked'};return lastFinalizeResult}
    const sourceSchema=Number(state.schemaVersion)||0;
    const snapshotId=selectedPayload&&sourceSchema<CURRENT_SCHEMA?captureSnapshot(selectedPayload,selectedSource,sourceSchema,CURRENT_SCHEMA):null;
    const ordered=[...(Array.isArray(descriptors)?descriptors:[])].sort((a,b)=>Number(a.order)-Number(b.order));
    const ledger=migrationLedger(state);
    for(const descriptor of ordered){
      if(ledger.some(entry=>entry.status==='completed'&&entry.idempotencyKey===descriptor.idempotencyKey))continue;
      const before=clone(state),startedAt=Date.now(),entryBase={id:`migration-${descriptor.id}-${startedAt.toString(36)}`,migrationId:descriptor.id,fromVersion:Number(state.schemaVersion)||0,toVersion:Number(descriptor.toVersion)||CURRENT_SCHEMA,idempotencyKey:descriptor.idempotencyKey,startedAt,preMigrationSnapshotId:snapshotId||null};
      try{
        if(typeof descriptor.ready==='function'&&!descriptor.ready())throw new Error('required_dependency_unavailable');
        if(typeof descriptor.apply==='function')descriptor.apply(state,{persistence:api});
        const validation=typeof descriptor.validate==='function'?descriptor.validate(state,{persistence:api}):{ok:true};
        if(validation&&validation.ok===false)throw new Error(validation.error||'migration_validation_failed');
        ledger.push({...entryBase,completedAt:Date.now(),status:'completed',errorCode:null,resultFingerprint:fnv1a32(canonicalSerialize(state))});
      }catch(error){
        for(const key of Object.keys(state))delete state[key];Object.assign(state,before);
        migrationLedger(state).push({...entryBase,completedAt:Date.now(),status:'failed',errorCode:String(error?.message||error),resultFingerprint:null});
        bootstrapStatus='locked';updateStatus('migration_failed',{source:selectedSource,stateSchemaVersion:Number(state.schemaVersion)||0,snapshotIds:snapshotId?[snapshotId]:[],messageCode:String(error?.message||error)});
        lastFinalizeResult={ok:false,error:String(error?.message||error),migrationId:descriptor.id};return lastFinalizeResult;
      }
    }
    state.schemaVersion=CURRENT_SCHEMA;
    try{bootstrapStatus='ready';const committed=commitState(state);lastFinalizeResult={ok:true,...committed,migrations:ordered.length};return lastFinalizeResult}catch(error){bootstrapStatus='locked';lastFinalizeResult={ok:false,error:String(error?.code||error?.message||error)};return lastFinalizeResult}
  }
  function diagnosticReport(){const slots=inspectSlots(),snapshots=loadArray(keys.snapshots),quarantine=loadArray(keys.quarantine);return{generatedAt:Date.now(),schemaOwner:'FamilyPilotPersistence',currentStateSchemaVersion:CURRENT_SCHEMA,storageNamespace,bootstrap:{status:bootstrapStatus,installedAt,firstOwnedReadAt,installedBeforeFirstOwnedRead:firstOwnedReadAt===null||installedAt<=firstOwnedReadAt},status:{status:currentStatusValue.status,source:currentStatusValue.source,revision:currentStatusValue.revision,stateSchemaVersion:currentStatusValue.stateSchemaVersion,messageCode:currentStatusValue.messageCode},slots:{head:Boolean(slots.head),a:slots.a.ok,b:slots.b.ok},snapshots:{count:snapshots.length,ids:snapshots.map(item=>item.id)},quarantine:{count:quarantine.length,ids:quarantine.map(item=>item.id),reasons:quarantine.map(item=>item.reasonCode)},migration:{lastFinalizeOk:lastFinalizeResult.ok===true},networkRequests}}
  function downloadDiagnostic(){const blob=new Blob([JSON.stringify(diagnosticReport(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`familypilot-diagnostic-${Date.now()}.json`;a.click();queueMicrotask(()=>URL.revokeObjectURL(url))}
  function retryRecovery(){const result=selectLoadSource();return result.ok?result:{source:recoveryLocked?'recovery_shell':'none'}}
  function cleanupTest(){if(!testToken)return 0;const remove=[];for(let i=0;i<nativeLength();i++){const key=nativeKey(i);if(key&&key.includes(testToken))remove.push(key)}for(const key of remove)nativeRemoveItem(key);return remove.length}
  function seedMalformedCompatibilityPayload(){for(const key of [keys.head,keys.slotA,keys.slotB,keys.compatibility,keys.candidate])nativeRemoveItem(key);nativeSetItem(keys.compatibility,'{"schemaVersion":22,"wallets":[')}
  function seedFutureSchemaPayload(){for(const key of [keys.head,keys.slotA,keys.slotB,keys.compatibility,keys.candidate])nativeRemoveItem(key);nativeSetItem(keys.compatibility,JSON.stringify({schemaVersion:CURRENT_SCHEMA+1,household:{id:'future'},wallets:[],operations:[],categories:[]}))}
  function corruptActiveSlot(){const slots=inspectSlots(),active=slots.head?.activeSlot;if(!active)return false;nativeSetItem(active==='a'?keys.slotA:keys.slotB,'{"corrupt":true');return true}

  const selected=selectLoadSource();
  if(selected.ok)pendingCandidate=selected.raw;
  const api=Object.freeze({CURRENT_SCHEMA,CURRENT_STATE_SCHEMA_VERSION,storageNamespace,canonicalSerialize,fnv1a32,structuralValidate,finalizeBootstrap,currentStatus:()=>clone(currentStatusValue),inspectSlots,isRecoveryLocked:()=>recoveryLocked,diagnosticReport,downloadDiagnostic,commitState,test:testMode?Object.freeze({cleanup:cleanupTest,failNextWriteAt:point=>{failNext=String(point||'')},corruptActiveSlot,seedMalformedCompatibilityPayload,seedFutureSchemaPayload,retryRecovery,nativeGetItem,nativeSetItem,keys:()=>({...keys})}):undefined});
  root.FamilyPilotPersistence=api;
  root.__FP_PERSISTENCE_CORE_READY__=true;
})(typeof window!=='undefined'?window:globalThis);

(function attachFamilyPilotScope(root){
  'use strict';
  const activeOperations=state=>(Array.isArray(state?.operations)?state.operations:[]).filter(operation=>operation?.status==='active');
  const activeMovements=state=>(Array.isArray(state?.walletMovements)?state.walletMovements:[]).filter(movement=>movement?.status==='active'&&(movement?.movementRole==='transfer_source'||movement?.movementRole==='transfer_destination'));
  const activeAdjustments=state=>(Array.isArray(state?.balanceAdjustments)?state.balanceAdjustments:[]).filter(item=>item?.status==='active');
  const wallets=state=>Array.isArray(state?.wallets)?state.wallets:[];
  function migrateState(state,at=Date.now()){
    if(!state||typeof state!=='object')throw new Error('FamilyPilot state is required');
    for(const key of ['members','wallets','operations','transfers','walletMovements'])if(!Array.isArray(state[key]))state[key]=[];
    for(const wallet of state.wallets){if(wallet.nativeCurrency==null&&wallet.baseCurrency)wallet.nativeCurrency=wallet.baseCurrency;if(!Array.isArray(wallet.allowedMemberIds))wallet.allowedMemberIds=Array.isArray(wallet.visibleToMemberIds)?wallet.visibleToMemberIds:[];if(wallet.archivedAt===undefined)wallet.archivedAt=null;if(wallet.createdAt===undefined)wallet.createdAt=at}
    return state;
  }
  function canAccessWallet(state,wallet){if(!wallet||wallet.archivedAt)return false;if(wallet.ownerMemberId&&wallet.ownerMemberId===state?.currentMemberId)return true;if(!Array.isArray(wallet.allowedMemberIds))return true;return wallet.allowedMemberIds.includes(state?.currentMemberId)}
  function accessibleWallets(state){const available=wallets(state).filter(wallet=>canAccessWallet(state,wallet));return available.length?available:wallets(state).filter(wallet=>!wallet.archivedAt)}
  function defaultWallet(state){const available=accessibleWallets(state);return available.find(wallet=>wallet.type==='household_default')||available[0]||null}
  function activeWallet(state){const available=accessibleWallets(state);return available.find(wallet=>wallet.id===state?.activeWalletId)||defaultWallet(state)}
  const isPersonalWallet=wallet=>wallet?.type==='personal',isTransfer=operation=>operation?.kind==='transfer',transferWalletIds=operation=>[operation?.sourceWalletId,operation?.destinationWalletId].filter(Boolean);
  function transferAccessible(state,operation){const ids=transferWalletIds(operation);if(ids.length!==2)return false;return ids.every(id=>{const wallet=wallets(state).find(item=>item.id===id);return canAccessWallet(state,wallet)})}
  function visibleOperations(state){const selected=activeWallet(state);if(!selected)return[];const operations=activeOperations(state);if(isPersonalWallet(selected))return operations.filter(operation=>isTransfer(operation)?transferAccessible(state,operation)&&transferWalletIds(operation).includes(selected.id):operation.walletId===selected.id);const householdWalletIds=new Set(accessibleWallets(state).filter(wallet=>!isPersonalWallet(wallet)).map(wallet=>wallet.id));return operations.filter(operation=>isTransfer(operation)?transferAccessible(state,operation)&&transferWalletIds(operation).some(id=>householdWalletIds.has(id)):householdWalletIds.has(operation.walletId))}
  function householdCapitalOperations(state){const includedWalletIds=new Set(wallets(state).filter(wallet=>!wallet.archivedAt&&wallet.includedInHouseholdCapital===true).map(wallet=>wallet.id));return activeOperations(state).filter(operation=>!isTransfer(operation)&&includedWalletIds.has(operation.walletId))}
  function householdCapitalMovements(state){const includedWalletIds=new Set(wallets(state).filter(wallet=>!wallet.archivedAt&&wallet.includedInHouseholdCapital===true).map(wallet=>wallet.id));return activeMovements(state).filter(movement=>includedWalletIds.has(movement.walletId))}
  function walletMovements(state,walletId){return activeMovements(state).filter(movement=>movement.walletId===walletId)}
  function walletAdjustments(state,walletId){return activeAdjustments(state).filter(item=>item.walletId===walletId)}
  function totals(operations){return operations.reduce((result,operation)=>{const amount=Number(operation?.amount)||0;if(operation?.kind==='income')result.income+=amount;if(operation?.kind==='expense')result.expense+=amount;if(operation?.kind==='debt_inflow')result.debtInflow+=amount;if(operation?.kind==='debt_outflow')result.debtOutflow+=amount;return result},{income:0,expense:0,debtInflow:0,debtOutflow:0})}
  function movementTotals(movements){return movements.reduce((result,movement)=>{const amount=Number(movement?.amount)||0;if(movement?.direction==='inflow')result.transferInflow+=amount;if(movement?.direction==='outflow')result.transferOutflow+=amount;return result},{transferInflow:0,transferOutflow:0})}
  function adjustmentTotal(adjustments){return adjustments.reduce((sum,item)=>sum+(Number(item?.delta)||0),0)}
  function snapshot(state,selected,operations,movements,adjustments,opening,scope,currency){const flow=totals(operations),transferFlow=movementTotals(movements),adjustment=adjustmentTotal(adjustments),change=flow.income+flow.debtInflow+transferFlow.transferInflow-flow.expense-flow.debtOutflow-transferFlow.transferOutflow+adjustment;return{wallet:selected,scope,currency,opening,...flow,...transferFlow,adjustment,change,capital:opening+change}}
  function walletCapitalSnapshot(state,walletId){const selected=wallets(state).find(item=>item.id===walletId&&!item.archivedAt);if(!selected)return{wallet:null,scope:'wallet',currency:state?.household?.baseCurrency||'EUR',opening:0,income:0,expense:0,debtInflow:0,debtOutflow:0,transferInflow:0,transferOutflow:0,adjustment:0,change:0,capital:0};const operations=activeOperations(state).filter(operation=>!isTransfer(operation)&&operation.walletId===selected.id),movements=walletMovements(state,selected.id),adjustments=walletAdjustments(state,selected.id),opening=Number(selected.openingBalance)||0;return snapshot(state,selected,operations,movements,adjustments,opening,'wallet',selected.nativeCurrency||state?.household?.baseCurrency||'EUR')}
  function capitalSnapshot(state){const selected=activeWallet(state);if(!selected)return{wallet:null,scope:'household',currency:state?.household?.baseCurrency||'EUR',opening:0,income:0,expense:0,debtInflow:0,debtOutflow:0,transferInflow:0,transferOutflow:0,adjustment:0,change:0,capital:0};if(isPersonalWallet(selected)){const result=walletCapitalSnapshot(state,selected.id);return{...result,scope:'personal'}}const operations=householdCapitalOperations(state),movements=householdCapitalMovements(state),includedIds=new Set(wallets(state).filter(wallet=>!wallet.archivedAt&&wallet.includedInHouseholdCapital===true).map(wallet=>wallet.id)),adjustments=activeAdjustments(state).filter(item=>includedIds.has(item.walletId)),opening=Number(state?.household?.openingCapital)||0,additionalOpening=wallets(state).filter(wallet=>wallet.type!=='household_default'&&wallet.includedInHouseholdCapital===true).reduce((sum,wallet)=>sum+(Number(wallet.openingBalance)||0),0);return snapshot(state,selected,operations,movements,adjustments,opening+additionalOpening,'household',state?.household?.baseCurrency||selected.nativeCurrency||'EUR')}
  function capitalBreakdown(state){const included=wallets(state).filter(wallet=>!wallet.archivedAt&&wallet.includedInHouseholdCapital===true),balances=new Map(included.map(wallet=>[wallet.id,walletCapitalSnapshot(state,wallet.id).capital])),defaultId=defaultWallet(state)?.id||included[0]?.id||'';for(const account of Array.isArray(state?.investmentAccounts)?state.investmentAccounts:[]){if(account?.status!=='active')continue;const assignment=(state?.investmentLocationAssignments||[]).find(item=>item?.investmentId===account.id&&item?.status!=='inactive'),locationId=assignment?.locationId||defaultId;if(balances.has(locationId))balances.set(locationId,(balances.get(locationId)||0)-(Number(account.bookAmount)||0))}let cash=0,bank=0;const locations=[];for(const wallet of included){const balance=Math.round((balances.get(wallet.id)||0)*100)/100,moneyForm=wallet.moneyForm==='cash'?'cash':'bank';if(moneyForm==='cash')cash+=balance;else bank+=balance;locations.push({walletId:wallet.id,name:wallet.name,moneyForm,locationKind:wallet.locationKind||'bank_current',balance,currency:wallet.nativeCurrency||state?.household?.baseCurrency||'EUR'})}const investments=(Array.isArray(state?.investmentAccounts)?state.investmentAccounts:[]).filter(account=>account?.status==='active').reduce((sum,account)=>sum+(Number(account.currentValue)||0),0),reservedPurpose=(Array.isArray(state?.savingsGoals)?state.savingsGoals:[]).filter(goal=>goal?.status==='active').reduce((sum,goal)=>sum+(Number(goal.savedAmount)||0),0);cash=Math.round(cash*100)/100;bank=Math.round(bank*100)/100;const total=Math.round((cash+bank+investments)*100)/100,freelyAvailable=Math.round(Math.max(0,cash+bank-reservedPurpose)*100)/100;return{cash,bank,investments:Math.round(investments*100)/100,total,reservedPurpose:Math.round(reservedPurpose*100)/100,freelyAvailable,locations}}
  function scopeDescriptor(state){const selected=activeWallet(state),personal=isPersonalWallet(selected);return{wallet:selected,scope:personal?'personal':'household',currency:personal?(selected?.nativeCurrency||state?.household?.baseCurrency||'EUR'):(state?.household?.baseCurrency||'EUR'),capitalTitle:personal?'Личный капитал':'Капитал',capitalLabel:personal?(selected?.name||'Личный кошелёк'):'включённые места хранения',operationsLabel:personal?(selected?.name||'Личный кошелёк'):'Семейный контекст',analyticsLabel:personal?(selected?.name||'Личный кошелёк'):'Семейный контекст'}}
  root.FamilyPilotScope=Object.freeze({migrateState,activeOperations,activeMovements,activeAdjustments,canAccessWallet,accessibleWallets,defaultWallet,activeWallet,isPersonalWallet,isTransfer,visibleOperations,householdCapitalOperations,householdCapitalMovements,walletMovements,walletAdjustments,totals,movementTotals,adjustmentTotal,walletCapitalSnapshot,capitalSnapshot,capitalBreakdown,scopeDescriptor});
})(typeof window!=='undefined'?window:globalThis);

(function bootstrapFamilyPilotPackages(root){
  'use strict';
  if(typeof document==='undefined'||!root||root.__FP_WF02_BOOTSTRAP__)return;
  root.__FP_WF02_BOOTSTRAP__=true;
  const testMode=new URLSearchParams(location.search).has('test');
  const runtimeDeadline=Date.now()+30000;
  function ensurePackageMarker(){const selector='meta[name="familypilot-package"][content="base-currency-wallet-transfers-v1"]';let marker=document.head?.querySelector(selector);if(document.head&&!marker){marker=document.createElement('meta');marker.name='familypilot-package';marker.content='base-currency-wallet-transfers-v1';marker.dataset.runtimeMount='familypilot-scope';document.head.appendChild(marker)}return marker}
  function loadScript(path,ready=()=>{}){const existing=[...document.scripts].find(script=>script.src&&script.src.endsWith(`/${path}`));if(existing){if(existing.dataset.loaded==='true')ready();else existing.addEventListener('load',ready,{once:true});return}const script=document.createElement('script');script.src=`./${path}`;script.async=false;script.dataset.familyPilotPackage='runtime-extension';script.addEventListener('load',()=>{script.dataset.loaded='true';ready()},{once:true});script.addEventListener('error',()=>{root.__FP_PACKAGE_BOOTSTRAP_ERROR__=`Failed to load ${path}`},{once:true});document.head.appendChild(script)}
  const loadOne=path=>new Promise(resolve=>loadScript(path,resolve));
  async function loadM403(){await loadOne('familypilot-m4-03-savings-accounts.js');await loadOne('familypilot-m4-03-savings-accounts-ui.js');root.__FP_M4_03_PACKAGE_LOADED__=true}
  async function loadPaymentAttention(){await loadOne('familypilot-payment-attention.js');await loadOne('familypilot-payment-attention-ui.js');root.__FP_M3_03_READY__=true;await loadOne('familypilot-obligation-state-ui.js');root.__FP_M3_04_READY__=true;await loadOne('familypilot-partial-payment-removal-v2.js');await loadOne('familypilot-partial-payments.js');await loadOne('familypilot-obligation-wallet-isolation.js');await loadOne('familypilot-partial-payment-settlement.js');await loadOne('familypilot-partial-payments-render-sync.js');await loadOne('familypilot-overpayment-resolution.js');await loadOne('familypilot-partial-payment-entry-ui.js');await loadOne('familypilot-partial-state-visuals.js');root.__FP_M3_07A_READY__=true;root.__FP_M3_07_MODEL_READY__=true;await loadOne('familypilot-payment-link-lifecycle.js');root.__FP_M3_05_READY__=true;await loadOne('familypilot-linked-obligation-operation-lifecycle.js');await loadOne('familypilot-mobile-payment-tap.js');await loadOne('familypilot-operation-mobile-ui.js');await loadOne('familypilot-operation-date-picker.js');root.__FP_M3_06_READY__=true;root.__FP_M3_07_READY__=true;await loadOne('familypilot-rule-history.js');root.__FP_M3_08_READY__=true;await loadOne('familypilot-planned-income.js');await loadOne('familypilot-planned-income-amount-model.js');await loadOne('familypilot-planned-income-ui.js');await loadOne('familypilot-planned-income-amount-ui.js');root.__FP_M4_01_READY__=true;root.__FP_M4_02_READY__=true;await loadM403()}
  function settleTransferSurfaceWhenBaseRuntimeReady(){const runtime=root.__FP_RUNTIME__;if(!runtime||(testMode&&!root.__FP_TEST__)){if(Date.now()>=runtimeDeadline){root.__FP_WF02_BOOTSTRAP_ERROR__='Base FamilyPilot runtime did not become ready';return}setTimeout(settleTransferSurfaceWhenBaseRuntimeReady,25);return}if(testMode){loadScript('familypilot-wallet-transfers-ui.js',()=>{root.__FP_WF02_READY__=true;root.__FP_WF02_HIDDEN__=false;loadPaymentAttention().catch(error=>{root.__FP_PACKAGE_BOOTSTRAP_ERROR__=String(error?.message||error)})});return}try{root.FamilyPilotWalletTransfers?.normalizeState(runtime.state,Date.now());runtime.save?.()}catch(error){root.__FP_WF02_COMPATIBILITY_ERROR__=String(error?.message||error)}const marker=ensurePackageMarker();if(marker)marker.dataset.productState='hidden-superseded';root.__FP_WF02_READY__=false;root.__FP_WF02_HIDDEN__=true;loadPaymentAttention().catch(error=>{root.__FP_PACKAGE_BOOTSTRAP_ERROR__=String(error?.message||error)})}
  function mount(){ensurePackageMarker();loadScript('familypilot-persistence-runtime.js',()=>{root.__FP_PERSISTENCE_RUNTIME_SCRIPT_LOADED__=true});loadScript('familypilot-viewport-anchor.js',()=>loadScript('familypilot-wallet-transfers.js',settleTransferSurfaceWhenBaseRuntimeReady))}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else queueMicrotask(mount);
})(typeof window!=='undefined'?window:globalThis);
