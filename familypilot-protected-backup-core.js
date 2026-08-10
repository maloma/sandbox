(function installFamilyPilotProtectedBackupCore(root){
  'use strict';
  if(!root||root.FamilyPilotProtectedBackupCore)return;

  const KIND='FamilyPilotProtectedBackup', FORMAT_VERSION=1, ITERATIONS=600000;
  const SALT_BYTES=16, IV_BYTES=12, TAG_BITS=128, KEY_BITS=256;
  const SUITE='PBKDF2-SHA-256/AES-256-GCM';
  const B64URL='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

  function deepFreeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const item of Object.values(value))deepFreeze(item)}return value}
  function error(code){return Object.freeze({ok:false,error:code})}
  function isPlainObject(value){if(value===null||typeof value!=='object'||Array.isArray(value))return false;const proto=Object.getPrototypeOf(value);return proto===null||typeof proto==='object'}
  function hasOnly(value,keys){return isPlainObject(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.prototype.hasOwnProperty.call(value,key))}
  function encodeBase64url(bytes){
    let output='',index=0;
    while(index<bytes.length){const a=bytes[index++],b=index<bytes.length?bytes[index++]:undefined,c=index<bytes.length?bytes[index++]:undefined;output+=B64URL[a>>2]+B64URL[((a&3)<<4)|(b===undefined?0:b>>4)]+(b===undefined?'':B64URL[((b&15)<<2)|(c===undefined?0:c>>6)])+(c===undefined?'':B64URL[c&63])}
    return output;
  }
  function decodeBase64url(text){
    if(typeof text!=='string'||text.length===0||text.length%4===1||!/^[A-Za-z0-9_-]+$/.test(text))return null;
    const output=[];let index=0;
    while(index<text.length){const a=B64URL.indexOf(text[index++]),b=B64URL.indexOf(text[index++]),c=index<text.length?B64URL.indexOf(text[index++]):-1,d=index<text.length?B64URL.indexOf(text[index++]):-1;if(a<0||b<0||c<-1||d<-1)return null;output.push((a<<2)|(b>>4));if(c>=0)output.push(((b&15)<<4)|(c>>2));if(d>=0)output.push(((c&3)<<6)|d)}
    return new Uint8Array(output);
  }
  function copyBytes(value){return value&&ArrayBuffer.isView(value)&&value.BYTES_PER_ELEMENT===1?new Uint8Array(value.buffer,value.byteOffset,value.byteLength):null}

  function createCore(options={}){
    const cryptoApi=Object.prototype.hasOwnProperty.call(options,'crypto')?options.crypto:(root.crypto||(typeof globalThis!=='undefined'&&globalThis.crypto));
    const clock=typeof options.now==='function'?options.now:Date.now;
    const defaultRandom=length=>{const bytes=new Uint8Array(length);cryptoApi.getRandomValues(bytes);return bytes};
    const randomBytes=typeof options.randomBytes==='function'?options.randomBytes:defaultRandom;
    const protectedStages=new WeakMap();
    const encoder=typeof root.TextEncoder==='function'?new root.TextEncoder():(typeof TextEncoder==='function'?new TextEncoder():null);
    const Decoder=typeof root.TextDecoder==='function'?root.TextDecoder:(typeof TextDecoder==='function'?TextDecoder:null);

    function secureCryptoAvailable(){const subtle=cryptoApi&&cryptoApi.subtle;return !!(encoder&&Decoder&&cryptoApi&&typeof cryptoApi.getRandomValues==='function'&&subtle&&typeof subtle.importKey==='function'&&typeof subtle.deriveKey==='function'&&typeof subtle.encrypt==='function'&&typeof subtle.decrypt==='function')}
    function dependencies(){const persistence=root.FamilyPilotPersistence,backup=root.FamilyPilotBackupRestoreCore;if(!persistence||typeof persistence.canonicalSerialize!=='function'||!backup||typeof backup.createBackupPackage!=='function'||typeof backup.validateBackupPackage!=='function'||typeof backup.stageRestore!=='function'||typeof backup.applyStagedRestore!=='function')return null;return{persistence,backup}}
    function validatePassphrase(passphrase){if(typeof passphrase!=='string')return false;const count=Array.from(passphrase).length;return count>=12&&count<=1024}
    function lifecycle(action,outcome,extra={}){return Object.freeze(Object.assign({action,timestamp:Number(clock()),outcome,protectedContainerVersion:FORMAT_VERSION,protectionSuite:SUITE},extra))}
    function random(length){try{const bytes=copyBytes(randomBytes(length));return bytes&&bytes.length===length?bytes:null}catch{return null}}
    async function deriveKey(passphrase,salt){
      const subtle=cryptoApi.subtle;
      const material=await subtle.importKey('raw',encoder.encode(passphrase),'PBKDF2',false,['deriveKey']);
      return subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:ITERATIONS},material,{name:'AES-GCM',length:KEY_BITS},false,['encrypt','decrypt']);
    }
    function validateContainer(input){
      let container=input;
      if(typeof container==='string'){try{container=JSON.parse(container)}catch{return error('protected_backup_malformed_json')}}
      if(!isPlainObject(container))return error('protected_backup_not_object');
      if(container.kind==='FamilyPilotBackupPackage')return error('protected_backup_required');
      if(!hasOnly(container,['kind','formatVersion','header','ciphertext']))return error('protected_backup_invalid');
      if(container.kind!==KIND)return error('protected_backup_required');
      if(container.formatVersion!==FORMAT_VERSION)return error('unsupported_protected_backup_format');
      const h=container.header;
      if(!hasOnly(h,['formatVersion','createdAt','payloadEncoding','kdf','cipher']))return error('protected_backup_header_invalid');
      if(h.formatVersion!==FORMAT_VERSION||!Number.isSafeInteger(h.createdAt)||h.createdAt<0||h.payloadEncoding!=='p2_package_canonical_json_utf8')return error('protected_backup_header_invalid');
      if(!hasOnly(h.kdf,['name','hash','iterations','salt'])||h.kdf.name!=='PBKDF2'||h.kdf.hash!=='SHA-256'||h.kdf.iterations!==ITERATIONS)return error('protected_backup_kdf_invalid');
      if(!hasOnly(h.cipher,['name','keyBits','iv','tagBits'])||h.cipher.name!=='AES-GCM'||h.cipher.keyBits!==KEY_BITS||h.cipher.tagBits!==TAG_BITS)return error('protected_backup_cipher_invalid');
      const salt=decodeBase64url(h.kdf.salt),iv=decodeBase64url(h.cipher.iv),ciphertext=decodeBase64url(container.ciphertext);
      if(!salt||salt.length!==SALT_BYTES||!iv||iv.length!==IV_BYTES||!ciphertext||ciphertext.length<=TAG_BITS/8)return error('protected_backup_encoding_invalid');
      return{ok:true,container,header:h,salt,iv,ciphertext};
    }
    async function createProtectedBackup(state,passphrase,options={}){
      if(!validatePassphrase(passphrase))return error('invalid_backup_passphrase');
      if(!secureCryptoAvailable())return error('secure_backup_crypto_unavailable');
      const deps=dependencies();if(!deps)return error('protected_backup_dependencies_unavailable');
      const createdAt=Object.prototype.hasOwnProperty.call(options,'createdAt')?Number(options.createdAt):Number(clock());
      if(!Number.isSafeInteger(createdAt)||createdAt<0)return error('invalid_backup_created_at');
      let pkg,text;try{pkg=deps.backup.createBackupPackage(state,{createdAt});text=deps.persistence.canonicalSerialize(pkg)}catch(failure){return error(String(failure&&failure.code||'protected_backup_create_failed'))}
      const salt=random(SALT_BYTES),iv=random(IV_BYTES);if(!salt||!iv)return error('secure_random_unavailable');
      const header=deepFreeze({formatVersion:FORMAT_VERSION,createdAt,payloadEncoding:'p2_package_canonical_json_utf8',kdf:deepFreeze({name:'PBKDF2',hash:'SHA-256',iterations:ITERATIONS,salt:encodeBase64url(salt)}),cipher:deepFreeze({name:'AES-GCM',keyBits:KEY_BITS,iv:encodeBase64url(iv),tagBits:TAG_BITS})});
      try{
        const key=await deriveKey(passphrase,salt),aad=encoder.encode(deps.persistence.canonicalSerialize(header)),ciphertext=await cryptoApi.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad,tagLength:TAG_BITS},key,encoder.encode(text));
        const container=deepFreeze({kind:KIND,formatVersion:FORMAT_VERSION,header,ciphertext:encodeBase64url(new Uint8Array(ciphertext))});
        return deepFreeze({ok:true,container,lifecycle:lifecycle('protected_backup_create','created'),serializedByteLength:encoder.encode(deps.persistence.canonicalSerialize(container)).length});
      }catch{return error('protected_backup_create_failed')}
    }
    function serializeProtectedBackup(container){const checked=validateContainer(container);if(!checked.ok)return checked;const deps=dependencies();if(!deps)return error('protected_backup_dependencies_unavailable');try{return deps.persistence.canonicalSerialize(checked.container)}catch{return error('protected_backup_serialization_failed')}}
    async function decryptProtectedBackup(input,passphrase){
      const checked=validateContainer(input);if(!checked.ok)return checked;
      if(!validatePassphrase(passphrase))return error('invalid_backup_passphrase');
      if(!secureCryptoAvailable())return error('secure_backup_crypto_unavailable');
      const deps=dependencies();if(!deps)return error('protected_backup_dependencies_unavailable');
      let plaintext;
      try{const key=await deriveKey(passphrase,checked.salt),aad=encoder.encode(deps.persistence.canonicalSerialize(checked.header)),raw=await cryptoApi.subtle.decrypt({name:'AES-GCM',iv:checked.iv,additionalData:aad,tagLength:TAG_BITS},key,checked.ciphertext);plaintext=new Decoder('utf-8',{fatal:true}).decode(raw)}catch{return error('protected_backup_authentication_failed')}
      let pkg;try{pkg=JSON.parse(plaintext)}catch{return error('protected_backup_plaintext_invalid')}
      const validated=deps.backup.validateBackupPackage(pkg,{allowUnprotectedDevelopment:true});if(!validated||!validated.ok)return error(validated&&validated.error||'protected_backup_plaintext_invalid');
      return deepFreeze({ok:true,package:deepFreeze(pkg),state:deepFreeze(validated.state),p2FormatVersion:validated.formatVersion});
    }
    async function stageProtectedRestore(input,passphrase){
      const decrypted=await decryptProtectedBackup(input,passphrase);if(!decrypted.ok)return decrypted;
      const deps=dependencies();if(!deps)return error('protected_backup_dependencies_unavailable');
      const staged=deps.backup.stageRestore(decrypted.package,{allowUnprotectedDevelopment:true});if(!staged||!staged.ok)return error(staged&&staged.error||'protected_restore_stage_failed');
      const stage=deepFreeze({stageKind:'FamilyPilotProtectedStagedRestoreV1',protectedContainerVersion:FORMAT_VERSION,protectionSuite:SUITE,p2FormatVersion:decrypted.package.formatVersion});protectedStages.set(stage,staged.stage);
      return deepFreeze({ok:true,stage,lifecycle:lifecycle('protected_restore_stage','staged',{p2FormatVersion:decrypted.package.formatVersion})});
    }
    function applyProtectedStagedRestore(stage){
      if(!stage||typeof stage!=='object'||!protectedStages.has(stage)||stage.stageKind!=='FamilyPilotProtectedStagedRestoreV1')return error('invalid_protected_staged_restore');
      const deps=dependencies();if(!deps)return error('protected_backup_dependencies_unavailable');
      const result=deps.backup.applyStagedRestore(protectedStages.get(stage));
      if(!result||!result.ok)return error(result&&result.error||'protected_restore_apply_failed');
      return deepFreeze({ok:true,lifecycle:lifecycle('protected_restore_apply','applied',{p2FormatVersion:stage.p2FormatVersion,restoreRevision:result.revision})});
    }
    return Object.freeze({KIND,FORMAT_VERSION,ITERATIONS,SALT_BYTES,IV_BYTES,TAG_BITS,KEY_BITS,SUITE,createProtectedBackup,serializeProtectedBackup,decryptProtectedBackup,stageProtectedRestore,applyProtectedStagedRestore});
  }

  const defaultCore=createCore();
  root.FamilyPilotProtectedBackupCore=Object.freeze(Object.assign({createCore},defaultCore));
})(typeof window!=='undefined'?window:globalThis);
