(()=>{
  'use strict';
  if(window.__FP_PARTIAL_PAYMENT_ENTRY_UI__)return;
  const READY_LIMIT=1200,PREVIEW_LIMIT=3,DAY=86400000,EPSILON=.005;

  function boot(attempt=0){
    const runtime=window.__FP_RUNTIME__,payments=window.FamilyPilotPartialPayments,resolver=window.FamilyPilotOverpaymentResolution;
    const modal=document.getElementById('partialPaymentModal');
    if(!runtime||!payments||!resolver||!window.__FP_PARTIAL_PAYMENTS_READY__||!window.__FP_OVERPAYMENT_RESOLUTION_READY__||!modal){
      if(attempt<READY_LIMIT)setTimeout(()=>boot(attempt+1),25);
      else window.__FP_PARTIAL_PAYMENT_ENTRY_UI_ERROR__='Partial payment entry dependencies did not become ready';
      return;
    }
    window.__FP_PARTIAL_PAYMENT_ENTRY_UI__=true;
    const $=runtime.$,state=runtime.state,now=runtime.now,open=runtime.open,close=runtime.close,money=runtime.money,esc=runtime.esc;
    let lastOpen=false,refreshing=false,pending=null,lastOccurrenceId='';
    const pad=value=>String(value).padStart(2,'0');
    const localDateTime=value=>{const date=new Date(value);return`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`};
    const parseDate=value=>{const parsed=new Date(value).getTime();return Number.isFinite(parsed)?parsed:NaN};
    const parseAmount=value=>Number(String(value??'').replace(',','.'));
    const sameCents=(a,b)=>Math.round(Number(a||0)*100)===Math.round(Number(b||0)*100);
    const dayNumber=value=>{const date=new Date(Number(value));return Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())/DAY};
    const formatDateTime=value=>new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
    const occurrence=id=>(state.obligationOccurrences||[]).find(item=>item.id===id)||null;
    const rule=id=>(state.obligationRules||[]).find(item=>item.id===id)||null;
    const operation=id=>(state.operations||[]).find(item=>item.id===id)||null;
    const wallet=id=>(state.wallets||[]).find(item=>item.id===id)||null;
    const allocationOccurrenceId=op=>op?.links?.obligationOccurrenceId||op?.links?.obligationAllocationOccurrenceId||null;

    const style=document.createElement('style');
    style.id='familypilot-partial-payment-entry-style';
    style.textContent=`
      .partial-payment-entry-card{margin-top:14px;padding:13px;border:1px solid color-mix(in srgb,#d99a00 46%,var(--line));border-radius:16px;background:color-mix(in srgb,#d99a00 7%,var(--card2))}
      .partial-payment-entry-card h3{margin:0 0 4px;font-size:15px}.partial-payment-entry-card>small{display:block;margin-bottom:11px;color:var(--muted);font-size:11px;line-height:1.35}
      .partial-payment-entry-card .field{margin-top:10px}.partial-payment-entry-card .field:first-of-type{margin-top:0}.partial-payment-entry-card .sheet-actions{margin-top:10px}.partial-payment-entry-card [data-partial-reconcile-start]{width:100%}
      .partial-linked-section{margin-top:14px}.partial-linked-section h3{margin:0 0 7px;font-size:13px}.partial-linked-section[hidden]{display:none!important}
      #partialExistingOperationDetails{display:none!important}
      .partial-reconcile-copy,.partial-overpayment-copy{margin:0 0 12px;color:var(--muted);font-size:12px;line-height:1.45}
      .partial-reconcile-list{display:grid;gap:9px}
      .partial-reconcile-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:12px;border:1px solid var(--line);border-radius:15px;background:var(--card2)}
      .partial-reconcile-item strong,.partial-reconcile-item small{display:block}.partial-reconcile-item small{margin-top:3px;color:var(--muted);font-size:10px;line-height:1.35}
      .partial-reconcile-item button{min-height:42px}
      .partial-reconcile-actions,.partial-overpayment-actions{display:grid;gap:8px;margin-top:14px}.partial-reconcile-actions button,.partial-overpayment-actions button{width:100%;min-height:50px}
      .partial-overpayment-summary{padding:12px;border:1px solid color-mix(in srgb,#d99a00 55%,var(--line));border-radius:15px;background:color-mix(in srgb,#d99a00 9%,var(--card2));margin-bottom:12px}
      .partial-overpayment-summary strong,.partial-overpayment-summary small{display:block}.partial-overpayment-summary small{margin-top:4px;color:var(--muted)}
    `;
    document.head.appendChild(style);

    const sheet=modal.querySelector('.sheet'),summary=$('partialPaymentSummary'),linkedList=$('partialLinkedList'),candidateSection=$('partialCandidateSection'),candidateList=$('partialCandidateList'),field=$('partialPaymentAmount')?.closest('.field'),error=$('partialPaymentError'),actions=sheet?.querySelector('.sheet-actions');
    if(!sheet||!summary||!linkedList||!candidateSection||!candidateList||!field||!error||!actions){window.__FP_PARTIAL_PAYMENT_ENTRY_UI_ERROR__='Partial payment modal structure unavailable';return}

    const linkedSection=document.createElement('section');linkedSection.id='partialLinkedSection';linkedSection.className='partial-linked-section';linkedSection.innerHTML='<h3>Уже оплачено частями</h3>';linkedSection.appendChild(linkedList);
    const entryCard=document.createElement('section');entryCard.id='partialPaymentEntryCard';entryCard.className='partial-payment-entry-card';entryCard.innerHTML='<h3>Новая оплата</h3><small>Укажите сумму и фактическую дату оплаты. После нажатия FamilyPilot проверит точные совпадения среди операций.</small>';
    const dateField=document.createElement('div');dateField.className='field';dateField.innerHTML='<label for="partialPaymentDate">Дата и время оплаты</label><input id="partialPaymentDate" type="datetime-local">';
    entryCard.append(field,dateField,error,actions);
    const existingDetails=document.createElement('details');existingDetails.id='partialExistingOperationDetails';existingDetails.className='partial-existing-details';existingDetails.hidden=true;existingDetails.innerHTML='<summary>Оплата уже записана в «Операциях»</summary>';existingDetails.appendChild(candidateSection);
    summary.after(linkedSection,entryCard,existingDetails);
    const label=field.querySelector('label');if(label)label.textContent='Сколько оплачено сейчас';
    const createButton=actions.querySelector('[data-partial-create]');if(createButton){createButton.removeAttribute('data-partial-create');createButton.dataset.partialReconcileStart='true';createButton.textContent='Записать оплату'}
    const cancelButton=actions.querySelector('[data-partial-close]');if(cancelButton)cancelButton.hidden=true;
    candidateSection.hidden=true;

    if(!$('partialReconciliationModal')){
      const reconciliation=document.createElement('div');reconciliation.id='partialReconciliationModal';reconciliation.className='modal';
      reconciliation.innerHTML=`<div class="sheet"><div class="sheet-head"><h2>Найдена возможная оплата</h2><button class="close" type="button" data-partial-reconcile-cancel>Закрыть</button></div><p id="partialReconciliationCopy" class="partial-reconcile-copy"></p><div id="partialReconciliationList" class="partial-reconcile-list"></div><div class="partial-reconcile-actions"><button class="btn primary" type="button" data-partial-reconcile-new>Ни один — создать новую операцию</button><button class="btn secondary" type="button" data-partial-reconcile-cancel>Отмена</button></div></div>`;
      document.body.appendChild(reconciliation);
    }
    if(!$('partialOverpaymentModal')){
      const overpayment=document.createElement('div');overpayment.id='partialOverpaymentModal';overpayment.className='modal';
      overpayment.innerHTML=`<div class="sheet"><div class="sheet-head"><h2>Обнаружена переплата</h2><button class="close" type="button" data-partial-overpayment-cancel>Закрыть</button></div><div id="partialOverpaymentSummary" class="partial-overpayment-summary"></div><p id="partialOverpaymentCopy" class="partial-overpayment-copy"></p><div class="partial-overpayment-actions"><button class="btn secondary" type="button" data-partial-overpayment="correct">Исправить сумму</button><button class="btn primary" type="button" data-partial-overpayment="carry">Перенести на следующий месяц</button><button class="btn secondary" type="button" data-partial-overpayment="leave">Оставить как есть</button><button class="btn secondary" type="button" data-partial-overpayment-cancel>Отмена</button></div></div>`;
      document.body.appendChild(overpayment);
    }

    function setHidden(node,value){if(node.hidden!==value)node.hidden=value}
    function setError(message){error.textContent=message||''}
    function refresh(){
      if(refreshing)return;refreshing=true;
      try{
        const isOpen=modal.classList.contains('open');
        if(isOpen&&!lastOpen){$('partialPaymentDate').value=localDateTime(now());if(lastOccurrenceId)modal.dataset.partialOccurrenceId=lastOccurrenceId}
        lastOpen=isOpen;
        const linked=[...linkedList.children].filter(node=>node.nodeType===1);setHidden(linkedSection,!linked.length);
        existingDetails.hidden=true;candidateSection.hidden=true;
      }finally{refreshing=false}
    }

    function exactMatches(id,amount,occurredAt){
      const item=occurrence(id),itemRule=rule(item?.ruleId),categoryId=item?.categoryId||itemRule?.categoryId;
      if(!item||!categoryId||!Number.isFinite(amount)||!Number.isFinite(occurredAt))return[];
      const targetDay=dayNumber(occurredAt);
      return(state.operations||[]).filter(op=>op.status==='active'&&op.kind==='expense'&&!allocationOccurrenceId(op)&&op.categoryId===categoryId&&sameCents(op.amount,amount)&&Math.abs(dayNumber(op.occurredAt)-targetDay)<=2).sort((a,b)=>Math.abs(dayNumber(a.occurredAt)-targetDay)-Math.abs(dayNumber(b.occurredAt)-targetDay)||Number(b.occurredAt||0)-Number(a.occurredAt||0));
    }

    function resultToast(result,linked=false){
      if(!result?.ok)return;
      const summary=result.summary||result.currentSummary;
      if(result.action==='carry'){runtime.toast('Переплата перенесена на следующий платёж.');return}
      if(result.action==='leave'&&summary?.overpaid>EPSILON){runtime.toast('Переплата оставлена в текущем платеже.');return}
      runtime.toast(summary?.status==='paid'?(linked?'Операция связана. Платёж закрыт.':'Платёж оплачен полностью.'):(linked?'Операция связана как частичная оплата.':'Частичная оплата добавлена.'));
    }

    function hasOverpayment(){
      if(!pending)return false;
      return pending.amount-payments.summary(pending.occurrenceId).remaining>EPSILON;
    }

    function renderOverpayment(){
      if(!pending)return false;
      const item=occurrence(pending.occurrenceId),itemRule=rule(item?.ruleId),code=item?.currency||wallet(item?.walletId)?.nativeCurrency||state.household?.baseCurrency||'EUR',preview=resolver.preview(pending.occurrenceId,pending.amount),carry=$('[data-partial-overpayment="carry"]');
      $('partialOverpaymentSummary').innerHTML=`<strong>${esc(itemRule?.name||'Обязательство')}</strong><small>Осталось: ${money(preview.remaining,code)} · Введено: ${money(pending.amount,code)} · Переплата: ${money(preview.overpaid,code)}</small>`;
      $('partialOverpaymentCopy').textContent=pending.sourceOperationId?'Вы выбрали существующую операцию. При переносе она будет заменена двумя отдельными операциями только после вашего подтверждения.':'Выберите, что сделать с переплатой.';
      carry.disabled=!preview.canCarry;carry.hidden=!preview.canCarry;
      return true;
    }

    function openOverpayment(){close('partialReconciliationModal');close('partialPaymentModal');renderOverpayment();open('partialOverpaymentModal');return true}

    function finalize(action='leave'){
      if(!pending)return false;
      const current=pending,result=resolver.resolve({occurrenceId:current.occurrenceId,amount:current.amount,occurredAt:current.occurredAt,action,sourceOperationId:current.sourceOperationId||null});
      if(!result.ok){setError(result.error);close('partialOverpaymentModal');open('partialPaymentModal');return false}
      if(action==='correct'){
        $('partialPaymentAmount').value=String(Number(result.correctedAmount||0).toFixed(2)).replace('.',',');
        $('partialPaymentDate').value=localDateTime(current.occurredAt);pending=null;close('partialOverpaymentModal');open('partialPaymentModal');$('partialPaymentAmount')?.focus();return true;
      }
      pending=null;close('partialOverpaymentModal');close('partialReconciliationModal');close('partialPaymentModal');resultToast(result,!!current.sourceOperationId);return true;
    }

    function selectedSource(sourceOperationId=null){
      if(!pending)return false;pending.sourceOperationId=sourceOperationId;
      if(hasOverpayment())return openOverpayment();
      const current=pending;pending=null;
      const result=sourceOperationId?payments.attachOperation(current.occurrenceId,operation(sourceOperationId),'partial_payment_reconciled_existing'):resolver.resolve({occurrenceId:current.occurrenceId,amount:current.amount,occurredAt:current.occurredAt,action:'leave'});
      if(!result.ok){setError(result.error);close('partialReconciliationModal');open('partialPaymentModal');return false}
      close('partialReconciliationModal');close('partialPaymentModal');resultToast(result,!!sourceOperationId);return true;
    }

    function createNew(){return selectedSource(null)}
    function linkExisting(operationId){
      if(!pending)return false;
      const op=operation(operationId);if(!op){setError('Операция не найдена.');close('partialReconciliationModal');open('partialPaymentModal');return false}
      return selectedSource(operationId);
    }

    function renderMatches(matches){
      const item=occurrence(pending?.occurrenceId),code=item?.currency||wallet(item?.walletId)?.nativeCurrency||state.household?.baseCurrency||'EUR';
      $('partialReconciliationCopy').textContent=matches.length===1?'Найден расход с такой же суммой и категорией в пределах двух дней. Это оплата, которую вы сейчас записываете?':`Найдено ${matches.length} расходов с такой же суммой и категорией в пределах двух дней. Выберите нужный или создайте новую операцию.`;
      $('partialReconciliationList').innerHTML=matches.map(op=>`<div class="partial-reconcile-item"><span><strong>${money(op.amount,code)}</strong><small>${formatDateTime(op.occurredAt)} · ${esc(wallet(op.walletId)?.name||'Кошелёк')}<br>${op.note?esc(op.note):'Без комментария'}</small></span><button class="btn secondary" type="button" data-partial-reconcile-link="${esc(op.id)}">Связать</button></div>`).join('');
    }

    function submit(){
      const occurrenceId=modal.dataset.partialOccurrenceId||lastOccurrenceId||'',amount=parseAmount($('partialPaymentAmount')?.value),occurredAt=parseDate($('partialPaymentDate')?.value);
      if(!occurrence(occurrenceId)){setError('Платёж не найден.');return false}
      if(!Number.isFinite(amount)||amount<=0||amount>999999.99){setError('Введите корректную сумму.');return false}
      if(!Number.isFinite(occurredAt)){setError('Укажите корректную дату оплаты.');return false}
      setError('');
      const matches=exactMatches(occurrenceId,amount,occurredAt);
      pending={occurrenceId,amount,occurredAt,candidateIds:matches.map(op=>op.id),sourceOperationId:null};
      if(!matches.length)return selectedSource(null);
      renderMatches(matches);close('partialPaymentModal');open('partialReconciliationModal');return true;
    }

    window.addEventListener('pointerdown',event=>{const toggle=event.target.closest?.('[data-state-payment-toggle],[data-ux-payment-toggle]');if(toggle)lastOccurrenceId=toggle.dataset.statePaymentToggle||toggle.dataset.uxPaymentToggle||lastOccurrenceId},true);
    window.addEventListener('contextmenu',event=>{const toggle=event.target.closest?.('[data-state-payment-toggle],[data-ux-payment-toggle]');if(toggle)lastOccurrenceId=toggle.dataset.statePaymentToggle||toggle.dataset.uxPaymentToggle||lastOccurrenceId},true);

    window.addEventListener('click',event=>{
      const start=event.target.closest?.('[data-partial-reconcile-start]');if(start){event.preventDefault();event.stopImmediatePropagation();submit();return}
      const link=event.target.closest?.('[data-partial-reconcile-link]');if(link){event.preventDefault();event.stopImmediatePropagation();linkExisting(link.dataset.partialReconcileLink);return}
      const create=event.target.closest?.('[data-partial-reconcile-new]');if(create){event.preventDefault();event.stopImmediatePropagation();createNew();return}
      const cancel=event.target.closest?.('[data-partial-reconcile-cancel]');if(cancel){event.preventDefault();event.stopImmediatePropagation();pending=null;close('partialReconciliationModal');open('partialPaymentModal');return}
      const overpayment=event.target.closest?.('[data-partial-overpayment]');if(overpayment){event.preventDefault();event.stopImmediatePropagation();finalize(overpayment.dataset.partialOverpayment);return}
      const overpaymentCancel=event.target.closest?.('[data-partial-overpayment-cancel]');if(overpaymentCancel){event.preventDefault();event.stopImmediatePropagation();pending=null;close('partialOverpaymentModal');open('partialPaymentModal');return}
    },true);

    new MutationObserver(refresh).observe(modal,{attributes:true,attributeFilter:['class'],subtree:true,childList:true});
    new MutationObserver(refresh).observe(linkedList,{childList:true});
    refresh();

    if(new URLSearchParams(location.search).has('test')){
      const api={refresh,candidateLimit:PREVIEW_LIMIT,details:()=>({open:false,hidden:true,count:0,visible:0}),openDetails:()=>false,showAll:()=>false,dateValue:()=>$('partialPaymentDate')?.value||'',setDate:value=>{$('partialPaymentDate').value=value},setOccurrence:id=>{lastOccurrenceId=id;modal.dataset.partialOccurrenceId=id},exactMatches,submit,createNew,linkExisting,finalize,hasOverpayment,pending:()=>pending?{...pending}:null};
      const install=(n=0)=>{if(window.__FP_TEST__){window.__FP_TEST__.partialPaymentEntryUi=api;return}if(n<READY_LIMIT)setTimeout(()=>install(n+1),25)};install();
    }
    window.__FP_PARTIAL_PAYMENT_ENTRY_UI_READY__=true;
  }
  boot();
})();