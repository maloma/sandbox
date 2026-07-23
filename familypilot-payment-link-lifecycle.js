(()=>{
  'use strict';

  if(window.__FP_PAYMENT_LINK_LIFECYCLE__)return;
  const READY_LIMIT=1200;
  const MEMORY_KEY='obligationPaymentLinkMemoryByOccurrenceId';
  const MIGRATION_KEY='obligationPaymentLinkLifecycleVersion';
  const INTERNAL_VOID_STATUS='voided';

  function boot(attempt=0){
    const runtime=window.__FP_RUNTIME__;
    const obligations=window.FamilyPilotObligations;
    if(!runtime||!obligations||!window.__FP_M3_04_READY__){
      if(attempt<READY_LIMIT)setTimeout(()=>boot(attempt+1),25);
      else window.__FP_PAYMENT_LINK_LIFECYCLE_ERROR__='Payment link lifecycle dependencies did not become ready';
      return;
    }
    window.__FP_PAYMENT_LINK_LIFECYCLE__=true;

    const state=runtime.state;
    const $=runtime.$;
    const save=runtime.save;
    const open=runtime.open;
    const close=runtime.close;
    const now=runtime.now;
    let contextOccurrenceId='';
    let pendingOccurrenceId='';
    let pendingAfter='planned';
    let reconciling=false;

    const occurrence=id=>(state.obligationOccurrences||[]).find(item=>item.id===id)||null;
    const rule=id=>(state.obligationRules||[]).find(item=>item.id===id)||null;
    const operation=id=>(state.operations||[]).find(item=>item.id===id)||null;
    const formatDate=value=>new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(new Date(value));
    const money=(value,currency='EUR')=>runtime.money(Number(value)||0,currency);

    function memoryMap(){
      state.config=state.config&&typeof state.config==='object'?state.config:{};
      const current=state.config[MEMORY_KEY];
      state.config[MEMORY_KEY]=current&&typeof current==='object'&&!Array.isArray(current)?current:{};
      return state.config[MEMORY_KEY];
    }

    function addRevision(target,source,changes){
      if(!target)return;
      target.revisions=Array.isArray(target.revisions)?target.revisions:[];
      target.revisions.push({
        id:`link-rev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,
        sequence:target.revisions.length+1,
        changedAt:now(),
        changedByMemberId:state.currentMemberId,
        source,
        changes
      });
      target.lastEditedAt=now();
    }

    function installStyle(){
      $('familypilot-payment-link-lifecycle-style')?.remove();
      const style=document.createElement('style');
      style.id='familypilot-payment-link-lifecycle-style';
      style.textContent=`
        .obligation-row[hidden],.obligation-date-group[hidden]{display:none!important}
        .payment-unpay-copy{margin-top:12px;padding:12px;border:1px solid var(--line);border-radius:15px;background:var(--card2);font-size:12px;line-height:1.5;color:var(--muted)}
        .payment-unpay-copy strong{display:block;color:var(--ink);font-size:14px;margin-bottom:4px}
        .payment-unpay-actions{display:grid;gap:9px;margin-top:14px}
        .payment-unpay-actions button{width:100%;min-height:54px;padding:11px 14px}
      `;
      document.head.appendChild(style);
    }

    function installModal(){
      if($('paymentUnpayModal'))return;
      const modal=document.createElement('div');
      modal.id='paymentUnpayModal';
      modal.className='modal';
      modal.innerHTML=`<div class="sheet"><div class="sheet-head"><h2>Снять отметку оплаты?</h2><button class="close" type="button" data-payment-unpay-action="cancel">Закрыть</button></div><div id="paymentUnpayInfo" class="payment-unpay-copy"></div><div class="payment-unpay-actions"><button class="btn danger" type="button" data-payment-unpay-action="remove">Снять отметку и удалить операцию</button><button class="btn secondary" type="button" data-payment-unpay-action="keep">Снять отметку, операцию оставить</button><button class="btn secondary" type="button" data-payment-unpay-action="cancel">Отмена</button></div></div>`;
      document.body.appendChild(modal);
    }

    function linkedOperation(id){
      const item=occurrence(id);
      if(!item)return null;
      return operation(item.linkedOperationId)||(state.operations||[]).find(op=>op.status==='active'&&op.links?.obligationOccurrenceId===id)||null;
    }

    function remember(id,op,action){
      if(!op)return;
      memoryMap()[id]={
        operationId:op.id,
        linkMode:op.links?.obligationLinkMode||null,
        sourceModule:op.links?.sourceModule||null,
        lastAction:action,
        rememberedAt:now()
      };
    }

    function clearObligationLinks(op){
      const oldOccurrence=op.links?.obligationOccurrenceId||null;
      op.links={...(op.links||{})};
      delete op.links.obligationRuleId;
      delete op.links.obligationOccurrenceId;
      delete op.links.relation;
      delete op.links.obligationLinkMode;
      addRevision(op,'obligation_payment_detached',[{field:'obligationOccurrenceId',oldValue:oldOccurrence,newValue:null}]);
    }

    function voidOperation(op){
      const oldStatus=op.status;
      op.status=INTERNAL_VOID_STATUS;
      op.systemVoidedAt=now();
      op.systemVoidReason='obligation_payment_unchecked';
      op.deletedAt=null;
      op.deletedByMemberId=null;
      op.trashExpiresAt=null;
      addRevision(op,'obligation_payment_voided',[{field:'status',oldValue:oldStatus,newValue:INTERNAL_VOID_STATUS}]);
    }

    function resetOccurrence(item,source){
      addRevision(item,source,[
        {field:'status',oldValue:item.status,newValue:'planned'},
        {field:'linkedOperationId',oldValue:item.linkedOperationId,newValue:null},
        {field:'actualAmount',oldValue:item.actualAmount,newValue:null},
        {field:'paidAt',oldValue:item.paidAt,newValue:null}
      ]);
      item.status='planned';
      item.linkedOperationId=null;
      item.actualAmount=null;
      item.paidAt=null;
    }

    function applyAfter(item,after){
      if(after!=='skipped')return;
      const result=obligations.skipOccurrence(state,item.id,state.currentMemberId,now());
      if(!result.ok)runtime.toast(result.error);
    }

    function completeUnpay(mode){
      const item=occurrence(pendingOccurrenceId);
      if(!item){close('paymentUnpayModal');return{ok:false,error:'Платёж не найден.'}}
      const op=linkedOperation(item.id);
      if(op){
        remember(item.id,op,mode);
        if(mode==='remove')voidOperation(op);
        else clearObligationLinks(op);
      }
      resetOccurrence(item,mode==='remove'?'obligation_payment_removed_with_operation':'obligation_payment_removed_keep_operation');
      applyAfter(item,pendingAfter);
      save();
      close('paymentUnpayModal');
      close('paymentContextModal');
      runtime.renderAll();
      runtime.toast(mode==='remove'?'Отметка снята. Операция убрана из финансов и сохранена во внутренней истории.':'Отметка снята. Операция оставлена как обычная.');
      return{ok:true,occurrence:item,operation:op||null,mode,after:pendingAfter};
    }

    function openUnpay(id,{after='planned'}={}){
      const item=occurrence(id);
      if(!item)return false;
      const op=linkedOperation(id);
      pendingOccurrenceId=id;
      pendingAfter=after;
      const itemRule=rule(item.ruleId);
      const currency=item.currency||'EUR';
      $('paymentUnpayInfo').innerHTML=`<strong>${itemRule?.name||'Обязательство'}</strong>${formatDate(item.dueAt)} · ${money(op?.amount??item.actualAmount??item.expectedAmount,currency)}<br>${op?'Отметка связана с реальной операцией. Выберите, что сделать с самой операцией.':'Связанная операция не найдена. Будет снята только отметка.'}`;
      close('paymentContextModal');
      open('paymentUnpayModal');
      return true;
    }

    function restorePrevious(id){
      const item=occurrence(id);
      const memory=memoryMap()[id];
      const op=operation(memory?.operationId);
      if(!item||!op||item.status!=='planned')return false;
      if(op.status==='trash')return false;
      if(op.status==='active'&&op.links?.obligationOccurrenceId&&op.links.obligationOccurrenceId!==id)return false;
      if(!['active',INTERNAL_VOID_STATUS].includes(op.status))return false;
      const itemRule=rule(item.ruleId);
      const oldStatus=op.status;
      op.status='active';
      op.systemVoidedAt=null;
      op.systemVoidReason=null;
      op.deletedAt=null;
      op.deletedByMemberId=null;
      op.trashExpiresAt=null;
      op.links={...(op.links||{}),sourceModule:memory.sourceModule||op.links?.sourceModule||'obligations',obligationRuleId:item.ruleId,obligationOccurrenceId:id,relation:'fulfills_occurrence'};
      if(memory.linkMode)op.links.obligationLinkMode=memory.linkMode;
      addRevision(op,'obligation_previous_payment_restored',[{field:'status',oldValue:oldStatus,newValue:'active'},{field:'obligationOccurrenceId',oldValue:null,newValue:id}]);
      addRevision(item,'obligation_previous_payment_restored',[{field:'status',oldValue:item.status,newValue:'paid'},{field:'linkedOperationId',oldValue:item.linkedOperationId,newValue:op.id}]);
      item.status='paid';
      item.linkedOperationId=op.id;
      item.actualAmount=Number(op.amount)||item.expectedAmount;
      item.paidAt=Number(op.occurredAt)||now();
      remember(id,op,'restored');
      save();
      runtime.renderAll();
      runtime.toast('Прежняя операция снова связана с платежом.');
      return true;
    }

    function migrateTechnicalTrash(){
      state.config=state.config&&typeof state.config==='object'?state.config:{};
      if(Number(state.config[MIGRATION_KEY]||0)>=1)return 0;
      let changed=0;
      for(const op of state.operations||[]){
        const technical=(op.revisions||[]).some(revision=>revision?.source==='obligation_payment_unchecked');
        if(op.status!=='trash'||!technical)continue;
        const id=op.links?.obligationOccurrenceId;
        if(id)remember(id,op,'legacy_migrated');
        op.status=INTERNAL_VOID_STATUS;
        op.systemVoidedAt=op.deletedAt||now();
        op.systemVoidReason='legacy_obligation_payment_unchecked';
        op.deletedAt=null;
        op.deletedByMemberId=null;
        op.trashExpiresAt=null;
        addRevision(op,'obligation_legacy_trash_migrated',[{field:'status',oldValue:'trash',newValue:INTERNAL_VOID_STATUS}]);
        changed+=1;
      }
      state.config[MIGRATION_KEY]=1;
      save();
      return changed;
    }

    function reconcileMemory(){
      for(const op of state.operations||[]){
        const id=op.links?.obligationOccurrenceId;
        if(id&&op.status==='active')remember(id,op,'active_link');
      }
    }

    function enforceOneActiveLink(){
      const groups=new Map();
      for(const op of state.operations||[]){
        const id=op.status==='active'?op.links?.obligationOccurrenceId:null;
        if(!id)continue;
        if(!groups.has(id))groups.set(id,[]);
        groups.get(id).push(op);
      }
      let changed=false;
      for(const [id,ops] of groups){
        if(ops.length<2)continue;
        const item=occurrence(id);
        const chosen=ops.find(op=>op.id===item?.linkedOperationId)||ops.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))[0];
        for(const op of ops){
          if(op===chosen)continue;
          clearObligationLinks(op);
          op.systemLinkConflictResolvedAt=now();
          changed=true;
        }
        if(item){item.linkedOperationId=chosen.id;item.status='paid';item.actualAmount=Number(chosen.amount)||item.expectedAmount;item.paidAt=Number(chosen.occurredAt)||now()}
      }
      if(changed){save();runtime.toast('Лишняя связь снята: у одного платежа может быть только одна активная операция.');}
      return changed;
    }

    function renderLifecycle(){
      reconcileMemory();
      const changed=enforceOneActiveLink();
      if(changed&&!reconciling){
        reconciling=true;
        queueMicrotask(()=>{runtime.renderAll();reconciling=false});
      }
    }

    installStyle();
    installModal();
    const migrated=migrateTechnicalTrash();
    const previous=runtime.getRenderAll();
    runtime.setRenderAll(()=>{previous();renderLifecycle()});
    renderLifecycle();
    if(migrated)setTimeout(()=>{runtime.renderAll();runtime.toast(`Технические отмены убраны из Корзины: ${migrated}.`)},0);

    window.addEventListener('pointerdown',event=>{
      const toggle=event.target.closest?.('[data-state-payment-toggle],[data-ux-payment-toggle]');
      if(toggle)contextOccurrenceId=toggle.dataset.statePaymentToggle||toggle.dataset.uxPaymentToggle||'';
    },true);
    window.addEventListener('contextmenu',event=>{
      const toggle=event.target.closest?.('[data-state-payment-toggle],[data-ux-payment-toggle]');
      if(toggle)contextOccurrenceId=toggle.dataset.statePaymentToggle||toggle.dataset.uxPaymentToggle||'';
    },true);
    window.addEventListener('click',event=>{
      const unpayAction=event.target.closest?.('[data-payment-unpay-action]');
      if(unpayAction){
        event.preventDefault();event.stopImmediatePropagation();
        const action=unpayAction.dataset.paymentUnpayAction;
        if(action==='remove'||action==='keep')completeUnpay(action);else close('paymentUnpayModal');
        return;
      }
      const contextAction=event.target.closest?.('[data-payment-context-action]');
      if(contextAction&&['unpaid','skipped'].includes(contextAction.dataset.paymentContextAction)){
        const item=occurrence(contextOccurrenceId);
        if(item?.status==='paid'){
          event.preventDefault();event.stopImmediatePropagation();
          openUnpay(item.id,{after:contextAction.dataset.paymentContextAction==='skipped'?'skipped':'planned'});
          return;
        }
      }
      const toggle=event.target.closest?.('[data-state-payment-toggle],[data-ux-payment-toggle]');
      if(!toggle)return;
      const id=toggle.dataset.statePaymentToggle||toggle.dataset.uxPaymentToggle||'';
      contextOccurrenceId=id;
      const item=occurrence(id);
      if(item?.status==='paid'){
        event.preventDefault();event.stopImmediatePropagation();openUnpay(id);return;
      }
      if(item?.status==='planned'&&restorePrevious(id)){
        event.preventDefault();event.stopImmediatePropagation();return;
      }
    },true);

    const testApi={openUnpay,completeUnpay,restorePrevious,migrateTechnicalTrash,enforceOneActiveLink,memory:id=>memoryMap()[id]||null,internalVoided:()=>state.operations.filter(op=>op.status===INTERNAL_VOID_STATUS).map(op=>op.id)};
    function installTest(attempt=0){
      if(!new URLSearchParams(location.search).has('test'))return;
      if(window.__FP_TEST__){window.__FP_TEST__.paymentLinkLifecycle=testApi;return}
      if(attempt<READY_LIMIT)setTimeout(()=>installTest(attempt+1),25);
    }
    installTest();
    window.__FP_PAYMENT_LINK_LIFECYCLE_READY__=true;
  }

  boot();
})();
