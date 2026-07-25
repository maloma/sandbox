(()=>{
  'use strict';
  if(window.__FP_M3_07B_R02_REMOVAL__)return;
  const READY_LIMIT=1200,PARTIAL_MEMORY_KEY='obligationPartialPaymentMemoryByOccurrenceId',SINGLE_MEMORY_KEY='obligationPaymentLinkMemoryByOccurrenceId';

  function boot(attempt=0){
    const runtime=window.__FP_RUNTIME__,obligations=window.FamilyPilotObligations;
    if(!runtime||!obligations||!window.__FP_M3_04_READY__){
      if(attempt<READY_LIMIT)setTimeout(()=>boot(attempt+1),25);
      else window.__FP_M3_07B_R02_REMOVAL_ERROR__='Payment-mark removal dependencies did not become ready';
      return;
    }
    window.__FP_M3_07B_R02_REMOVAL__=true;
    const state=runtime.state,$=runtime.$,save=runtime.save,open=runtime.open,close=runtime.close,now=runtime.now,esc=runtime.esc,money=runtime.money;
    let contextOccurrenceId='',pendingOccurrenceId='',pendingAfter='planned';

    const occurrence=id=>(state.obligationOccurrences||[]).find(item=>item.id===id)||null;
    const rule=id=>(state.obligationRules||[]).find(item=>item.id===id)||null;
    const wallet=id=>(state.wallets||[]).find(item=>item.id===id)||null;
    const currency=item=>item?.currency||wallet(item?.walletId)?.nativeCurrency||state.household?.baseCurrency||'EUR';
    const formatDate=value=>new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(value));
    const allocationOccurrenceId=op=>op?.links?.obligationOccurrenceId||op?.links?.obligationAllocationOccurrenceId||null;
    const activeOperations=id=>(state.operations||[]).filter(op=>op.status==='active'&&op.kind==='expense'&&allocationOccurrenceId(op)===id).sort((a,b)=>Number(a.occurredAt||0)-Number(b.occurredAt||0)||Number(a.createdAt||0)-Number(b.createdAt||0));

    function configMap(key){
      state.config=state.config&&typeof state.config==='object'?state.config:{};
      const current=state.config[key];
      state.config[key]=current&&typeof current==='object'&&!Array.isArray(current)?current:{};
      return state.config[key];
    }
    function addRevision(target,source,changes){
      if(!target)return;
      target.revisions=Array.isArray(target.revisions)?target.revisions:[];
      target.revisions.push({id:`r02-rev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,sequence:target.revisions.length+1,changedAt:now(),changedByMemberId:state.currentMemberId,source,changes});
      target.lastEditedAt=now();
    }
    function remember(id,ops){
      const at=now();
      configMap(PARTIAL_MEMORY_KEY)[id]={operationIds:ops.map(op=>op.id),mode:'remove_all',rememberedAt:at};
      if(ops.length===1){
        const op=ops[0];
        configMap(SINGLE_MEMORY_KEY)[id]={operationId:op.id,linkMode:op.links?.obligationLinkMode||null,sourceModule:op.links?.sourceModule||'obligations',lastAction:'remove',rememberedAt:at};
      }
    }
    function voidOperation(op){
      const oldStatus=op.status;
      op.status='voided';
      op.systemVoidedAt=now();
      op.systemVoidReason='obligation_payment_mark_removed';
      op.deletedAt=null;op.deletedByMemberId=null;op.trashExpiresAt=null;
      addRevision(op,'obligation_payment_mark_removed',[{field:'status',oldValue:oldStatus,newValue:'voided'}]);
    }

    const style=document.createElement('style');
    style.id='familypilot-m3-07b-r02-removal-style';
    style.textContent=`
      [data-payment-unpay-action="keep"],[data-allocation-unpay="keep"],[data-partial-operation="keep"],[data-allocation-single="keep"]{display:none!important}
      .r02-payment-remove-copy{margin-top:12px;padding:12px;border:1px solid var(--line);border-radius:15px;background:var(--card2);font-size:12px;line-height:1.45;color:var(--muted)}
      .r02-payment-remove-copy strong{display:block;color:var(--ink);font-size:14px;margin-bottom:4px}
      .r02-payment-remove-list{display:grid;gap:8px;margin-top:12px}
      .r02-payment-remove-item{padding:10px 12px;border:1px solid var(--line);border-radius:14px;background:var(--card2)}
      .r02-payment-remove-item strong,.r02-payment-remove-item small{display:block}.r02-payment-remove-item small{margin-top:3px;color:var(--muted);font-size:10px}
      .r02-payment-remove-actions{display:grid;gap:9px;margin-top:14px}.r02-payment-remove-actions button{width:100%;min-height:52px}
    `;
    document.head.appendChild(style);

    if(!$('paymentMarkRemovalModal')){
      const modal=document.createElement('div');modal.id='paymentMarkRemovalModal';modal.className='modal';
      modal.innerHTML=`<div class="sheet"><div class="sheet-head"><h2>Снять отметку оплаты?</h2><button class="close" type="button" data-r02-cancel>Закрыть</button></div><div id="paymentMarkRemovalCopy" class="r02-payment-remove-copy"></div><div id="paymentMarkRemovalList" class="r02-payment-remove-list"></div><div class="r02-payment-remove-actions"><button class="btn danger" type="button" data-r02-remove>Снять оплату и удалить связанные операции</button><button class="btn secondary" type="button" data-r02-cancel>Отмена</button></div></div>`;
      document.body.appendChild(modal);
    }

    function renderModal(){
      const item=occurrence(pendingOccurrenceId),itemRule=rule(item?.ruleId),ops=activeOperations(pendingOccurrenceId);if(!item)return false;
      const total=ops.reduce((sum,op)=>sum+Number(op.amount||0),0),code=currency(item);
      $('paymentMarkRemovalCopy').innerHTML=`<strong>${esc(itemRule?.name||'Обязательство')}</strong>С оплатой связано ${ops.length} ${ops.length===1?'операция':'операции'} на сумму ${money(total,code)}.<br>После подтверждения они будут удалены из финансового учёта, а платёж станет неоплаченным${pendingAfter==='skipped'?' и будет отмечен пропущенным':''}.`;
      $('paymentMarkRemovalList').innerHTML=ops.map(op=>`<div class="r02-payment-remove-item"><strong>${money(op.amount,code)}</strong><small>${formatDate(op.occurredAt)}${op.note?` · ${esc(op.note)}`:''}</small></div>`).join('');
      return true;
    }
    function openRemoval(id,{after='planned'}={}){
      const item=occurrence(id),ops=activeOperations(id);if(!item||!ops.length)return false;
      pendingOccurrenceId=id;pendingAfter=after;
      close('paymentContextModal');close('paymentUnpayModal');close('allocationUnpayModal');
      renderModal();open('paymentMarkRemovalModal');return true;
    }
    function completeRemoval(){
      const item=occurrence(pendingOccurrenceId),ops=activeOperations(pendingOccurrenceId);if(!item||!ops.length){close('paymentMarkRemovalModal');return false}
      const oldStatus=item.status,oldActual=item.actualAmount,oldLinked=item.linkedOperationId,oldLinkedIds=Array.isArray(item.linkedOperationIds)?[...item.linkedOperationIds]:[];
      remember(item.id,ops);
      for(const op of ops)voidOperation(op);
      item.status='planned';item.actualAmount=null;item.paidAt=null;item.linkedOperationId=null;item.linkedOperationIds=[];item.allocationStatus='planned';item.overpaidAmount=0;
      addRevision(item,'obligation_payment_mark_removed',[
        {field:'status',oldValue:oldStatus,newValue:'planned'},
        {field:'actualAmount',oldValue:oldActual,newValue:null},
        {field:'linkedOperationId',oldValue:oldLinked,newValue:null},
        {field:'linkedOperationIds',oldValue:oldLinkedIds,newValue:[]}
      ]);
      if(pendingAfter==='skipped')obligations.skipOccurrence(state,item.id,state.currentMemberId,now());
      save();close('paymentMarkRemovalModal');runtime.renderAll();runtime.toast('Отметка оплаты снята. Связанные операции убраны из финансового учёта.');return true;
    }

    window.addEventListener('pointerdown',event=>{
      const toggle=event.target.closest?.('[data-state-payment-toggle],[data-ux-payment-toggle]');
      if(toggle)contextOccurrenceId=toggle.dataset.statePaymentToggle||toggle.dataset.uxPaymentToggle||'';
    },true);
    window.addEventListener('contextmenu',event=>{
      const toggle=event.target.closest?.('[data-state-payment-toggle],[data-ux-payment-toggle]');
      if(toggle)contextOccurrenceId=toggle.dataset.statePaymentToggle||toggle.dataset.uxPaymentToggle||'';
    },true);
    window.addEventListener('click',event=>{
      const cancel=event.target.closest?.('[data-r02-cancel]');if(cancel){event.preventDefault();event.stopImmediatePropagation();close('paymentMarkRemovalModal');return}
      const remove=event.target.closest?.('[data-r02-remove]');if(remove){event.preventDefault();event.stopImmediatePropagation();completeRemoval();return}
      const obsolete=event.target.closest?.('[data-payment-unpay-action="keep"],[data-allocation-unpay="keep"],[data-partial-operation="keep"],[data-allocation-single="keep"]');
      if(obsolete){event.preventDefault();event.stopImmediatePropagation();runtime.toast('Связанную оплату нельзя оставлять обычным расходом.');return}
      const contextAction=event.target.closest?.('[data-payment-context-action]');
      if(contextAction&&['unpaid','skipped'].includes(contextAction.dataset.paymentContextAction)){
        const id=contextOccurrenceId,ops=activeOperations(id),item=occurrence(id);
        if(item&&ops.length){event.preventDefault();event.stopImmediatePropagation();openRemoval(id,{after:contextAction.dataset.paymentContextAction==='skipped'?'skipped':'planned'});return}
      }
      const toggle=event.target.closest?.('[data-state-payment-toggle],[data-ux-payment-toggle]');if(!toggle)return;
      const id=toggle.dataset.statePaymentToggle||toggle.dataset.uxPaymentToggle||'',item=occurrence(id),ops=activeOperations(id);contextOccurrenceId=id;
      if(item&&ops.length&&(item.status==='partial'||item.status==='paid')){event.preventDefault();event.stopImmediatePropagation();openRemoval(id);return}
    },true);

    const api={activeOperations,openRemoval,completeRemoval,remembered:id=>configMap(PARTIAL_MEMORY_KEY)[id]||null,keepOptionsVisible:()=>[...document.querySelectorAll('[data-payment-unpay-action="keep"],[data-allocation-unpay="keep"],[data-partial-operation="keep"],[data-allocation-single="keep"]')].some(node=>getComputedStyle(node).display!=='none')};
    window.FamilyPilotPaymentMarkRemovalV2=Object.freeze(api);
    if(new URLSearchParams(location.search).has('test')){
      const install=(n=0)=>{if(window.__FP_TEST__){window.__FP_TEST__.paymentMarkRemovalV2=api;return}if(n<READY_LIMIT)setTimeout(()=>install(n+1),25)};install();
    }
    window.__FP_M3_07B_R02_REMOVAL_READY__=true;
  }
  boot();
})();