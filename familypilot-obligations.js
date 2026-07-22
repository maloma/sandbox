(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FamilyPilotObligations=api;
  if(root&&root.document){
    const style=root.document.createElement('style');
    style.id='familypilot-m3-02-privacy-style';
    style.textContent='#obligationSummary{display:none!important}';
    root.document.head.appendChild(style);
    const load=()=>{
      if(root.document.querySelector('script[data-fp-m3-02-ui]'))return;
      const script=root.document.createElement('script');
      script.src='./familypilot-obligations-ui-v2.js';
      script.dataset.fpM302Ui='true';
      root.document.body.appendChild(script);
    };
    if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',load,{once:true});
    else setTimeout(load,0);
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const DAY=86400000;
  const ACTIVE_OPERATION='active';
  const MAX_OCCURRENCES=720;
  const terminalStatuses=new Set(['paid','skipped','cancelled']);
  const intervalUnits=new Set(['day','week','month','year']);
  const endingModes=new Set(['unlimited','count','untilDate']);

  function makeId(prefix='id',at=Date.now()){
    return `${prefix}-${Number(at).toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  }

  function asNumber(value,fallback=0){
    const n=Number(value);
    return Number.isFinite(n)?n:fallback;
  }

  function positiveInt(value,fallback=1,max=MAX_OCCURRENCES){
    const n=Math.trunc(asNumber(value,fallback));
    return Math.max(1,Math.min(max,n));
  }

  function startOfDay(value){
    const d=new Date(value);
    return new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime();
  }

  function startOfMonth(value){
    const d=new Date(value);
    return new Date(d.getFullYear(),d.getMonth(),1).getTime();
  }

  function addCalendarDays(value,count){
    const d=new Date(value);
    return new Date(d.getFullYear(),d.getMonth(),d.getDate()+count).getTime();
  }

  function addMonths(value,count=1){
    const source=new Date(value);
    const day=source.getDate();
    const target=new Date(source.getFullYear(),source.getMonth()+count,1);
    const last=new Date(target.getFullYear(),target.getMonth()+1,0).getDate();
    target.setDate(Math.min(day,last));
    return target.getTime();
  }

  function addYears(value,count=1){
    const source=new Date(value);
    const month=source.getMonth();
    const day=source.getDate();
    const target=new Date(source.getFullYear()+count,month,1);
    const last=new Date(target.getFullYear(),month+1,0).getDate();
    target.setDate(Math.min(day,last));
    return target.getTime();
  }

  function addInterval(value,intervalValue=1,intervalUnit='month'){
    const count=positiveInt(intervalValue,1);
    if(intervalUnit==='day')return addCalendarDays(value,count);
    if(intervalUnit==='week')return addCalendarDays(value,count*7);
    if(intervalUnit==='year')return addYears(value,count);
    return addMonths(value,count);
  }

  function normalizeHistory(value){
    return Array.isArray(value)?value:[];
  }

  function normalizeAmountVersion(raw,at=Date.now()){
    return{
      id:raw?.id||makeId('obl-amount',at),
      effectiveSequence:positiveInt(raw?.effectiveSequence,1),
      amount:Math.max(0,asNumber(raw?.amount,0)),
      currency:String(raw?.currency||'EUR'),
      createdAt:asNumber(raw?.createdAt,at),
      createdByMemberId:raw?.createdByMemberId||'member-anna',
      source:String(raw?.source||'user')
    };
  }

  function normalizeScheduleVersion(raw,fallback,at=Date.now()){
    const unit=intervalUnits.has(raw?.intervalUnit)?raw.intervalUnit:fallback.intervalUnit;
    return{
      id:raw?.id||makeId('obl-schedule',at),
      effectiveSequence:positiveInt(raw?.effectiveSequence,1),
      firstDueAt:asNumber(raw?.firstDueAt,fallback.firstDueAt),
      intervalValue:positiveInt(raw?.intervalValue,fallback.intervalValue),
      intervalUnit:unit,
      createdAt:asNumber(raw?.createdAt,at),
      createdByMemberId:raw?.createdByMemberId||'member-anna'
    };
  }

  function normalizeRule(raw,at=Date.now()){
    const legacyMonthly=raw?.cadence==='monthly';
    const cadence=raw?.cadence==='once'?'once':(raw?.cadence==='recurring'||legacyMonthly?'recurring':'once');
    const firstDueAt=asNumber(raw?.firstDueAt||raw?.nextDueAt||raw?.dueAt,startOfDay(at));
    const intervalValue=cadence==='recurring'?positiveInt(raw?.intervalValue,1):1;
    const intervalUnit=cadence==='recurring'?(intervalUnits.has(raw?.intervalUnit)?raw.intervalUnit:(legacyMonthly?'month':'month')):'month';
    const endingMode=cadence==='once'?'count':(endingModes.has(raw?.endingMode)?raw.endingMode:'unlimited');
    const paymentCount=cadence==='once'?1:(endingMode==='count'?positiveInt(raw?.paymentCount,1):null);
    const endingDate=endingMode==='untilDate'?asNumber(raw?.endingDate,firstDueAt):null;
    const fallbackSchedule={firstDueAt,intervalValue,intervalUnit};
    const versions=(Array.isArray(raw?.scheduleVersions)&&raw.scheduleVersions.length?raw.scheduleVersions:[{
      effectiveSequence:1,firstDueAt,intervalValue,intervalUnit,createdAt:raw?.createdAt||at,createdByMemberId:raw?.createdByMemberId
    }]).map(version=>normalizeScheduleVersion(version,fallbackSchedule,at)).sort((a,b)=>a.effectiveSequence-b.effectiveSequence||a.createdAt-b.createdAt);
    if(versions[0].effectiveSequence!==1)versions.unshift(normalizeScheduleVersion({effectiveSequence:1},fallbackSchedule,at));
    return{
      id:raw?.id||makeId('obl-rule',at),
      name:String(raw?.name||'Обязательство').trim()||'Обязательство',
      cadence,
      firstDueAt:versions[0].firstDueAt,
      nextDueAt:asNumber(raw?.nextDueAt,firstDueAt),
      intervalValue,
      intervalUnit,
      endingMode,
      paymentCount,
      endingDate,
      amount:Math.max(0,asNumber(raw?.amount,0)),
      currency:String(raw?.currency||'EUR'),
      walletId:String(raw?.walletId||'wallet-household-main'),
      categoryId:String(raw?.categoryId||''),
      note:String(raw?.note||''),
      status:raw?.status==='archived'?'archived':'active',
      archivedAt:raw?.archivedAt==null?null:asNumber(raw.archivedAt,null),
      archivedByMemberId:raw?.archivedByMemberId||null,
      amountVersions:(Array.isArray(raw?.amountVersions)?raw.amountVersions:[]).map(version=>normalizeAmountVersion(version,at)).sort((a,b)=>a.effectiveSequence-b.effectiveSequence||a.createdAt-b.createdAt),
      scheduleVersions:versions,
      createdByMemberId:raw?.createdByMemberId||'member-anna',
      createdAt:asNumber(raw?.createdAt,at),
      lastEditedByMemberId:raw?.lastEditedByMemberId||raw?.createdByMemberId||'member-anna',
      lastEditedAt:asNumber(raw?.lastEditedAt,raw?.createdAt||at),
      revisions:normalizeHistory(raw?.revisions)
    };
  }

  function normalizeOccurrence(raw,at=Date.now()){
    const scheduled=asNumber(raw?.scheduledDueAt||raw?.dueAt,startOfDay(at));
    const status=['planned','paid','skipped','cancelled'].includes(raw?.status)?raw.status:'planned';
    return{
      id:raw?.id||makeId('obl-occ',at),
      ruleId:String(raw?.ruleId||''),
      sequence:positiveInt(raw?.sequence,1),
      scheduledDueAt:scheduled,
      dueAt:asNumber(raw?.dueAt,scheduled),
      movedFromDueAt:raw?.movedFromDueAt==null?null:asNumber(raw.movedFromDueAt,null),
      expectedAmount:Math.max(0,asNumber(raw?.expectedAmount,0)),
      expectedAmountOverride:raw?.expectedAmountOverride==null?null:Math.max(0,asNumber(raw.expectedAmountOverride,0)),
      actualAmount:raw?.actualAmount==null?null:Math.max(0,asNumber(raw.actualAmount,0)),
      currency:String(raw?.currency||'EUR'),
      walletId:String(raw?.walletId||'wallet-household-main'),
      categoryId:String(raw?.categoryId||''),
      status,
      linkedOperationId:raw?.linkedOperationId||null,
      paidAt:raw?.paidAt==null?null:asNumber(raw.paidAt,null),
      postponedAt:raw?.postponedAt==null?null:asNumber(raw.postponedAt,null),
      skippedAt:raw?.skippedAt==null?null:asNumber(raw.skippedAt,null),
      createdAt:asNumber(raw?.createdAt,at),
      lastEditedAt:asNumber(raw?.lastEditedAt,raw?.createdAt||at),
      revisions:normalizeHistory(raw?.revisions)
    };
  }

  function scheduleVersionForSequence(rule,sequence){
    let selected=rule.scheduleVersions[0];
    for(const version of rule.scheduleVersions){
      if(version.effectiveSequence<=sequence)selected=version;
      else break;
    }
    return selected;
  }

  function scheduleDate(rule,sequence){
    const version=scheduleVersionForSequence(rule,sequence);
    const offset=Math.max(0,sequence-version.effectiveSequence);
    if(offset===0)return startOfDay(version.firstDueAt);
    if(version.intervalUnit==='day')return addCalendarDays(version.firstDueAt,version.intervalValue*offset);
    if(version.intervalUnit==='week')return addCalendarDays(version.firstDueAt,version.intervalValue*7*offset);
    if(version.intervalUnit==='year')return addYears(version.firstDueAt,version.intervalValue*offset);
    return addMonths(version.firstDueAt,version.intervalValue*offset);
  }

  function amountForSequence(rule,sequence){
    let amount=rule.amount;
    for(const version of rule.amountVersions){
      if(version.effectiveSequence<=sequence)amount=version.amount;
      else break;
    }
    return amount;
  }

  function sequenceAllowed(rule,sequence,date=scheduleDate(rule,sequence)){
    if(rule.cadence==='once')return sequence===1;
    if(rule.endingMode==='count')return sequence<=positiveInt(rule.paymentCount,1);
    if(rule.endingMode==='untilDate')return startOfDay(date)<=startOfDay(rule.endingDate);
    return true;
  }

  function revision(target,changes,actorId,at=Date.now(),source='user'){
    const actual=changes.filter(change=>String(change.oldValue??'')!==String(change.newValue??''));
    if(!actual.length)return null;
    const item={id:makeId('obl-rev',at),sequence:normalizeHistory(target.revisions).length+1,changedAt:at,changedByMemberId:actorId||'member-anna',source,changes:actual};
    target.revisions=normalizeHistory(target.revisions);
    target.revisions.push(item);
    target.lastEditedAt=at;
    return item;
  }

  function createOccurrence(state,rule,sequence,at=Date.now()){
    const scheduledDueAt=scheduleDate(rule,sequence);
    const occurrence=normalizeOccurrence({
      id:makeId('obl-occ',at+sequence),
      ruleId:rule.id,
      sequence,
      scheduledDueAt,
      dueAt:scheduledDueAt,
      expectedAmount:amountForSequence(rule,sequence),
      currency:rule.currency,
      walletId:rule.walletId,
      categoryId:rule.categoryId,
      status:'planned',
      createdAt:at,
      lastEditedAt:at,
      revisions:[]
    },at);
    state.obligationOccurrences.push(occurrence);
    return occurrence;
  }

  function occurrenceBySequence(state,ruleId,sequence){
    return state.obligationOccurrences.find(item=>item.ruleId===ruleId&&item.sequence===sequence)||null;
  }

  function reconcileSequences(state,rule,at=Date.now()){
    const occurrences=state.obligationOccurrences.filter(item=>item.ruleId===rule.id).sort((a,b)=>a.scheduledDueAt-b.scheduledDueAt||a.createdAt-b.createdAt);
    const seen=new Set();
    let next=1;
    for(const occurrence of occurrences){
      let sequence=positiveInt(occurrence.sequence,next);
      if(seen.has(sequence))sequence=next;
      while(seen.has(sequence))sequence+=1;
      occurrence.sequence=sequence;
      seen.add(sequence);
      next=Math.max(next,sequence+1);
    }
    if(occurrences.length&&(!rule.scheduleVersions?.length||rule.scheduleVersions[0].effectiveSequence!==1)){
      rule.scheduleVersions=[normalizeScheduleVersion({effectiveSequence:1,firstDueAt:occurrences[0].scheduledDueAt,intervalValue:rule.intervalValue,intervalUnit:rule.intervalUnit},rule,at),...(rule.scheduleVersions||[])];
    }
    if(occurrences.length&&rule.scheduleVersions?.[0]){
      rule.scheduleVersions[0].firstDueAt=Math.min(rule.scheduleVersions[0].firstDueAt,occurrences[0].scheduledDueAt);
      rule.firstDueAt=rule.scheduleVersions[0].firstDueAt;
    }
  }

  function ensureOccurrencesWindow(state,from,to,at=Date.now()){
    const lower=Number.isFinite(Number(from))?Number(from):-Infinity;
    const upper=Number.isFinite(Number(to))?Number(to):addMonths(startOfMonth(at),13);
    const created=[];
    for(const rule of state.obligationRules){
      reconcileSequences(state,rule,at);
      if(rule.status!=='active')continue;
      for(let sequence=1;sequence<=MAX_OCCURRENCES;sequence+=1){
        const dueAt=scheduleDate(rule,sequence);
        if(!sequenceAllowed(rule,sequence,dueAt))break;
        if(dueAt>upper)break;
        if(dueAt>=lower&&!occurrenceBySequence(state,rule.id,sequence))created.push(createOccurrence(state,rule,sequence,at));
        if(rule.cadence==='once')break;
      }
    }
    return created;
  }

  function refreshExpectedAmounts(state,ruleId,fromSequence=1,actorId='member-anna',at=Date.now()){
    const rule=state.obligationRules.find(item=>item.id===ruleId);
    if(!rule)return[];
    const changed=[];
    for(const occurrence of state.obligationOccurrences){
      if(occurrence.ruleId!==ruleId||occurrence.sequence<fromSequence||terminalStatuses.has(occurrence.status)||occurrence.expectedAmountOverride!=null)continue;
      const next=amountForSequence(rule,occurrence.sequence);
      if(next===occurrence.expectedAmount)continue;
      revision(occurrence,[{field:'expectedAmount',oldValue:occurrence.expectedAmount,newValue:next}],actorId,at,'amount_version');
      occurrence.expectedAmount=next;
      changed.push(occurrence);
    }
    return changed;
  }

  function normalizeState(state,at=Date.now()){
    if(!state||typeof state!=='object')throw new Error('FamilyPilot state is required');
    state.schemaVersion=Math.max(4,asNumber(state.schemaVersion,2));
    state.obligationRules=(Array.isArray(state.obligationRules)?state.obligationRules:[]).map(rule=>normalizeRule(rule,at));
    state.obligationOccurrences=(Array.isArray(state.obligationOccurrences)?state.obligationOccurrences:[]).map(occurrence=>normalizeOccurrence(occurrence,at));
    state.operations=Array.isArray(state.operations)?state.operations:[];
    for(const operation of state.operations)operation.links=operation.links&&typeof operation.links==='object'?operation.links:{};
    for(const rule of state.obligationRules)reconcileSequences(state,rule,at);
    ensureOccurrencesWindow(state,-Infinity,addMonths(startOfMonth(at),13),at);
    for(const rule of state.obligationRules)refreshExpectedAmounts(state,rule.id,1,'system',at);
    syncPaymentLinks(state,at);
    return state;
  }

  function validateRuleInput(input){
    const name=String(input?.name||'').trim().replace(/\s+/g,' ');
    const amount=asNumber(input?.amount,NaN);
    const dueAt=asNumber(input?.dueAt,NaN);
    const rawCadence=input?.cadence==='monthly'?'recurring':input?.cadence;
    const cadence=rawCadence==='recurring'?'recurring':'once';
    const intervalValue=cadence==='recurring'?positiveInt(input?.intervalValue,1):1;
    const intervalUnit=cadence==='recurring'&&intervalUnits.has(input?.intervalUnit)?input.intervalUnit:'month';
    const endingMode=cadence==='once'?'count':(endingModes.has(input?.endingMode)?input.endingMode:'unlimited');
    const paymentCount=endingMode==='count'?positiveInt(input?.paymentCount,cadence==='once'?1:1):null;
    const endingDate=endingMode==='untilDate'?asNumber(input?.endingDate,NaN):null;
    if(!name)return{ok:false,error:'Введите название обязательства.'};
    if(name.length>80)return{ok:false,error:'Название — не более 80 символов.'};
    if(!Number.isFinite(amount)||amount<=0||amount>999999.99)return{ok:false,error:'Сумма должна быть от 0,01 до 999 999,99.'};
    if(!Number.isFinite(dueAt))return{ok:false,error:'Выберите дату первого платежа.'};
    if(!input?.walletId)return{ok:false,error:'Выберите кошелёк.'};
    if(!input?.categoryId)return{ok:false,error:'Выберите категорию расхода.'};
    if(cadence==='recurring'&&endingMode==='untilDate'&&(!Number.isFinite(endingDate)||startOfDay(endingDate)<startOfDay(dueAt)))return{ok:false,error:'Дата окончания не может быть раньше первого платежа.'};
    return{ok:true,value:{
      name,amount,dueAt,cadence,intervalValue,intervalUnit,endingMode,paymentCount,endingDate,
      walletId:String(input.walletId),categoryId:String(input.categoryId),currency:String(input.currency||'EUR'),note:String(input.note||'').trim()
    }};
  }

  function createRule(state,input,actorId='member-anna',at=Date.now()){
    const validated=validateRuleInput(input);
    if(!validated.ok)return validated;
    const value=validated.value;
    const rule=normalizeRule({
      id:makeId('obl-rule',at),name:value.name,cadence:value.cadence,firstDueAt:value.dueAt,nextDueAt:value.dueAt,
      intervalValue:value.intervalValue,intervalUnit:value.intervalUnit,endingMode:value.endingMode,paymentCount:value.paymentCount,endingDate:value.endingDate,
      amount:value.amount,currency:value.currency,walletId:value.walletId,categoryId:value.categoryId,note:value.note,status:'active',
      scheduleVersions:[{effectiveSequence:1,firstDueAt:value.dueAt,intervalValue:value.intervalValue,intervalUnit:value.intervalUnit,createdAt:at,createdByMemberId:actorId}],
      amountVersions:[],createdByMemberId:actorId,createdAt:at,lastEditedByMemberId:actorId,lastEditedAt:at,revisions:[]
    },at);
    state.obligationRules.push(rule);
    const occurrences=ensureOccurrencesWindow(state,-Infinity,addMonths(startOfMonth(at),13),at).filter(item=>item.ruleId===rule.id);
    return{ok:true,rule,occurrence:occurrences[0]||null,occurrences};
  }

  function nextEditableSequence(state,ruleId,at=Date.now()){
    const candidates=state.obligationOccurrences.filter(item=>item.ruleId===ruleId&&!terminalStatuses.has(item.status)&&startOfDay(item.dueAt)>=startOfDay(at)).sort((a,b)=>a.sequence-b.sequence);
    if(candidates.length)return candidates[0].sequence;
    const max=state.obligationOccurrences.filter(item=>item.ruleId===ruleId).reduce((value,item)=>Math.max(value,item.sequence),0);
    return max+1;
  }

  function updateRule(state,ruleId,input,actorId='member-anna',at=Date.now()){
    const rule=state.obligationRules.find(item=>item.id===ruleId);
    if(!rule)return{ok:false,error:'Обязательство не найдено.'};
    const validated=validateRuleInput(input);
    if(!validated.ok)return validated;
    const value=validated.value;
    const scheduleChanged=rule.cadence!==value.cadence||rule.intervalValue!==value.intervalValue||rule.intervalUnit!==value.intervalUnit||rule.endingMode!==value.endingMode||String(rule.paymentCount??'')!==String(value.paymentCount??'')||String(rule.endingDate??'')!==String(value.endingDate??'')||startOfDay(input.dueAt)!==startOfDay(rule.nextDueAt||rule.firstDueAt);
    const proposed={name:value.name,cadence:value.cadence,intervalValue:value.intervalValue,intervalUnit:value.intervalUnit,endingMode:value.endingMode,paymentCount:value.paymentCount,endingDate:value.endingDate,currency:value.currency,walletId:value.walletId,categoryId:value.categoryId,note:value.note};
    revision(rule,Object.entries(proposed).map(([field,newValue])=>({field,oldValue:rule[field],newValue})),actorId,at);
    Object.assign(rule,proposed,{lastEditedByMemberId:actorId,lastEditedAt:at});
    if(scheduleChanged){
      const effectiveSequence=nextEditableSequence(state,ruleId,at);
      rule.scheduleVersions=rule.scheduleVersions.filter(version=>version.effectiveSequence<effectiveSequence);
      rule.scheduleVersions.push(normalizeScheduleVersion({effectiveSequence,firstDueAt:value.dueAt,intervalValue:value.intervalValue,intervalUnit:value.intervalUnit,createdAt:at,createdByMemberId:actorId},rule,at));
      rule.scheduleVersions.sort((a,b)=>a.effectiveSequence-b.effectiveSequence);
      rule.nextDueAt=value.dueAt;
      state.obligationOccurrences=state.obligationOccurrences.filter(item=>item.ruleId!==ruleId||item.sequence<effectiveSequence||terminalStatuses.has(item.status)||startOfDay(item.dueAt)<startOfDay(at));
      ensureOccurrencesWindow(state,-Infinity,addMonths(startOfMonth(at),13),at);
    }
    return{ok:true,rule};
  }

  function changeExpectedAmount(state,occurrenceId,newAmount,scope='starting_next',actorId='member-anna',at=Date.now()){
    const occurrence=state.obligationOccurrences.find(item=>item.id===occurrenceId);
    if(!occurrence)return{ok:false,error:'Платёж не найден.'};
    const rule=state.obligationRules.find(item=>item.id===occurrence.ruleId);
    if(!rule)return{ok:false,error:'Правило обязательства не найдено.'};
    const amount=asNumber(newAmount,NaN);
    if(!Number.isFinite(amount)||amount<=0||amount>999999.99)return{ok:false,error:'Некорректная ожидаемая сумма.'};
    if(scope==='only_this'){
      revision(occurrence,[{field:'expectedAmount',oldValue:occurrence.expectedAmount,newValue:amount},{field:'expectedAmountOverride',oldValue:occurrence.expectedAmountOverride,newValue:amount}],actorId,at,'amount_override');
      occurrence.expectedAmountOverride=amount;
      occurrence.expectedAmount=amount;
      return{ok:true,occurrence,rule,effectiveSequence:occurrence.sequence};
    }
    const effectiveSequence=scope==='this_and_following'?occurrence.sequence:occurrence.sequence+1;
    rule.amountVersions=rule.amountVersions.filter(version=>version.effectiveSequence!==effectiveSequence);
    rule.amountVersions.push(normalizeAmountVersion({effectiveSequence,amount,currency:rule.currency,createdAt:at,createdByMemberId:actorId,source:scope},at));
    rule.amountVersions.sort((a,b)=>a.effectiveSequence-b.effectiveSequence||a.createdAt-b.createdAt);
    revision(rule,[{field:'amountVersion',oldValue:null,newValue:`${effectiveSequence}:${amount}`}],actorId,at,'amount_version');
    refreshExpectedAmounts(state,rule.id,effectiveSequence,actorId,at);
    return{ok:true,occurrence,rule,effectiveSequence};
  }

  function occurrenceDisplayStatus(occurrence,at=Date.now()){
    if(terminalStatuses.has(occurrence.status))return occurrence.status;
    const today=startOfDay(at),due=startOfDay(occurrence.dueAt);
    if(due<today)return'overdue';
    if(due===today)return'due';
    if(occurrence.postponedAt)return'postponed';
    return'planned';
  }

  function findLinkedOperation(state,occurrenceId){
    return state.operations.find(operation=>operation.status===ACTIVE_OPERATION&&operation.links?.obligationOccurrenceId===occurrenceId)||null;
  }

  function syncPaymentLinks(state,at=Date.now()){
    for(const occurrence of state.obligationOccurrences){
      const linkedById=occurrence.linkedOperationId?state.operations.find(operation=>operation.id===occurrence.linkedOperationId&&operation.status===ACTIVE_OPERATION):null;
      const linked=linkedById||findLinkedOperation(state,occurrence.id);
      if(linked){
        occurrence.linkedOperationId=linked.id;
        occurrence.status='paid';
        occurrence.actualAmount=asNumber(linked.amount,occurrence.expectedAmount);
        occurrence.paidAt=asNumber(linked.occurredAt,occurrence.paidAt||at);
        occurrence.walletId=linked.walletId||occurrence.walletId;
        occurrence.categoryId=linked.categoryId||occurrence.categoryId;
      }else if(occurrence.status==='paid'){
        occurrence.status='planned';
        occurrence.actualAmount=null;
        occurrence.paidAt=null;
        occurrence.linkedOperationId=null;
      }
    }
    return state;
  }

  function createExpenseOperation(state,rule,occurrence,input,actorId='member-anna',at=Date.now()){
    const amount=asNumber(input?.amount,occurrence.expectedAmount);
    const occurredAt=asNumber(input?.occurredAt,at);
    const operation={
      id:makeId('op',at),kind:'expense',amount,categoryId:input?.categoryId||occurrence.categoryId||rule.categoryId,
      walletId:input?.walletId||occurrence.walletId||rule.walletId,note:String(input?.note||`Оплата обязательства: ${rule.name}`),occurredAt,
      createdByMemberId:actorId,createdAt:at,lastEditedByMemberId:actorId,lastEditedAt:at,revisions:[],status:'active',deletedAt:null,
      deletedByMemberId:null,trashExpiresAt:null,receipt:null,links:{sourceModule:'obligations',obligationRuleId:rule.id,obligationOccurrenceId:occurrence.id,relation:'fulfills_occurrence'},transferGroupId:null
    };
    state.operations.push(operation);
    return operation;
  }

  function payOccurrence(state,occurrenceId,input={},actorId='member-anna',at=Date.now()){
    syncPaymentLinks(state,at);
    const occurrence=state.obligationOccurrences.find(item=>item.id===occurrenceId);
    if(!occurrence)return{ok:false,error:'Платёж не найден.'};
    const rule=state.obligationRules.find(item=>item.id===occurrence.ruleId);
    if(!rule)return{ok:false,error:'Правило обязательства не найдено.'};
    const existing=findLinkedOperation(state,occurrence.id);
    if(existing)return{ok:false,error:'Этот платёж уже связан с активной операцией.',operation:existing};
    if(occurrence.status==='skipped'||occurrence.status==='cancelled')return{ok:false,error:'Закрытый платёж нельзя отметить оплаченным.'};
    const amount=asNumber(input.amount,occurrence.expectedAmount);
    const occurredAt=asNumber(input.occurredAt,at);
    if(!Number.isFinite(amount)||amount<=0||amount>999999.99)return{ok:false,error:'Некорректная сумма оплаты.'};
    if(!Number.isFinite(occurredAt)||occurredAt>at)return{ok:false,error:'Дата оплаты не может быть в будущем.'};
    const operation=createExpenseOperation(state,rule,occurrence,{...input,amount,occurredAt},actorId,at);
    revision(occurrence,[{field:'status',oldValue:occurrence.status,newValue:'paid'},{field:'linkedOperationId',oldValue:occurrence.linkedOperationId,newValue:operation.id},{field:'actualAmount',oldValue:occurrence.actualAmount,newValue:amount}],actorId,at,'obligation_payment');
    occurrence.status='paid';occurrence.linkedOperationId=operation.id;occurrence.actualAmount=amount;occurrence.paidAt=occurredAt;occurrence.lastEditedAt=at;
    return{ok:true,operation,occurrence,nextOccurrence:null};
  }

  function correctPayment(state,occurrenceId,input={},actorId='member-anna',at=Date.now()){
    syncPaymentLinks(state,at);
    const occurrence=state.obligationOccurrences.find(item=>item.id===occurrenceId);
    if(!occurrence)return{ok:false,error:'Платёж не найден.'};
    const operation=findLinkedOperation(state,occurrenceId);
    if(!operation)return{ok:false,error:'Связанная операция не найдена.'};
    const amount=asNumber(input.amount,operation.amount);
    const occurredAt=asNumber(input.occurredAt,operation.occurredAt);
    if(!Number.isFinite(amount)||amount<=0||amount>999999.99)return{ok:false,error:'Некорректная сумма оплаты.'};
    if(!Number.isFinite(occurredAt)||occurredAt>at)return{ok:false,error:'Дата оплаты не может быть в будущем.'};
    const proposed={amount,occurredAt,walletId:input.walletId||operation.walletId,categoryId:input.categoryId||operation.categoryId,note:input.note==null?operation.note:String(input.note)};
    const changes=Object.entries(proposed).map(([field,newValue])=>({field,oldValue:operation[field],newValue})).filter(change=>String(change.oldValue??'')!==String(change.newValue??''));
    if(changes.length){
      operation.revisions=normalizeHistory(operation.revisions);
      operation.revisions.push({id:makeId('rev',at),sequence:operation.revisions.length+1,changedByMemberId:actorId,changedAt:at,source:'obligation_payment_correction',changes});
      Object.assign(operation,proposed,{lastEditedByMemberId:actorId,lastEditedAt:at});
      revision(occurrence,[{field:'actualAmount',oldValue:occurrence.actualAmount,newValue:amount},{field:'paidAt',oldValue:occurrence.paidAt,newValue:occurredAt}],actorId,at,'obligation_payment_correction');
    }
    syncPaymentLinks(state,at);
    return{ok:true,operation,occurrence};
  }

  function moveOccurrence(state,occurrenceId,newDueAt,actorId='member-anna',at=Date.now()){
    const occurrence=state.obligationOccurrences.find(item=>item.id===occurrenceId);
    if(!occurrence)return{ok:false,error:'Платёж не найден.'};
    if(terminalStatuses.has(occurrence.status))return{ok:false,error:'Завершённый платёж нельзя перенести.'};
    const dueAt=asNumber(newDueAt,NaN);
    if(!Number.isFinite(dueAt))return{ok:false,error:'Некорректная новая дата.'};
    revision(occurrence,[{field:'dueAt',oldValue:occurrence.dueAt,newValue:dueAt}],actorId,at,'obligation_move');
    if(occurrence.movedFromDueAt==null)occurrence.movedFromDueAt=occurrence.dueAt;
    occurrence.dueAt=dueAt;occurrence.postponedAt=at;occurrence.lastEditedAt=at;
    return{ok:true,occurrence};
  }

  function postponeOccurrence(state,occurrenceId,newDueAt,actorId='member-anna',at=Date.now()){
    return moveOccurrence(state,occurrenceId,newDueAt,actorId,at);
  }

  function skipOccurrence(state,occurrenceId,actorId='member-anna',at=Date.now()){
    const occurrence=state.obligationOccurrences.find(item=>item.id===occurrenceId);
    if(!occurrence)return{ok:false,error:'Платёж не найден.'};
    if(terminalStatuses.has(occurrence.status))return{ok:false,error:'Платёж уже завершён.'};
    revision(occurrence,[{field:'status',oldValue:occurrence.status,newValue:'skipped'}],actorId,at,'obligation_skip');
    occurrence.status='skipped';occurrence.skippedAt=at;occurrence.lastEditedAt=at;
    return{ok:true,occurrence,nextOccurrence:null};
  }

  function archiveRule(state,ruleId,actorId='member-anna',at=Date.now()){
    const rule=state.obligationRules.find(item=>item.id===ruleId);
    if(!rule)return{ok:false,error:'Обязательство не найдено.'};
    if(rule.status==='archived')return{ok:true,rule};
    revision(rule,[{field:'status',oldValue:rule.status,newValue:'archived'}],actorId,at,'obligation_archive');
    rule.status='archived';rule.archivedAt=at;rule.archivedByMemberId=actorId;rule.lastEditedAt=at;
    return{ok:true,rule};
  }

  function restoreRule(state,ruleId,actorId='member-anna',at=Date.now()){
    const rule=state.obligationRules.find(item=>item.id===ruleId);
    if(!rule)return{ok:false,error:'Обязательство не найдено.'};
    if(rule.status==='active')return{ok:true,rule};
    revision(rule,[{field:'status',oldValue:rule.status,newValue:'active'}],actorId,at,'obligation_restore');
    rule.status='active';rule.archivedAt=null;rule.archivedByMemberId=null;rule.lastEditedAt=at;
    ensureOccurrencesWindow(state,-Infinity,addMonths(startOfMonth(at),13),at);
    return{ok:true,rule};
  }

  function visibleWalletIds(state,scopeDescriptor,accessibleWallets,isPersonalWallet){
    if(scopeDescriptor?.scope==='personal')return new Set([scopeDescriptor.wallet?.id].filter(Boolean));
    const wallets=Array.isArray(accessibleWallets)?accessibleWallets:state.wallets||[];
    return new Set(wallets.filter(wallet=>!(isPersonalWallet?.(wallet)??wallet.type==='personal')).map(wallet=>wallet.id));
  }

  function visibleRules(state,walletIds,options={}){
    const allowed=walletIds instanceof Set?walletIds:new Set(walletIds||[]);
    const includeArchived=!!options.includeArchived;
    return state.obligationRules.filter(rule=>allowed.has(rule.walletId)&&(includeArchived||rule.status==='active'));
  }

  function visibleOccurrences(state,walletIds,at=Date.now(),range=null){
    const allowed=walletIds instanceof Set?walletIds:new Set(walletIds||[]);
    const ruleIds=new Set(state.obligationRules.filter(rule=>allowed.has(rule.walletId)).map(rule=>rule.id));
    if(range)ensureOccurrencesWindow(state,range.from,range.to,at);
    syncPaymentLinks(state,at);
    return state.obligationOccurrences.filter(occurrence=>ruleIds.has(occurrence.ruleId)&&(!range||(occurrence.dueAt>=range.from&&occurrence.dueAt<range.to))).sort((a,b)=>a.dueAt-b.dueAt||a.sequence-b.sequence||a.createdAt-b.createdAt);
  }

  function attentionItems(state,walletIds,at=Date.now()){
    const activeRuleIds=new Set(visibleRules(state,walletIds).map(rule=>rule.id));
    return visibleOccurrences(state,walletIds,at).filter(occurrence=>activeRuleIds.has(occurrence.ruleId)&&!terminalStatuses.has(occurrence.status)).map(occurrence=>{
      const status=occurrenceDisplayStatus(occurrence,at);
      if(status!=='due'&&status!=='overdue')return null;
      const rule=state.obligationRules.find(item=>item.id===occurrence.ruleId);
      return{id:`obligation:${occurrence.id}`,severity:status==='overdue'?'red':'yellow',title:status==='overdue'?`Просрочено: ${rule?.name||'обязательство'}`:`Сегодня: ${rule?.name||'обязательство'}`,module:'obligations',targetId:occurrence.id,resolutionCondition:'occurrence becomes paid, skipped, cancelled or rescheduled'};
    }).filter(Boolean);
  }

  function scheduleLabel(rule){
    if(rule.cadence==='once')return'Один раз';
    const unitLabels={day:['день','дня','дней'],week:['неделю','недели','недель'],month:['месяц','месяца','месяцев'],year:['год','года','лет']};
    const value=positiveInt(rule.intervalValue,1);
    const labels=unitLabels[rule.intervalUnit]||unitLabels.month;
    const form=value%10===1&&value%100!==11?labels[0]:(value%10>=2&&value%10<=4&&(value%100<10||value%100>=20)?labels[1]:labels[2]);
    const ending=rule.endingMode==='count'?` · ${rule.paymentCount} платежей`:(rule.endingMode==='untilDate'?` · до ${new Intl.DateTimeFormat('ru-RU').format(new Date(rule.endingDate))}`:' · бессрочно');
    return `Каждые ${value} ${form}${ending}`;
  }

  return{
    DAY,MAX_OCCURRENCES,addMonths,addInterval,startOfDay,startOfMonth,scheduleDate,amountForSequence,normalizeState,
    createRule,updateRule,ensureOccurrencesWindow,occurrenceDisplayStatus,syncPaymentLinks,payOccurrence,correctPayment,
    moveOccurrence,postponeOccurrence,skipOccurrence,changeExpectedAmount,archiveRule,restoreRule,visibleWalletIds,
    visibleRules,visibleOccurrences,attentionItems,validateRuleInput,scheduleLabel,makeId,terminalStatuses
  };
});
