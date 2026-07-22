(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FamilyPilotObligations=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const DAY=86400000;
  const ACTIVE_OPERATION='active';
  const terminalStatuses=new Set(['paid','skipped','cancelled']);

  function makeId(prefix='id',at=Date.now()){
    return `${prefix}-${Number(at).toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  }

  function asNumber(value,fallback=0){
    const n=Number(value);
    return Number.isFinite(n)?n:fallback;
  }

  function startOfDay(value){
    const d=new Date(value);
    return new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime();
  }

  function addMonths(value,count=1){
    const d=new Date(value);
    const day=d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth()+count);
    const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
    d.setDate(Math.min(day,last));
    return d.getTime();
  }

  function normalizeHistory(value){
    return Array.isArray(value)?value:[];
  }

  function normalizeRule(raw,at=Date.now()){
    const due=asNumber(raw?.nextDueAt||raw?.dueAt,startOfDay(at));
    return {
      id:raw?.id||makeId('obl-rule',at),
      name:String(raw?.name||'Обязательство').trim()||'Обязательство',
      cadence:raw?.cadence==='monthly'?'monthly':'once',
      nextDueAt:due,
      amount:Math.max(0,asNumber(raw?.amount,0)),
      currency:String(raw?.currency||'EUR'),
      walletId:String(raw?.walletId||'wallet-household-main'),
      categoryId:String(raw?.categoryId||''),
      note:String(raw?.note||''),
      status:raw?.status==='archived'?'archived':'active',
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
    return {
      id:raw?.id||makeId('obl-occ',at),
      ruleId:String(raw?.ruleId||''),
      scheduledDueAt:scheduled,
      dueAt:asNumber(raw?.dueAt,scheduled),
      expectedAmount:Math.max(0,asNumber(raw?.expectedAmount,0)),
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

  function normalizeState(state,at=Date.now()){
    if(!state||typeof state!=='object')throw new Error('FamilyPilot state is required');
    state.schemaVersion=Math.max(3,asNumber(state.schemaVersion,2));
    state.obligationRules=(Array.isArray(state.obligationRules)?state.obligationRules:[]).map(r=>normalizeRule(r,at));
    state.obligationOccurrences=(Array.isArray(state.obligationOccurrences)?state.obligationOccurrences:[]).map(o=>normalizeOccurrence(o,at));
    state.operations=Array.isArray(state.operations)?state.operations:[];
    for(const operation of state.operations){
      operation.links=operation.links&&typeof operation.links==='object'?operation.links:{};
    }
    for(const rule of state.obligationRules){
      ensureOccurrenceForRule(state,rule,at);
    }
    syncPaymentLinks(state,at);
    return state;
  }

  function validateRuleInput(input){
    const name=String(input?.name||'').trim().replace(/\s+/g,' ');
    const amount=asNumber(input?.amount,NaN);
    const dueAt=asNumber(input?.dueAt,NaN);
    if(!name)return{ok:false,error:'Введите название обязательства.'};
    if(name.length>80)return{ok:false,error:'Название — не более 80 символов.'};
    if(!Number.isFinite(amount)||amount<=0||amount>999999.99)return{ok:false,error:'Сумма должна быть от 0,01 до 999 999,99.'};
    if(!Number.isFinite(dueAt))return{ok:false,error:'Выберите дату платежа.'};
    if(!input?.walletId)return{ok:false,error:'Выберите кошелёк.'};
    if(!input?.categoryId)return{ok:false,error:'Выберите категорию расхода.'};
    return{ok:true,value:{
      name,
      amount,
      dueAt,
      cadence:input.cadence==='monthly'?'monthly':'once',
      walletId:String(input.walletId),
      categoryId:String(input.categoryId),
      currency:String(input.currency||'EUR'),
      note:String(input.note||'').trim()
    }};
  }

  function revision(target,changes,actorId,at=Date.now(),source='user'){
    const actual=changes.filter(change=>String(change.oldValue??'')!==String(change.newValue??''));
    if(!actual.length)return null;
    const item={id:makeId('obl-rev',at),changedAt:at,changedByMemberId:actorId||'member-anna',source,changes:actual};
    target.revisions=normalizeHistory(target.revisions);
    target.revisions.push(item);
    target.lastEditedAt=at;
    return item;
  }

  function createOccurrence(state,rule,dueAt=rule.nextDueAt,at=Date.now()){
    const occurrence=normalizeOccurrence({
      id:makeId('obl-occ',at),
      ruleId:rule.id,
      scheduledDueAt:dueAt,
      dueAt,
      expectedAmount:rule.amount,
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

  function openOccurrencesForRule(state,ruleId){
    return state.obligationOccurrences.filter(o=>o.ruleId===ruleId&&!terminalStatuses.has(o.status));
  }

  function ensureOccurrenceForRule(state,rule,at=Date.now()){
    if(rule.status!=='active')return null;
    const existing=state.obligationOccurrences.find(o=>o.ruleId===rule.id&&o.scheduledDueAt===rule.nextDueAt);
    if(existing)return existing;
    if(rule.cadence==='once'&&state.obligationOccurrences.some(o=>o.ruleId===rule.id))return null;
    return createOccurrence(state,rule,rule.nextDueAt,at);
  }

  function createRule(state,input,actorId='member-anna',at=Date.now()){
    const validated=validateRuleInput(input);
    if(!validated.ok)return validated;
    const value=validated.value;
    const rule=normalizeRule({
      id:makeId('obl-rule',at),
      name:value.name,
      cadence:value.cadence,
      nextDueAt:value.dueAt,
      amount:value.amount,
      currency:value.currency,
      walletId:value.walletId,
      categoryId:value.categoryId,
      note:value.note,
      status:'active',
      createdByMemberId:actorId,
      createdAt:at,
      lastEditedByMemberId:actorId,
      lastEditedAt:at,
      revisions:[]
    },at);
    state.obligationRules.push(rule);
    const occurrence=createOccurrence(state,rule,rule.nextDueAt,at);
    return{ok:true,rule,occurrence};
  }

  function updateRule(state,ruleId,input,actorId='member-anna',at=Date.now()){
    const rule=state.obligationRules.find(r=>r.id===ruleId);
    if(!rule)return{ok:false,error:'Обязательство не найдено.'};
    const validated=validateRuleInput(input);
    if(!validated.ok)return validated;
    const value=validated.value;
    const proposed={name:value.name,cadence:value.cadence,nextDueAt:value.dueAt,amount:value.amount,currency:value.currency,walletId:value.walletId,categoryId:value.categoryId,note:value.note};
    const changes=Object.entries(proposed).map(([field,newValue])=>({field,oldValue:rule[field],newValue}));
    revision(rule,changes,actorId,at);
    Object.assign(rule,proposed,{lastEditedByMemberId:actorId,lastEditedAt:at});
    // Existing occurrences are concrete facts and are intentionally not rewritten.
    ensureOccurrenceForRule(state,rule,at);
    return{ok:true,rule};
  }

  function occurrenceDisplayStatus(occurrence,at=Date.now()){
    if(occurrence.status==='paid'||occurrence.status==='skipped'||occurrence.status==='cancelled')return occurrence.status;
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
      const linkedById=occurrence.linkedOperationId?state.operations.find(o=>o.id===occurrence.linkedOperationId&&o.status===ACTIVE_OPERATION):null;
      const linked=linkedById||findLinkedOperation(state,occurrence.id);
      if(linked){
        occurrence.linkedOperationId=linked.id;
        occurrence.status='paid';
        occurrence.actualAmount=asNumber(linked.amount,occurrence.expectedAmount);
        occurrence.paidAt=asNumber(linked.occurredAt,occurrence.paidAt||at);
      }else if(occurrence.status==='paid'){
        occurrence.status='planned';
        occurrence.actualAmount=null;
        occurrence.paidAt=null;
      }
    }
    return state;
  }

  function advanceRecurringRule(state,rule,occurrence,at=Date.now()){
    if(rule?.cadence!=='monthly'||rule.status!=='active')return null;
    const base=occurrence.scheduledDueAt||rule.nextDueAt;
    rule.nextDueAt=addMonths(base,1);
    rule.lastEditedAt=at;
    return ensureOccurrenceForRule(state,rule,at);
  }

  function createExpenseOperation(state,rule,occurrence,input,actorId='member-anna',at=Date.now()){
    const amount=asNumber(input?.amount,occurrence.expectedAmount);
    const occurredAt=asNumber(input?.occurredAt,at);
    const operation={
      id:makeId('op',at),
      kind:'expense',
      amount,
      categoryId:input?.categoryId||occurrence.categoryId||rule.categoryId,
      walletId:input?.walletId||occurrence.walletId||rule.walletId,
      note:String(input?.note||`Оплата обязательства: ${rule.name}`),
      occurredAt,
      createdByMemberId:actorId,
      createdAt:at,
      lastEditedByMemberId:actorId,
      lastEditedAt:at,
      revisions:[],
      status:'active',
      deletedAt:null,
      deletedByMemberId:null,
      trashExpiresAt:null,
      receipt:null,
      links:{
        sourceModule:'obligations',
        obligationRuleId:rule.id,
        obligationOccurrenceId:occurrence.id,
        relation:'fulfills_occurrence'
      },
      transferGroupId:null
    };
    state.operations.push(operation);
    return operation;
  }

  function payOccurrence(state,occurrenceId,input={},actorId='member-anna',at=Date.now()){
    syncPaymentLinks(state,at);
    const occurrence=state.obligationOccurrences.find(o=>o.id===occurrenceId);
    if(!occurrence)return{ok:false,error:'Платёж не найден.'};
    const rule=state.obligationRules.find(r=>r.id===occurrence.ruleId);
    if(!rule)return{ok:false,error:'Правило обязательства не найдено.'};
    const existing=findLinkedOperation(state,occurrence.id);
    if(existing)return{ok:false,error:'Этот платёж уже связан с активной операцией.',operation:existing};
    if(occurrence.status==='skipped'||occurrence.status==='cancelled')return{ok:false,error:'Закрытый платёж нельзя отметить оплаченным.'};
    const amount=asNumber(input.amount,occurrence.expectedAmount);
    const occurredAt=asNumber(input.occurredAt,at);
    if(!Number.isFinite(amount)||amount<=0||amount>999999.99)return{ok:false,error:'Некорректная сумма оплаты.'};
    if(!Number.isFinite(occurredAt)||occurredAt>at)return{ok:false,error:'Дата оплаты не может быть в будущем.'};
    const operation=createExpenseOperation(state,rule,occurrence,{...input,amount,occurredAt},actorId,at);
    revision(occurrence,[
      {field:'status',oldValue:occurrence.status,newValue:'paid'},
      {field:'linkedOperationId',oldValue:occurrence.linkedOperationId,newValue:operation.id},
      {field:'actualAmount',oldValue:occurrence.actualAmount,newValue:amount}
    ],actorId,at,'obligation_payment');
    occurrence.status='paid';
    occurrence.linkedOperationId=operation.id;
    occurrence.actualAmount=amount;
    occurrence.paidAt=occurredAt;
    occurrence.lastEditedAt=at;
    const nextOccurrence=advanceRecurringRule(state,rule,occurrence,at);
    return{ok:true,operation,occurrence,nextOccurrence};
  }

  function postponeOccurrence(state,occurrenceId,newDueAt,actorId='member-anna',at=Date.now()){
    const occurrence=state.obligationOccurrences.find(o=>o.id===occurrenceId);
    if(!occurrence)return{ok:false,error:'Платёж не найден.'};
    if(terminalStatuses.has(occurrence.status))return{ok:false,error:'Завершённый платёж нельзя перенести.'};
    const dueAt=asNumber(newDueAt,NaN);
    if(!Number.isFinite(dueAt)||startOfDay(dueAt)<startOfDay(at))return{ok:false,error:'Новая дата не может быть в прошлом.'};
    revision(occurrence,[{field:'dueAt',oldValue:occurrence.dueAt,newValue:dueAt}],actorId,at,'obligation_postpone');
    occurrence.dueAt=dueAt;
    occurrence.postponedAt=at;
    occurrence.lastEditedAt=at;
    return{ok:true,occurrence};
  }

  function skipOccurrence(state,occurrenceId,actorId='member-anna',at=Date.now()){
    const occurrence=state.obligationOccurrences.find(o=>o.id===occurrenceId);
    if(!occurrence)return{ok:false,error:'Платёж не найден.'};
    if(terminalStatuses.has(occurrence.status))return{ok:false,error:'Платёж уже завершён.'};
    const rule=state.obligationRules.find(r=>r.id===occurrence.ruleId);
    revision(occurrence,[{field:'status',oldValue:occurrence.status,newValue:'skipped'}],actorId,at,'obligation_skip');
    occurrence.status='skipped';
    occurrence.skippedAt=at;
    occurrence.lastEditedAt=at;
    const nextOccurrence=advanceRecurringRule(state,rule,occurrence,at);
    return{ok:true,occurrence,nextOccurrence};
  }

  function visibleWalletIds(state,scopeDescriptor,accessibleWallets,isPersonalWallet){
    if(scopeDescriptor?.scope==='personal')return new Set([scopeDescriptor.wallet?.id].filter(Boolean));
    const wallets=Array.isArray(accessibleWallets)?accessibleWallets:state.wallets||[];
    return new Set(wallets.filter(w=>!(isPersonalWallet?.(w)??w.type==='personal')).map(w=>w.id));
  }

  function visibleRules(state,walletIds){
    const allowed=walletIds instanceof Set?walletIds:new Set(walletIds||[]);
    return state.obligationRules.filter(rule=>rule.status==='active'&&allowed.has(rule.walletId));
  }

  function visibleOccurrences(state,walletIds,at=Date.now()){
    const ruleIds=new Set(visibleRules(state,walletIds).map(rule=>rule.id));
    syncPaymentLinks(state,at);
    return state.obligationOccurrences.filter(o=>ruleIds.has(o.ruleId)).sort((a,b)=>a.dueAt-b.dueAt||a.createdAt-b.createdAt);
  }

  function attentionItems(state,walletIds,at=Date.now()){
    return visibleOccurrences(state,walletIds,at).filter(o=>!terminalStatuses.has(o.status)).map(o=>{
      const status=occurrenceDisplayStatus(o,at);
      if(status!=='due'&&status!=='overdue')return null;
      const rule=state.obligationRules.find(r=>r.id===o.ruleId);
      return{
        id:`obligation:${o.id}`,
        severity:status==='overdue'?'red':'yellow',
        title:status==='overdue'?`Просрочено: ${rule?.name||'обязательство'}`:`Сегодня: ${rule?.name||'обязательство'}`,
        module:'obligations',
        targetId:o.id,
        resolutionCondition:'occurrence becomes paid, skipped, cancelled or rescheduled'
      };
    }).filter(Boolean);
  }

  return{
    DAY,
    addMonths,
    startOfDay,
    normalizeState,
    createRule,
    updateRule,
    ensureOccurrenceForRule,
    occurrenceDisplayStatus,
    syncPaymentLinks,
    payOccurrence,
    postponeOccurrence,
    skipOccurrence,
    visibleWalletIds,
    visibleRules,
    visibleOccurrences,
    attentionItems,
    validateRuleInput,
    makeId
  };
});