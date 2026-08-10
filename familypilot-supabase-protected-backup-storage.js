(function installFamilyPilotSupabaseProtectedBackupStorage(root){
  'use strict';
  if(!root||root.FamilyPilotSupabaseProtectedBackupStorage)return;

  const BUCKET='familypilot-protected-backups', CHUNK_BYTES=5*1024*1024, MAX_PROTECTED_BACKUP_BYTES=256*1024*1024;
  const CHUNK_MIME='application/vnd.familypilot.protected-backup-chunk', MANIFEST_MIME='application/vnd.familypilot.protected-backup-manifest+json';
  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, SAFE=/^[A-Za-z0-9_-]{1,128}$/;
  const plans=new WeakMap(), retentionPlans=new WeakMap();
  const B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

  function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);Object.keys(value).forEach(key=>freeze(value[key]));}return value}
  function fail(error,extra){return freeze(Object.assign({ok:false,error},extra||{}))}
  function bytes(value){return value&&ArrayBuffer.isView(value)&&value.BYTES_PER_ELEMENT===1?new Uint8Array(value.buffer,value.byteOffset,value.byteLength):null}
  function b64url(input){let out='',i=0;while(i<input.length){const a=input[i++],b=i<input.length?input[i++]:undefined,c=i<input.length?input[i++]:undefined;out+=B64[a>>2]+B64[((a&3)<<4)|(b===undefined?0:b>>4)]+(b===undefined?'':B64[((b&15)<<2)|(c===undefined?0:c>>6)])+(c===undefined?'':B64[c&63]);}return out}
  function encodedPath(path){return path.split('/').map(encodeURIComponent).join('/')}
  function validMode(mode){return mode==='scheduled'||mode==='manual'}
  function validHousehold(value){return typeof value==='string'&&SAFE.test(value)}
  function exactKeys(value,keys){return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.prototype.hasOwnProperty.call(value,key))}
  function manifestName(revision,createdAt,backupId){return `r${revision}-t${createdAt}-${backupId}.fpmanifest`}
  function parseManifestPath(path){
    if(typeof path!=='string'||path.length>512)return null;
    const match=/^([^/]+)\/([^/]+)\/(scheduled|manual)\/manifests\/(r([1-9][0-9]*)-t([0-9]+)-([A-Za-z0-9_-]{22,})\.fpmanifest)$/.exec(path);
    if(!match||!validHousehold(match[1])||!UUID.test(match[2]))return null;
    const remoteRevision=Number(match[5]),createdAt=Number(match[6]);
    if(!Number.isSafeInteger(remoteRevision)||!Number.isSafeInteger(createdAt))return null;
    return {householdId:match[1],authUid:match[2],mode:match[3],file:match[4],remoteRevision,createdAt,backupId:match[7],manifestPath:path};
  }
  function configured(options){
    let url;try{url=new URL(options.projectUrl)}catch{return null}
    if(url.protocol!=='https:'||!/^[-a-z0-9]+\.supabase\.co$/i.test(url.hostname)||url.pathname!=='/'||url.username||url.password||url.search||url.hash||url.port)return null;
    if(typeof options.publishableKey!=='string'||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(options.publishableKey))return null;
    if(typeof options.getAccessToken!=='function'||typeof options.getAuthUserId!=='function'||typeof options.fetchImpl!=='function')return null;
    const cryptoApi=options.crypto;
    if(!cryptoApi||typeof cryptoApi.getRandomValues!=='function'||!cryptoApi.subtle||typeof cryptoApi.subtle.digest!=='function')return null;
    if(typeof options.now!=='function'||typeof options.randomBytes!=='function')return null;
    const encoder=typeof root.TextEncoder==='function'?new root.TextEncoder():(typeof TextEncoder==='function'?new TextEncoder():null);
    const Decoder=typeof root.TextDecoder==='function'?root.TextDecoder:(typeof TextDecoder==='function'?TextDecoder:null);
    if(!encoder||!Decoder)return null;
    return {url:url.href.slice(0,-1),key:options.publishableKey,encoder,Decoder,cryptoApi};
  }

  function createStorage(input={}){
    const platformCrypto=typeof root.crypto!=='undefined'?root.crypto:(typeof globalThis!=='undefined'?globalThis.crypto:null);
    const activeCrypto=input.crypto===undefined?platformCrypto:input.crypto;
    const options={
      projectUrl:input.projectUrl,publishableKey:input.publishableKey,getAccessToken:input.getAccessToken,getAuthUserId:input.getAuthUserId,
      fetchImpl:input.fetchImpl||root.fetch||(typeof fetch==='function'?fetch:null),crypto:activeCrypto,
      now:input.now||Date.now,randomBytes:input.randomBytes||((length)=>{const out=new Uint8Array(length);activeCrypto.getRandomValues(out);return out})
    };
    const config=configured(options);
    async function session(){
      if(!config)return fail('storage_configuration_invalid');
      let token,uid;try{[token,uid]=await Promise.all([options.getAccessToken(),options.getAuthUserId()]);}catch{return fail('auth_session_unavailable')}
      if(typeof token!=='string'||token.length<1||!UUID.test(uid||''))return fail('auth_session_unavailable');
      return {ok:true,token,uid};
    }
    async function sha(data){try{return Array.from(new Uint8Array(await config.cryptoApi.subtle.digest('SHA-256',data)),value=>value.toString(16).padStart(2,'0')).join('')}catch{return null}}
    function objectUrl(path){return `${config.url}/storage/v1/object/${BUCKET}/${encodedPath(path)}`}
    async function provider(path,init,s){
      try{return await options.fetchImpl(objectUrl(path),Object.assign({},init,{headers:Object.assign({'apikey':config.key,'Authorization':`Bearer ${s.token}`},init&&init.headers||{})}))}catch{return null}
    }
    function dependencies(){const core=root.FamilyPilotProtectedBackupCore,persistence=root.FamilyPilotPersistence;return core&&typeof core.serializeProtectedBackup==='function'&&persistence&&typeof persistence.canonicalSerialize==='function'?{core,persistence}:null}
    function validateManifest(value,context){
      const keys=['kind','formatVersion','protectedContainerKind','protectedContainerVersion','mode','backupId','createdAt','remoteRevision','serializedByteLength','fullSha256','chunkSizeBytes','chunkCount','chunks'];
      if(!exactKeys(value,keys)||value.kind!=='FamilyPilotProtectedBackupStorageManifest'||value.formatVersion!==1||value.protectedContainerKind!=='FamilyPilotProtectedBackup'||value.protectedContainerVersion!==1||!validMode(value.mode)||typeof value.backupId!=='string'||!/^[A-Za-z0-9_-]{22,}$/.test(value.backupId)||!Number.isSafeInteger(value.createdAt)||value.createdAt<0||!Number.isSafeInteger(value.remoteRevision)||value.remoteRevision<1||!Number.isSafeInteger(value.serializedByteLength)||value.serializedByteLength<1||value.serializedByteLength>MAX_PROTECTED_BACKUP_BYTES||typeof value.fullSha256!=='string'||!/^[0-9a-f]{64}$/.test(value.fullSha256)||value.chunkSizeBytes!==CHUNK_BYTES||!Number.isSafeInteger(value.chunkCount)||value.chunkCount<1||value.chunkCount>Math.ceil(MAX_PROTECTED_BACKUP_BYTES/CHUNK_BYTES)||!Array.isArray(value.chunks)||value.chunks.length!==value.chunkCount)return null;
      if(context&&(value.mode!==context.mode||value.backupId!==context.backupId||value.createdAt!==context.createdAt||value.remoteRevision!==context.remoteRevision))return null;
      let total=0;
      for(let i=0;i<value.chunks.length;i++){const chunk=value.chunks[i];if(!exactKeys(chunk,['index','byteLength','sha256'])||chunk.index!==i||!Number.isSafeInteger(chunk.byteLength)||chunk.byteLength<1||chunk.byteLength>CHUNK_BYTES||typeof chunk.sha256!=='string'||!/^[0-9a-f]{64}$/.test(chunk.sha256))return null;total+=chunk.byteLength;}
      return total===value.serializedByteLength?value:null;
    }
    async function prepareBackupUpload(container,{householdId,remoteRevision,mode}={}){
      const s=await session();if(!s.ok)return s;
      if(!validHousehold(householdId)||!Number.isSafeInteger(remoteRevision)||remoteRevision<1||!validMode(mode))return fail('invalid_backup_upload_request');
      const deps=dependencies();if(!deps)return fail('protected_backup_dependencies_unavailable');
      let text;try{text=deps.core.serializeProtectedBackup(container)}catch{return fail('protected_backup_required')}
      if(typeof text!=='string')return fail(text&&text.error||'protected_backup_required');
      const raw=config.encoder.encode(text);if(raw.length<1||raw.length>MAX_PROTECTED_BACKUP_BYTES)return fail('protected_backup_size_invalid');
      let random;try{random=bytes(options.randomBytes(16))}catch{return fail('secure_random_unavailable')}
      if(!random||random.length<16)return fail('secure_random_unavailable');
      const backupId=b64url(random), createdAt=Number(options.now());if(!Number.isSafeInteger(createdAt)||createdAt<0)return fail('invalid_backup_created_at');
      const chunks=[];for(let offset=0,index=0;offset<raw.length;offset+=CHUNK_BYTES,index++){const data=raw.slice(offset,Math.min(offset+CHUNK_BYTES,raw.length)),digest=await sha(data);if(!digest)return fail('storage_hash_unavailable');chunks.push({index,byteLength:data.length,sha256:digest,data});}
      const fullSha256=await sha(raw);if(!fullSha256)return fail('storage_hash_unavailable');
      const manifest=validateManifest({kind:'FamilyPilotProtectedBackupStorageManifest',formatVersion:1,protectedContainerKind:'FamilyPilotProtectedBackup',protectedContainerVersion:1,mode,backupId,createdAt,remoteRevision,serializedByteLength:raw.length,fullSha256,chunkSizeBytes:CHUNK_BYTES,chunkCount:chunks.length,chunks:chunks.map(({index,byteLength,sha256})=>({index,byteLength,sha256}))});
      let manifestText;try{manifestText=deps.persistence.canonicalSerialize(manifest)}catch{return fail('storage_manifest_serialization_failed')}
      const manifestPath=`${householdId}/${s.uid}/${mode}/manifests/${manifestName(remoteRevision,createdAt,backupId)}`;
      const chunkPaths=chunks.map(chunk=>`${householdId}/${s.uid}/${mode}/chunks/${backupId}/${chunk.index}.fpchunk`);
      const plan=freeze({kind:'FamilyPilotPreparedProtectedBackupUpload',formatVersion:1,householdId,authUid:s.uid,mode,backupId,createdAt,remoteRevision,manifestPath,chunkPaths:chunkPaths.slice(),manifest:freeze(manifest)});
      plans.set(plan,{chunks,manifestText});return plan;
    }
    async function uploadPreparedBackup(plan){
      const privatePlan=plans.get(plan);if(!privatePlan)return fail('invalid_prepared_backup_plan');
      const s=await session();if(!s.ok)return s;if(s.uid!==plan.authUid)return fail('backup_upload_identity_changed');
      let uploaded=0;
      for(let i=0;i<privatePlan.chunks.length;i++){const response=await provider(plan.chunkPaths[i],{method:'POST',headers:{'Content-Type':CHUNK_MIME,'x-upsert':'false'},body:privatePlan.chunks[i].data},s);if(!response||!response.ok)return fail('backup_upload_incomplete',{uploadedChunkCount:uploaded,backupId:plan.backupId});uploaded++;}
      const response=await provider(plan.manifestPath,{method:'POST',headers:{'Content-Type':MANIFEST_MIME,'x-upsert':'false'},body:privatePlan.manifestText},s);
      if(!response||!response.ok)return fail('backup_upload_incomplete',{uploadedChunkCount:uploaded,backupId:plan.backupId});
      return freeze({ok:true,status:'backup_stored',backupId:plan.backupId,manifestPath:plan.manifestPath});
    }
    async function listCompleteBackups({householdId,mode='scheduled',limit=100}={}){
      const s=await session();if(!s.ok)return s;if(!validHousehold(householdId)||!validMode(mode)||!Number.isSafeInteger(limit)||limit<1||limit>100)return fail('invalid_backup_list_request');
      const prefix=`${householdId}/${s.uid}/${mode}/manifests/`;
      let response;try{response=await options.fetchImpl(`${config.url}/storage/v1/object/list/${BUCKET}`,{method:'POST',headers:{'apikey':config.key,'Authorization':`Bearer ${s.token}`,'Content-Type':'application/json'},body:JSON.stringify({prefix,limit})});}catch{return fail('backup_list_failed')}
      if(!response||!response.ok)return fail('backup_list_failed');let listed;try{listed=await response.json()}catch{return fail('backup_list_failed')}
      const files=Array.isArray(listed)?listed:(Array.isArray(listed&&listed.data)?listed.data:[]),out=[];
      for(const entry of files){const name=typeof entry==='string'?entry:entry&&entry.name;if(typeof name!=='string')continue;const path=name.startsWith(prefix)?name:`${prefix}${name}`;const parsed=parseManifestPath(path);if(parsed&&parsed.householdId===householdId&&parsed.authUid===s.uid&&parsed.mode===mode)out.push(freeze({manifestPath:path,backupId:parsed.backupId,remoteRevision:parsed.remoteRevision,createdAt:parsed.createdAt}));}
      return freeze({ok:true,backups:out});
    }
    function evaluateSchedule({remoteRevision,completeBackups,policy,now}={}){
      if(!policy||typeof policy.enabled!=='boolean'||!Number.isSafeInteger(policy.intervalMs)||policy.intervalMs<3600000||policy.intervalMs>30*86400000||!Number.isSafeInteger(remoteRevision)||remoteRevision<1||!Number.isSafeInteger(now)||now<0)return fail('invalid_backup_schedule');
      if(!policy.enabled)return freeze({ok:true,due:false,requiresPassphrase:false});
      const backups=Array.isArray(completeBackups)?completeBackups.filter(item=>item&&item.mode!=='manual'&&Number.isSafeInteger(item.remoteRevision)&&Number.isSafeInteger(item.createdAt)):[];
      if(!backups.length)return freeze({ok:true,due:true,requiresPassphrase:true});
      backups.sort((a,b)=>b.createdAt-a.createdAt||b.remoteRevision-a.remoteRevision||String(b.backupId).localeCompare(String(a.backupId)));
      const newest=backups[0];if(newest.remoteRevision>=remoteRevision)return freeze({ok:true,due:false,requiresPassphrase:false});
      const dueAt=newest.createdAt+policy.intervalMs;if(now<dueAt)return freeze({ok:true,due:false,requiresPassphrase:false,dueAt});
      return freeze({ok:true,due:true,requiresPassphrase:true,dueAt});
    }
    async function downloadWithSession(manifestPath,s){
      const context=parseManifestPath(manifestPath);if(!context)return fail('invalid_remote_backup_manifest_path');
      const manifestResponse=await provider(manifestPath,{method:'GET'},s);if(!manifestResponse||!manifestResponse.ok)return fail('remote_backup_integrity_failed');
      let manifestText,manifest;try{manifestText=await manifestResponse.text();manifest=validateManifest(JSON.parse(manifestText),context)}catch{return fail('remote_backup_integrity_failed')};if(!manifest)return fail('remote_backup_integrity_failed');
      const pieces=[];for(const chunk of manifest.chunks){const chunkPath=`${context.householdId}/${context.authUid}/${context.mode}/chunks/${context.backupId}/${chunk.index}.fpchunk`;const response=await provider(chunkPath,{method:'GET'},s);if(!response||!response.ok)return fail('remote_backup_integrity_failed');let data;try{data=new Uint8Array(await response.arrayBuffer())}catch{return fail('remote_backup_integrity_failed')};if(data.length!==chunk.byteLength||await sha(data)!==chunk.sha256)return fail('remote_backup_integrity_failed');pieces.push(data);}
      const raw=new Uint8Array(manifest.serializedByteLength);let offset=0;for(const part of pieces){raw.set(part,offset);offset+=part.length}if(await sha(raw)!==manifest.fullSha256)return fail('remote_backup_integrity_failed');
      let parsed,text;try{text=new config.Decoder('utf-8',{fatal:true}).decode(raw);parsed=JSON.parse(text)}catch{return fail('remote_backup_integrity_failed')}
      const deps=dependencies();if(!deps)return fail('protected_backup_dependencies_unavailable');let canonical;try{canonical=deps.core.serializeProtectedBackup(parsed)}catch{return fail('remote_backup_integrity_failed')};if(typeof canonical!=='string')return fail('remote_backup_integrity_failed');
      return freeze({ok:true,protectedContainerText:canonical,manifest:freeze(manifest),context:freeze(context)});
    }
    async function downloadProtectedBackup(manifestPath){const s=await session();if(!s.ok)return s;const result=await downloadWithSession(manifestPath,s);return result.ok?freeze({ok:true,protectedContainerText:result.protectedContainerText}):result}
    async function stageRemoteProtectedRestore(manifestPath,passphrase){const downloaded=await downloadProtectedBackup(manifestPath);if(!downloaded.ok)return downloaded;const deps=dependencies();if(!deps)return fail('protected_backup_dependencies_unavailable');try{return deps.core.stageProtectedRestore(downloaded.protectedContainerText,passphrase)}catch{return fail('protected_restore_stage_failed')}}
    function planRetention(completeScheduledBackups,{keepCount}={}){
      if(!Number.isSafeInteger(keepCount)||keepCount<1||keepCount>100||!Array.isArray(completeScheduledBackups))return fail('invalid_retention_policy');
      const managed=completeScheduledBackups.map(item=>item&&parseManifestPath(item.manifestPath)).filter(Boolean).filter(item=>item.mode==='scheduled').sort((a,b)=>b.createdAt-a.createdAt||b.remoteRevision-a.remoteRevision||b.backupId.localeCompare(a.backupId));
      const candidates=managed.slice(keepCount).map(item=>freeze({manifestPath:item.manifestPath,backupId:item.backupId}));const plan=freeze({kind:'FamilyPilotProtectedBackupRetentionPlan',formatVersion:1,keepCount,candidates});retentionPlans.set(plan,{candidates:managed.slice(keepCount)});return plan;
    }
    async function applyRetentionPlan(plan){
      const privatePlan=retentionPlans.get(plan);if(!privatePlan)return fail('invalid_retention_plan');const s=await session();if(!s.ok)return s;let removed=0;
      for(const candidate of privatePlan.candidates){if(candidate.authUid!==s.uid)return fail('retention_identity_changed');const downloaded=await downloadWithSession(candidate.manifestPath,s);if(!downloaded.ok)return fail('retention_cleanup_incomplete',{removedManifestCount:removed,orphanChunkCount:0});const deleted=await provider(candidate.manifestPath,{method:'DELETE'},s);if(!deleted||!deleted.ok)return fail('retention_cleanup_incomplete',{removedManifestCount:removed,orphanChunkCount:0});let orphan=0;for(const chunk of downloaded.manifest.chunks){const path=`${candidate.householdId}/${candidate.authUid}/${candidate.mode}/chunks/${candidate.backupId}/${chunk.index}.fpchunk`;const response=await provider(path,{method:'DELETE'},s);if(!response||!response.ok){orphan=downloaded.manifest.chunkCount-chunk.index;return fail('retention_cleanup_incomplete',{removedManifestCount:removed+1,orphanChunkCount:orphan});}}removed++;}
      return freeze({ok:true,status:'retention_applied',removedManifestCount:removed});
    }
    return freeze({BUCKET,CHUNK_BYTES,MAX_PROTECTED_BACKUP_BYTES,prepareBackupUpload,uploadPreparedBackup,listCompleteBackups,evaluateSchedule,downloadProtectedBackup,stageRemoteProtectedRestore,planRetention,applyRetentionPlan});
  }
  root.FamilyPilotSupabaseProtectedBackupStorage=freeze({BUCKET,CHUNK_BYTES,MAX_PROTECTED_BACKUP_BYTES,createStorage});
})(typeof window!=='undefined'?window:globalThis);
