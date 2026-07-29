import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync('familypilot-module-registry-retry-correction.js','utf8');
const marker='PF08A_WAVE1D_FINANCIAL_FINGERPRINT_DOMAIN_PASS';
const assert=(value,message)=>{if(!value)throw new Error(message)};

// Independent schema expectation derived from the authoritative persisted runtime owners,
// not imported from the implementation under test.
const requiredCollections=[
  'members','wallets','categories','operations','transfers','walletMovements',
  'obligationRules','obligationOccurrences','debtChains','debtCounterparties','debtEvents',
  'savingsGoals','savingsAccountPlans','savingsContributionOverrides','savingsGoalPolicies',
  'savingsMonthlyPlanReviews','savingsReserveDesigns','savingsReservePolicies','savingsRules',
  'savingsTransfers','purposeAllocations','purposeAllocationEvents','savingsLegacyReconciliationIssues',
  'savingsPurposeMigrationResults','savingsPurposeMigrationSnapshots','walletTransfers',
  'investmentAccounts','investmentValuations','investmentLocationAssignments','purposeLocationAssignments',
  'reserveContributionRules','giftFundReserveBridges','balanceAdjustments','plannedIncomeRules',
  'plannedIncomeOccurrences','incomeDistributionRules','incomeRuleActivationSnapshots',
  'savingsActionOccurrences','birthdayEvents','whatIfScenarios','whatIfPlanConversions',
  'whatIfInterestSimulations','persistenceMigrationLedger','m405ActionExecutionLedger',
  'm405NotifiedIncomeBatchIds',
];
const requiredObjects=['household','config','giftFundSettings','specialPurposeGoalIds','starterOnboarding'];
const requiredScalars=['defaultOperatingLocationId','reserveSavingsGoalId','selectedPartyId'];
const excludedKeys=['schemaVersion','currentMemberId','activeWalletId','learningModeByMember'];
const forbiddenLegacyKeys=['debts','savingsPlans','birthdays','scenarioPlanConversions','giftFund','onboardingState'];

const authoritativeContract=Object.freeze({
  version:1,
  owner:'FamilyPilotPersistence',
  keyPolicy:'canonical_schema_plus_observed_runtime_keys',
  objectKeys:Object.freeze([...requiredObjects]),
  collectionKeys:Object.freeze([...requiredCollections]),
  scalarKeys:Object.freeze([...requiredScalars]),
  excludedStateKeys:Object.freeze([...excludedKeys]),
});

function stateSeed(){
  const state={
    schemaVersion:22,
    currentMemberId:'member-1',
    activeWalletId:'wallet-1',
    learningModeByMember:{'member-1':true},
    household:{id:'household-1',baseCurrency:'EUR',openingCapital:1000},
    config:{trashRetentionEnabled:true,trashRetentionDays:45},
    giftFundSettings:{goalId:'goal-gift'},
    specialPurposeGoalIds:{giftFund:'goal-gift'},
    starterOnboarding:{status:'not_started',currentStep:0},
    defaultOperatingLocationId:'location-main',
    reserveSavingsGoalId:'goal-reserve',
    selectedPartyId:'party-1',
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
  FamilyPilotPersistence:{financialStateContract:()=>JSON.parse(JSON.stringify(authoritativeContract))},
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
assert(contract?.version===3,'Financial fingerprint contract version missing');
assert(contract.stateOwner==='window.__FP_RUNTIME__.state','Authoritative state owner missing');
assert(contract.persistenceOwner==='FamilyPilotPersistence','Persistence owner missing');
assert(contract.schemaContractOwner==='FamilyPilotPersistence','Persistence schema contract was not consumed');
assert(contract.keyPolicy==='persistence_contract_plus_observed_runtime_keys','Key policy missing');
assert(contract.recordTimestampsAndAuditMetadata==='included_without_normalization','Timestamp treatment missing');
assert(contract.persistenceEnvelopeMetadata==='excluded','Persistence metadata treatment missing');
for(const key of [...requiredObjects,...requiredCollections,...requiredScalars])assert(contract.keys.includes(key),`Contract omitted ${key}`);
for(const key of requiredCollections)assert(contract.unorderedCollections.includes(key),`Collection ordering contract omitted ${key}`);
for(const key of excludedKeys)assert(contract.excludedStateKeys.includes(key),`Exclusion contract omitted ${key}`);
for(const key of forbiddenLegacyKeys)assert(!contract.keys.includes(key),`Legacy/non-runtime key remained in contract: ${key}`);

const baseline=corrected.financialFingerprint();
for(const key of requiredCollections){
  const held=state[key];
  state[key]=[{id:`${key}-probe`,amount:1,occurredAt:1000,audit:{createdAt:900,updatedAt:1000}}];
  assert(corrected.financialFingerprint()!==baseline,`Fingerprint missed canonical collection ${key}`);
  state[key]=held;
}
for(const key of requiredObjects){
  const held=state[key];
  state[key]={...held,__financialProbe:key};
  assert(corrected.financialFingerprint()!==baseline,`Fingerprint missed canonical object ${key}`);
  state[key]=held;
}
for(const key of requiredScalars){
  const held=state[key];
  state[key]=`${String(held)}-probe`;
  assert(corrected.financialFingerprint()!==baseline,`Fingerprint missed canonical scalar ${key}`);
  state[key]=held;
}
assert(corrected.financialFingerprint()===baseline,'Financial state did not return to baseline');

state.unexpectedFinancialExtension=[{id:'extension-1',amount:9}];
assert(corrected.financialFingerprint()!==baseline,'Observed runtime extension key was silently omitted');
delete state.unexpectedFinancialExtension;
assert(corrected.financialFingerprint()===baseline,'Removing observed extension did not restore baseline');

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
state.transfers=[];

state.walletMovements=[{id:'movement-1',walletId:'wallet-1',amount:5,occurredAt:1000}];
const timestampA=corrected.financialFingerprint();
state.walletMovements[0].occurredAt=1001;
assert(corrected.financialFingerprint()!==timestampA,'Record timestamp mutation was not detected');
state.walletMovements=[];
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
  persistence_schema_contract_consumed:true,
  canonical_runtime_keys_covered:true,
  legacy_keys_rejected:true,
  every_required_key_has_negative_mutation_probe:true,
  observed_extension_keys_covered:true,
  canonical_collection_order:true,
  timestamp_metadata_sensitive:true,
  transient_state_excluded:true,
},null,2));
console.log(marker);
