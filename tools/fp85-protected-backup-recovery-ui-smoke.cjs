const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const {webcrypto}=require('crypto');

const root=path.join(__dirname,'..');
const source=name=>fs.readFileSync(path.join(root,name),'utf8');
class StorageMock{constructor(){this.data=new Map()}getItem(key){return this.data.has(String(key))?this.data.get(String(key)):null}setItem(key,value){this.data.set(String(key),String(value))}removeItem(key){this.data.delete(String(key))}clear(){this.data.clear()}key(index){return[...this.data.keys()][index]||null}get length(){return this.data.size}}
function load(){
  const storage=new StorageMock(),context={localStorage:storage,location:{search:'?test=1&persistenceTest=fp85ui'},URLSearchParams,setTimeout,clearTimeout,queueMicrotask,TextEncoder,TextDecoder,crypto:webcrypto};
  context.globalThis=context;vm.createContext(context);
  for(const name of ['familypilot-scope.js','familypilot-backup-restore-core.js','familypilot-protected-backup-core.js','familypilot-protected-backup-ui.js'])vm.runInContext(source(name),context);
  return{storage,persistence:context.FamilyPilotPersistence,protectedCore:context.FamilyPilotProtectedBackupCore,ui:context.FamilyPilotProtectedBackupUI};
}
function state(id){return{schemaVersion:22,household:{id,name:'Household',baseCurrency:'EUR'},wallets:[],operations:[],walletMovements:[],transfers:[],purposeAllocations:[],savingsTransfers:[],obligationRules:[],obligationOccurrences:[]}}
function snapshot(storage){return JSON.stringify([...storage.data.entries()].sort((a,b)=>a[0].localeCompare(b[0])))}
function clone(value){return JSON.parse(JSON.stringify(value))}

(async()=>{
  const {storage,persistence,protectedCore,ui}=load();
  assert(persistence&&protectedCore&&ui,'production P1/P2/P4C1/UI APIs load');
  const passphrase='correct horse battery staple';
  const backupState=state('backup-state'),currentState=state('current-state');
  const controller=ui.createController({getState:()=>backupState,now:()=>1700000000000});

  const beforeBackup=snapshot(storage);
  const backup=await controller.createProtectedBackup(passphrase,passphrase);
  assert(backup.ok&&/^familypilot-backup-\d{8}-\d{6}\.fpbackup$/.test(backup.filename)&&backup.serialized.length>0,'backup creates a bounded .fpbackup payload');
  assert.strictEqual(snapshot(storage),beforeBackup,'creating a backup cannot mutate canonical storage');
  assert(!backup.serialized.includes(passphrase)&&!snapshot(storage).includes(passphrase),'passphrase is not serialized or persisted');
  assert.strictEqual(JSON.parse(backup.serialized).kind,'FamilyPilotProtectedBackup','backup uses the accepted protected-container path');

  persistence.commitState(currentState);
  const beforeFailures=snapshot(storage);
  assert.strictEqual((await controller.stageRestoreFromText(backup.serialized,'wrong passphrase')).error,'protected_backup_authentication_failed');
  assert.strictEqual(snapshot(storage),beforeFailures,'wrong passphrase cannot mutate canonical storage');
  const tampered=JSON.parse(backup.serialized);tampered.ciphertext=tampered.ciphertext.slice(0,-1)+(tampered.ciphertext.endsWith('A')?'B':'A');
  assert.strictEqual((await controller.stageRestoreFromText(JSON.stringify(tampered),passphrase)).error,'protected_backup_authentication_failed');
  assert.strictEqual(snapshot(storage),beforeFailures,'tampered file cannot mutate canonical storage');
  assert.strictEqual((await controller.stageRestoreFromText('{',passphrase)).error,'protected_backup_malformed_json');
  assert.strictEqual(snapshot(storage),beforeFailures,'malformed file cannot mutate canonical storage');
  const unsupported=clone(JSON.parse(backup.serialized));unsupported.formatVersion=2;
  assert.strictEqual((await controller.stageRestoreFromText(JSON.stringify(unsupported),passphrase)).error,'unsupported_protected_backup_format');
  assert.strictEqual(snapshot(storage),beforeFailures,'unsupported format cannot mutate canonical storage');
  assert.strictEqual((await controller.stageRestoreFile(null,passphrase)).error,'backup_file_selection_cancelled');
  assert.strictEqual(snapshot(storage),beforeFailures,'cancelled file selection cannot mutate canonical storage');

  const staged=await controller.stageRestoreFile({name:'family.fpbackup',text:async()=>backup.serialized},passphrase);
  assert(staged.ok,'valid protected backup decrypts and stages through P2 before confirmation');
  assert.strictEqual(snapshot(storage),beforeFailures,'staging cannot mutate canonical storage');
  assert.strictEqual(controller.confirmRestore(false).error,'restore_confirmation_cancelled');
  assert.strictEqual(snapshot(storage),beforeFailures,'cancelled confirmation cannot mutate canonical storage');
  const restaged=await controller.stageRestoreFromText(backup.serialized,passphrase);
  assert(restaged.ok,'backup can be staged again after cancellation');
  const applied=controller.confirmRestore(true);
  assert(applied.ok&&applied.requiresReload===true,'explicit confirmation applies the accepted staged restore');
  assert.strictEqual(persistence.test.retryRecovery().state.household.id,'backup-state','successful restore replaces canonical state only after confirmation');
  assert(!snapshot(storage).includes(passphrase),'passphrase remains absent after restore');
  persistence.test.seedMalformedCompatibilityPayload();persistence.test.retryRecovery();
  assert.strictEqual(persistence.isRecoveryLocked(),true,'fixture exposes the accepted recovery lock');
  const beforeLockedRestore=snapshot(storage);
  assert.strictEqual((await controller.stageRestoreFromText(backup.serialized,passphrase)).error,'recovery_locked');
  assert.strictEqual(snapshot(storage),beforeLockedRestore,'recovery lock prevents restore mutation');
  console.log('FP85_PROTECTED_BACKUP_RECOVERY_UI_PASS');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
