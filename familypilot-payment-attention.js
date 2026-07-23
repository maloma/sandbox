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

(function(){
  'use strict';

  if(window.__FP_M3_03_DEMO__)return;
  const READY_LIMIT=1200;
  const VERSION='m3-03-payment-attention-demo-v1';
  const MARKER='marker:m3-03-payment-attention-demo:';
  const PREFIX='Демо · ';

  function boot(attempt=0){
    const runtime=window.__FP_RUNTIME__,attention=window.FamilyPilotPaymentAttention,obligations=window.FamilyPilotObligations;
    if(!runtime||!attention||!obligations||!window.__FP_M3_03_READY__){
      if(attempt<READY_LIMIT)setTimeout(()=>boot(attempt+1),25);
      else window.__FP_M3_03_DEMO_ERROR__='Payment demo dependencies did not become ready';
      return;
    }
    window.__FP_M3_03_DEMO__=true;

    const state=runtime.state,now=runtime.now,save=runtime.save;
    const testMode=new URLSearchParams(location.search).has('test');
    const isDemoRule=rule=>String(rule?.note||'').includes(MARKER)||String(rule?.name||'').startsWith(PREFIX);
    const keyOf=rule=>(String(rule?.note||'').match(/marker:m3-03-payment-attention-demo:([a-z0-9-]+)/i)||[])[1]||'';
    const demoRules=()=>Array.isArray(state.obligationRules)?state.obligationRules.filter(isDemoRule):[];

    function records(){
      const rules=demoRules(),ids=new Set(rules.map(rule=>rule.id)),occurrences=(state.obligationOccurrences||[]).filter(item=>ids.has(item.ruleId));
      return rules.map(rule=>({key:keyOf(rule),rule,leadDays:attention.leadDaysForRule(state,rule.id),occurrences:occurrences.filter(item=>item.ruleId===rule.id)}));
    }

    function remove({notify=true,render=true}={}){
      const rules=demoRules(),ruleIds=new Set(rules.map(rule=>rule.id));
      const occurrenceIds=new Set((state.obligationOccurrences||[]).filter(item=>ruleIds.has(item.ruleId)).map(item=>item.id));
      state.operations=(state.operations||[]).filter(operation=>!ruleIds.has(operation.links?.obligationRuleId)&&!occurrenceIds.has(operation.links?.obligationOccurrenceId)&&!String(operation.note||'').includes(MARKER));
      state.obligationOccurrences=(state.obligationOccurrences||[]).filter(item=>!ruleIds.has(item.ruleId));
      state.obligationRules=(state.obligationRules||[]).filter(rule=>!ruleIds.has(rule.id));
      const reminderMap=attention.ensureReminderConfig(state);
      for(const id of ruleIds)delete reminderMap[id];
      delete state.config.paymentAttentionDemoVersion;
      delete state.config.paymentAttentionDemoSeededAt;
      save();
      if(render)runtime.renderAll();
      renderPanel();
      if(notify)runtime.toast('Демо-платежи удалены.');
      return{rules:rules.length,occurrences:occurrenceIds.size};
    }

    function load({notify=true}={}){
      remove({notify:false,render:false});
      const category=(state.categories||[]).find(item=>item.kind==='expense'&&!item.archivedAt)||(state.categories||[]).find(item=>item.kind==='expense');
      const household=(state.wallets||[]).find(item=>item.id==='wallet-household-main')||(state.wallets||[]).find(item=>item.type!=='personal');
      const personal=(state.wallets||[]).find(item=>item.id==='wallet-personal-anna')||(state.wallets||[]).find(item=>item.type==='personal'&&item.ownerMemberId===state.currentMemberId);
      if(!category||!household){if(notify)runtime.toast('Не удалось создать демо: нет кошелька или категории расхода.');return{ok:false,error:'fixture_context_missing'}}
      const today=attention.startOfDay(now()),at=now();
      const specs=[
        {key:'overdue',name:'Демо · Просроченный интернет',amount:29.90,offset:-2,lead:3,note:'Просроченный платёж остаётся до решения пользователя.'},
        {key:'today-0',name:'Демо · Сегодня (0 дней)',amount:48,offset:0,lead:0,note:'Напоминание только в день платежа.'},
        {key:'lead-1',name:'Демо · Через 1 день',amount:12.50,offset:1,lead:1,note:'Напоминание за 1 день.'},
        {key:'recurring-3',name:'Демо · Повторяющаяся аренда',amount:650,offset:3,lead:3,cadence:'recurring',paymentCount:3,note:'Повторяющийся платёж и напоминание за 3 дня.'},
        {key:'lead-7',name:'Демо · Через 7 дней',amount:72,offset:7,lead:7,note:'Напоминание за 7 дней.'},
        {key:'lead-14',name:'Демо · Через 14 дней',amount:39,offset:14,lead:14,note:'Напоминание за 14 дней.'},
        {key:'lead-30',name:'Демо · Через 30 дней',amount:18,offset:30,lead:30,note:'Напоминание за 30 дней.'},
        {key:'outside-window',name:'Демо · Вне окна напоминания',amount:9.99,offset:5,lead:3,note:'Есть в календаре, но ещё не должен быть на Главной.'},
        {key:'personal',name:'Демо · Личный платёж Анны',amount:21,offset:2,lead:3,walletId:personal?.id,note:'Виден только в личном кошельке Анны.'},
        {key:'paid',name:'Демо · Уже оплачено',amount:11,offset:-1,lead:3,terminal:'paid',note:'Оплачен и исключён из активных напоминаний.'},
        {key:'skipped',name:'Демо · Пропущено',amount:7,offset:0,lead:0,terminal:'skipped',note:'Пропущен и исключён из активных напоминаний.'},
        {key:'postponed',name:'Демо · Перенесённый платёж',amount:33,offset:-1,lead:7,moveTo:4,note:'Перенесён только этот платёж.'}
      ];
      const created=[];
      for(const spec of specs){
        if(spec.key==='personal'&&!spec.walletId)continue;
        const walletId=spec.walletId||household.id,dueAt=attention.addDays(today,spec.offset);
        const result=obligations.createRule(state,{
          name:spec.name,amount:spec.amount,dueAt,cadence:spec.cadence||'once',
          intervalValue:1,intervalUnit:'month',endingMode:'count',paymentCount:spec.paymentCount||1,
          walletId,categoryId:category.id,currency:(state.wallets||[]).find(item=>item.id===walletId)?.nativeCurrency||'EUR',
          note:`${spec.note} · ${MARKER}${spec.key}`
        },state.currentMemberId,at);
        if(!result.ok)continue;
        attention.setRuleLeadDays(state,result.rule.id,spec.lead);
        const occurrence=result.occurrence;
        if(spec.terminal==='paid'&&occurrence)obligations.payOccurrence(state,occurrence.id,{amount:spec.amount,occurredAt:Math.min(at,attention.addDays(today,-1)+12*3600000),note:`Демо-оплата · ${MARKER}${spec.key}`},state.currentMemberId,at);
        if(spec.terminal==='skipped'&&occurrence)obligations.skipOccurrence(state,occurrence.id,state.currentMemberId,at);
        if(Number.isFinite(spec.moveTo)&&occurrence)obligations.moveOccurrence(state,occurrence.id,attention.addDays(today,spec.moveTo),state.currentMemberId,at);
        created.push({key:spec.key,ruleId:result.rule.id,occurrenceId:occurrence?.id||null});
      }
      state.config.paymentAttentionDemoVersion=VERSION;
      state.config.paymentAttentionDemoSeededAt=at;
      save();runtime.renderAll();renderPanel();
      if(notify)runtime.toast('Демо-платежи загружены.');
      return{ok:true,created};
    }

    function installPanel(){
      if(document.getElementById('paymentAttentionDemoPanel'))return;
      const screen=document.getElementById('obligationsScreen');if(!screen)return;
      const panel=document.createElement('section');panel.id='paymentAttentionDemoPanel';panel.className='card section';
      const firstCard=screen.querySelector('.card');if(firstCard?.nextSibling)screen.insertBefore(panel,firstCard.nextSibling);else screen.appendChild(panel);
      panel.addEventListener('click',event=>{
        if(event.target.closest('[data-payment-demo-load]'))load();
        if(event.target.closest('[data-payment-demo-remove]'))remove();
      });
    }

    function renderPanel(){
      const panel=document.getElementById('paymentAttentionDemoPanel');if(!panel)return;
      const count=demoRules().length;
      panel.innerHTML=`<div class="section-head"><div><h2>Демо платежей</h2><small class="analytics-data-basis">Все сроки и состояния для проверки</small></div></div><p class="obligation-help">${count?`Загружено ${count} сценариев. Даты можно пересоздать относительно сегодняшнего дня.`:'Демо-записи удалены. Обычные платежи не затрагиваются.'}</p><div class="sheet-actions"><button class="btn primary" type="button" data-payment-demo-load>${count?'Обновить демо':'Загрузить демо'}</button>${count?'<button class="btn secondary" type="button" data-payment-demo-remove>Удалить демо</button>':''}</div>`;
    }

    installPanel();
    attention.ensureReminderConfig(state);
    if(!testMode&&state.household?.id==='household-demo'&&state.config.paymentAttentionDemoVersion!==VERSION)load({notify:false});
    else renderPanel();

    const api={load:()=>load({notify:false}),remove:()=>remove({notify:false}),records,version:VERSION};
    function installTestApi(attempt=0){if(!testMode)return;if(window.__FP_TEST__){window.__FP_TEST__.paymentAttentionDemo=api;return}if(attempt<READY_LIMIT)setTimeout(()=>installTestApi(attempt+1),25)}
    installTestApi();
    window.__FP_M3_03_DEMO_READY__=true;
  }

  boot();
})();