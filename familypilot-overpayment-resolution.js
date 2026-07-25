(()=>{
  'use strict';
  if(window.__FP_OVERPAYMENT_RESOLUTION__)return;
  const READY_LIMIT=1200,EPSILON=.005;

  function boot(attempt=0){
    const runtime=window.__FP_RUNTIME__,payments=window.FamilyPilotPartialPayments,obligations=window.FamilyPilotObligations;
    if(!runtime||!payments||!obligations||!window.__FP_PARTIAL_PAYMENTS_READY__){
      if(attempt<READY_LIMIT)setTimeout(()=>boot(attempt+1),25);
      else window.__FP_OVERPAYMENT_RESOLUTION_ERROR__='Overpayment resolution dependencies did not become ready';
      return;
    }
    window.__FP_OVERPAYMENT_RESOLUTION__=true;
    const state=runtime.state,save=runtime.save,now=runtime.now;
    const occurrence=id=>(state.obligationOccurrences||[]).find(item=>item.id===id)||null;
    const rule=id=>(state.obligationRules||[]).find(item=>item.id===id)||null;
    const operation=id=>(state.operations||[]).find(item=>item.id===id)||null;
    const linkedOccurrenceId=op=>op?.links?.obligationOccurrenceId||op?.links?.obligationAllocationOccurrenceId||null;

    function addRevision(target,source,changes){
      target.revisions=Array.isArray(target.revisions)?target.revisions:[];
      target.revisions.push({id:`overpay-rev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,sequence:target.revisions.length+1,changedAt:now(),changedByMemberId:state.currentMemberId,source,changes});
      target.lastEditedAt=now();
    }

    function nextOccurrence(id){
      const item=occurrence(id),itemRule=rule(item?.ruleId);if(!item||!itemRule||itemRule.cadence!=='recurring')return null;
      let next=(state.obligationOccurrences||[]).find(entry=>entry.ruleId===item.ruleId&&Number(entry.sequence)===Number(item.sequence)+1)||null;
      if(!next){
        const target=obligations.scheduleDate(itemRule,Number(item.sequence)+1);
        obligations.ensureOccurrencesWindow(state,-Infinity,target+86400000,now());
        next=(state.obligationOccurrences||[]).find(entry=>entry.ruleId===item.ruleId&&Number(entry.sequence)===Number(item.sequence)+1)||null;
      }
      if(!next||next.status==='cancelled'||next.status==='skipped')return null;
      return next;
    }

    function preview(id,amount){
      const data=payments.summary(id),value=Number(amount),remaining=Number(data.remaining||0),overpaid=Math.max(0,value-remaining),next=nextOccurrence(id);
      return{occurrence:data.item,remaining,overpaid,next,canCarry:overpaid>EPSILON&&!!next};
    }

    function adjustDate(op,occurredAt,source){
      const oldValue=Number(op.occurredAt);
      if(Number.isFinite(occurredAt)&&oldValue!==occurredAt){
        op.occurredAt=occurredAt;
        addRevision(op,source,[{field:'occurredAt',oldValue,newValue:occurredAt}]);
        op.lastEditedAt=now();
      }
    }

    function createAt(id,amount,occurredAt,source){
      const result=payments.createOperation(id,amount);if(!result.ok)return result;
      adjustDate(result.operation,occurredAt,source);
      save();runtime.renderAll();
      return{...result,summary:payments.summary(id)};
    }

    function voidSource(op){
      const oldStatus=op.status;
      op.status='voided';op.systemVoidedAt=now();op.systemVoidReason='overpayment_source_replaced_for_carry_forward';op.deletedAt=null;op.deletedByMemberId=null;op.trashExpiresAt=null;
      addRevision(op,'overpayment_source_replaced_for_carry_forward',[{field:'status',oldValue,newValue:'voided'}]);
    }

    function resolve({occurrenceId,amount,occurredAt,action,sourceOperationId=null}){
      const value=Number(amount),data=payments.summary(occurrenceId),item=data.item;
      if(!item)return{ok:false,error:'Платёж не найден.'};
      if(!Number.isFinite(value)||value<=0)return{ok:false,error:'Введите корректную сумму.'};
      const remaining=Number(data.remaining||0),overpaid=Math.max(0,value-remaining);
      if(overpaid<=EPSILON)return{ok:false,error:'Переплата не обнаружена.'};
      if(action==='correct')return{ok:true,action,correctedAmount:remaining,remaining};

      const source=sourceOperationId?operation(sourceOperationId):null;
      if(sourceOperationId&&(!source||source.status!=='active'||source.kind!=='expense'||linkedOccurrenceId(source)))return{ok:false,error:'Выбранная операция больше недоступна.'};

      if(action==='leave'){
        const result=source?payments.attachOperation(occurrenceId,source,'overpayment_left_as_entered'):createAt(occurrenceId,value,occurredAt,'overpayment_left_as_entered');
        if(!result.ok)return result;
        return{ok:true,action,operation:result.operation,summary:payments.summary(occurrenceId),overpaid};
      }

      if(action!=='carry')return{ok:false,error:'Неизвестное действие с переплатой.'};
      const next=nextOccurrence(occurrenceId);if(!next)return{ok:false,error:'Следующий платёж недоступен для переноса переплаты.'};

      const sourceSnapshot=source?JSON.parse(JSON.stringify(source)):null;
      const createdIds=[];
      try{
        if(source)voidSource(source);
        let currentResult=null;
        if(remaining>EPSILON){
          currentResult=createAt(occurrenceId,remaining,occurredAt,'overpayment_current_part_created');
          if(!currentResult.ok)throw new Error(currentResult.error||'Не удалось создать текущую часть оплаты.');
          createdIds.push(currentResult.operation.id);
        }
        const nextResult=createAt(next.id,overpaid,occurredAt,'overpayment_carried_to_next_occurrence');
        if(!nextResult.ok)throw new Error(nextResult.error||'Не удалось перенести переплату.');
        createdIds.push(nextResult.operation.id);
        if(source)addRevision(source,'overpayment_source_replaced_for_carry_forward',[{field:'replacementOperationIds',oldValue:null,newValue:[...createdIds]}]);
        save();runtime.renderAll();
        return{ok:true,action,currentOccurrence:item,nextOccurrence:next,currentOperation:currentResult?.operation||null,nextOperation:nextResult.operation,currentSummary:payments.summary(occurrenceId),nextSummary:payments.summary(next.id),overpaid,replacedSourceOperation:source||null};
      }catch(error){
        state.operations=(state.operations||[]).filter(op=>!createdIds.includes(op.id));
        if(source&&sourceSnapshot){const index=state.operations.findIndex(op=>op.id===source.id);if(index>=0)state.operations[index]=sourceSnapshot;else state.operations.push(sourceSnapshot)}
        payments.deriveAll();save();runtime.renderAll();
        return{ok:false,error:String(error?.message||error)};
      }
    }

    const api={preview,nextOccurrence,resolve};
    window.FamilyPilotOverpaymentResolution=Object.freeze(api);
    if(new URLSearchParams(location.search).has('test')){
      const install=(n=0)=>{if(window.__FP_TEST__){window.__FP_TEST__.overpaymentResolution=api;return}if(n<READY_LIMIT)setTimeout(()=>install(n+1),25)};install();
    }
    window.__FP_OVERPAYMENT_RESOLUTION_READY__=true;
  }
  boot();
})();