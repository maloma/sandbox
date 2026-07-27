(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FamilyPilotSavingsTruth=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const VERSION='savings-purpose-allocation-v1';
  const MAX_AMOUNT=9999999.99;
  const round=value=>Math.round((Number(value)||0)*100)/100;
  const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const makeId=(prefix='id',at=Date.now())=>`${prefix}-${Number(at).toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  const active=item=>item&&item.status!=='inactive'&&item.status!=='reversed';
  const goalById=(state,id)=>(state.savingsGoals||[]).find(item=>String(item.id)===String(id))||null;
  const walletById=(state,id)=>(state.wallets||[]).find(item=>String(item.id)===String(id))||null;
  const purposeGoal=id=>String(id||'').startsWith('purpose:')?String(id).slice(8):'';

  function ensure(state){
    if(!state||typeof state!=='object')throw new Error('FamilyPilot state is required');
    state.purposeAllocations=Array.isArray(state.purposeAllocations)?state.purposeAllocations.filter(Boolean):[];
    state.purposeAllocationEvents=Array.isArray(state.purposeAllocationEvents)?state.purposeAllocationEvents.filter(Boolean):[];
    state.savingsLegacyReconciliationIssues=Array.isArray(state.savingsLegacyReconciliationIssues)?state.savingsLegacyReconciliationIssues.filter(Boolean):[];
    state.savingsPurposeMigrationResults=Array.isArray(state.savingsPurposeMigrationResults)?state.savingsPurposeMigrationResults.filter(Boolean):[];
    state.savingsPurposeMigrationSnapshots=Array.isArray(state.savingsPurposeMigrationSnapshots)?state.savingsPurposeMigrationSnapshots.filter(Boolean):[];
    state.schemaVersion=Math.max(21,finite(state.schemaVersion));
    return state;
  }

  function eligibleLocations(state){
    return(state.wallets||[]).filter(wallet=>wallet&&!wallet.archivedAt&&wallet.includedInHouseholdCapital===true&&wallet.moneyForm!=='investment'&&!String(wallet.type||'').includes('investment'));
  }

  function assignment(state,goalId){return(state.purposeLocationAssignments||[]).find(item=>String(item.goalId)===String(goalId)&&item.status!=='inactive')||null}
  function assignmentProvenance(item){return['user_confirmed','execution_confirmed','auto_fallback','unknown'].includes(item?.provenance)?item.provenance:'unknown'}
  function trustedLocation(state,goalId){
    const eligible=eligibleLocations(state),item=assignment(state,goalId),wallet=item&&eligible.find(row=>row.id===item.locationId),provenance=assignmentProvenance(item);
    if(wallet&&['user_confirmed','execution_confirmed'].includes(provenance))return{wallet,provenance};
    if(eligible.length===1)return{wallet:eligible[0],provenance:'only_eligible_location'};
    return{wallet:null,provenance:item?provenance:'unknown'};
  }

  function locationBalance(state,locationId,deps={}){
    const scoped=deps.scope?.walletCapitalSnapshot?.(state,locationId)?.capital;
    if(Number.isFinite(Number(scoped)))return round(scoped);
    const wallet=walletById(state,locationId);if(!wallet)return 0;
    let value=round(wallet.openingBalance);
    for(const operation of state.operations||[]){if(operation?.status!=='active'||operation.walletId!==locationId)continue;const amount=round(operation.amount);if(operation.kind==='income'||operation.kind==='debt_inflow')value=round(value+amount);if(operation.kind==='expense'||operation.kind==='debt_outflow')value=round(value-amount)}
    for(const transfer of state.walletTransfers||[]){if(!active(transfer))continue;if(transfer.sourceWalletId===locationId)value=round(value-round(transfer.amount));if(transfer.destinationWalletId===locationId)value=round(value+round(transfer.amount))}
    for(const adjustment of state.balanceAdjustments||[])if(active(adjustment)&&adjustment.walletId===locationId)value=round(value+round(adjustment.delta));
    return value;
  }

  function normalizeAllocation(raw,at=Date.now()){
    return{id:String(raw?.id||makeId('purpose-allocation',at)),goalId:String(raw?.goalId||''),locationId:String(raw?.locationId||''),amount:Math.max(0,round(raw?.amount)),status:raw?.status==='inactive'?'inactive':'active',createdAt:finite(raw?.createdAt,at),createdByMemberId:String(raw?.createdByMemberId||'member-anna'),updatedAt:finite(raw?.updatedAt,raw?.createdAt||at),updatedByMemberId:String(raw?.updatedByMemberId||raw?.createdByMemberId||'member-anna'),source:String(raw?.source||'manual_reconciliation'),version:1};
  }
  function normalizeEvent(raw,at=Date.now()){
    return{id:String(raw?.id||makeId('purpose-allocation-event',at)),allocationId:String(raw?.allocationId||''),goalId:String(raw?.goalId||''),locationId:String(raw?.locationId||''),amountDelta:round(raw?.amountDelta),balanceBefore:Math.max(0,round(raw?.balanceBefore)),balanceAfter:Math.max(0,round(raw?.balanceAfter)),reason:String(raw?.reason||'manual_reconciliation'),linkedEconomicEventId:String(raw?.linkedEconomicEventId||''),linkedSavingsTransferId:String(raw?.linkedSavingsTransferId||''),linkedWalletTransferId:String(raw?.linkedWalletTransferId||''),migrationKey:String(raw?.migrationKey||''),occurredAt:finite(raw?.occurredAt,at),createdAt:finite(raw?.createdAt,at),createdByMemberId:String(raw?.createdByMemberId||'member-anna'),reversalOfEventId:String(raw?.reversalOfEventId||''),status:raw?.status==='reversed'?'reversed':'active'};
  }
  function normalizeIssue(raw,at=Date.now()){
    return{id:String(raw?.id||makeId('savings-reconciliation',at)),goalId:String(raw?.goalId||''),legacyClaimAmount:Math.max(0,round(raw?.legacyClaimAmount)),derivedAllocationAmount:Math.max(0,round(raw?.derivedAllocationAmount)),unverifiedAmount:Math.max(0,round(raw?.unverifiedAmount)),preferredLocationId:String(raw?.preferredLocationId||''),availableByLocationSnapshot:Array.isArray(raw?.availableByLocationSnapshot)?raw.availableByLocationSnapshot:[],reason:String(raw?.reason||'legacy_conflict'),status:['resolved','dismissed','superseded'].includes(raw?.status)?raw.status:'pending',resolution:raw?.resolution||null,createdAt:finite(raw?.createdAt,at),updatedAt:finite(raw?.updatedAt,raw?.createdAt||at),resolvedAt:raw?.resolvedAt==null?null:finite(raw.resolvedAt,at),resolvedByMemberId:String(raw?.resolvedByMemberId||''),migrationKey:String(raw?.migrationKey||'')};
  }

  function normalizeContainers(state,at=Date.now()){
    ensure(state);
    state.purposeAllocations=state.purposeAllocations.map(item=>normalizeAllocation(item,at));
    state.purposeAllocationEvents=state.purposeAllocationEvents.map(item=>normalizeEvent(item,at));
    state.savingsLegacyReconciliationIssues=state.savingsLegacyReconciliationIssues.map(item=>normalizeIssue(item,at));
    return state;
  }

  function allocationsForGoal(state,goalId){ensure(state);return state.purposeAllocations.filter(item=>active(item)&&item.goalId===String(goalId)&&item.amount>0)}
  function allocationsAtLocation(state,locationId){ensure(state);return state.purposeAllocations.filter(item=>active(item)&&item.locationId===String(locationId)&&item.amount>0)}
  function actualSaved(state,goalId){return round(allocationsForGoal(state,goalId).reduce((sum,item)=>sum+item.amount,0))}
  function allocatedAtLocation(state,locationId){return round(allocationsAtLocation(state,locationId).reduce((sum,item)=>sum+item.amount,0))}
  function rawUnallocatedAtLocation(state,locationId,deps={}){return round(locationBalance(state,locationId,deps)-allocatedAtLocation(state,locationId))}
  function spendableUnallocatedAtLocation(state,locationId,deps={}){return Math.max(0,rawUnallocatedAtLocation(state,locationId,deps))}
  function breakdown(state,goalId){return allocationsForGoal(state,goalId).map(item=>({...clone(item),location:walletById(state,item.locationId)?.name||'Место недоступно'}))}

  function syncGoalCaches(state){ensure(state);for(const goal of state.savingsGoals||[])goal.savedAmount=actualSaved(state,goal.id);return state}

  function availableSnapshot(state,deps={}){return eligibleLocations(state).map(wallet=>({locationId:wallet.id,name:wallet.name,balance:locationBalance(state,wallet.id,deps),allocated:allocatedAtLocation(state,wallet.id),rawAvailable:rawUnallocatedAtLocation(state,wallet.id,deps),available:spendableUnallocatedAtLocation(state,wallet.id,deps)}))}

  function existingPair(state,goalId,locationId){return state.purposeAllocations.find(item=>active(item)&&item.goalId===String(goalId)&&item.locationId===String(locationId))||null}
  function appendEvent(state,allocation,before,after,input={},actorId='member-anna',at=Date.now()){
    const event=normalizeEvent({id:input.id||makeId('purpose-allocation-event',at),allocationId:allocation.id,goalId:allocation.goalId,locationId:allocation.locationId,amountDelta:round(after-before),balanceBefore:before,balanceAfter:after,reason:input.reason||'manual_reconciliation',linkedEconomicEventId:input.linkedEconomicEventId,linkedSavingsTransferId:input.linkedSavingsTransferId,linkedWalletTransferId:input.linkedWalletTransferId,migrationKey:input.migrationKey,occurredAt:input.occurredAt||at,createdAt:at,createdByMemberId:actorId,reversalOfEventId:input.reversalOfEventId},at);state.purposeAllocationEvents.push(event);return event;
  }

  function changeAllocation(state,input,actorId='member-anna',deps={},at=Date.now()){
    normalizeContainers(state,at);const goal=goalById(state,input?.goalId),wallet=eligibleLocations(state).find(item=>item.id===String(input?.locationId||'')),delta=round(input?.delta);
    if(!goal)return{ok:false,error:'Цель накопления не найдена.'};
    if(!wallet)return{ok:false,error:'Выберите действующее место хранения наличных или банковских денег.'};
    if(!Number.isFinite(delta)||Math.abs(delta)<.005)return{ok:false,error:'Укажите сумму больше нуля.'};
    let allocation=existingPair(state,goal.id,wallet.id);const before=round(allocation?.amount||0),after=round(before+delta);
    if(after<-.005||after>MAX_AMOUNT)return{ok:false,error:'Недостаточно денег, назначенных этой цели.'};
    if(delta>0&&delta>spendableUnallocatedAtLocation(state,wallet.id,deps)+.005)return{ok:false,error:`В месте «${wallet.name}» недостаточно свободных денег.`};
    if(!allocation){allocation=normalizeAllocation({goalId:goal.id,locationId:wallet.id,amount:0,source:input?.source||'manual_reconciliation',createdAt:at,createdByMemberId:actorId},at);state.purposeAllocations.push(allocation)}
    allocation.amount=Math.max(0,after);allocation.status=allocation.amount>.005?'active':'inactive';allocation.updatedAt=at;allocation.updatedByMemberId=actorId;allocation.source=String(input?.source||allocation.source||'manual_reconciliation');
    const event=appendEvent(state,allocation,before,allocation.amount,input,actorId,at);syncGoalCaches(state);return{ok:true,allocation,event,before,after:allocation.amount};
  }

  function snapshotTransaction(state){return clone({purposeAllocations:state.purposeAllocations||[],purposeAllocationEvents:state.purposeAllocationEvents||[],savingsLegacyReconciliationIssues:state.savingsLegacyReconciliationIssues||[],savingsPurposeMigrationResults:state.savingsPurposeMigrationResults||[],savingsPurposeMigrationSnapshots:state.savingsPurposeMigrationSnapshots||[],goalCaches:(state.savingsGoals||[]).map(goal=>({id:goal.id,savedAmount:goal.savedAmount}))})}
  function restoreTransaction(state,snapshot){state.purposeAllocations=snapshot.purposeAllocations;state.purposeAllocationEvents=snapshot.purposeAllocationEvents;state.savingsLegacyReconciliationIssues=snapshot.savingsLegacyReconciliationIssues;state.savingsPurposeMigrationResults=snapshot.savingsPurposeMigrationResults;state.savingsPurposeMigrationSnapshots=snapshot.savingsPurposeMigrationSnapshots;for(const cache of snapshot.goalCaches){const goal=goalById(state,cache.id);if(goal)goal.savedAmount=cache.savedAmount}}

  function allocateExisting(state,input,actorId='member-anna',deps={},at=Date.now()){return changeAllocation(state,{...input,delta:Math.abs(round(input?.amount)),reason:input?.reason||'manual_reconciliation',source:input?.source||'manual_reconciliation'},actorId,deps,at)}
  function release(state,input,actorId='member-anna',deps={},at=Date.now()){return changeAllocation(state,{...input,delta:-Math.abs(round(input?.amount)),reason:input?.reason||'release',source:input?.source||'release'},actorId,deps,at)}

  function reallocate(state,input,actorId='member-anna',deps={},at=Date.now()){
    const amount=Math.abs(round(input?.amount));if(!amount)return{ok:false,error:'Укажите сумму больше нуля.'};const snapshot=snapshotTransaction(state);
    const out=release(state,{goalId:input?.sourceGoalId,locationId:input?.sourceLocationId,amount,reason:'reallocation_out',linkedEconomicEventId:input?.linkedEconomicEventId},actorId,deps,at);if(!out.ok)return out;
    const into=allocateExisting(state,{goalId:input?.destinationGoalId,locationId:input?.destinationLocationId||input?.sourceLocationId,amount,reason:'reallocation_in',linkedEconomicEventId:input?.linkedEconomicEventId},actorId,deps,at);if(!into.ok){restoreTransaction(state,snapshot);return into}
    return{ok:true,sourceEvent:out.event,destinationEvent:into.event};
  }

  function reverseEvent(state,eventId,actorId='member-anna',deps={},at=Date.now()){
    normalizeContainers(state,at);const original=state.purposeAllocationEvents.find(item=>item.id===eventId&&item.status==='active');if(!original)return{ok:false,error:'Изменение назначения не найдено или уже отменено.'};
    const newer=state.purposeAllocationEvents.some(item=>item.status==='active'&&item.allocationId===original.allocationId&&item.createdAt>original.createdAt);if(newer)return{ok:false,error:'После этого изменения уже есть более новые действия. Используйте новое компенсирующее изменение.'};
    const result=changeAllocation(state,{goalId:original.goalId,locationId:original.locationId,delta:-original.amountDelta,reason:'reversal',reversalOfEventId:original.id},actorId,deps,at);if(!result.ok)return result;original.status='reversed';return{...result,reversedEvent:original};
  }

  function validHistory(state,goalId){
    const rows=[],seen=new Set(),errors=[];
    for(const transfer of state.savingsTransfers||[]){if(!active(transfer))continue;const id=String(transfer.id||'');if(!id||seen.has(id)){errors.push('duplicate_or_missing_transfer_id');continue}seen.add(id);const amount=round(transfer.amount);if(!Number.isFinite(amount)||amount<=0){errors.push('invalid_transfer_amount');continue}const sourceGoal=purposeGoal(transfer.sourceAccountId),destinationGoal=purposeGoal(transfer.destinationAccountId);if(sourceGoal!==String(goalId)&&destinationGoal!==String(goalId))continue;rows.push({transfer,delta:destinationGoal===String(goalId)?amount:-amount})}
    rows.sort((a,b)=>finite(a.transfer.effectiveDate,a.transfer.createdAt)-finite(b.transfer.effectiveDate,b.transfer.createdAt));let running=0;for(const row of rows){running=round(running+row.delta);if(running<-.005)errors.push('negative_transfer_history')}
    return{rows,amount:Math.max(0,running),errors:[...new Set(errors)]};
  }

  function issueFor(state,goalId){return state.savingsLegacyReconciliationIssues.find(item=>item.goalId===String(goalId)&&item.status==='pending')||null}
  function createIssue(state,input,at=Date.now()){
    let issue=issueFor(state,input.goalId);if(issue)return issue;
    issue=normalizeIssue({...input,id:makeId('savings-reconciliation',at),status:'pending',createdAt:at,updatedAt:at},at);state.savingsLegacyReconciliationIssues.push(issue);return issue;
  }

  function createMigrationAllocation(state,goalId,locationId,amount,reason,migrationKey,actorId,deps,at,linkedTransferId=''){
    if(amount<=.005)return{ok:true,unchanged:true};return changeAllocation(state,{goalId,locationId,delta:amount,reason,source:reason,linkedSavingsTransferId:linkedTransferId,migrationKey},actorId,deps,at);
  }

  function migrateGoal(state,goal,rawSnapshot,deps={},at=Date.now()){
    const migrationKey=`${VERSION}:${goal.id}`,existing=state.savingsPurposeMigrationResults.find(item=>item.migrationKey===migrationKey);if(existing){syncGoalCaches(state);return existing}
    const legacy=Math.max(0,round(rawSnapshot.legacySavedAmount)),history=validHistory(state,goal.id),trust=trustedLocation(state,goal.id),createdAllocationIds=[],createdEventIds=[];let historyAmount=0,issue=null,result='no_legacy_value',baseline=0;
    const transaction=snapshotTransaction(state);
    try{
      if(history.errors.length){issue=createIssue(state,{goalId:goal.id,legacyClaimAmount:legacy,derivedAllocationAmount:0,unverifiedAmount:legacy,preferredLocationId:trust.wallet?.id||'',availableByLocationSnapshot:availableSnapshot(state,deps),reason:`invalid_transfer_history:${history.errors.join(',')}`,migrationKey},at);result='pending_conflict'}
      else{
        for(const row of history.rows){
          const locationId=String(row.transfer.destinationLocationId||row.transfer.sourceLocationId||trust.wallet?.id||'');const wallet=eligibleLocations(state).find(item=>item.id===locationId);
          if(!wallet){issue=createIssue(state,{goalId:goal.id,legacyClaimAmount:legacy,derivedAllocationAmount:historyAmount,unverifiedAmount:Math.max(0,legacy-historyAmount),preferredLocationId:locationId,availableByLocationSnapshot:availableSnapshot(state,deps),reason:'history_location_ineligible',migrationKey},at);result='pending_conflict';break}
          const change=row.delta>0?createMigrationAllocation(state,goal.id,wallet.id,row.delta,'transfer_history',migrationKey,rawSnapshot.actorId,deps,at,row.transfer.id):release(state,{goalId:goal.id,locationId:wallet.id,amount:Math.abs(row.delta),reason:'transfer_history',migrationKey,linkedSavingsTransferId:row.transfer.id},rawSnapshot.actorId,deps,at);
          if(!change.ok){issue=createIssue(state,{goalId:goal.id,legacyClaimAmount:legacy,derivedAllocationAmount:actualSaved(state,goal.id),unverifiedAmount:Math.max(0,legacy-actualSaved(state,goal.id)),preferredLocationId:wallet.id,availableByLocationSnapshot:availableSnapshot(state,deps),reason:'history_replay_failed',migrationKey},at);result='pending_conflict';break}
          if(change.allocation)createdAllocationIds.push(change.allocation.id);if(change.event)createdEventIds.push(change.event.id);
        }
        historyAmount=actualSaved(state,goal.id);
        if(!issue){
          const residual=round(legacy-historyAmount);
          if(residual<-.005){issue=createIssue(state,{goalId:goal.id,legacyClaimAmount:legacy,derivedAllocationAmount:historyAmount,unverifiedAmount:0,preferredLocationId:trust.wallet?.id||'',availableByLocationSnapshot:availableSnapshot(state,deps),reason:'history_exceeds_legacy',migrationKey},at);result='pending_conflict'}
          else if(residual>.005){
            if(!trust.wallet){issue=createIssue(state,{goalId:goal.id,legacyClaimAmount:legacy,derivedAllocationAmount:historyAmount,unverifiedAmount:residual,preferredLocationId:assignment(state,goal.id)?.locationId||'',availableByLocationSnapshot:availableSnapshot(state,deps),reason:'location_untrusted',migrationKey},at);result='pending_conflict'}
            else if(rawUnallocatedAtLocation(state,trust.wallet.id,deps)<residual-.005){issue=createIssue(state,{goalId:goal.id,legacyClaimAmount:legacy,derivedAllocationAmount:historyAmount,unverifiedAmount:residual,preferredLocationId:trust.wallet.id,availableByLocationSnapshot:availableSnapshot(state,deps),reason:rawUnallocatedAtLocation(state,trust.wallet.id,deps)<0?'location_overallocated':'insufficient_real_money',migrationKey},at);result='pending_conflict'}
            else{const change=createMigrationAllocation(state,goal.id,trust.wallet.id,residual,'legacy_baseline',migrationKey,rawSnapshot.actorId,deps,at);if(!change.ok)throw Error(change.error);baseline=residual;createdAllocationIds.push(change.allocation.id);createdEventIds.push(change.event.id);result=historyAmount>0?'migrated_from_history':'migrated'}
          }else result=historyAmount>0?'migrated_from_history':'no_legacy_value';
        }
      }
      const record={goalId:String(goal.id),migrationKey,legacySavedAmount:legacy,historyDerivedAmount:historyAmount,baselineAmount:baseline,canonicalAmount:actualSaved(state,goal.id),assignmentProvenance:trust.provenance,result,createdAllocationIds:[...new Set(createdAllocationIds)],createdEventIds:[...new Set(createdEventIds)],issueId:issue?.id||'',completedAt:at};state.savingsPurposeMigrationResults.push(record);syncGoalCaches(state);return record;
    }catch(error){restoreTransaction(state,transaction);throw error}
  }

  function captureLegacyPreflight(state,deps={},at=Date.now()){
    normalizeContainers(state,at);const snapshotKey=`${VERSION}:preflight`,existing=state.savingsPurposeMigrationSnapshots.find(item=>item.snapshotKey===snapshotKey);
    const snapshot=existing||{snapshotKey,createdAt:at,goals:(state.savingsGoals||[]).map(goal=>({goalId:String(goal.id),status:goal.status||'active',legacySavedAmount:Math.max(0,round(goal.savedAmount)),rawAssignment:clone(assignment(state,goal.id)),actorId:String(goal.updatedByMemberId||goal.createdByMemberId||state.currentMemberId||'member-anna')})),rawAssignments:clone(state.purposeLocationAssignments||[])};
    if(!existing)state.savingsPurposeMigrationSnapshots.push(snapshot);
    for(const raw of snapshot.goals){const goal=goalById(state,raw.goalId);if(goal)migrateGoal(state,goal,raw,deps,at)}
    syncGoalCaches(state);return{ok:true,snapshot,results:clone(state.savingsPurposeMigrationResults),issues:pendingIssues(state)};
  }

  function normalizeState(state,deps={},at=Date.now()){captureLegacyPreflight(state,deps,at);syncGoalCaches(state);return state}
  function pendingIssues(state){ensure(state);return state.savingsLegacyReconciliationIssues.filter(item=>item.status==='pending').map(clone)}
  function issueStatus(state,goalId){const issue=issueFor(state,goalId);return issue?clone(issue):null}

  function resolveIssue(state,issueId,input,actorId='member-anna',deps={},at=Date.now()){
    normalizeContainers(state,at);const issue=state.savingsLegacyReconciliationIssues.find(item=>item.id===issueId&&item.status==='pending');if(!issue)return{ok:false,error:'Сверка не найдена или уже завершена.'};
    if(input?.mode==='accept_canonical'){issue.status='resolved';issue.resolution={mode:'accept_canonical',canonicalAmount:actualSaved(state,issue.goalId)};issue.resolvedAt=at;issue.resolvedByMemberId=actorId;issue.updatedAt=at;return{ok:true,issue}}
    const rows=(Array.isArray(input?.allocations)?input.allocations:[]).map(row=>({locationId:String(row.locationId||''),amount:Math.max(0,round(row.amount))})).filter(row=>row.amount>.005);const total=round(rows.reduce((sum,row)=>sum+row.amount,0));
    if(total<0||total>issue.unverifiedAmount+.005)return{ok:false,error:`Можно подтвердить не более ${issue.unverifiedAmount.toFixed(2)}.`};
    const snapshot=snapshotTransaction(state),events=[];
    for(const row of rows){const result=allocateExisting(state,{goalId:issue.goalId,locationId:row.locationId,amount:row.amount,reason:'manual_reconciliation',source:'manual_reconciliation',migrationKey:issue.migrationKey},actorId,deps,at);if(!result.ok){restoreTransaction(state,snapshot);return result}events.push(result.event)}
    issue.status='resolved';issue.resolution={mode:'confirmed_allocations',allocations:rows,total,legacyClaimAmount:issue.legacyClaimAmount,canonicalAmount:actualSaved(state,issue.goalId)};issue.resolvedAt=at;issue.resolvedByMemberId=actorId;issue.updatedAt=at;syncGoalCaches(state);return{ok:true,issue,events};
  }

  function markAssignment(state,goalId,locationId,provenance='user_confirmed',actorId='member-anna',at=Date.now()){
    state.purposeLocationAssignments=Array.isArray(state.purposeLocationAssignments)?state.purposeLocationAssignments:[];let item=assignment(state,goalId);
    if(!item){item={goalId:String(goalId),locationId:String(locationId),status:'active',protectionMode:'logical',updatedAt:at,updatedByMemberId:actorId,provenance};state.purposeLocationAssignments.push(item)}else Object.assign(item,{locationId:String(locationId),provenance,status:'active',updatedAt:at,updatedByMemberId:actorId});return item;
  }

  function audit(state){ensure(state);const directCacheMismatches=(state.savingsGoals||[]).filter(goal=>Math.abs(round(goal.savedAmount)-actualSaved(state,goal.id))>.005).map(goal=>goal.id),overallocated=eligibleLocations(state).map(wallet=>({locationId:wallet.id,raw:rawUnallocatedAtLocation(state,wallet.id)})).filter(item=>item.raw<-.005);return{singleTruth:directCacheMismatches.length===0,directCacheMismatches,overallocated,pendingIssues:pendingIssues(state).length,allocations:clone(state.purposeAllocations),events:clone(state.purposeAllocationEvents)}}

  return Object.freeze({VERSION,MAX_AMOUNT,ensure,eligibleLocations,assignmentProvenance,trustedLocation,locationBalance,normalizeState,captureLegacyPreflight,actualSaved,allocatedAtLocation,rawUnallocatedAtLocation,spendableUnallocatedAtLocation,breakdown,syncGoalCaches,availableSnapshot,allocateExisting,release,reallocate,reverseEvent,pendingIssues,issueStatus,resolveIssue,markAssignment,audit,changeAllocation});
});
