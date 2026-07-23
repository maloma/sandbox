(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FamilyPilotPaymentAttention=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const DAY=86400000;
  const DEFAULT_LEAD_DAYS=3;
  const MAX_LEAD_DAYS=30;
  const closedStatuses=new Set(['paid','skipped','cancelled']);

  const startOfDay=value=>{const d=new Date(value);return new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime()};
  const addDays=(value,count)=>{const d=new Date(value);return new Date(d.getFullYear(),d.getMonth(),d.getDate()+count).getTime()};

  function normalizeLeadDays(value,fallback=DEFAULT_LEAD_DAYS){
    const parsed=Math.trunc(Number(value));
    if(!Number.isFinite(parsed))return normalizeLeadDays(fallback,DEFAULT_LEAD_DAYS);
    return Math.max(0,Math.min(MAX_LEAD_DAYS,parsed));
  }

  function ensureReminderConfig(state){
    if(!state||typeof state!=='object')throw new Error('FamilyPilot state is required');
    state.config=state.config&&typeof state.config==='object'?state.config:{};
    const current=state.config.paymentReminderLeadDaysByRuleId;
    state.config.paymentReminderLeadDaysByRuleId=current&&typeof current==='object'&&!Array.isArray(current)?current:{};
    return state.config.paymentReminderLeadDaysByRuleId;
  }

  function leadDaysForRule(state,ruleId){
    const map=ensureReminderConfig(state);
    return normalizeLeadDays(map[String(ruleId||'')],DEFAULT_LEAD_DAYS);
  }

  function setRuleLeadDays(state,ruleId,value){
    const id=String(ruleId||'');
    if(!id)throw new Error('Obligation rule id is required');
    const days=normalizeLeadDays(value,DEFAULT_LEAD_DAYS);
    ensureReminderConfig(state)[id]=days;
    return days;
  }

  function visibleWalletIds(state,scopeApi){
    if(!scopeApi)throw new Error('FamilyPilot scope API is required');
    const selected=scopeApi.activeWallet(state);
    if(!selected)return new Set();
    if(scopeApi.isPersonalWallet(selected))return new Set([selected.id]);
    return new Set(scopeApi.accessibleWallets(state).filter(wallet=>!scopeApi.isPersonalWallet(wallet)).map(wallet=>wallet.id));
  }

  function classifyOccurrence(occurrence,leadDays,at=Date.now()){
    if(!occurrence||closedStatuses.has(occurrence.status))return null;
    const due=startOfDay(occurrence.dueAt),today=startOfDay(at);
    if(due<today)return'overdue';
    if(due===today)return'today';
    if(leadDays>0&&due<=addDays(today,leadDays))return'upcoming';
    return null;
  }

  function attentionItems(state,scopeApi,at=Date.now()){
    ensureReminderConfig(state);
    const walletIds=visibleWalletIds(state,scopeApi);
    const rules=new Map((Array.isArray(state.obligationRules)?state.obligationRules:[]).map(rule=>[rule.id,rule]));
    const rank={overdue:0,today:1,upcoming:2};
    return (Array.isArray(state.obligationOccurrences)?state.obligationOccurrences:[])
      .filter(occurrence=>walletIds.has(occurrence.walletId)&&!closedStatuses.has(occurrence.status))
      .map(occurrence=>{
        const rule=rules.get(occurrence.ruleId)||null;
        const leadDays=leadDaysForRule(state,occurrence.ruleId);
        const bucket=classifyOccurrence(occurrence,leadDays,at);
        return bucket?{bucket,occurrence,rule,leadDays}:null;
      })
      .filter(Boolean)
      .sort((a,b)=>rank[a.bucket]-rank[b.bucket]||(a.bucket==='overdue'?b.occurrence.dueAt-a.occurrence.dueAt:a.occurrence.dueAt-b.occurrence.dueAt)||a.occurrence.sequence-b.occurrence.sequence);
  }

  function groupedAttention(state,scopeApi,at=Date.now()){
    const groups={overdue:[],today:[],upcoming:[]};
    for(const item of attentionItems(state,scopeApi,at))groups[item.bucket].push(item);
    return groups;
  }

  return Object.freeze({DAY,DEFAULT_LEAD_DAYS,MAX_LEAD_DAYS,startOfDay,addDays,normalizeLeadDays,ensureReminderConfig,leadDaysForRule,setRuleLeadDays,visibleWalletIds,classifyOccurrence,attentionItems,groupedAttention});
});
