(()=>{
  'use strict';

  if(window.__FP_OBLIGATION_STATE_UI__)return;
  const READY_LIMIT=1200;
  const PRESS_MS=550;
  const HIDDEN_KEY='hiddenObligationOccurrencesById';
  const terminal=new Set(['paid','skipped','cancelled']);

  function boot(attempt=0){
    const runtime=window.__FP_RUNTIME__;
    const obligations=window.FamilyPilotObligations;
    const attention=window.FamilyPilotPaymentAttention;
    if(!runtime||!obligations||!attention||!window.__FP_M3_03_READY__){
      if(attempt<READY_LIMIT)setTimeout(()=>boot(attempt+1),25);
      else window.__FP_OBLIGATION_STATE_UI_ERROR__='Obligation state dependencies did not become ready';
      return;
    }
    window.__FP_OBLIGATION_STATE_UI__=true;

    const state=runtime.state;
    const scopeApi=runtime.scopeApi;
    const $=runtime.$;
    const esc=runtime.esc;
    const money=runtime.money;
    const save=runtime.save;
    const open=runtime.open;
    const close=runtime.close;
    const now=runtime.now;
    let contextOccurrenceId='';
    let pressTimer=0;
    let suppressClickUntil=0;

    const occurrence=id=>(state.obligationOccurrences||[]).find(item=>item.id===id)||null;
    const rule=id=>(state.obligationRules||[]).find(item=>item.id===id)||null;
    const wallet=id=>(state.wallets||[]).find(item=>item.id===id)||null;
    const currency=item=>item?.currency||wallet(item?.walletId)?.nativeCurrency||state.household?.baseCurrency||'EUR';
    const plural=(n,a,b,c)=>n%10===1&&n%100!==11?a:(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20)?b:c);
    const formatDate=value=>new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(new Date(value));
    const statusLabel=status=>({overdue:'Просрочено',due:'Сегодня',paid:'Оплачено',postponed:'Перенесён',skipped:'Пропущено',cancelled:'Отменено',planned:'Запланировано'}[status]||status);

    function hiddenMap(){
      state.config=state.config&&typeof state.config==='object'?state.config:{};
      const current=state.config[HIDDEN_KEY];
      state.config[HIDDEN_KEY]=current&&typeof current==='object'&&!Array.isArray(current)?current:{};
      return state.config[HIDDEN_KEY];
    }
    function isHidden(id){return !!hiddenMap()[id]}
    function visibleWalletIds(){
      const selected=scopeApi.activeWallet(state);
      if(!selected)return new Set();
      if(scopeApi.isPersonalWallet(selected))return new Set([selected.id]);
      return new Set(scopeApi.accessibleWallets(state).filter(item=>!scopeApi.isPersonalWallet(item)).map(item=>item.id));
    }
    function addRevision(target,source,changes){
      target.revisions=Array.isArray(target.revisions)?target.revisions:[];
      target.revisions.push({
        id:`state-rev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,
        sequence:target.revisions.length+1,
        changedAt:now(),
        changedByMemberId:state.currentMemberId,
        source,
        changes
      });
      target.lastEditedAt=now();
    }

    function installStyle(){
      $('familypilot-obligation-state-style')?.remove();
      const style=document.createElement('style');
      style.id='familypilot-obligation-state-style';
      style.textContent=`
        .payment-context-actions{gap:10px!important}
        .payment-context-actions button{width:100%!important;min-height:58px!important;padding:13px 16px!important;border-radius:16px!important;font-size:15px!important;touch-action:manipulation}
        .payment-context-actions button:disabled{opacity:.5;filter:saturate(.55)}
        .obligation-row--due{border-color:color-mix(in srgb,var(--blue) 55%,var(--line))!important;background:color-mix(in srgb,var(--blue) 9%,var(--card))!important}
        .obligation-date-group.is-today{border-color:color-mix(in srgb,var(--blue) 48%,var(--line))!important}
        .plan-module.attention-today{border-color:color-mix(in srgb,var(--blue) 55%,var(--line))!important;background:color-mix(in srgb,var(--blue) 8%,var(--card))!important}
        .plan-module.attention-today .plan-module-state{color:var(--blue)!important}
        .obligation-row--skipped{opacity:1!important;border-color:color-mix(in srgb,var(--muted) 45%,var(--line))!important;background:color-mix(in srgb,var(--muted) 8%,var(--card))!important}
        .obligation-pay-check.is-skipped{background:color-mix(in srgb,var(--muted) 12%,var(--card))!important;color:var(--muted)!important}
        .hidden-obligations-section{margin-top:18px}
        .hidden-obligations-section summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;font-weight:950;min-height:44px}
        .hidden-obligations-section summary::-webkit-details-marker{display:none}
        .hidden-obligations-section summary::after{content:'⌄';color:var(--muted);font-size:18px;transition:transform .16s ease}
        .hidden-obligations-section[open] summary::after{transform:rotate(180deg)}
        .hidden-obligations-count{margin-left:auto;margin-right:8px;min-width:24px;height:24px;border-radius:999px;background:var(--card2);border:1px solid var(--line);display:grid;place-items:center;font-size:11px;color:var(--muted)}
        .hidden-obligations-list{display:grid;gap:8px;margin-top:12px}
        .hidden-obligation-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:11px;border:1px solid var(--line);border-radius:15px;background:color-mix(in srgb,var(--muted) 7%,var(--card2));color:var(--ink)}
        .hidden-obligation-row strong,.hidden-obligation-row small{display:block}
        .hidden-obligation-row small{margin-top:3px;color:var(--muted);font-size:11px}
        .hidden-obligation-actions{text-align:right}
        .hidden-obligation-actions strong{font-size:14px;white-space:nowrap}
        .hidden-obligation-actions button{margin-top:6px;min-height:38px;border:1px solid var(--line);border-radius:12px;background:var(--card);color:var(--ink);font-weight:900;padding:7px 10px}
      `;
      document.head.appendChild(style);
    }

    function installContextAction(){
      const modal=$('paymentContextModal');
      if(!modal)return;
      const remove=modal.querySelector('[data-payment-context-action="delete"]');
      if(remove){
        remove.dataset.paymentContextAction='hide';
        remove.textContent='Скрыть';
        remove.classList.remove('danger');
        remove.classList.add('secondary');
      }
    }

    function updateContextState(id=contextOccurrenceId){
      const item=occurrence(id);
      const modal=$('paymentContextModal');
      if(!item||!modal)return;
      const buttons={
        paid:modal.querySelector('[data-payment-context-action="paid"]'),
        unpaid:modal.querySelector('[data-payment-context-action="unpaid"]'),
        skipped:modal.querySelector('[data-payment-context-action="skipped"]'),
        hide:modal.querySelector('[data-payment-context-action="hide"]')
      };
      if(buttons.paid){buttons.paid.disabled=item.status==='paid';buttons.paid.textContent=item.status==='paid'?'Уже оплачено':'Оплачено'}
      if(buttons.unpaid){const already=item.status==='planned';buttons.unpaid.disabled=already;buttons.unpaid.textContent=already?'Уже не оплачено':'Не оплачено'}
      if(buttons.skipped){buttons.skipped.disabled=item.status==='skipped';buttons.skipped.textContent=item.status==='skipped'?'Уже пропущено':'Пропущено'}
      if(buttons.hide){buttons.hide.textContent='Скрыть'}
    }

    function proxyToggle(id){
      const proxy=document.createElement('button');
      proxy.hidden=true;
      proxy.dataset.uxPaymentToggle=id;
      document.body.appendChild(proxy);
      proxy.click();
      proxy.remove();
    }
    function proxyContext(id){
      contextOccurrenceId=id;
      const proxy=document.createElement('button');
      proxy.hidden=true;
      proxy.dataset.uxPaymentToggle=id;
      document.body.appendChild(proxy);
      proxy.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}));
      proxy.remove();
      queueMicrotask(()=>updateContextState(id));
    }

    function restoreSkipped(id){
      const item=occurrence(id);
      if(!item||item.status!=='skipped')return false;
      addRevision(item,'obligation_skip_unchecked',[
        {field:'status',oldValue:'skipped',newValue:'planned'},
        {field:'skippedAt',oldValue:item.skippedAt,newValue:null}
      ]);
      item.status='planned';
      item.skippedAt=null;
      save();
      runtime.renderAll();
      runtime.toast('Отметка «Пропущено» снята.');
      return true;
    }

    function hideOccurrence(id){
      const item=occurrence(id);
      if(!item)return false;
      hiddenMap()[id]={hiddenAt:now(),hiddenByMemberId:state.currentMemberId};
      addRevision(item,'obligation_hidden',[{field:'hidden',oldValue:false,newValue:true}]);
      save();
      close('paymentContextModal');
      runtime.renderAll();
      runtime.toast('Платёж скрыт. Он доступен внизу списка.');
      return true;
    }
    function showOccurrence(id){
      const item=occurrence(id);
      if(!item)return false;
      delete hiddenMap()[id];
      addRevision(item,'obligation_unhidden',[{field:'hidden',oldValue:true,newValue:false}]);
      save();
      runtime.renderAll();
      runtime.toast('Платёж снова показан.');
      return true;
    }

    function decorateToggleButtons(){
      for(const button of document.querySelectorAll('[data-ux-payment-toggle]:not([data-state-compat])')){
        const id=button.dataset.uxPaymentToggle;
        button.removeAttribute('data-ux-payment-toggle');
        button.dataset.statePaymentToggle=id;
        const item=occurrence(id);
        if(item?.status==='skipped')button.setAttribute('aria-label','Снять отметку «Пропущено»');
        const row=button.closest('[data-obligation-occurrence]');
        if(row&&!row.querySelector('[data-state-compat="'+CSS.escape(id)+'"]')){
          const compat=document.createElement('button');
          compat.type='button';
          compat.hidden=true;
          compat.tabIndex=-1;
          compat.dataset.uxPaymentToggle=id;
          compat.dataset.stateCompat=id;
          compat.setAttribute('aria-hidden','true');
          row.appendChild(compat);
        }
      }
    }

    function groupOpenItems(items){return items.filter(item=>!terminal.has(item.status))}
    function totals(items){
      const values=new Map();
      for(const item of groupOpenItems(items))values.set(currency(item),(values.get(currency(item))||0)+Number(item.expectedAmount||0));
      return [...values].map(([code,value])=>money(value,code)).join(' · ')||'0 €';
    }
    function refreshGroup(group){
      const rows=[...group.querySelectorAll('[data-obligation-occurrence]')].filter(row=>!row.hidden);
      const items=rows.map(row=>occurrence(row.dataset.obligationOccurrence)).filter(Boolean);
      if(!items.length){group.hidden=true;return}
      group.hidden=false;
      group.classList.toggle('is-multi',items.length>1);
      const openItems=groupOpenItems(items);
      const overdue=openItems.some(item=>obligations.occurrenceDisplayStatus(item,now())==='overdue');
      const today=openItems.some(item=>obligations.occurrenceDisplayStatus(item,now())==='due');
      group.classList.toggle('has-overdue',overdue);
      group.classList.toggle('is-today',today&&!overdue);
      const plan=group.querySelector('.obligation-day-plan');
      if(plan){
        plan.innerHTML=`<strong>${items.length} ${plural(items.length,'платёж','платежа','платежей')}</strong><small>${openItems.length?`Запланировать: ${esc(totals(items))}`:'Всё отмечено'}</small>`;
      }
    }

    function hiddenItems(){
      const allowed=visibleWalletIds();
      const ids=hiddenMap();
      return (state.obligationOccurrences||[])
        .filter(item=>ids[item.id]&&allowed.has(item.walletId))
        .sort((a,b)=>b.dueAt-a.dueAt||b.sequence-a.sequence);
    }
    function renderHiddenSection(){
      const screen=$('obligationsScreen');
      if(!screen)return;
      $('hiddenObligationsSection')?.remove();
      const items=hiddenItems();
      if(!items.length)return;
      const section=document.createElement('details');
      section.id='hiddenObligationsSection';
      section.className='card section hidden-obligations-section';
      section.innerHTML=`<summary><span>Скрытые платежи</span><span class="hidden-obligations-count">${items.length}</span></summary><div class="hidden-obligations-list">${items.map(item=>{
        const itemRule=rule(item.ruleId);
        const status=obligations.occurrenceDisplayStatus(item,now());
        const amount=item.status==='paid'&&item.actualAmount!=null?item.actualAmount:item.expectedAmount;
        return`<div class="hidden-obligation-row" data-hidden-obligation="${esc(item.id)}"><span><strong>${esc(itemRule?.name||'Обязательство')}</strong><small>${esc(formatDate(item.dueAt))} · ${esc(statusLabel(status))}</small></span><span class="hidden-obligation-actions"><strong>${money(amount,currency(item))}</strong><button type="button" data-show-obligation="${esc(item.id)}">Показать снова</button></span></div>`;
      }).join('')}</div>`;
      screen.appendChild(section);
    }

    function applyHiddenRows(){
      for(const row of document.querySelectorAll('#obligationList [data-obligation-occurrence]')){
        row.hidden=isHidden(row.dataset.obligationOccurrence);
      }
      for(const group of document.querySelectorAll('#obligationList .obligation-date-group'))refreshGroup(group);
      renderHiddenSection();
    }

    function updatePlanIndicator(){
      const groups=attention.groupedAttention(state,scopeApi,now());
      const filtered={
        overdue:groups.overdue.filter(item=>!isHidden(item.occurrence.id)),
        today:groups.today.filter(item=>!isHidden(item.occurrence.id)),
        upcoming:groups.upcoming.filter(item=>!isHidden(item.occurrence.id))
      };
      const overdue=filtered.overdue.length;
      const today=filtered.today.length;
      const upcoming=filtered.upcoming.length;
      const nav=document.querySelector('.bottom [data-screen="plans"]');
      const badge=nav?.querySelector('.plan-attention-badge');
      if(badge){
        const urgent=overdue+today;
        badge.hidden=!(urgent||upcoming);
        badge.textContent=urgent?String(Math.min(99,urgent)):'';
        badge.classList.toggle('overdue',overdue>0);
        badge.classList.toggle('upcoming',!urgent&&upcoming>0);
      }
      const module=document.querySelector('[data-plan-module="obligations"]');
      const hint=$('planObligationHint');
      const stateNode=$('planObligationState');
      if(!module||!hint||!stateNode)return;
      module.classList.remove('attention-overdue','attention-today','attention-upcoming');
      if(overdue){module.classList.add('attention-overdue');hint.textContent=`${overdue} просрочено`;stateNode.textContent='Проверить'}
      else if(today){module.classList.add('attention-today');hint.textContent=`Сегодня ${today} ${plural(today,'платёж','платежа','платежей')}`;stateNode.textContent='Сегодня'}
      else if(upcoming){module.classList.add('attention-upcoming');hint.textContent=`Скоро ${upcoming} ${plural(upcoming,'платёж','платежа','платежей')}`;stateNode.textContent='Скоро'}
      else{hint.textContent='Платежи и сроки';stateNode.textContent='Открыть'}
    }

    function render(){
      installContextAction();
      decorateToggleButtons();
      applyHiddenRows();
      updatePlanIndicator();
    }

    installStyle();
    hiddenMap();
    const previous=runtime.getRenderAll();
    runtime.setRenderAll(()=>{previous();render()});
    render();

    document.addEventListener('pointerdown',event=>{
      const toggle=event.target.closest?.('[data-state-payment-toggle]');
      if(!toggle)return;
      clearTimeout(pressTimer);
      const id=toggle.dataset.statePaymentToggle;
      pressTimer=setTimeout(()=>{
        suppressClickUntil=Date.now()+900;
        proxyContext(id);
        navigator.vibrate?.(20);
      },PRESS_MS);
    },true);
    for(const type of ['pointerup','pointercancel','pointerleave'])document.addEventListener(type,()=>{clearTimeout(pressTimer);pressTimer=0},true);
    document.addEventListener('contextmenu',event=>{
      const toggle=event.target.closest?.('[data-state-payment-toggle]');
      if(!toggle)return;
      event.preventDefault();
      event.stopImmediatePropagation();
      proxyContext(toggle.dataset.statePaymentToggle);
    },true);
    document.addEventListener('click',event=>{
      const layer=event.target;
      if(layer?.matches?.('.modal.open,.overlay.open')&&layer.id){
        event.preventDefault();
        suppressClickUntil=0;
        close(layer.id);
        return;
      }
      if(event.target.closest?.('[data-payment-context-action]'))suppressClickUntil=0;
      const show=event.target.closest?.('[data-show-obligation]');
      if(show){event.preventDefault();event.stopImmediatePropagation();showOccurrence(show.dataset.showObligation);return}
      const hide=event.target.closest?.('[data-payment-context-action="hide"]');
      if(hide){event.preventDefault();event.stopImmediatePropagation();hideOccurrence(contextOccurrenceId);return}
      const toggle=event.target.closest?.('[data-state-payment-toggle]');
      if(!toggle)return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if(Date.now()<suppressClickUntil)return;
      const id=toggle.dataset.statePaymentToggle;
      const item=occurrence(id);
      if(item?.status==='skipped'){restoreSkipped(id);return}
      proxyToggle(id);
    },true);

    const testApi={
      isHidden,hideOccurrence,showOccurrence,restoreSkipped,render,openContext:proxyContext,
      hiddenItems:()=>hiddenItems().map(item=>item.id),
      contextButtonHeight:()=>Math.round($('paymentContextModal')?.querySelector('[data-payment-context-action="skipped"]')?.getBoundingClientRect().height||0),
      backdropClose:id=>{const modal=$(id);if(!modal)return false;modal.click();return !modal.classList.contains('open')}
    };
    function installTest(attempt=0){
      if(!new URLSearchParams(location.search).has('test'))return;
      if(window.__FP_TEST__){window.__FP_TEST__.obligationState=testApi;return}
      if(attempt<READY_LIMIT)setTimeout(()=>installTest(attempt+1),25);
    }
    installTest();
    window.__FP_OBLIGATION_STATE_UI_READY__=true;
  }

  boot();
})();
