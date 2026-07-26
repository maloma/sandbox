(()=>{
'use strict';
if(window.__FP_PLANNED_INCOME_AMOUNT_UI__)return;
const READY_LIMIT=1200,DAY=86400000,HISTORY_AGE=120*DAY;
function boot(attempt=0){
  const runtime=window.__FP_RUNTIME__,api=window.FamilyPilotPlannedIncome;
  if(!runtime||!api||!window.__FP_PLANNED_INCOME_UI_READY__){
    if(attempt<READY_LIMIT)setTimeout(()=>boot(attempt+1),25);
    else window.__FP_PLANNED_INCOME_AMOUNT_UI_ERROR__='Planned-income UI unavailable';
    return;
  }
  window.__FP_PLANNED_INCOME_AMOUNT_UI__=true;
  const state=runtime.state,scope=runtime.scopeApi,esc=runtime.esc,money=runtime.money,now=runtime.now;
  const occurrence=id=>(state.plannedIncomeOccurrences||[]).find(item=>item.id===id)||null;
  const rule=id=>(state.plannedIncomeRules||[]).find(item=>item.id===id)||null;
  const wallet=id=>(state.wallets||[]).find(item=>item.id===id)||null;
  const currency=item=>item?.currency||wallet(item?.walletId)?.nativeCurrency||state.household?.baseCurrency||'EUR';
  const formatDate=value=>new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(new Date(value));
  const day=value=>{const date=new Date(value);date.setHours(0,0,0,0);return date.getTime()};
  const visibleWalletIds=()=>{const active=scope.activeWallet(state);if(!active)return new Set();if(scope.isPersonalWallet(active))return new Set([active.id]);return new Set(scope.accessibleWallets(state).filter(item=>!scope.isPersonalWallet(item)).map(item=>item.id))};
  const statusLabel=(item,data)=>data.status==='received'?'Получено':data.status==='partial'?'Получено частично':day(item.dueAt)<day(now())?'Не поступило':day(item.dueAt)===day(now())?'Ожидается сегодня':'Запланировано';

  function cleanActions(){
    const modal=document.getElementById('plannedIncomeContextModal');
    if(modal){
      modal.querySelector('[data-income-action="received"]')?.remove();
      modal.querySelector('[data-income-action="skipped"]')?.remove();
      const record=modal.querySelector('[data-income-action="partial"]');
      if(record){record.textContent='Записать поступление';record.className='btn primary'}
      const detach=modal.querySelector('[data-income-action="unreceived"]');
      if(detach)detach.textContent='Изменить связанные поступления';
    }
    const receipt=document.getElementById('plannedIncomeReceiptModal');
    if(receipt){
      const title=document.getElementById('plannedIncomeReceiptTitle');if(title)title.textContent='Записать поступление';
      const input=document.getElementById('plannedIncomeReceiptAmount');
      const label=input?.closest('.field')?.querySelector('label');if(label)label.textContent='Фактически полученная сумма';
      const save=document.getElementById('plannedIncomeReceiptCreate');if(save)save.textContent='Сохранить приход';
    }
  }

  function installFilter(){
    if(document.getElementById('plannedIncomeViewFilter'))return;
    const screen=document.getElementById('plannedIncomeScreen');
    const head=[...(screen?.querySelectorAll('.section-head')||[])].find(node=>node.querySelector('h2')?.textContent.trim()==='Календарь приходов');
    if(!head)return;
    const select=document.createElement('select');
    select.id='plannedIncomeViewFilter';
    select.setAttribute('aria-label','Фильтр плановых приходов');
    select.innerHTML='<option value="current">Текущие</option><option value="history">История</option><option value="unreceived">Не поступили</option><option value="all">Все</option>';
    select.style.maxWidth='150px';
    head.appendChild(select);
    const list=document.createElement('div');
    list.id='plannedIncomeFilteredList';
    list.className='planned-income-list';
    list.hidden=true;
    document.getElementById('plannedIncomeList')?.after(list);
    select.addEventListener('change',renderFilter);
  }

  function filteredItems(mode){
    const ids=visibleWalletIds(),cutoff=now()-HISTORY_AGE;
    return(state.plannedIncomeOccurrences||[]).filter(item=>{
      if(!ids.has(item.walletId)||item.hidden)return false;
      const data=api.summary(state,item.id);
      if(mode==='history')return item.dueAt<cutoff;
      if(mode==='unreceived')return item.dueAt<day(now())&&data.received<.005;
      return true;
    }).sort((a,b)=>b.dueAt-a.dueAt||b.sequence-a.sequence);
  }

  function historyRow(item){
    const data=api.summary(state,item.id),label=statusLabel(item,data),amount=data.received>0?`${money(data.received,currency(item))} / ${money(data.expected,currency(item))}`:money(data.expected,currency(item));
    return`<article class="planned-income-row status-${data.status==='planned'?'overdue':data.status}" data-income-filtered="${esc(item.id)}"><div class="planned-income-main"><strong>${esc(rule(item.ruleId)?.name||'Плановый приход')}</strong><small>${esc(wallet(item.walletId)?.name||'Кошелёк')} · ${esc(label)}</small><div class="planned-income-value"><b>${amount}</b><span>${esc(formatDate(item.dueAt))}</span></div></div></article>`;
  }

  function trimCurrent(){
    const cutoff=now()-HISTORY_AGE;
    for(const row of document.querySelectorAll('#plannedIncomeList [data-income-occurrence]')){
      const item=occurrence(row.dataset.incomeOccurrence);
      row.hidden=!!item&&item.dueAt<cutoff;
    }
    for(const section of document.querySelectorAll('#plannedIncomeList .planned-income-day')){
      const rows=[...section.querySelectorAll('[data-income-occurrence]')];
      section.hidden=rows.length>0&&rows.every(row=>row.hidden);
    }
  }

  function fixPlanCard(){
    const ids=visibleWalletIds(),cutoff=now()-HISTORY_AGE,items=(state.plannedIncomeOccurrences||[]).filter(item=>ids.has(item.walletId)&&!item.hidden&&item.dueAt>=cutoff);
    const overdue=items.filter(item=>api.displayStatus(state,item,now())==='overdue').length;
    const today=items.filter(item=>api.displayStatus(state,item,now())==='due').length;
    const upcoming=items.filter(item=>api.displayStatus(state,item,now())==='planned'&&item.dueAt<=now()+7*DAY).length;
    const hint=document.getElementById('planIncomeHint'),status=document.getElementById('planIncomeState');
    if(!hint||!status)return;
    if(overdue){hint.textContent=`${overdue} ожидается с просрочкой`;status.textContent='Проверить'}
    else if(today){hint.textContent=`Сегодня ${today}`;status.textContent='Сегодня'}
    else if(upcoming){hint.textContent=`Скоро ${upcoming}`;status.textContent='Скоро'}
    else{hint.textContent='Ожидаемые поступления';status.textContent='Открыть'}
  }

  function fixRuleCards(){
    for(const card of document.querySelectorAll('[data-income-rule]')){
      const item=rule(card.dataset.incomeRule),copy=card.querySelector('small');
      if(!item||!copy||item.status==='disabled')continue;
      const next=(state.plannedIncomeOccurrences||[]).filter(entry=>entry.ruleId===item.id&&entry.dueAt>=day(now())&&api.summary(state,entry.id).status!=='received').sort((a,b)=>a.dueAt-b.dueAt)[0];
      const suffix=copy.textContent.includes(' · ')?copy.textContent.slice(copy.textContent.indexOf(' · ')):'';
      copy.textContent=(next?`Ближайший: ${formatDate(next.dueAt)}`:'Нет ближайшего прихода')+suffix;
    }
  }

  function renderFilter(){
    cleanActions();installFilter();trimCurrent();fixPlanCard();fixRuleCards();
    const select=document.getElementById('plannedIncomeViewFilter'),current=document.getElementById('plannedIncomeList'),filtered=document.getElementById('plannedIncomeFilteredList');
    if(!select||!current||!filtered)return;
    if(select.value==='current'){current.hidden=false;filtered.hidden=true;return}
    const items=filteredItems(select.value);
    current.hidden=true;filtered.hidden=false;
    filtered.innerHTML=items.length?items.map(historyRow).join(''):'<div class="obligation-empty">По выбранному фильтру записей нет.</div>';
  }

  const observer=new MutationObserver(()=>queueMicrotask(renderFilter));
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  installFilter();renderFilter();
  window.FamilyPilotPlannedIncomeAmountUI=Object.freeze({renderFilter,filteredItems,historyAge:HISTORY_AGE});
  if(new URLSearchParams(location.search).has('test')){
    const install=(attempt=0)=>{if(window.__FP_TEST__){window.__FP_TEST__.plannedIncomeAmountUI=window.FamilyPilotPlannedIncomeAmountUI;return}if(attempt<READY_LIMIT)setTimeout(()=>install(attempt+1),25)};
    install();
  }
  window.__FP_M4_02_AMOUNT_UI_READY__=true;
}
boot();
})();