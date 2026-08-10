'use strict';
const truth=require('../familypilot-pf08a-savings-truth.js');
const assert=(value,message)=>{if(!value)throw new Error(message)};
const wallet=(id,balance=500)=>({id,type:'household_shared',name:id,openingBalance:balance,includedInHouseholdCapital:true,archivedAt:null,moneyForm:'bank'});
const goal=(id,saved=0,status='active')=>({id,name:id,targetAmount:1000,savedAmount:saved,targetDate:'',status,createdAt:1,createdByMemberId:'member-anna',updatedAt:1,updatedByMemberId:'member-anna'});
const base=(goals=[goal('g1',0)],wallets=[wallet('w1')])=>({schemaVersion:20,currentMemberId:'member-anna',household:{baseCurrency:'EUR'},wallets,savingsGoals:goals,operations:[],walletTransfers:[],balanceAdjustments:[],savingsTransfers:[],purposeLocationAssignments:[]});
const deps={};

// Case A: zero legacy value.
{
  const state=base();truth.captureLegacyPreflight(state,deps,10);assert(truth.actualSaved(state,'g1')===0,'Case A allocation');assert(state.savingsPurposeMigrationResults.length===1,'Case A result');assert(state.savingsLegacyReconciliationIssues.length===0,'Case A issue');
}

// Case B: trusted exactly-one location and enough real money.
{
  const state=base([goal('g1',120)]);const before=JSON.stringify(state.operations);truth.captureLegacyPreflight(state,deps,20);assert(truth.actualSaved(state,'g1')===120,'Case B saved');assert(state.savingsGoals[0].savedAmount===120,'Case B cache');assert(state.purposeAllocationEvents.some(event=>event.reason==='legacy_baseline'),'Case B baseline event');assert(JSON.stringify(state.operations)===before,'Case B fabricated operation');const count=state.purposeAllocationEvents.length;truth.captureLegacyPreflight(state,deps,30);assert(state.purposeAllocationEvents.length===count,'Case B idempotency');
}

// Case C: two locations, no trusted assignment.
{
  const state=base([goal('g1',100)],[wallet('w1'),wallet('w2')]);truth.captureLegacyPreflight(state,deps,40);assert(truth.actualSaved(state,'g1')===0,'Case C current amount');assert(truth.pendingIssues(state).length===1,'Case C missing issue');assert(truth.pendingIssues(state)[0].reason==='location_untrusted','Case C reason');
}

// Case D: insufficient real money never produces a partial automatic baseline.
{
  const state=base([goal('g1',100)],[wallet('w1',40)]);truth.captureLegacyPreflight(state,deps,50);assert(truth.actualSaved(state,'g1')===0,'Case D partial migration');assert(truth.pendingIssues(state)[0].unverifiedAmount===100,'Case D unverified amount');
}

// Verified transfer history is not duplicated by a baseline.
{
  const state=base([goal('g1',75)],[wallet('w1',500)]);state.savingsTransfers=[{id:'t1',sourceAccountId:'operating:main',destinationAccountId:'purpose:g1',amount:75,effectiveDate:1,status:'active',destinationLocationId:'w1'}];truth.captureLegacyPreflight(state,deps,60);assert(truth.actualSaved(state,'g1')===75,'History amount');assert(state.purposeAllocationEvents.filter(event=>event.reason==='legacy_baseline').length===0,'History duplicated by baseline');assert(state.purposeAllocationEvents.filter(event=>event.reason==='transfer_history').length===1,'History event missing');
}

// Existing allocations, allocation/release and capital classification.
{
  const state=base([goal('g1',0)],[wallet('w1',500)]);truth.captureLegacyPreflight(state,deps,70);const a=truth.allocateExisting(state,{goalId:'g1',locationId:'w1',amount:80},'member-anna',deps,80);assert(a.ok&&truth.actualSaved(state,'g1')===80,'Manual allocation');assert(truth.rawUnallocatedAtLocation(state,'w1',deps)===420,'Raw availability');const r=truth.release(state,{goalId:'g1',locationId:'w1',amount:30},'member-anna',deps,90);assert(r.ok&&truth.actualSaved(state,'g1')===50,'Release');assert(state.operations.length===0&&state.walletTransfers.length===0,'Classification created economic operation');
}

// Split allocation and reallocation remain one owned-money classification.
{
  const state=base([goal('g1',0),goal('g2',0)],[wallet('w1',500),wallet('w2',500)]);truth.captureLegacyPreflight(state,deps,100);assert(truth.allocateExisting(state,{goalId:'g1',locationId:'w1',amount:40},'member-anna',deps,110).ok,'Split 1');assert(truth.allocateExisting(state,{goalId:'g1',locationId:'w2',amount:60},'member-anna',deps,120).ok,'Split 2');assert(truth.breakdown(state,'g1').length===2&&truth.actualSaved(state,'g1')===100,'Split breakdown');const move=truth.reallocate(state,{sourceGoalId:'g1',destinationGoalId:'g2',sourceLocationId:'w1',destinationLocationId:'w1',amount:25},'member-anna',deps,130);assert(move.ok&&truth.actualSaved(state,'g1')===75&&truth.actualSaved(state,'g2')===25,'Goal reallocation');
}

// Resolution may confirm a smaller amount and leaves the remainder as historical evidence.
{
  const state=base([goal('g1',100)],[wallet('w1',60),wallet('w2',60)]);truth.captureLegacyPreflight(state,deps,140);const issue=truth.pendingIssues(state)[0];assert(issue&&truth.actualSaved(state,'g1')===0,'Issue seed');const result=truth.resolveIssue(state,issue.id,{allocations:[{locationId:'w1',amount:50}]},'member-anna',deps,150);assert(result.ok&&truth.actualSaved(state,'g1')===50,'Issue resolution');assert(result.issue.resolution.legacyClaimAmount===100,'Legacy evidence lost');
}

// Archived goal allocations remain classified.
{
  const state=base([goal('g1',40,'archived')],[wallet('w1',100)]);truth.captureLegacyPreflight(state,deps,160);assert(truth.actualSaved(state,'g1')===40,'Archived allocation released');assert(state.savingsGoals[0].status==='archived','Archived goal restored');
}

console.log(JSON.stringify({status:'PASS',marker:'PF08A_WAVE1B_SAVINGS_TRUTH_DOMAIN_PASS',cases_a_h:true,idempotent:true,history_not_duplicated:true,no_partial_migration:true,capital_classification_only:true,split_locations:true,reconciliation:true,archived_preserved:true},null,2));
require('./fp84-goal-reconciliation-domain-smoke.cjs');
