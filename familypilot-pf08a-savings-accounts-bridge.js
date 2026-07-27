(()=>{
  'use strict';
  if(window.__FP_SAVINGS_TRUTH_ACCOUNTS_BRIDGE__)return;
  const original=window.FamilyPilotSavingsAccounts,truth=window.FamilyPilotSavingsTruth,runtime=window.__FP_RUNTIME__;
  if(!original||!truth||!runtime){window.__FP_SAVINGS_TRUTH_ACCOUNTS_BRIDGE_ERROR__='Savings truth account dependencies are unavailable';return}
  window.__FP_SAVINGS_TRUTH_ACCOUNTS_BRIDGE__=true;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const round=value=>Math.round((Number(value)||0)*100)/100;
  const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const makeId=(prefix='id',at=Date.now())=>`${prefix}-${Number(at).toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  const goalId=id=>String(id||'').startsWith('purpose:')?String(id).slice(8):'';
  const isPurpose=id=>Boolean(goalId(id));
  const scopeDeps=()=>({scope:runtime.scopeApi});
  const transactionKeys=['purposeAllocations','purposeAllocationEvents','savingsLegacyReconciliationIssues','savingsPurposeMigrationResults','savingsPurposeMigrationSnapshots','savingsTransfers','investmentAccounts','investmentValuations'];
  function snapshot(state){const data={};for(const key of transactionKeys)data[key]=clone(state[key]||[]);data.goalCaches=(state.savingsGoals||[]).map(goal=>({id:goal.id,savedAmount:goal.savedAmount}));return data}
  function restore(state,data){for(const key of transactionKeys)state[key]=data[key];for(const cache of data.goalCaches){const goal=(state.savingsGoals||[]).find(item=>item.id===cache.id);if(goal)goal.savedAmount=cache.savedAmount}}
  function normalizeState(state,at=Date.now()){truth.captureLegacyPreflight(state,scopeDeps(),at);original.normalizeState(state,at);truth.syncGoalCaches(state);return state}
  function preferredLocation(state,purposeAccountId,explicit=''){
    const id=goalId(purposeAccountId),eligible=truth.eligibleLocations(state);if(explicit&&eligible.some(item=>item.id===explicit))return explicit;
    const assigned=(state.purposeLocationAssignments||[]).find(item=>item.goalId===id&&item.status!=='inactive');if(assigned&&eligible.some(item=>item.id===assigned.locationId))return assigned.locationId;
    const breakdown=truth.breakdown(state,id);if(breakdown.length===1&&eligible.some(item=>item.id===breakdown[0].locationId))return breakdown[0].locationId;
    return eligible.length===1?eligible[0].id:'';
  }
  function pushTransfer(state,input,actorId,at){state.savingsTransfers=Array.isArray(state.savingsTransfers)?state.savingsTransfers:[];const transfer={id:makeId('savings-transfer',at),sourceAccountId:String(input.sourceAccountId),destinationAccountId:String(input.destinationAccountId),amount:round(input.amount),currency:String(input.currency||state.household?.baseCurrency||'EUR'),effectiveDate:finite(input.effectiveDate,at),note:String(input.note||'').trim(),status:'active',createdAt:at,createdByMemberId:String(actorId||'member-anna'),economicEventId:String(input.economicEventId||''),sourceLocationId:String(input.sourceLocationId||''),destinationLocationId:String(input.destinationLocationId||''),purposeAllocationEventIds:(input.purposeAllocationEventIds||[]).map(String)};state.savingsTransfers.push(transfer);return transfer}
  function createTransfer(state,input,baseCapital=0,actorId='member-anna',at=Date.now()){
    normalizeState(state,at);const sourceAccountId=String(input?.sourceAccountId||''),destinationAccountId=String(input?.destinationAccountId||''),amount=round(input?.amount),effectiveDate=finite(input?.effectiveDate,NaN);
    if(!sourceAccountId||!destinationAccountId)return{ok:false,error:'Выберите оба счёта.'};
    if(sourceAccountId===destinationAccountId)return{ok:false,error:'Счета должны отличаться.'};
    if(!Number.isFinite(amount)||amount<=0||amount>original.MAX_AMOUNT)return{ok:false,error:'Укажите сумму больше нуля.'};
    if(!Number.isFinite(effectiveDate))return{ok:false,error:'Укажите дату перевода.'};
    const source=original.accountById(state,sourceAccountId,baseCapital),destination=original.accountById(state,destinationAccountId,baseCapital);if(!source||!destination)return{ok:false,error:'Один из счетов не найден.'};
    if(!isPurpose(sourceAccountId)&&!isPurpose(destinationAccountId)){const result=original.createTransfer(state,input,baseCapital,actorId,at);truth.syncGoalCaches(state);return result}
    if(source.type==='investment'||destination.type==='investment')return{ok:false,error:'Перевод между инвестиционным счётом и назначением денег требует отдельного подтверждённого вывода и пока недоступен.'};
    const economicEventId=String(input?.economicEventId||makeId('savings-economic-event',at)),data=snapshot(state),events=[];let result;
    try{
      if(sourceAccountId===original.OPERATING_ACCOUNT_ID&&isPurpose(destinationAccountId)){
        const locationId=preferredLocation(state,destinationAccountId,input?.destinationLocationId);if(!locationId)return{ok:false,error:'Выберите, где реально находятся деньги для этой цели.'};
        result=truth.allocateExisting(state,{goalId:goalId(destinationAccountId),locationId,amount,reason:input?.reason||'savings_execution',source:'savings_execution',linkedEconomicEventId:economicEventId,occurredAt:effectiveDate},actorId,scopeDeps(),at);if(!result.ok)return result;events.push(result.event);
      }else if(isPurpose(sourceAccountId)&&destinationAccountId===original.OPERATING_ACCOUNT_ID){
        const locationId=preferredLocation(state,sourceAccountId,input?.sourceLocationId);if(!locationId)return{ok:false,error:'Выберите, из какого места снимается назначение.'};
        result=truth.release(state,{goalId:goalId(sourceAccountId),locationId,amount,reason:input?.reason||'release',linkedEconomicEventId:economicEventId,occurredAt:effectiveDate},actorId,scopeDeps(),at);if(!result.ok)return result;events.push(result.event);
      }else if(isPurpose(sourceAccountId)&&isPurpose(destinationAccountId)){
        const sourceLocationId=preferredLocation(state,sourceAccountId,input?.sourceLocationId),destinationLocationId=preferredLocation(state,destinationAccountId,input?.destinationLocationId||sourceLocationId);if(!sourceLocationId||!destinationLocationId)return{ok:false,error:'Выберите места хранения для перераспределения.'};
        result=truth.reallocate(state,{sourceGoalId:goalId(sourceAccountId),destinationGoalId:goalId(destinationAccountId),sourceLocationId,destinationLocationId,amount,linkedEconomicEventId:economicEventId},actorId,scopeDeps(),at);if(!result.ok)return result;events.push(result.sourceEvent,result.destinationEvent);
      }else return{ok:false,error:'Неподдерживаемое направление перевода.'};
      const transfer=pushTransfer(state,{...input,amount,effectiveDate,economicEventId,purposeAllocationEventIds:events.map(event=>event.id)},actorId,at);for(const event of events)event.linkedSavingsTransferId=transfer.id;truth.syncGoalCaches(state);return{ok:true,transfer,purposeAllocationEvents:events,economicEventId};
    }catch(error){restore(state,data);return{ok:false,error:String(error?.message||error)}}
  }
  const api=Object.freeze({...original,normalizeState,createTransfer,truth});
  window.FamilyPilotSavingsAccounts=api;
  truth.captureLegacyPreflight(runtime.state,scopeDeps(),runtime.now());runtime.save();
})();
