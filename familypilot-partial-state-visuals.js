(()=>{
  'use strict';
  if(window.__FP_PARTIAL_STATE_VISUALS__)return;
  const READY_LIMIT=1200;

  function boot(attempt=0){
    const runtime=window.__FP_RUNTIME__,payments=window.FamilyPilotPartialPayments,obligations=window.FamilyPilotObligations;
    if(!runtime||!payments||!obligations||!window.__FP_PARTIAL_PAYMENTS_READY__){
      if(attempt<READY_LIMIT)setTimeout(()=>boot(attempt+1),25);
      else window.__FP_PARTIAL_STATE_VISUALS_ERROR__='Partial-state visual dependencies did not become ready';
      return;
    }
    window.__FP_PARTIAL_STATE_VISUALS__=true;
    const state=runtime.state,now=runtime.now;
    const occurrence=id=>(state.obligationOccurrences||[]).find(item=>item.id===id)||null;

    const style=document.createElement('style');
    style.id='familypilot-partial-state-visuals-style';
    style.textContent=`
      .obligation-row.obligation-row--partial{border-color:color-mix(in srgb,#d99a00 56%,var(--line))!important;background:color-mix(in srgb,#d99a00 9%,var(--card))!important}
      .obligation-row.obligation-row--partial .obligation-status{background:color-mix(in srgb,#d99a00 18%,var(--card2))!important;color:#b87900!important}
      .obligation-row.obligation-row--partial.partial-time--today{box-shadow:inset 3px 0 0 var(--blue),var(--shadow)!important}
      .obligation-row.obligation-row--partial.partial-time--overdue{border-color:color-mix(in srgb,var(--red) 72%,#d99a00)!important;box-shadow:inset 3px 0 0 var(--red),var(--shadow)!important}
      .partial-time-indicator{display:inline-flex;align-items:center;min-height:22px;margin-left:6px;padding:3px 8px;border-radius:999px;font-size:10px;font-weight:950;vertical-align:middle}
      .partial-time-indicator.today{background:color-mix(in srgb,var(--blue) 14%,var(--card2));color:var(--blue);border:1px solid color-mix(in srgb,var(--blue) 45%,var(--line))}
      .partial-time-indicator.overdue{background:color-mix(in srgb,var(--red) 14%,var(--card2));color:var(--red);border:1px solid color-mix(in srgb,var(--red) 48%,var(--line))}
    `;
    document.head.appendChild(style);

    function decorate(){
      for(const row of document.querySelectorAll('#obligationList [data-obligation-occurrence]')){
        const item=occurrence(row.dataset.obligationOccurrence);if(!item)continue;
        const summary=payments.summary(item.id),partial=summary.status==='partial',timeStatus=partial?obligations.occurrenceDisplayStatus(item,now()):'';
        row.classList.toggle('partial-time--today',partial&&timeStatus==='due');
        row.classList.toggle('partial-time--overdue',partial&&timeStatus==='overdue');
        row.querySelector('.partial-time-indicator')?.remove();
        if(!partial)continue;
        const status=row.querySelector('.obligation-status');
        if(status)status.textContent='Частично оплачено';
        if(timeStatus==='due'||timeStatus==='overdue'){
          const indicator=document.createElement('span');
          indicator.className=`partial-time-indicator ${timeStatus==='due'?'today':'overdue'}`;
          indicator.textContent=timeStatus==='due'?'Сегодня':'Просрочено';
          status?.after(indicator);
        }
      }
    }

    const previous=runtime.getRenderAll();
    runtime.setRenderAll(()=>{const result=previous();decorate();return result});
    decorate();

    if(new URLSearchParams(location.search).has('test')){
      const api={decorate,stateFor:id=>{const item=occurrence(id),summary=payments.summary(id),timeStatus=item?obligations.occurrenceDisplayStatus(item,now()):null;return{partial:summary.status==='partial',timeStatus,rowClass:document.querySelector(`[data-obligation-occurrence="${CSS.escape(id)}"]`)?.className||'',indicator:document.querySelector(`[data-obligation-occurrence="${CSS.escape(id)}"] .partial-time-indicator`)?.textContent||''}}};
      const install=(n=0)=>{if(window.__FP_TEST__){window.__FP_TEST__.partialStateVisuals=api;return}if(n<READY_LIMIT)setTimeout(()=>install(n+1),25)};install();
    }
    window.__FP_PARTIAL_STATE_VISUALS_READY__=true;
  }
  boot();
})();