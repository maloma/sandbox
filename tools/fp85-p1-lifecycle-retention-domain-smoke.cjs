const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const source=fs.readFileSync(require('path').join(__dirname,'..','familypilot-scope.js'),'utf8');
class StorageMock{constructor(){this.data=new Map()}getItem(key){key=String(key);return this.data.has(key)?this.data.get(key):null}setItem(key,value){this.data.set(String(key),String(value))}removeItem(key){this.data.delete(String(key))}clear(){this.data.clear()}key(index){return [...this.data.keys()][index]||null}get length(){return this.data.size}}
function load(name){const storage=new StorageMock(),context={localStorage:storage,location:{search:`?test=1&persistenceTest=${name}`},URLSearchParams,console,setTimeout,clearTimeout,queueMicrotask};context.globalThis=context;vm.createContext(context);vm.runInContext(source,context);return{storage,persistence:context.FamilyPilotPersistence}}
function records(count,protectedRecord,offset=0){return Array.from({length:count},(_,index)=>({id:`r-${offset+index}`,capturedAt:offset+index,protected:protectedRecord,retainedBytes:10}))}
function ids(list){return list.map(item=>item.id)}
const {storage,persistence:p}=load('retention');
assert(p&&p.test,'persistence core should load in the test harness');
let result=p.test.retain(records(25,true),20);assert(result.ok);assert.strictEqual(result.list.length,20);assert.deepStrictEqual(ids(result.list),ids(records(20,true,5)));
result=p.test.retain([...records(20,true,100),...records(5,false)],20);assert(result.ok);assert.deepStrictEqual(ids(result.list),ids(records(20,true,100)),'oldest unprotected records evict first');
result=p.test.retain([...records(21,true),...records(2,false,30)],20);assert(result.ok);assert.strictEqual(result.list.length,20);assert.deepStrictEqual(ids(result.list),ids(records(20,true,1)),'protected overflow remains hard-capped');
for(let index=0;index<25;index++)p.test.quarantineRaw('test',`payload-${index}`,'test',true);
let keys=p.test.keys();let quarantine=JSON.parse(p.test.nativeGetItem(keys.quarantine));assert.strictEqual(quarantine.length,20);assert.deepStrictEqual(quarantine.map(item=>item.rawPayload),Array.from({length:20},(_,index)=>`payload-${index+5}`));
for(let index=0;index<5;index++)p.test.captureSnapshot(`snapshot-${index}`,'test',index,index+1);
assert.strictEqual(JSON.parse(p.test.nativeGetItem(keys.snapshots)).length,3);
result=p.test.retain([{id:'a',capturedAt:1,protected:true,retainedBytes:8},{id:'b',capturedAt:2,protected:false,retainedBytes:8},{id:'c',capturedAt:3,protected:true,retainedBytes:8}],20,{maxBytes:16});assert(result.ok);assert.deepStrictEqual(ids(result.list),['a','c']);assert.strictEqual(result.bytes,16);
result=p.test.retain([{id:'oversized',capturedAt:1,protected:true,retainedBytes:17}],20,{maxBytes:16});assert(result.ok);assert.deepStrictEqual(result.list,[],'an oversized individual record is evicted to satisfy the byte budget');
assert.strictEqual(p.test.retain(records(1,false),-1).ok,false);assert.strictEqual(p.test.retain(records(1,false),1,{maxBytes:-1}).ok,false);
const policy=p.lifecyclePolicy();const active=policy.classes.find(entry=>entry.name==='active_confirmed');assert(active&&active.genericCleanupEligible===false);assert.deepStrictEqual(policy.retention.quarantine.maxBytes,null);
const canonicalPayload=JSON.stringify({schemaVersion:22,operations:[{id:'operation-1',amount:91}],wallets:[]});
for(const name of ['compatibility','slotA','slotB','head','status'])p.test.nativeSetItem(keys[name],`${name}:${canonicalPayload}`);
p.test.nativeSetItem('unknown-unclassified-key','must-stay');
const before=Object.fromEntries(['compatibility','slotA','slotB','head','status'].map(name=>[name,p.test.nativeGetItem(keys[name])]));
const summary=p.cleanupNonCanonicalArtifacts();assert.strictEqual(summary.status,'completed');assert.deepStrictEqual(Object.fromEntries(['compatibility','slotA','slotB','head','status'].map(name=>[name,p.test.nativeGetItem(keys[name])])),before);assert.strictEqual(p.test.nativeGetItem('unknown-unclassified-key'),'must-stay');assert(!JSON.stringify(summary).includes(canonicalPayload));assert.strictEqual(p.fnv1a32(before.compatibility),p.fnv1a32(p.test.nativeGetItem(keys.compatibility)));
const locked=load('locked');locked.persistence.test.seedMalformedCompatibilityPayload();locked.persistence.test.retryRecovery();assert.strictEqual(locked.persistence.isRecoveryLocked(),true);assert.strictEqual(locked.persistence.cleanupNonCanonicalArtifacts().status,'blocked');
assert.strictEqual(policy.classes.filter(entry=>entry.name==='active_confirmed').length,1,'no second canonical financial/history truth is introduced');
console.log('FP85_P1_LIFECYCLE_RETENTION_DOMAIN_PASS');
