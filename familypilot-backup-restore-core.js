(function installFamilyPilotBackupRestoreCore(root){
  'use strict';
  if(!root||root.FamilyPilotBackupRestoreCore)return;

  const PACKAGE_TYPE='familypilot-backup';
  const PACKAGE_VERSION=1;
  const MANIFEST_VERSION=1;
  const INTEGRITY_ALGORITHM='SHA-256';
  const PROTECTION_MODES=new Set(['none','external']);

  function isPlainObject(value){
    if(value===null||typeof value!=='object'||Array.isArray(value))return false;
    const proto=Object.getPrototypeOf(value);
    return proto===null||proto===Object.prototype||typeof proto==='object';
  }

  function canonicalSerialize(value){
    const seen=new Set();
    function normalize(input){
      if(input===null||typeof input==='string'||typeof input==='boolean')return input;
      if(typeof input==='number'){
        if(!Number.isFinite(input))throw new TypeError('serialization_failed_non_finite');
        return input;
      }
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

  function clone(value){return JSON.parse(canonicalSerialize(value))}

  function cryptoProvider(){
    const provider=root.crypto;
    if(!provider||!provider.subtle||typeof provider.subtle.digest!=='function')throw new Error('sha256_unavailable');
    return provider;
  }

  async function sha256(text){
    const encoded=new TextEncoder().encode(String(text));
    const digest=await cryptoProvider().subtle.digest('SHA-256',encoded);
    return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
  }

  function normalizeProtection(value){
    if(!isPlainObject(value))return{ok:false,error:'protection_policy_required'};
    const mode=String(value.mode||'');
    if(!PROTECTION_MODES.has(mode))return{ok:false,error:'unsupported_protection_mode'};
    const profileId=value.profileId==null?null:String(value.profileId).trim();
    if(mode==='external'&&!profileId)return{ok:false,error:'external_protection_profile_required'};
    if(mode==='none'&&profileId)return{ok:false,error:'unprotected_profile_not_allowed'};
    return{ok:true,value:{mode,profileId}};
  }

  function validateProtection(packageProtection,requiredProtection){
    const packaged=normalizeProtection(packageProtection);
    if(!packaged.ok)return packaged;
    if(requiredProtection==null)return packaged;
    const required=normalizeProtection(requiredProtection);
    if(!required.ok)return{ok:false,error:`required_${required.error}`};
    if(required.value.mode==='external'&&packaged.value.mode!=='external')return{ok:false,error:'protection_downgrade_blocked'};
    if(required.value.mode==='external'&&required.value.profileId!==packaged.value.profileId)return{ok:false,error:'protection_profile_mismatch'};
    return packaged;
  }

  function structuralValidator(options){
    const persistence=options?.persistence||root.FamilyPilotPersistence;
    return persistence&&typeof persistence.structuralValidate==='function'?state=>persistence.structuralValidate(state):state=>{
      if(!isPlainObject(state))return{ok:false,error:'root_not_object'};
      const schema=Number(state.schemaVersion);
      return Number.isInteger(schema)&&schema>=0?{ok:true}:{ok:false,error:'invalid_schema_version'};
    };
  }

  function currentSchema(options){
    const persistence=options?.persistence||root.FamilyPilotPersistence;
    const explicit=Number(options?.currentSchemaVersion);
    if(Number.isInteger(explicit)&&explicit>=0)return explicit;
    const fromPersistence=Number(persistence?.CURRENT_STATE_SCHEMA_VERSION??persistence?.CURRENT_SCHEMA);
    if(Number.isInteger(fromPersistence)&&fromPersistence>=0)return fromPersistence;
    throw new Error('current_schema_unavailable');
  }

  async function createPackage(state,options={}){
    const validate=structuralValidator(options),validation=validate(state);
    if(!validation||validation.ok!==true)return{ok:false,error:validation?.error||'state_validation_failed'};
    const protection=normalizeProtection(options.protection);
    if(!protection.ok)return protection;
    const schema=Number(state.schemaVersion);
    if(!Number.isInteger(schema)||schema<0)return{ok:false,error:'invalid_schema_version'};
    const payload=canonicalSerialize(state);
    const payloadSha256=await sha256(payload);
    const createdAt=Number(options.createdAt??Date.now());
    if(!Number.isFinite(createdAt)||createdAt<=0)return{ok:false,error:'invalid_created_at'};
    const manifestBase={
      manifestVersion:MANIFEST_VERSION,
      packageType:PACKAGE_TYPE,
      packageVersion:PACKAGE_VERSION,
      stateSchemaVersion:schema,
      createdAt,
      appVersion:options.appVersion==null?null:String(options.appVersion),
      protection:protection.value,
      integrity:{algorithm:INTEGRITY_ALGORITHM,payloadSha256,security:'corruption_detection_only'},
    };
    const manifestSha256=await sha256(canonicalSerialize(manifestBase));
    const manifest={...manifestBase,manifestSha256};
    const packageSha256=await sha256(canonicalSerialize({manifest,payload}));
    return{ok:true,package:{manifest,payload,packageSha256}};
  }

  function parsePackage(input){
    if(typeof input==='string'){
      try{input=JSON.parse(input)}catch{return{ok:false,error:'package_malformed_json'}}
    }
    if(!isPlainObject(input))return{ok:false,error:'package_root_invalid'};
    try{return{ok:true,value:clone(input)}}catch{return{ok:false,error:'package_serialization_invalid'}}
  }

  function manifestComplete(manifest){
    if(!isPlainObject(manifest))return false;
    if(manifest.manifestVersion!==MANIFEST_VERSION||manifest.packageType!==PACKAGE_TYPE||manifest.packageVersion!==PACKAGE_VERSION)return false;
    if(!Number.isInteger(manifest.stateSchemaVersion)||manifest.stateSchemaVersion<0)return false;
    if(!Number.isFinite(Number(manifest.createdAt))||Number(manifest.createdAt)<=0)return false;
    if(!isPlainObject(manifest.integrity)||manifest.integrity.algorithm!==INTEGRITY_ALGORITHM||typeof manifest.integrity.payloadSha256!=='string'||manifest.integrity.payloadSha256.length!==64)return false;
    if(manifest.integrity.security!=='corruption_detection_only'||typeof manifest.manifestSha256!=='string'||manifest.manifestSha256.length!==64)return false;
    return true;
  }

  async function prepareRestore(input,options={}){
    const parsed=parsePackage(input);
    if(!parsed.ok)return parsed;
    const pkg=parsed.value;
    if(!manifestComplete(pkg.manifest))return{ok:false,error:'manifest_incomplete_or_unsupported'};
    if(typeof pkg.payload!=='string'||typeof pkg.packageSha256!=='string'||pkg.packageSha256.length!==64)return{ok:false,error:'package_contents_incomplete'};
    const protection=validateProtection(pkg.manifest.protection,options.requiredProtection);
    if(!protection.ok)return protection;
    const manifestBase={...pkg.manifest};delete manifestBase.manifestSha256;
    if(await sha256(canonicalSerialize(manifestBase))!==pkg.manifest.manifestSha256)return{ok:false,error:'manifest_integrity_failed'};
    if(await sha256(pkg.payload)!==pkg.manifest.integrity.payloadSha256)return{ok:false,error:'payload_integrity_failed'};
    if(await sha256(canonicalSerialize({manifest:pkg.manifest,payload:pkg.payload}))!==pkg.packageSha256)return{ok:false,error:'package_integrity_failed'};
    let state;
    try{state=JSON.parse(pkg.payload)}catch{return{ok:false,error:'payload_malformed_json'}}
    if(!isPlainObject(state))return{ok:false,error:'payload_root_invalid'};
    const validate=structuralValidator(options),sourceSchema=Number(pkg.manifest.stateSchemaVersion),targetSchema=currentSchema(options);
    if(Number(state.schemaVersion)!==sourceSchema)return{ok:false,error:'schema_manifest_payload_mismatch'};
    if(sourceSchema>targetSchema)return{ok:false,error:'future_schema_blocked'};
    let migrated=false;
    if(sourceSchema<targetSchema){
      if(typeof options.migrate!=='function')return{ok:false,error:'migration_required',sourceSchemaVersion:sourceSchema,targetSchemaVersion:targetSchema};
      const candidate=clone(state);
      try{
        const result=await options.migrate(candidate,{sourceSchemaVersion:sourceSchema,targetSchemaVersion:targetSchema});
        if(result&&result.ok===false)return{ok:false,error:result.error||'migration_failed'};
      }catch(error){return{ok:false,error:String(error?.message||error||'migration_failed')}}
      state=candidate;migrated=true;
    }
    if(Number(state.schemaVersion)!==targetSchema)return{ok:false,error:migrated?'migration_target_schema_mismatch':'schema_mismatch'};
    const validation=validate(state);
    if(!validation||validation.ok!==true)return{ok:false,error:validation?.error||'state_validation_failed'};
    const stateCanonical=canonicalSerialize(state),stateSha256=await sha256(stateCanonical);
    return{ok:true,prepared:{state:clone(state),stateSha256,packageSha256:pkg.packageSha256,sourceSchemaVersion:sourceSchema,targetSchemaVersion:targetSchema,migrated,protection:protection.value,preparedAt:Date.now()}};
  }

  function replaceObject(target,source){
    for(const key of Object.keys(target))delete target[key];
    for(const [key,value] of Object.entries(source))target[key]=value;
  }

  async function commitPreparedRestore(liveState,prepared,options={}){
    if(!isPlainObject(liveState))return{ok:false,error:'live_state_invalid'};
    if(!isPlainObject(prepared)||!isPlainObject(prepared.state)||typeof prepared.stateSha256!=='string')return{ok:false,error:'prepared_restore_invalid'};
    const computed=await sha256(canonicalSerialize(prepared.state));
    if(computed!==prepared.stateSha256)return{ok:false,error:'prepared_restore_tampered'};
    const validate=structuralValidator(options),validation=validate(prepared.state);
    if(!validation||validation.ok!==true)return{ok:false,error:validation?.error||'state_validation_failed'};
    const persistence=options.persistence||root.FamilyPilotPersistence;
    const commit=options.commit||persistence?.commitState;
    if(typeof commit!=='function')return{ok:false,error:'atomic_commit_unavailable'};
    const before=clone(liveState),candidate=clone(prepared.state);
    try{
      replaceObject(liveState,candidate);
      const result=await commit.call(persistence,liveState);
      if(result&&result.ok===false)throw new Error(result.error||'atomic_commit_failed');
      return{ok:true,packageSha256:prepared.packageSha256,sourceSchemaVersion:prepared.sourceSchemaVersion,targetSchemaVersion:prepared.targetSchemaVersion,migrated:prepared.migrated===true};
    }catch(error){
      try{replaceObject(liveState,before)}catch{return{ok:false,error:'rollback_failed',cause:String(error?.message||error)}}
      return{ok:false,error:String(error?.code||error?.message||error||'atomic_commit_failed'),rolledBack:true};
    }
  }

  function safeMetadata(input){
    const parsed=parsePackage(input);
    if(!parsed.ok)return parsed;
    const pkg=parsed.value,manifest=pkg.manifest;
    if(!manifestComplete(manifest))return{ok:false,error:'manifest_incomplete_or_unsupported'};
    return{ok:true,metadata:{packageType:manifest.packageType,packageVersion:manifest.packageVersion,stateSchemaVersion:manifest.stateSchemaVersion,createdAt:manifest.createdAt,appVersion:manifest.appVersion,protection:{...manifest.protection},integrityAlgorithm:manifest.integrity.algorithm,packageSha256:String(pkg.packageSha256||'')}};
  }

  const api=Object.freeze({
    PACKAGE_TYPE,PACKAGE_VERSION,MANIFEST_VERSION,INTEGRITY_ALGORITHM,
    canonicalSerialize,sha256,createPackage,prepareRestore,commitPreparedRestore,safeMetadata,
  });
  root.FamilyPilotBackupRestoreCore=api;
})(typeof window!=='undefined'?window:globalThis);
