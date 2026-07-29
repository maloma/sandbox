import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync('familypilot-module-registry-retry-correction.js','utf8');
const marker='PF08A_WAVE1D_FINANCIAL_FINGERPRINT_DOMAIN_PASS';
const assert=(value,message)=>{if(!value)throw new Error(message)};
const requiredCollections=[
  'members','wallets','categories','operations','transfers','walletMovements',
  'obligationRules','obligationOccurrences','debts','debtEvents',
  'savingsGoals','savingsPlans','savingsTransfers','purposeAllocations','purposeAllocationEvents',
  'savingsLegacyReconciliationIssues','savingsPurposeMigrationResults',
  'walletTransfers','investmentAccounts','balanceAdjustments',
  'plannedIncomeRules','plannedIncomeOccurrences','incomeDistributionRules','savingsActionOccurrences',
  'birthdays','whatIfScenarios','scenarioPlanConversions','whatIfInterestSimulations',
];
const requiredObjects=['household','config','giftFund','onboardingState'];
const excludedKeys=['schemaVersion','currentMemberId','activeWalletId','learningModeByMember'];

function stateSeed(){
  const state={
    schemaVersion:22,
    currentMemberId:'member-1',
    activeWalletId:'wallet-1',
    learningModeByMember:{'member-1':true},
    household:{id:'household-1',baseCurrency:'EUR',openingCapital:1000},
    config:{trashRetentionEnabled:true,trashRetentionDays:45},
    giftFund:{amount:0,currency:'EUR'},
    onboardingState:{completed:false},
  };
  for(const key of requiredCollections)state[key]=[];
  state.wallets=[{id:'wallet-1',openingBalance:0,nativeCurrency:'EUR'}];
  return state;
}

const state=stateSeed();
const registry={
  snapshot:()=>({catalogue:[]}),
  moduleForPath:()=>null,
  markDegraded(){},
  financialFingerprint:()=>"legacy",
  test:{sentinel:true},
};
const context={
  console,URLSearchParams,Map,Set,WeakMap,Object,Array,String,Number,Boolean,JSON,
  location:{search:'?test=1'},
  FamilyPilotModuleRegistry:registry,
  __FP_RUNTIME__:{state},
  document:{
    documentElement:{},
    body:{classList:{toggle(){}}},
    querySelectorAll(){return[]},
    querySelector(){return null},
    addEventListener(){},
  },
  MutationObserver:class{observe(){}},
  addEventListener(){},
};
context.window=context;
context.globalThis=context;
vm.runInNewContext(source,context,{filename:'familypilot-module-registry-retry-correction.js'});

const corrected=context.FamilyPilotModuleRegistry;
assert(corrected!==registry,'Corrected registry surface was not installed');
assert(corrected.test?.sentinel===true,'Existing registry test surface was not preserved');
const contract=corrected.financialFingerprintContract?.();
assert(contract?.version===2,'Financial fingerprint contract version missing');
assert(contract.stateOwner==='window.__FP_RUNTIME__.state','Authoritative state owner missing');
assert(contract.persistenceOwner==='FamilyPilotPersistence','Persistence owner missing');
assert(contract.recordTimestampsAndAuditMetadata==='included_without_normalization','Timestamp treatment missing');
assert(contract.persistenceEnvelopeMetadata==='excluded','Persistence metadata treatment missing');
for(const key of [...requiredObjects,...requiredCollections])assert(contract.keys.includes(key),`Contract omitted ${key}`);
for(const key of requiredCollections)assert(contract.unorderedCollections.includes(key),`Collection ordering contract omitted ${key}`);
for(const key of excludedKeys)assert(contract.excludedStateKeys.includes(key),`Exclusion contract omitted ${key}`);

const baseline=corrected.financialFingerprint();
for(const key of requiredCollections){
  state[key]=[{id:`${key}-probe`,amount:1,occurredAt:1000,audit:{createdAt:900,updatedAt:1000}}];
  assert(corrected.financialFingerprint()!==baseline,`Fingerprint missed ${key}`);
  state[key]=key==='wallets'?[{id:'wallet-1',openingBalance:0,nativeCurrency:'EUR'}]:[];
}
for(const key of requiredObjects){
  const held=state[key];
  state[key]={...held,__financialProbe:key};
  assert(corrected.financialFingerprint()!==baseline,`Fingerprint missed ${key}`);
  state[key]=held;
}
assert(corrected.financialFingerprint()===baseline,'Financial state did not return to baseline');

state.transfers=[
  {id:'transfer-2',amount:20,meta:{z:2,a:1}},
  {id:'transfer-1',amount:10,meta:{z:1,a:2}},
];
const canonicalA=corrected.financialFingerprint();
state.transfers=[
  {meta:{a:2,z:1},amount:10,id:'transfer-1'},
  {meta:{a:1,z:2},amount:20,id:'transfer-2'},
];
const canonicalB=corrected.financialFingerprint();
assert(canonicalA===canonicalB,'Fingerprint depends on object or collection insertion order');

state.walletMovements=[{id:'movement-1',walletId:'wallet-1',amount:5,occurredAt:1000}];
const timestampA=corrected.financialFingerprint();
state.walletMovements[0].occurredAt=1001;
assert(corrected.financialFingerprint()!==timestampA,'Record timestamp mutation was not detected');
state.walletMovements=[];
state.transfers=[];
assert(corrected.financialFingerprint()===baseline,'Canonical reset did not restore baseline');

const transientBaseline=corrected.financialFingerprint();
state.schemaVersion=23;
state.currentMemberId='member-2';
state.activeWalletId='wallet-2';
state.learningModeByMember={'member-2':false};
assert(corrected.financialFingerprint()===transientBaseline,'Excluded transient or persistence metadata changed fingerprint');
assert(context.__FP_TEST__?.moduleRegistryCorrection?.financialFingerprint()===corrected.financialFingerprint(),'Test correction surface disagrees with registry fingerprint');

console.log(JSON.stringify({
  status:'PASS',
  marker,
  contract_version:contract.version,
  authoritative_state_owner:true,
  persistence_owner:true,
  migration_collections_covered:true,
  debts_covered:true,
  transfers_covered:true,
  wallet_movements_covered:true,
  canonical_object_keys:true,
  canonical_collection_order:true,
  timestamp_metadata_sensitive:true,
  transient_state_excluded:true,
},null,2));
console.log(marker);
