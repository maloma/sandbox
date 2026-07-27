(()=>{
  'use strict';
  if(window.__FP_SAVINGS_TRUTH_CORRECTION__)return;
  const original=window.FamilyPilotSavingsTruth;if(!original){window.__FP_SAVINGS_TRUTH_CORRECTION_ERROR__='Savings truth domain unavailable';return}
  window.__FP_SAVINGS_TRUTH_CORRECTION__=true;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const round=value=>Math.round((Number(value)||0)*100)/100;
  const makeId=(prefix='id',at=Date.now())=>`${prefix}-${Number(at).toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  function protectExisting(state,deps={},at=Date.now()){
    original.ensure(state);state.savingsPurposeMigrationResults=Array.isArray(state.savingsPurposeMigrationResults)?state.savingsPurposeMigrationResults:[];state.savingsLegacyReconciliationIssues=Array.isArray(state.savingsLegacyReconciliationIssues)?state.savingsLegacyReconciliationIssues:[];
    for(const goal of state.savingsGoals||[]){const key=`${original.VERSION}:${goal.id}`;if(state.savingsPurposeMigrationResults.some(item=>item.migrationKey===key))continue;const canonical=original.actualSaved(state,goal.id);if(canonical<=.005)continue;const legacy=Math.max(0,round(goal.savedAmount)),same=Math.abs(legacy-canonical)<=.005;let issue=null;
      if(!same){issue={id:makeId('savings-reconciliation',at),goalId:String(goal.id),legacyClaimAmount:legacy,derivedAllocationAmount:canonical,unverifiedAmount:Math.max(0,round(legacy-canonical)),preferredLocationId:'',availableByLocationSnapshot:original.availableSnapshot(state,deps),reason:'canonical_legacy_mismatch',status:'pending',resolution:null,createdAt:at,updatedAt:at,resolvedAt:null,resolvedByMemberId:'',migrationKey:key};state.savingsLegacyReconciliationIssues.push(issue)}
      state.savingsPurposeMigrationResults.push({goalId:String(goal.id),migrationKey:key,legacySavedAmount:legacy,historyDerivedAmount:0,baselineAmount:0,canonicalAmount:canonical,assignmentProvenance:'existing_canonical',result:same?'migrated_existing':'pending_conflict',createdAllocationIds:original.breakdown(state,goal.id).map(item=>item.id),createdEventIds:[],issueId:issue?.id||'',completedAt:at});
    }
  }
  function captureLegacyPreflight(state,deps={},at=Date.now()){protectExisting(state,deps,at);return original.captureLegacyPreflight(state,deps,at)}
  function normalizeState(state,deps={},at=Date.now()){captureLegacyPreflight(state,deps,at);original.syncGoalCaches(state);return state}
  window.FamilyPilotSavingsTruth=Object.freeze({...original,captureLegacyPreflight,normalizeState,protectExisting});
})();
