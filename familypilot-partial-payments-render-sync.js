(()=>{
  'use strict';
  if(window.__FP_PARTIAL_PAYMENTS_RENDER_SYNC__)return;
  const READY_LIMIT=1200,EPSILON=.005;

  function boot(attempt=0){
    const runtime=window.__FP_RUNTIME__,payments=window.FamilyPilotPartialPayments,attention=window.FamilyPilotPaymentAttention;
    if(!runtime||!payments||!attention||!window.__FP_PARTIAL_PAYMENTS_READY__){
      if(attempt<READY_LIMIT)setTimeout(()=>boot(attempt+1),25);
      else window.__FP_PARTIAL_PAYMENTS_RENDER_SYNC_ERROR__='Partial payment render dependencies did not become ready';
      return;
    }
    window.__FP_PARTIAL_PAYMENTS_RENDER_SYNC__=true;
    const state=runtime.state,scopeApi=runtime.scopeApi,esc=runtime.esc,money=runtime.money,now=runtime.now;
    const occurrence=id=>(state.obligationOccurrences||[]).find(item=>item.id===id)||null;
    const operation=id=>(state.operations||[]).find(item=>item.id===id)||null;
    const wallet=id=>(state.wallets||[]).find(item=>item.id===id)||null;
    const currency=item=>item?.currency||wallet(item?.walletId)?.nativeCurrency||state.household?.baseCurrency||'EUR';
    const list=document.getElementById('obligationList');
    let syncing=false,scheduled=false,observer=null;

    function decorateRows(){
      for(const row of document.querySelectorAll('#obligationList [data-obligation-occurrence]')){
        const item=occurrence(row.dataset.obligationOccurrence);if(!item)continue;
        const data=payments.summary(item.id),copy=row.querySelector('.obligation-row-copy small'),value=row.querySelector('.obligation-row-value strong'),button=row.querySelector('[data-state-payment-toggle]');
        row.classList.toggle('obligation-row--partial',data.status==='partial');
        if(data.status==='partial'){
          const copyHtml=`${esc(wallet(item.walletId)?.name||'Кошелёк')} · <span class="partial-payment-progress">Оплачено ${money(data.paid,currency(item))} из ${money(data.expected,currency(item))} · Осталось ${money(data.remaining,currency(item))}</span>`;
          if(copy&&copy.innerHTML!==copyHtml)copy.innerHTML=copyHtml;
          const valueText=`${money(data.paid,currency(item))} / ${money(data.expected,currency(item))}`;
          if(value&&value.textContent!==valueText)value.textContent=valueText;
          if(button){button.classList.add('is-partial');if(button.textContent!=='½')button.textContent='½';button.setAttribute('aria-label','Добавить ещё одну оплату')}
        }else if(button){button.classList.remove('is-partial')}
        if(data.status==='paid'&&data.operations.length>1){
          const copyHtml=`${esc(wallet(item.walletId)?.name||'Кошелёк')} · Оплачено ${money(data.paid,currency(item))}${data.overpaid?` · Переплата ${money(data.overpaid,currency(item))}`:''}`;
          if(copy&&copy.innerHTML!==copyHtml)copy.innerHTML=copyHtml;
          const valueText=`${money(data.paid,currency(item))} / ${money(data.expected,currency(item))}`;
          if(value&&value.textContent!==valueText)value.textContent=valueText;
        }
      }
      for(const group of document.querySelectorAll('#obligationList .obligation-date-group')){
        const visible=[...group.querySelectorAll('[data-obligation-occurrence]')].filter(row=>!row.hidden).map(row=>occurrence(row.dataset.obligationOccurrence)).filter(Boolean),totals=new Map();
        for(const item of visible){
          if(['paid','skipped','cancelled'].includes(item.status))continue;
          const data=payments.summary(item.id),code=currency(item),needed=data.status==='partial'?data.remaining:Number(item.expectedAmount||0);
          totals.set(code,(totals.get(code)||0)+needed);
        }
        const plan=group.querySelector('.obligation-day-plan small'),next=totals.size?`Запланировать: ${[...totals].map(([code,value])=>money(value,code)).join(' · ')}`:'Всё отмечено';
        if(plan&&plan.textContent!==next)plan.textContent=next;
      }
    }

    function updatePlanIndicator(){
      const hidden=state.config?.hiddenObligationOccurrencesById||{},groups=attention.groupedAttention(state,scopeApi,now());
      const valid=items=>items.filter(entry=>!hidden[entry.occurrence.id]&&payments.summary(entry.occurrence.id).remaining>EPSILON);
      const overdue=valid(groups.overdue).length,today=valid(groups.today).length,upcoming=valid(groups.upcoming).length;
      const badge=document.querySelector('.bottom [data-screen="plans"] .plan-attention-badge');
      if(badge){const urgent=overdue+today;badge.hidden=!(urgent||upcoming);badge.textContent=urgent?String(Math.min(99,urgent)):'';badge.classList.toggle('overdue',overdue>0);badge.classList.toggle('upcoming',!urgent&&upcoming>0)}
      const module=document.querySelector('[data-plan-module="obligations"]'),hint=document.getElementById('planObligationHint'),status=document.getElementById('planObligationState');
      if(!module||!hint||!status)return;
      module.classList.remove('attention-overdue','attention-today','attention-upcoming');
      if(overdue){module.classList.add('attention-overdue');hint.textContent=`${overdue} просрочено`;status.textContent='Проверить'}
      else if(today){module.classList.add('attention-today');hint.textContent=`Сегодня ${today} плат.`;status.textContent='Сегодня'}
      else if(upcoming){module.classList.add('attention-upcoming');hint.textContent=`Скоро ${upcoming} плат.`;status.textContent='Скоро'}
      else{hint.textContent='Платежи и сроки';status.textContent='Открыть'}
    }

    function observe(){if(observer&&list)observer.observe(list,{childList:true,subtree:true})}
    function sync(){
      if(syncing)return;
      syncing=true;
      observer?.disconnect();
      try{payments.deriveAll();decorateRows();updatePlanIndicator()}
      finally{syncing=false;observe()}
    }
    function schedule(){if(scheduled||syncing)return;scheduled=true;queueMicrotask(()=>{scheduled=false;sync()})}

    const previous=runtime.getRenderAll();
    runtime.setRenderAll(()=>{const result=previous();sync();return result});
    if(list){observer=new MutationObserver(schedule);observe()}
    sync();

    if(new URLSearchParams(location.search).has('test')){
      const install=(n=0)=>{
        if(window.__FP_TEST__){
          window.__FP_TEST__.renderAll=()=>runtime.renderAll();
          window.__FP_TEST__.partialPayments=Object.freeze({
            ...payments,
            render:sync,
            attachOperation:(occurrenceId,candidate)=>payments.attachOperation(occurrenceId,operation(candidate?.id)||candidate)
          });
          return;
        }
        if(n<READY_LIMIT)setTimeout(()=>install(n+1),25);
      };
      install();
    }
    window.__FP_PARTIAL_PAYMENTS_RENDER_SYNC_READY__=true;
  }
  boot();
})();
