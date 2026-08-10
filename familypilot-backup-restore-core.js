(function installFamilyPilotBackupRestoreCore(root){
  'use strict';
  if(!root||root.FamilyPilotBackupRestoreCore)return;

  const PACKAGE_KIND='FamilyPilotBackupPackage';
  const FORMAT_VERSION=1;
  const PAYLOAD_ENCODING='canonical_json_utf8';
  const UNPROTECTED_DEVELOPMENT_MODE='unprotected_development_only';
  const stagedRestores=new WeakSet();

  const persistence=()=>root.FamilyPilotPersistence;
  function api(){const value=persistence();if(!value)throw new Error('persistence_unavailable');return value}
  function isPlainObject(value){if(value===null||typeof value!=='object'||Array.isArray(value))return false;const proto=Object.getPrototypeOf(value);return proto===null||typeof proto==='object'}
  function deepFreeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const item of Object.values(value))deepFreeze(item)}return value}
  function clone(value){return JSON.parse(api().canonicalSerialize(value))}
  function utf8ByteLength(text){
    const value=String(text),Encoder=root.TextEncoder||(typeof TextEncoder!=='undefined'&&TextEncoder);
    if(Encoder)return new Encoder().encode(value).length;
    let bytes=0;
    for(let index=0;index<value.length;index++){
      const code=value.charCodeAt(index);
      if(code<=0x7f)bytes+=1;
      else if(code<=0x7ff)bytes+=2;
      else if(code>=0xd800&&code<=0xdbff&&index+1<value.length){const next=value.charCodeAt(index+1);if(next>=0xdc00&&next<=0xdfff){bytes+=4;index++}else bytes+=3}
      else bytes+=3;
    }
    return bytes;
  }
  function error(code){return{ok:false,error:code}}
  function fingerprint(kind,formatVersion,manifest,payload){return api().fnv1a32(api().canonicalSerialize({kind,formatVersion,manifest,payload}))}
  function lifecycle(action,outcome,manifest,packageFingerprint,revision){
    const event={action,timestamp:Date.now(),outcome,formatVersion:manifest?.formatVersion||FORMAT_VERSION,stateSchemaVersion:manifest?.stateSchemaVersion||api().CURRENT_STATE_SCHEMA_VERSION,protectionState:manifest?.protectionMode||null,packageFingerprint:packageFingerprint||null};
    if(Number.isInteger(revision))event.revision=revision;
    return event;
  }
  function createBackupPackage(state,options={}){
    const p=api(),validation=p.structuralValidate(state);if(!validation.ok)throw Object.assign(new Error(validation.error),{code:validation.error});
    const schema=Number(state.schemaVersion??0),current=p.CURRENT_STATE_SCHEMA_VERSION;
    if(schema!==current)throw Object.assign(new Error(schema>current?'future_schema':'unsupported_schema'),{code:schema>current?'future_schema':'unsupported_schema'});
    let payload;try{payload=p.canonicalSerialize(state)}catch{throw Object.assign(new Error('serialization_failed'),{code:'serialization_failed'})}
    const manifest={
      formatVersion:FORMAT_VERSION,
      createdAt:Number.isFinite(Number(options.createdAt))?Number(options.createdAt):Date.now(),
      stateSchemaVersion:schema,
      payloadEncoding:PAYLOAD_ENCODING,
      payloadByteLength:utf8ByteLength(payload),
      checksumAlgorithm:'fnv1a32',
      payloadChecksum:p.fnv1a32(payload),
      protectionMode:UNPROTECTED_DEVELOPMENT_MODE,
    };
    return deepFreeze({kind:PACKAGE_KIND,formatVersion:FORMAT_VERSION,manifest:deepFreeze(manifest),payload});
  }
  function parsePackage(input){
    if(typeof input==='string'){try{input=JSON.parse(input)}catch{return error('package_malformed_json')}}
    if(!isPlainObject(input))return error('package_not_object');
    return{ok:true,value:input};
  }
  function validateBackupPackage(input,policy={}){
    const p=api(),parsed=parsePackage(input);if(!parsed.ok)return parsed;const pkg=parsed.value;
    if(pkg.kind!==PACKAGE_KIND)return error('unsupported_package_kind');
    if(pkg.formatVersion!==FORMAT_VERSION)return error('unsupported_package_format');
    if(!isPlainObject(pkg.manifest))return error('manifest_missing');
    const manifest=pkg.manifest,required=['formatVersion','createdAt','stateSchemaVersion','payloadEncoding','payloadByteLength','checksumAlgorithm','payloadChecksum','protectionMode'];
    if(required.some(key=>!Object.prototype.hasOwnProperty.call(manifest,key)))return error('manifest_incomplete');
    if(manifest.formatVersion!==FORMAT_VERSION||manifest.payloadEncoding!==PAYLOAD_ENCODING||!Number.isFinite(Number(manifest.createdAt))||!Number.isInteger(Number(manifest.stateSchemaVersion))||!Number.isSafeInteger(manifest.payloadByteLength)||manifest.payloadByteLength<0||manifest.checksumAlgorithm!=='fnv1a32'||typeof manifest.payloadChecksum!=='string')return error('manifest_invalid');
    if(manifest.protectionMode!==UNPROTECTED_DEVELOPMENT_MODE)return error('unsupported_protection_mode');
    if(policy?.allowUnprotectedDevelopment!==true)return error('unprotected_development_not_allowed');
    if(typeof pkg.payload!=='string')return error('payload_invalid_type');
    if(utf8ByteLength(pkg.payload)!==manifest.payloadByteLength)return error('payload_byte_length_mismatch');
    if(p.fnv1a32(pkg.payload)!==manifest.payloadChecksum)return error('payload_checksum_mismatch');
    let state;try{state=JSON.parse(pkg.payload)}catch{return error('payload_malformed_json')}
    if(!isPlainObject(state))return error('payload_root_not_object');
    const validation=p.structuralValidate(state);if(!validation.ok)return error(validation.error);
    const schema=Number(state.schemaVersion??0),current=p.CURRENT_STATE_SCHEMA_VERSION;
    if(schema>current)return error('future_schema');
    if(schema<current)return error('migration_required');
    if(schema!==Number(manifest.stateSchemaVersion))return error('state_schema_mismatch');
    let safeManifest,safeState,packageFingerprint;
    try{safeManifest=clone(manifest);safeState=clone(state);packageFingerprint=fingerprint(pkg.kind,pkg.formatVersion,safeManifest,pkg.payload)}catch{return error('package_serialization_invalid')}
    return{ok:true,kind:pkg.kind,formatVersion:pkg.formatVersion,manifest:safeManifest,state:safeState,fingerprint:packageFingerprint};
  }
  function stageRestore(input,policy={}){
    const result=validateBackupPackage(input,policy);if(!result.ok)return result;
    const stage=deepFreeze({stageKind:'FamilyPilotStagedRestoreV1',packageKind:result.kind,packageFormatVersion:result.formatVersion,manifest:deepFreeze(result.manifest),state:deepFreeze(result.state),fingerprint:result.fingerprint});
    stagedRestores.add(stage);
    return{ok:true,stage,lifecycle:lifecycle('restore_stage','staged',stage.manifest,stage.fingerprint)};
  }
  function validateStagedRestore(stage){
    const p=api();
    if(!stage||typeof stage!=='object'||!stagedRestores.has(stage)||stage.stageKind!=='FamilyPilotStagedRestoreV1')return error('invalid_staged_restore');
    let payload,expected;try{payload=p.canonicalSerialize(stage.state);expected=fingerprint(stage.packageKind,stage.packageFormatVersion,stage.manifest,payload)}catch{return error('invalid_staged_restore')}
    if(stage.fingerprint!==expected||stage.manifest.payloadChecksum!==p.fnv1a32(payload)||stage.manifest.payloadByteLength!==utf8ByteLength(payload))return error('staged_restore_fingerprint_mismatch');
    const validation=p.structuralValidate(stage.state);if(!validation.ok)return error(validation.error);
    const schema=Number(stage.state.schemaVersion??0),current=p.CURRENT_STATE_SCHEMA_VERSION;
    if(schema!==current)return error(schema>current?'future_schema':'migration_required');
    return{ok:true};
  }
  function applyStagedRestore(stage){
    const p=api();
    if(p.isRecoveryLocked())return error('recovery_locked');
    const validated=validateStagedRestore(stage);if(!validated.ok)return validated;
    try{
      const committed=p.commitState(stage.state);
      return{ok:true,status:'restored',revision:committed.revision,activeSlot:committed.activeSlot,stateSchemaVersion:p.CURRENT_STATE_SCHEMA_VERSION,restoreFingerprint:stage.fingerprint,requiresReload:true,lifecycle:lifecycle('restore_apply','applied',stage.manifest,stage.fingerprint,committed.revision)};
    }catch(err){return{ok:false,error:String(err?.code||err?.message||'restore_apply_failed'),lifecycle:lifecycle('restore_apply','failed',stage.manifest,stage.fingerprint)}}
  }

  root.FamilyPilotBackupRestoreCore=Object.freeze({
    PACKAGE_KIND,FORMAT_VERSION,PAYLOAD_ENCODING,UNPROTECTED_DEVELOPMENT_MODE,
    utf8ByteLength,createBackupPackage,validateBackupPackage,stageRestore,validateStagedRestore,applyStagedRestore,
  });
})(typeof window!=='undefined'?window:globalThis);
