const assert=require('assert');
const childProcess=require('child_process');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.join(__dirname,'..');
const scope=fs.readFileSync(path.join(root,'familypilot-scope.js'),'utf8');
const backup=fs.readFileSync(path.join(root,'familypilot-backup-restore-core.js'),'utf8');
const core=fs.readFileSync(path.join(root,'familypilot-destructive-lifecycle-core.js'),'utf8');

class StorageMock{constructor(){this.data=new Map()}getItem(key){key=String(key);return this.data.has(key)?this.data.get(key):null}setItem(key,value){this.data.set(String(key),String(value))}removeItem(key){this.data.delete(String(key))}clear(){this.data.clear()}key(index){return[...this.data.keys()][index]||null}get length(){return this.data.size}}
function load(name){const storage=new StorageMock(),context={localStorage:storage,location:{search:`?test=1&persistenceTest=${name}`},URLSearchParams,console,TextEncoder,queueMicrotask};context.globalThis=context;vm.createContext(context);vm.runInContext(scope,context);vm.runInContext(backup,context);vm.runInContext(core,context);return{storage,p:context.FamilyPilotPersistence,b:context.FamilyPilotBackupRestoreCore,d:context.FamilyPilotDestructiveLifecycleCore}}
function state(id='household-current',operation={}){return{schemaVersion:22,household:{id,name:'Sensitive household',baseCurrency:'EUR',openingCapital:0},config:{trashRetentionEnabled:true,trashRetentionDays:45,quickCategoryIds:{expense:[],income:[]}},currentMemberId:'member-1',activeWalletId:null,wallets:[],operations:[{id:'operation-1',kind:'expense',amount:91,note:'Private finance note',status:'active',deletedAt:null,deletedByMemberId:null,trashExpiresAt:null,...operation}],walletMovements:[],transfers:[],purposeAllocations:[],savingsTransfers:[],obligationRules:[],obligationOccurrences:[]}}
function snapshot(storage){return JSON.stringify([...storage.data.entries()].sort((a,b)=>a[0].localeCompare(b[0])))}
function acknowledgement(plan,strong=false){return{action:plan.action,acknowledged:true,strong}}
function prepareAndConfirm(d,current,request){const result=d.prepare(current,request);assert(result.ok,result.error);const confirmed=d.confirm(result.plan,acknowledgement(result.plan,result.plan.action==='reset_application'||result.plan.action==='irreversible_privacy_erase'));assert(confirmed.ok,confirmed.error);return{plan:result.plan,confirmation:confirmed.confirmation}}

const {storage,p,b,d}=load('p3a');
assert(p&&p.test,'accepted P1 persistence core loads');
assert(b,'accepted P2 backup/restore core loads');
assert(d,'P3A core loads');
assert.deepStrictEqual([...d.ACTIONS],['trash','restore_from_trash','expire_trash','reset_application','irreversible_privacy_erase']);
const policy=d.policy();assert.strictEqual(policy.uiWiringPresent,false);for(const action of d.ACTIONS)assert.strictEqual(policy.actions[action].uiWiringPresent,false);
assert.notStrictEqual('cleanupNonCanonicalArtifacts','reset_application');assert.notStrictEqual('reset_application','irreversible_privacy_erase');
assert.strictEqual(d.prepare(state(),{action:'trash',entityType:'wallet',id:'wallet-1'}).error,'unsupported_entity_lifecycle');

const original=state(),beforePlanning=snapshot(storage);
const trash=d.prepare(original,{action:'trash',entityType:'operation',id:'operation-1',now:1700000000000});
assert(trash.ok);assert(Object.isFrozen(trash.plan)&&Object.isFrozen(trash.plan.target));assert.strictEqual(snapshot(storage),beforePlanning,'planning causes zero persistence writes');
assert.strictEqual(original.operations[0].status,'active');assert.strictEqual(d.candidateDescriptor(trash.plan).collections.operations,1);
assert(!JSON.stringify(trash).includes('Private finance note'));assert(!JSON.stringify(trash).includes('Sensitive household'));assert(!JSON.stringify(trash).includes('"amount":91'));
const trashConfirmation=d.confirm(trash.plan,acknowledgement(trash.plan));assert(trashConfirmation.ok);
const trashedApply=d.apply(trash.plan,trashConfirmation.confirmation,original);assert(trashedApply.ok&&trashedApply.requiresReload);assert.strictEqual(original.operations[0].status,'active','caller state is never replaced');
let recovered=p.test.retryRecovery().state;assert.strictEqual(recovered.operations.length,1);assert.strictEqual(recovered.operations[0].id,'operation-1');assert.strictEqual(recovered.operations[0].status,'trash');assert.strictEqual(recovered.operations.some(item=>item.trash===true),false,'no second Trash collection');
const restore=prepareAndConfirm(d,recovered,{action:'restore_from_trash',entityType:'operation',id:'operation-1'});const restored=d.apply(restore.plan,restore.confirmation,recovered);assert(restored.ok);recovered=p.test.retryRecovery().state;assert.strictEqual(recovered.operations.length,1);assert.strictEqual(recovered.operations[0].id,'operation-1');assert.strictEqual(recovered.operations[0].status,'active');

const activeExpiry=d.prepare(state(),{action:'expire_trash',now:1700000000000});assert(activeExpiry.ok);assert.strictEqual(activeExpiry.plan.target.count,0,'active operation cannot expire as Trash');
const disabled=state();disabled.config.trashRetentionEnabled=false;const disabledExpiry=d.prepare(disabled,{action:'expire_trash',now:1700000000000});assert.strictEqual(disabledExpiry.error,'retention_policy_disabled');assert.strictEqual(disabledExpiry.eligibleIds.length,0);
const invalid=state();invalid.config.trashRetentionDays=0;assert.strictEqual(d.prepare(invalid,{action:'expire_trash',now:1700000000000}).error,'invalid_retention_policy');
const ambiguous=state('household-current',{status:'trash',deletedAt:null});assert.strictEqual(d.prepare(ambiguous,{action:'expire_trash',now:1700000000000}).error,'ambiguous_trash_timestamp');
const eligible=state('household-current',{status:'trash',deletedAt:1700000000000-45*24*60*60*1000});const expiry=d.prepare(eligible,{action:'expire_trash',now:1700000000000});assert(expiry.ok);assert.strictEqual(expiry.plan.target.count,1);assert.strictEqual(d.confirm(expiry.plan,acknowledgement(expiry.plan)).ok,true);assert.strictEqual(d.apply(expiry.plan,d.confirm(expiry.plan,acknowledgement(expiry.plan)).confirmation,eligible).error,'unsupported_expiry_apply');

const resetState=state('before-reset');p.commitState(resetState);const reset=d.prepare(resetState,{action:'reset_application'});assert(reset.ok);assert.strictEqual(reset.plan.backupOfferRequired,true);assert.strictEqual(d.candidateDescriptor(reset.plan).collections.operations,0);assert.strictEqual(d.confirm(reset.plan,{action:'irreversible_privacy_erase',acknowledged:true,strong:true}).error,'action_bound_confirmation_required');assert.strictEqual(d.apply(reset.plan,{},resetState).error,'invalid_action_bound_confirmation');
const copiedPlan={...reset.plan};const resetBefore=snapshot(storage);assert.strictEqual(d.apply(copiedPlan,{},resetState).error,'invalid_destructive_plan');assert.strictEqual(snapshot(storage),resetBefore,'forged plan rejected before mutation');
const staleState=state('before-reset');staleState.operations[0].note='changed';const resetConfirmation=d.confirm(reset.plan,acknowledgement(reset.plan,true));assert.strictEqual(d.apply(reset.plan,resetConfirmation.confirmation,staleState).error,'stale_destructive_plan');
const validReset=prepareAndConfirm(d,resetState,{action:'reset_application'});const resetResult=d.apply(validReset.plan,validReset.confirmation,resetState);assert(resetResult.ok&&resetResult.requiresReload);assert.strictEqual(p.test.retryRecovery().state.operations.length,0,'reset commit uses existing persistence');

const privacy=d.prepare(state(),{action:'irreversible_privacy_erase'});assert(privacy.ok);assert.strictEqual(privacy.plan.irreversible,true);assert.strictEqual(policy.actions.irreversible_privacy_erase.mayTriggerAutomatically,false);assert.strictEqual(d.confirm(privacy.plan,{action:'reset_application',acknowledged:true,strong:true}).error,'action_bound_confirmation_required');const privacyConfirmation=d.confirm(privacy.plan,acknowledgement(privacy.plan,true));assert(privacyConfirmation.ok);const privacyResult=d.apply(privacy.plan,privacyConfirmation.confirmation,state());assert.strictEqual(privacyResult.error,'erase_adapter_authority_required');assert.strictEqual(privacy.plan.summary.unknownStorage,'not_deleted');assert.strictEqual(privacy.plan.summary.externalStorage,'not_deleted');assert(!JSON.stringify(privacyResult).includes('Private finance note'));

const locked=load('locked');const lockedState=state();const lockedReset=prepareAndConfirm(locked.d,lockedState,{action:'reset_application'});locked.p.test.seedMalformedCompatibilityPayload();locked.p.test.retryRecovery();assert.strictEqual(locked.p.isRecoveryLocked(),true);assert.strictEqual(locked.d.apply(lockedReset.plan,lockedReset.confirmation,lockedState).error,'recovery_locked');const lockedPrivacy=prepareAndConfirm(locked.d,lockedState,{action:'irreversible_privacy_erase'});assert.strictEqual(locked.d.apply(lockedPrivacy.plan,lockedPrivacy.confirmation,lockedState).error,'recovery_locked');

const failureState=state('authoritative');p.commitState(failureState);const slotPlan=prepareAndConfirm(d,failureState,{action:'reset_application'});p.test.failNextWriteAt('slot_write');assert.strictEqual(d.apply(slotPlan.plan,slotPlan.confirmation,failureState).ok,false);assert.strictEqual(p.test.retryRecovery().state.household.id,'authoritative');const headPlan=prepareAndConfirm(d,failureState,{action:'reset_application'});p.test.failNextWriteAt('head_write');assert.strictEqual(d.apply(headPlan.plan,headPlan.confirmation,failureState).ok,false);assert.strictEqual(p.test.retryRecovery().state.household.id,'authoritative');

for(const file of ['fp85-p1-lifecycle-retention-domain-smoke.cjs','fp85-p2-backup-restore-core-domain-smoke.cjs']){const run=childProcess.spawnSync(process.execPath,[path.join(__dirname,file)],{encoding:'utf8'});assert.strictEqual(run.status,0,run.stderr||run.stdout)}
assert.strictEqual(Object.keys(p.financialStateContract()).includes('trash'),false,'no second canonical financial/history truth');
console.log('FP85_P3A_DESTRUCTIVE_LIFECYCLE_CORE_PASS');
