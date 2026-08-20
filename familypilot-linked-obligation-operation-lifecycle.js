(()=>{
  'use strict';
  if(window.__FP_LINKED_OBLIGATION_OPERATION_LIFECYCLE__)return;
  const READY_LIMIT=1200;

  function boot(attempt=0){
    const runtime=window.__FP_RUNTIME__,partial=window.FamilyPilotPartialPayments;
    if(!runtime||!partial||!window.__FP_PARTIAL_PAYMENTS_READY__){
      if(attempt<READY_LIMIT)setTimeout(()=>boot(attempt+1),25);
      else window.__FP_LINKED_OBLIGATION_OPERATION_LIFECYCLE_ERROR__='Linked operation lifecycle dependencies did not become ready';
      return;
    }
    window.__FP_LINKED_OBLIGATION_OPERATION_LIFECYCLE__=true;
    const state=runtime.state,$=runtime.$,save=runtime.save,close=runtime.close,now=runtime.now;
    let detailOperationId='';

    const operation=id=>(state.operations||[]).find(item=>item.id===id)||null;
    const occurrence=id=>(state.obligationOccurrences||[]).find(item=>item.id===id)||null;
    const rule=id=>(state.obligationRules||[]).find(item=>item.id===id)||null;
    const linkedOccurrenceId=op=>op?.links?.obligationOccurrenceId||op?.links?.obligationAllocationOccurrenceId||null;
    const linkedOccurrence=op=>occurrence(linkedOccurrenceId(op));
    const linkedRule=op=>rule(linkedOccurrence(op)?.ruleId||op?.links?.obligationRuleId);
    const formatDate=value=>new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(value));

    function addRevision(target,source,changes){
      target.revisions=Array.isArray(target.revisions)?target.revisions:[];
      target.revisions.push({id:`linked-op-rev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,sequence:target.revisions.length+1,changedByMemberId:state.currentMemberId,changedAt:now(),source,batchId:null,changes});
      target.lastEditedByMemberId=state.currentMemberId;target.lastEditedAt=now();
    }
    function editChanges(op){
      const amount=Number(String($('amountInput')?.value||'').trim().replace(',','.'));
      const occurredAt=new Date($('dateInput')?.value||'').getTime(),changes=[];
      if(Number.isFinite(amount)&&Math.round(amount*100)!==Math.round(Number(op.amount||0)*100))changes.push({field:'amount',oldValue:op.amount,newValue:amount});
      if(Number.isFinite(occurredAt)&&Math.abs(Number(op.occurredAt||0)-occurredAt)>=60000)changes.push({field:'occurredAt',oldValue:op.occurredAt,newValue:occurredAt});
      return changes;
    }
    function editWarning(op,changes){
      const item=linkedOccurrence(op),itemRule=linkedRule(op),fields=changes.map(change=>change.field==='amount'?'сумма':'дата').join(' и ');
      return `Эта операция связана с обязательством «${itemRule?.name||'Обязательство'}» за ${formatDate(item?.dueAt||op.occurredAt)}. Изменится ${fields}, поэтому отметка оплаты и оплаченная сумма обязательства будут пересчитаны. Продолжить?`;
    }
    function deleteWarning(op){
      const item=linkedOccurrence(op),itemRule=linkedRule(op);
      return `Эта операция связана с обязательством «${itemRule?.name||'Обязательство'}» за ${formatDate(item?.dueAt||op.occurredAt)}. После удаления обязательство будет пересчитано и может стать частично оплаченным или неоплаченным. Переместить операцию в Корзину?`;
    }
    function deleteLinkedOperation(id){
      const op=operation(id),occurrenceId=linkedOccurrenceId(op);if(!op||op.status!=='active'||!occurrenceId)return false;
      if(!window.confirm(deleteWarning(op)))return false;
      const deletedAt=now();
      addRevision(op,'linked_obligation_operation_user_delete',[{field:'status',oldValue:'active',newValue:'trash'}]);
      const entryRetention=window.FamilyPilotDestructiveLifecycleCore?.trashEntryRetention?.(state,deletedAt)||{trashExpiresAt:null,trashRetentionProvenance:null};
      op.status='trash';op.deletedAt=deletedAt;op.deletedByMemberId=state.currentMemberId;op.trashExpiresAt=entryRetention.trashExpiresAt;op.trashRetentionProvenance=entryRetention.trashRetentionProvenance;
      op.links={...(op.links||{}),obligationLinkPreservedInTrash:true,obligationLinkPreservedAt:deletedAt};
      save();close('entryModal');close('operationDetail');partial.deriveAll();runtime.renderAll();runtime.toast('Операция перемещена в Корзину. Обязательство пересчитано.');return true;
    }
    function afterRestore(id){
      const op=operation(id);if(!op||op.status!=='active'||!linkedOccurrenceId(op))return false;
      op.links={...(op.links||{})};delete op.links.obligationLinkPreservedInTrash;delete op.links.obligationLinkPreservedAt;
      addRevision(op,'linked_obligation_operation_restored',[{field:'obligationPaymentState',oldValue:'excluded_while_in_trash',newValue:'included_after_restore'}]);
      partial.deriveAll();save();runtime.renderAll();runtime.toast('Операция и связь с обязательством восстановлены.');return true;
    }

    window.addEventListener('click',event=>{
      const operationRow=event.target.closest?.('[data-op-id]');if(operationRow)detailOperationId=operationRow.dataset.opId||'';
      const trashView=event.target.closest?.('[data-trash-view]');if(trashView)detailOperationId=trashView.dataset.trashView||'';

      const saveButton=event.target.closest?.('#saveOperationBtn');
      if(saveButton){
        const id=$('editingId')?.value||'',op=operation(id),changes=editChanges(op);
        if(op?.status==='active'&&linkedOccurrenceId(op)&&changes.length&&!window.confirm(editWarning(op,changes))){event.preventDefault();event.stopImmediatePropagation();return}
        if(op?.status==='active'&&linkedOccurrenceId(op)&&changes.length)queueMicrotask(()=>{partial.deriveAll();save();runtime.renderAll();runtime.toast('Операция изменена. Обязательство пересчитано.')});
        return;
      }

      const deleteButton=event.target.closest?.('#detailDeleteBtn');
      if(deleteButton){
        const op=operation(detailOperationId);
        if(op?.status==='active'&&linkedOccurrenceId(op)){event.preventDefault();event.stopImmediatePropagation();deleteLinkedOperation(op.id);return}
      }

      const restoreButton=event.target.closest?.('[data-trash-restore]');
      if(restoreButton){
        const id=restoreButton.dataset.trashRestore,op=operation(id);
        if(op?.status==='trash'&&linkedOccurrenceId(op))queueMicrotask(()=>afterRestore(id));
      }
    },true);

    const api={linkedOccurrenceId,editChanges,editWarning,deleteWarning,deleteLinkedOperation,afterRestore,setDetailOperation:id=>{detailOperationId=id},detailOperation:()=>detailOperationId};
    window.FamilyPilotLinkedObligationOperationLifecycle=Object.freeze(api);
    if(new URLSearchParams(location.search).has('test')){
      const install=(n=0)=>{if(window.__FP_TEST__){window.__FP_TEST__.linkedObligationOperationLifecycle=api;return}if(n<READY_LIMIT)setTimeout(()=>install(n+1),25)};install();
    }
    window.__FP_LINKED_OBLIGATION_OPERATION_LIFECYCLE_READY__=true;
  }
  boot();
})();
