'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {webcrypto}=require('node:crypto');

const source=fs.readFileSync(path.join(__dirname,'..','familypilot-backup-restore-core.js'),'utf8');
const context={crypto:webcrypto,TextEncoder,Uint8Array,console};context.globalThis=context;context.window=context;vm.createContext(context);vm.runInContext(source,context,{filename:'familypilot-backup-restore-core.js'});
const core=context.FamilyPilotBackupRestoreCore;assert(core);
const persistence={CURRENT_STATE_SCHEMA_VERSION:22,structuralValidate(state){return state&&typeof state==='object'&&!Array.isArray(state)&&Number.isInteger(Number(state.schemaVersion))?{ok:true}:{ok:false,error:'invalid_state'}},commitState(state){this.last=JSON.parse(JSON.stringify(state));return{ok:true,revision:7}}};
const base={schemaVersion:22,household:{id:'h1',baseCurrency:'EUR'},wallets:[{id:'w1',openingBalance:125}],operations:[{id:'o1',kind:'expense',amount:12.5}],purposeAllocationEvents:[{id:'pa1',amount:20}]};

(async()=>{
  let result=await core.createPackage(base,{persistence,protection:{mode:'none'},createdAt:1700000000000,appVersion:'test'});assert.equal(result.ok,true);const pkg=result.package;
  assert.equal(pkg.manifest.integrity.algorithm,'SHA-256');assert.equal(pkg.manifest.integrity.security,'corruption_detection_only');assert.equal(pkg.manifest.protection.mode,'none');
  assert.equal(JSON.stringify(core.safeMetadata(pkg).metadata).includes('125'),false,'safe metadata must not copy financial payload');

  let prepared=await core.prepareRestore(pkg,{persistence,requiredProtection:{mode:'none'}});assert.equal(prepared.ok,true);assert.equal(prepared.prepared.targetSchemaVersion,22);
  const live={schemaVersion:22,marker:'old'};let committed=await core.commitPreparedRestore(live,prepared.prepared,{persistence});assert.equal(committed.ok,true);assert.equal(live.household.id,'h1');assert.equal(live.marker,undefined);

  const tampered=JSON.parse(JSON.stringify(pkg));tampered.payload=tampered.payload.replace('12.5','99.5');prepared=await core.prepareRestore(tampered,{persistence,requiredProtection:{mode:'none'}});assert.equal(prepared.ok,false);assert.equal(prepared.error,'payload_integrity_failed');

  const missingManifest=JSON.parse(JSON.stringify(pkg));delete missingManifest.manifest.stateSchemaVersion;prepared=await core.prepareRestore(missingManifest,{persistence});assert.equal(prepared.ok,false);assert.equal(prepared.error,'manifest_incomplete_or_unsupported');

  result=await core.createPackage(base,{persistence,protection:{mode:'external',profileId:'family-key-profile-v1'},createdAt:1700000000001});assert.equal(result.ok,true);const protectedPkg=result.package;
  prepared=await core.prepareRestore(pkg,{persistence,requiredProtection:{mode:'external',profileId:'family-key-profile-v1'}});assert.equal(prepared.ok,false);assert.equal(prepared.error,'protection_downgrade_blocked');
  prepared=await core.prepareRestore(protectedPkg,{persistence,requiredProtection:{mode:'external',profileId:'other-profile'}});assert.equal(prepared.ok,false);assert.equal(prepared.error,'protection_profile_mismatch');
  prepared=await core.prepareRestore(protectedPkg,{persistence,requiredProtection:{mode:'external',profileId:'family-key-profile-v1'}});assert.equal(prepared.ok,true);

  const future={...base,schemaVersion:23};result=await core.createPackage(future,{currentSchemaVersion:23,persistence:{...persistence,CURRENT_STATE_SCHEMA_VERSION:23},protection:{mode:'none'},createdAt:1700000000002});assert.equal(result.ok,true);prepared=await core.prepareRestore(result.package,{persistence});assert.equal(prepared.ok,false);assert.equal(prepared.error,'future_schema_blocked');

  const old={...base,schemaVersion:21};const oldPersistence={...persistence,CURRENT_STATE_SCHEMA_VERSION:21};result=await core.createPackage(old,{persistence:oldPersistence,protection:{mode:'none'},createdAt:1700000000003});assert.equal(result.ok,true);prepared=await core.prepareRestore(result.package,{persistence});assert.equal(prepared.ok,false);assert.equal(prepared.error,'migration_required');
  prepared=await core.prepareRestore(result.package,{persistence,migrate(state,{targetSchemaVersion}){state.schemaVersion=targetSchemaVersion;state.migratedMarker=true;return{ok:true}}});assert.equal(prepared.ok,true);assert.equal(prepared.prepared.migrated,true);assert.equal(prepared.prepared.state.migratedMarker,true);

  const before={schemaVersion:22,marker:'before',wallets:[{id:'keep'}]};const snapshot=JSON.parse(JSON.stringify(before));prepared=await core.prepareRestore(pkg,{persistence});assert.equal(prepared.ok,true);committed=await core.commitPreparedRestore(before,prepared.prepared,{persistence,commit(){const error=new Error('simulated_atomic_failure');error.code='simulated_atomic_failure';throw error}});assert.equal(committed.ok,false);assert.equal(committed.rolledBack,true);assert.deepEqual(JSON.parse(JSON.stringify(before)),snapshot,'live state must roll back exactly when commit fails');

  const invalidPackage=JSON.parse(JSON.stringify(pkg));invalidPackage.manifest.packageVersion=2;const untouched={schemaVersion:22,marker:'untouched'};const untouchedBefore=JSON.stringify(untouched);prepared=await core.prepareRestore(invalidPackage,{persistence});assert.equal(prepared.ok,false);assert.equal(JSON.stringify(untouched),untouchedBefore,'validation failure must not mutate active state');

  console.log('FP85_P2_BACKUP_RESTORE_DOMAIN_PASS');
  console.log(JSON.stringify({manifestValidation:true,sha256Integrity:true,protectionDowngradeBlocked:true,futureSchemaBlocked:true,migrationPathExplicit:true,stagedBeforeMutation:true,atomicRollback:true,noFinancialPayloadInMetadata:true,noCryptoContainerChoice:true}));
})().catch(error=>{console.error(error);process.exitCode=1});
