const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const {webcrypto}=require('crypto');
const root=path.join(__dirname,'..');
const scope=fs.readFileSync(path.join(root,'familypilot-scope.js'),'utf8');
const p2=fs.readFileSync(path.join(root,'familypilot-backup-restore-core.js'),'utf8');
const p4c1=fs.readFileSync(path.join(root,'familypilot-protected-backup-core.js'),'utf8');
class StorageMock{constructor(){this.data=new Map()}getItem(key){return this.data.has(String(key))?this.data.get(String(key)):null}setItem(key,value){this.data.set(String(key),String(value))}removeItem(key){this.data.delete(String(key))}clear(){this.data.clear()}key(index){return[...this.data.keys()][index]||null}get length(){return this.data.size}}
function load(name){const storage=new StorageMock(),context={localStorage:storage,location:{search:`?test=1&persistenceTest=${name}`},URLSearchParams,setTimeout,clearTimeout,queueMicrotask,TextEncoder,TextDecoder,crypto:webcrypto};context.globalThis=context;vm.createContext(context);vm.runInContext(scope,context);vm.runInContext(p2,context);vm.runInContext(p4c1,context);return{storage,p:context.FamilyPilotPersistence,b:context.FamilyPilotBackupRestoreCore,c:context.FamilyPilotProtectedBackupCore}}
function state(id='protected-state'){return{schemaVersion:22,household:{id,name:'Žofia Protected',baseCurrency:'EUR'},wallets:[{id:'wallet-secret',name:'Main Wallet'}],operations:[],walletMovements:[],transfers:[],purposeAllocations:[],savingsTransfers:[],obligationRules:[],obligationOccurrences:[]}}
function snapshot(storage){return JSON.stringify([...storage.data.entries()].sort())}
function decode(text){return Buffer.from(text.replace(/-/g,'+').replace(/_/g,'/'),'base64')}
function clone(value){return JSON.parse(JSON.stringify(value))}
function deterministic(){let n=0;return length=>Uint8Array.from({length},()=>n++&255)}
async function authenticatedContainer(container,passphrase,plaintext,persistence){const salt=decode(container.header.kdf.salt),iv=decode(container.header.cipher.iv),material=await webcrypto.subtle.importKey('raw',new TextEncoder().encode(passphrase),'PBKDF2',false,['deriveKey']),key=await webcrypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:600000},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']),ciphertext=await webcrypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(persistence.canonicalSerialize(container.header)),tagLength:128},key,new TextEncoder().encode(plaintext)),output=clone(container);output.ciphertext=Buffer.from(ciphertext).toString('base64url');return output}
(async()=>{
  assert(p2.includes('FamilyPilotBackupRestoreCore'),'accepted P2 source loads');
  assert(!p4c1.includes("require('")&&!/localStorage|sessionStorage|indexedDB|fetch\s*\(|XMLHttpRequest|WebSocket|console\./.test(p4c1),'P4C1 has no provider, secret persistence, or logging');
  const {storage,p,b,c}=load('p4c1');assert(p&&b&&c&&Object.isFrozen(c),'P1/P2/P4C1 namespaces load and P4C1 is frozen');
  const core=c.createCore({crypto:webcrypto,now:()=>1700000000123,randomBytes:deterministic()});
  assert.strictEqual((await core.createProtectedBackup(state(),'short')).error,'invalid_backup_passphrase');
  assert.strictEqual((await core.createProtectedBackup(state(),'x'.repeat(1025))).error,'invalid_backup_passphrase');
  const beforeCreate=snapshot(storage),first=await core.createProtectedBackup(state(),'  twelve chars  '),second=await core.createProtectedBackup(state(),'  twelve chars  ');
  assert(first.ok&&second.ok&&Object.isFrozen(first.container)&&Object.isFrozen(first.container.header));assert.strictEqual(snapshot(storage),beforeCreate,'create is zero mutation');
  const container=first.container;assert.strictEqual(container.kind,'FamilyPilotProtectedBackup');assert.strictEqual(container.formatVersion,1);assert.deepStrictEqual({...container.header.kdf,salt:undefined},{name:'PBKDF2',hash:'SHA-256',iterations:600000,salt:undefined});assert.strictEqual(decode(container.header.kdf.salt).length,16);assert.deepStrictEqual({...container.header.cipher,iv:undefined},{name:'AES-GCM',keyBits:256,tagBits:128,iv:undefined});assert.strictEqual(decode(container.header.cipher.iv).length,12);
  assert.notStrictEqual(container.header.kdf.salt,second.container.header.kdf.salt);assert.notStrictEqual(container.header.cipher.iv,second.container.header.cipher.iv);assert.notStrictEqual(container.ciphertext,second.container.ciphertext);
  const serialized=core.serializeProtectedBackup(container);assert.strictEqual(typeof serialized,'string');assert(!serialized.includes('Žofia Protected')&&!serialized.includes('Main Wallet')&&!serialized.includes('wallet-secret')&&!serialized.includes('twelve chars'));
  const decrypted=await core.decryptProtectedBackup(serialized,'  twelve chars  ');assert(decrypted.ok);assert.deepStrictEqual(JSON.parse(JSON.stringify(decrypted.state)),state());
  assert.strictEqual((await core.decryptProtectedBackup(container,'twelve chars')).error,'protected_backup_authentication_failed','spaces are intentional');
  const badCipher=clone(container);badCipher.ciphertext=badCipher.ciphertext.slice(0,-1)+(badCipher.ciphertext.endsWith('A')?'B':'A');assert.strictEqual((await core.decryptProtectedBackup(badCipher,'  twelve chars  ')).error,'protected_backup_authentication_failed');
  const badHeader=clone(container);badHeader.header.createdAt++;assert.strictEqual((await core.decryptProtectedBackup(badHeader,'  twelve chars  ')).error,'protected_backup_authentication_failed');
  const badSalt=clone(container);badSalt.header.kdf.salt=badSalt.header.kdf.salt.slice(0,-1)+(badSalt.header.kdf.salt.endsWith('A')?'B':'A');assert.strictEqual((await core.decryptProtectedBackup(badSalt,'  twelve chars  ')).error,'protected_backup_authentication_failed');
  const badIv=clone(container);badIv.header.cipher.iv=badIv.header.cipher.iv.slice(0,-1)+(badIv.header.cipher.iv.endsWith('A')?'B':'A');assert.strictEqual((await core.decryptProtectedBackup(badIv,'  twelve chars  ')).error,'protected_backup_authentication_failed');
  const badKdf=clone(container);badKdf.header.kdf.iterations=1;assert.strictEqual((await core.decryptProtectedBackup(badKdf,'  twelve chars  ')).error,'protected_backup_kdf_invalid');
  const badEncoding=clone(container);badEncoding.header.cipher.iv='***';assert.strictEqual((await core.decryptProtectedBackup(badEncoding,'  twelve chars  ')).error,'protected_backup_encoding_invalid');
  const raw=b.createBackupPackage(state());assert.strictEqual((await core.decryptProtectedBackup(raw,'  twelve chars  ')).error,'protected_backup_required');
  const authenticatedInvalid=await authenticatedContainer(container,'  twelve chars  ','{"kind":"not-a-p2-package"}',p);assert.strictEqual((await core.decryptProtectedBackup(authenticatedInvalid,'  twelve chars  ')).error,'unsupported_package_kind','P2 validation runs after authenticated decrypt');assert.strictEqual((await core.stageProtectedRestore(authenticatedInvalid,'  twelve chars  ')).error,'unsupported_package_kind');
  const beforeStage=snapshot(storage);assert.strictEqual((await core.stageProtectedRestore(container,'wrong passphrase')).error,'protected_backup_authentication_failed');assert.strictEqual(snapshot(storage),beforeStage,'authentication failure cannot mutate');const staged=await core.stageProtectedRestore(container,'  twelve chars  ');assert(staged.ok&&Object.isFrozen(staged.stage));assert.strictEqual(snapshot(storage),beforeStage,'stage is zero mutation');assert.strictEqual(core.applyProtectedStagedRestore({...staged.stage}).error,'invalid_protected_staged_restore');
  const applied=core.applyProtectedStagedRestore(staged.stage);assert(applied.ok);assert.strictEqual(p.test.retryRecovery().state.household.id,'protected-state');
  const locked=load('p4c1locked'),lockedCore=locked.c.createCore({crypto:webcrypto,randomBytes:deterministic()}),lockedContainer=(await lockedCore.createProtectedBackup(state('locked'),'  twelve chars  ')).container;const lockedStage=await lockedCore.stageProtectedRestore(lockedContainer,'  twelve chars  ');locked.p.test.seedMalformedCompatibilityPayload();locked.p.test.retryRecovery();assert.strictEqual(lockedCore.applyProtectedStagedRestore(lockedStage.stage).error,'recovery_locked');
  const unavailable=c.createCore({crypto:null});assert.strictEqual((await unavailable.createProtectedBackup(state(),'  twelve chars  ')).error,'secure_backup_crypto_unavailable');
  assert.strictEqual(require('child_process').spawnSync('git',['status','--short','--','familypilot-backup-restore-core.js'],{cwd:root}).stdout.toString(),'','P2 remains unchanged');
  console.log('FP85_P4C1_PROTECTED_BACKUP_CONTAINER_PASS');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
