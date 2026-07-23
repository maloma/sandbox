(()=>{
  'use strict';
  if(window.__FP_PARTIAL_PAYMENTS__)return;
  const READY_LIMIT=1200,DAY=86400000,MEMORY_KEY='obligationPartialPaymentMemoryByOccurrenceId',EPSILON=.005;

  function boot(attempt=0){
    const runtime=window.__FP_RUNTIME__,obligations=window.FamilyPilotObligations,attention=window.FamilyPilotPaymentAttention;
    if(!runtime||!obligations||!attention||!window.__FP_M3_04_READY__){
      if(attempt<READY_LIMIT)setTimeout(()=>boot(attempt+1),25);
      else window.__FP_PARTIAL_PAYMENTS_ERROR__='Partial payment dependencies did not become ready';
      return;
    }
    window.__FP_PARTIAL_PAYMENTS__=true;
    const state=runtime.state,$=runtime.$,esc=runtime.esc,money=runtime.money,save=runtime.save,open=runtime.open,close=runtime.close,now=runtime.now,scopeApi=runtime.scopeApi;
    let contextOccurrenceId='',partialOccurrenceId='',unpayOccurrenceId='',unpayAfter='planned',projectionInstalled=false;

    const occurrence=id=>(state.obligationOccurrences||[]).find(item=>item.id===id)||null;
    const rule=id=>(state.obligationRules||[]).find(item=>item.id===id)||null;
    const operation=id=>(state.operations||[]).find(item=>item.id===id)||null;
    const wallet=id=>(state.wallets||[]).find(item=>item.id===id)||null;
    const currency=item=>item?.currency||wallet(item?.walletId)?.nativeCurrency||state.household?.baseCurrency||'EUR';
    const formatDate=value=>new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(value));
    const sameCents=(a,b)=>Math.round(Number(a||0)*100)===Math.round(Number(b||0)*100);

    function addRevision(target,source,changes){
      if(!target)return;
      target.revisions=Array.isArray(target.revisions)?target.revisions:[];
      target.revisions.push({id:`allocation-rev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,sequence:target.revisions.length+1,changedAt:now(),changedByMemberId:state.currentMemberId,source,changes});
      target.lastEditedAt=now();
    }
    function memoryMap(){
      state.config=state.config&&typeof state.config==='object'?state.config:{};
      const current=state.config[MEMORY_KEY];
      state.config[MEMORY_KEY]=current&&typeof current==='object'&&!Array.isArray(current)?current:{};
      return state.config[MEMORY_KEY];
    }
    function allocationOccurrenceId(op){return op?.links?.obligationOccurrenceId||op?.links?.obligationAllocationOccurrenceId||null}
    function isAllocated(op,id=''){const linked=allocationOccurrenceId(op);return !!linked&&(!id||linked===id)}
    function activeAllocations(id){return(state.operations||[]).filter(op=>op.status==='active'&&op.kind==='expense'&&isAllocated(op,id)).sort((a,b)=>Number(a.occurredAt||0)-Number(b.occurredAt||0)||Number(a.createdAt||0)-Number(b.createdAt||0))}
    function allAllocationOperations(id){return(state.operations||[]).filter(op=>op.kind==='expense'&&isAllocated(op,id)).sort((a,b)=>Number(a.occurredAt||0)-Number(b.occurredAt||0)||Number(a.createdAt||0)-Number(b.createdAt||0))}
    function summary(id){
      const item=occurrence(id),operations=activeAllocations(id),expected=Number(item?.expectedAmount||0),paid=operations.reduce((sum,op)=>sum+Number(op.amount||0),0),remaining=Math.max(0,expected-paid),overpaid=Math.max(0,paid-expected);
      return{item,operations,expected,paid,remaining,overpaid,status:paid<=EPSILON?'planned':paid+EPSILON>=expected?'paid':'partial'};
    }
    function ensurePrimary(id,ops=activeAllocations(id)){
      const item=occurrence(id);if(!item)return null;
      let primary=ops.find(op=>op.links?.obligationOccurrenceId===id)||null;
      if(!primary&&ops.length){
        primary=ops[0];primary.links={...(primary.links||{})};delete primary.links.obligationAllocationOccurrenceId;primary.links.obligationOccurrenceId=id;primary.links.relation='fulfills_occurrence';primary.links.allocationGroupVersion=1;
      }
      for(const op of ops){
        op.links={...(op.links||{}),obligationRuleId:item.ruleId,allocationGroupVersion:1};
        if(op===primary)continue;
        if(op.links.obligationOccurrenceId===id)delete op.links.obligationOccurrenceId;
        op.links.obligationAllocationOccurrenceId=id;op.links.relation='partially_fulfills_occurrence';
      }
      return primary;
    }
    function deriveOccurrence(id){
      const item=occurrence(id);if(!item)return null;
      const operations=activeAllocations(id),primary=ensurePrimary(id,operations),data=summary(id),oldStatus=item.status;
      item.linkedOperationIds=operations.map(op=>op.id);
      item.linkedOperationId=primary?.id||null;
      item.actualAmount=data.paid>EPSILON?data.paid:null;
      item.paidAt=operations.length?Math.max(...operations.map(op=>Number(op.occurredAt||0))):null;
      item.allocationStatus=data.status;
      item.overpaidAmount=data.overpaid;
      if(operations.length){item.status=data.status;item.skippedAt=null}
      else if(oldStatus==='partial'||(oldStatus==='paid'&&Array.isArray(item.linkedOperationIds))){item.status='planned';item.actualAmount=null;item.paidAt=null;item.overpaidAmount=0}
      return{...data,item,operations,primary};
    }
    function deriveAll(){for(const item of state.obligationOccurrences||[])deriveOccurrence(item.id)}

    function attachOperation(id,op,source='partial_payment_link_existing'){
      const item=occurrence(id),itemRule=rule(item?.ruleId);if(!item||!itemRule||!op)return{ok:false,error:'Платёж или операция не найдены.'};
      if(op.status!=='active'||op.kind!=='expense')return{ok:false,error:'Операция недоступна для связи.'};
      const existing=allocationOccurrenceId(op);if(existing&&existing!==id)return{ok:false,error:'Операция уже связана с другим платежом.'};
      const before=activeAllocations(id),hasPrimary=before.some(entry=>entry.links?.obligationOccurrenceId===id);
      op.links={...(op.links||{}),sourceModule:'obligations',obligationRuleId:item.ruleId,allocationGroupVersion:1,obligationLinkMode:op.links?.obligationLinkMode||'existing'};
      if(hasPrimary){delete op.links.obligationOccurrenceId;op.links.obligationAllocationOccurrenceId=id;op.links.relation='partially_fulfills_occurrence'}
      else{delete op.links.obligationAllocationOccurrenceId;op.links.obligationOccurrenceId=id;op.links.relation='fulfills_occurrence'}
      addRevision(op,source,[{field:'obligationAllocation',oldValue:existing,newValue:id}]);
      if(item.status==='skipped'||item.status==='cancelled'){item.status='planned';item.skippedAt=null}
      const result=deriveOccurrence(id);addRevision(item,source,[{field:'status',oldValue:item.status,newValue:result.status},{field:'actualAmount',oldValue:item.actualAmount,newValue:result.paid}]);
      save();runtime.renderAll();return{ok:true,occurrence:item,operation:op,summary:result};
    }
    function createOperation(id,amount){
      const item=occurrence(id),itemRule=rule(item?.ruleId),value=Number(String(amount).replace(',','.'));if(!item||!itemRule)return{ok:false,error:'Платёж не найден.'};
      if(!Number.isFinite(value)||value<=0||value>999999.99)return{ok:false,error:'Введите корректную сумму.'};
      const at=now(),op={id:`op-partial-${at.toString(36)}-${Math.random().toString(36).slice(2,8)}`,kind:'expense',amount:value,categoryId:item.categoryId||itemRule.categoryId,walletId:item.walletId||itemRule.walletId,note:`Оплата обязательства: ${itemRule.name}`,occurredAt:at,createdByMemberId:state.currentMemberId,createdAt:at,lastEditedByMemberId:state.currentMemberId,lastEditedAt:at,revisions:[],status:'active',deletedAt:null,deletedByMemberId:null,trashExpiresAt:null,receipt:null,links:{sourceModule:'obligations',obligationRuleId:item.ruleId,obligationLinkMode:'generated',allocationGroupVersion:1},transferGroupId:null};
      state.operations.push(op);return attachOperation(id,op,'partial_payment_created');
    }
    function clearLinks(op){
      const old=allocationOccurrenceId(op);op.links={...(op.links||{})};delete op.links.obligationOccurrenceId;delete op.links.obligationAllocationOccurrenceId;delete op.links.obligationRuleId;delete op.links.relation;delete op.links.allocationGroupVersion;delete op.links.obligationLinkMode;addRevision(op,'partial_payment_detached',[{field:'obligationAllocation',oldValue:old,newValue:null}]);
    }
    function voidOperation(op){const old=op.status;op.status='voided';op.systemVoidedAt=now();op.systemVoidReason='partial_payment_removed';op.deletedAt=null;op.deletedByMemberId=null;op.trashExpiresAt=null;addRevision(op,'partial_payment_voided',[{field:'status',oldValue:old,newValue:'voided'}])}
    function rememberGroup(id,ops,mode){memoryMap()[id]={operationIds:ops.map(op=>op.id),mode,rememberedAt:now()}}
    function restoreRemembered(id){
      const item=occurrence(id),memory=memoryMap()[id],ops=(memory?.operationIds||[]).map(operation).filter(Boolean);if(!item||!ops.length||item.status!=='planned')return false;
      if(ops.some(op=>op.status==='trash'||(allocationOccurrenceId(op)&&allocationOccurrenceId(op)!==id)))return false;
      for(const op of ops){if(!['active','voided'].includes(op.status))return false}
      for(const op of ops){op.status='active';op.systemVoidedAt=null;op.systemVoidReason=null;op.deletedAt=null;op.deletedByMemberId=null;op.trashExpiresAt=null;clearLinks(op)}
      for(const op of ops)attachOperation(id,op,'partial_payment_group_restored');
      memoryMap()[id].lastRestoredAt=now();save();runtime.renderAll();runtime.toast('Прежние оплаты снова связаны с платежом.');return true;
    }

    function matchingExpenses(id){
      const data=summary(id),item=data.item;if(!item)return[];const target=Math.min(Number(item.dueAt),now());
      return(state.operations||[]).filter(op=>op.status==='active'&&op.kind==='expense'&&!allocationOccurrenceId(op)&&op.walletId===item.walletId&&op.categoryId===item.categoryId&&Number(op.amount)>0&&Number(op.occurredAt)<=now()&&Math.abs(Number(op.occurredAt)-target)<=45*DAY).sort((a,b)=>{
        const aExact=sameCents(a.amount,data.remaining)?0:1,bExact=sameCents(b.amount,data.remaining)?0:1;return aExact-bExact||Math.abs(Number(a.amount)-data.remaining)-Math.abs(Number(b.amount)-data.remaining)||Number(b.occurredAt)-Number(a.occurredAt)
      }).slice(0,8);
    }

    function installStyle(){
      const style=document.createElement('style');style.id='familypilot-partial-payments-style';style.textContent=`
        .obligation-row--partial{border-color:color-mix(in srgb,#d99a00 62%,var(--line))!important;background:color-mix(in srgb,#d99a00 12%,var(--card))!important}.obligation-pay-check.is-partial{border-color:#d99a00!important;background:color-mix(in srgb,#d99a00 18%,var(--card))!important;color:#c18100!important}.partial-payment-progress{color:#b87900!important;font-weight:850}.partial-payment-summary{margin-top:12px;padding:12px;border:1px solid color-mix(in srgb,#d99a00 45%,var(--line));border-radius:15px;background:color-mix(in srgb,#d99a00 8%,var(--card2))}.partial-payment-summary strong,.partial-payment-summary small{display:block}.partial-payment-summary small{margin-top:4px;color:var(--muted)}.partial-payment-list{display:grid;gap:8px;margin-top:12px}.partial-payment-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px;border:1px solid var(--line);border-radius:14px;background:var(--card2)}.partial-payment-item strong,.partial-payment-item small{display:block}.partial-payment-item small{margin-top:3px;color:var(--muted);font-size:10px}.partial-payment-item-actions{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}.partial-payment-item-actions button{min-height:36px;padding:6px 8px;font-size:10px}.partial-payment-candidates{margin-top:15px}.partial-payment-candidates h3{font-size:13px;margin:0 0 7px}.partial-payment-system-note{color:#b87900!important;font-weight:850}
      `;document.head.appendChild(style);
    }
    function installModals(){
      if(!$('partialPaymentModal')){const modal=document.createElement('div');modal.id='partialPaymentModal';modal.className='modal';modal.innerHTML=`<div class="sheet"><div class="sheet-head"><h2>Добавить оплату</h2><button class="close" type="button" data-partial-close>Закрыть</button></div><div id="partialPaymentSummary"></div><div id="partialLinkedList" class="partial-payment-list"></div><section id="partialCandidateSection" class="partial-payment-candidates"><h3>Подходящие операции</h3><div id="partialCandidateList" class="partial-payment-list"></div></section><div class="field"><label for="partialPaymentAmount">Сумма новой оплаты</label><input id="partialPaymentAmount" inputmode="decimal" placeholder="0,00"></div><div id="partialPaymentError" class="error"></div><div class="sheet-actions"><button class="btn secondary" type="button" data-partial-close>Отмена</button><button class="btn primary" type="button" data-partial-create>Создать расход и связать</button></div></div>`;document.body.appendChild(modal)}
      if(!$('allocationUnpayModal')){const modal=document.createElement('div');modal.id='allocationUnpayModal';modal.className='modal';modal.innerHTML=`<div class="sheet"><div class="sheet-head"><h2>Изменить оплаты?</h2><button class="close" type="button" data-allocation-unpay="cancel">Закрыть</button></div><div id="allocationUnpaySummary" class="partial-payment-summary"></div><div id="allocationUnpayList" class="partial-payment-list"></div><div class="payment-unpay-actions"><button class="btn danger" type="button" data-allocation-unpay="remove">Снять отметку и удалить связанные операции</button><button class="btn secondary" type="button" data-allocation-unpay="keep">Снять отметку, операции оставить</button><button class="btn secondary" type="button" data-allocation-unpay="cancel">Отмена</button></div></div>`;document.body.appendChild(modal)}
    }
    function installContextAction(){
      const modal=$('paymentContextModal');if(!modal||modal.querySelector('[data-payment-context-action="partial"]'))return;
      const edit=modal.querySelector('[data-payment-context-action="edit"]'),button=document.createElement('button');button.type='button';button.className='btn secondary';button.dataset.paymentContextAction='partial';button.textContent='Частичная оплата';edit?.before(button);
    }

    function renderPartialModal(){
      const data=summary(partialOccurrenceId),item=data.item,itemRule=rule(item?.ruleId);if(!item)return;
      $('partialPaymentSummary').innerHTML=`<div class="partial-payment-summary"><strong>${esc(itemRule?.name||'Обязательство')}</strong><small>Запланировано: ${money(data.expected,currency(item))} · Оплачено: ${money(data.paid,currency(item))} · Осталось: ${money(data.remaining,currency(item))}${data.overpaid?` · Переплата: ${money(data.overpaid,currency(item))}`:''}</small></div>`;
      $('partialLinkedList').innerHTML=data.operations.length?data.operations.map(op=>`<div class="partial-payment-item"><span><strong>${money(op.amount,currency(item))}</strong><small>${formatDate(op.occurredAt)} · связанная операция</small></span><span class="partial-payment-item-actions"><button class="btn secondary" type="button" data-partial-operation="keep" data-operation-id="${esc(op.id)}">Отвязать</button><button class="btn danger" type="button" data-partial-operation="remove" data-operation-id="${esc(op.id)}">Убрать из финансов</button></span></div>`).join(''):'';
      const candidates=matchingExpenses(item.id);$('partialCandidateSection').hidden=!candidates.length;$('partialCandidateList').innerHTML=candidates.map(op=>`<div class="partial-payment-item"><span><strong>${money(op.amount,currency(item))}</strong><small>${formatDate(op.occurredAt)}${op.note?` · ${esc(op.note)}`:''}</small></span><button class="btn secondary" type="button" data-partial-link="${esc(op.id)}">Связать</button></div>`).join('');
      $('partialPaymentAmount').value=data.remaining>EPSILON?String(data.remaining.toFixed(2)).replace('.',','):'';$('partialPaymentError').textContent='';
    }
    function openPartial(id){partialOccurrenceId=id;close('paymentContextModal');renderPartialModal();open('partialPaymentModal')}
    function removeOne(id,opId,mode){
      const op=operation(opId);if(!op||!isAllocated(op,id))return false;rememberGroup(id,activeAllocations(id),mode==='remove'?'single_removed':'single_detached');if(mode==='remove')voidOperation(op);else clearLinks(op);deriveOccurrence(id);save();runtime.renderAll();if($('partialPaymentModal')?.classList.contains('open'))renderPartialModal();runtime.toast(mode==='remove'?'Операция убрана из финансов.':'Операция оставлена, связь снята.');return true;
    }
    function renderUnpayModal(){
      const data=summary(unpayOccurrenceId),item=data.item,itemRule=rule(item?.ruleId);if(!item)return;
      $('allocationUnpaySummary').innerHTML=`<strong>${esc(itemRule?.name||'Обязательство')}</strong><small>${data.operations.length} операций · ${money(data.paid,currency(item))} из ${money(data.expected,currency(item))}</small>`;
      $('allocationUnpayList').innerHTML=data.operations.map(op=>`<div class="partial-payment-item"><span><strong>${money(op.amount,currency(item))}</strong><small>${formatDate(op.occurredAt)}</small></span><span class="partial-payment-item-actions"><button class="btn secondary" type="button" data-allocation-single="keep" data-operation-id="${esc(op.id)}">Отвязать</button><button class="btn danger" type="button" data-allocation-single="remove" data-operation-id="${esc(op.id)}">Убрать</button></span></div>`).join('');
    }
    function openMultiUnpay(id,{after='planned'}={}){unpayOccurrenceId=id;unpayAfter=after;close('paymentContextModal');renderUnpayModal();open('allocationUnpayModal')}
    function completeMultiUnpay(mode){
      const item=occurrence(unpayOccurrenceId),ops=activeAllocations(unpayOccurrenceId);if(!item)return false;rememberGroup(item.id,ops,mode);
      for(const op of ops){if(mode==='remove')voidOperation(op);else clearLinks(op)}
      deriveOccurrence(item.id);item.status='planned';item.actualAmount=null;item.paidAt=null;item.linkedOperationId=null;item.linkedOperationIds=[];
      if(unpayAfter==='skipped')obligations.skipOccurrence(state,item.id,state.currentMemberId,now());save();close('allocationUnpayModal');runtime.renderAll();runtime.toast(mode==='remove'?'Оплаты убраны из финансов и сохранены во внутренней истории.':'Связи сняты, операции оставлены.');return true;
    }

    function decorateRows(){
      for(const row of document.querySelectorAll('#obligationList [data-obligation-occurrence]')){
        const item=occurrence(row.dataset.obligationOccurrence);if(!item)continue;const data=summary(item.id),copy=row.querySelector('.obligation-row-copy small'),value=row.querySelector('.obligation-row-value strong'),button=row.querySelector('[data-state-payment-toggle]');
        row.classList.toggle('obligation-row--partial',item.status==='partial');
        if(item.status==='partial'){
          if(copy)copy.innerHTML=`${esc(wallet(item.walletId)?.name||'Кошелёк')} · <span class="partial-payment-progress">Оплачено ${money(data.paid,currency(item))} из ${money(data.expected,currency(item))} · Осталось ${money(data.remaining,currency(item))}</span>`;
          if(value)value.textContent=`${money(data.paid,currency(item))} / ${money(data.expected,currency(item))}`;
          if(button){button.classList.add('is-partial');button.textContent='½';button.setAttribute('aria-label','Добавить ещё одну оплату')}
        }else if(button)button.classList.remove('is-partial');
        if(item.status==='paid'&&data.operations.length>1){
          if(copy)copy.innerHTML=`${esc(wallet(item.walletId)?.name||'Кошелёк')} · Оплачено ${money(data.paid,currency(item))}${data.overpaid?` · Переплата ${money(data.overpaid,currency(item))}`:''}`;
          if(value)value.textContent=`${money(data.paid,currency(item))} / ${money(data.expected,currency(item))}`;
        }
      }
      for(const group of document.querySelectorAll('#obligationList .obligation-date-group')){
        const items=[...group.querySelectorAll('[data-obligation-occurrence]')].filter(row=>!row.hidden).map(row=>occurrence(row.dataset.obligationOccurrence)).filter(Boolean),map=new Map();
        for(const item of items){if(['paid','skipped','cancelled'].includes(item.status))continue;const data=summary(item.id),code=currency(item),needed=item.status==='partial'?data.remaining:Number(item.expectedAmount||0);map.set(code,(map.get(code)||0)+needed)}
        const plan=group.querySelector('.obligation-day-plan small');if(plan)plan.textContent=map.size?`Запланировать: ${[...map].map(([code,value])=>money(value,code)).join(' · ')}`:'Всё отмечено';
      }
    }
    function updatePlanIndicator(){
      const hidden=state.config?.hiddenObligationOccurrencesById||{},groups=attention.groupedAttention(state,scopeApi,now()),filtered={overdue:groups.overdue.filter(x=>!hidden[x.occurrence.id]&&summary(x.occurrence.id).remaining>EPSILON),today:groups.today.filter(x=>!hidden[x.occurrence.id]&&summary(x.occurrence.id).remaining>EPSILON),upcoming:groups.upcoming.filter(x=>!hidden[x.occurrence.id]&&summary(x.occurrence.id).remaining>EPSILON)},overdue=filtered.overdue.length,today=filtered.today.length,upcoming=filtered.upcoming.length;
      const badge=document.querySelector('.bottom [data-screen="plans"] .plan-attention-badge');if(badge){const urgent=overdue+today;badge.hidden=!(urgent||upcoming);badge.textContent=urgent?String(Math.min(99,urgent)):'';badge.classList.toggle('overdue',overdue>0);badge.classList.toggle('upcoming',!urgent&&upcoming>0)}
    }
    function installOperationProjection(){
      if(projectionInstalled)return;projectionInstalled=true;const base=runtime.getOperationRow();runtime.setOperationRow(op=>{let html=base(op);const id=allocationOccurrenceId(op);if(!id||op.status!=='active')return html;const data=summary(id),item=data.item,itemRule=rule(item?.ruleId);if(!item)return html;const label=`Плановый расход · ${itemRule?.name||'Обязательство'} · часть ${money(op.amount,currency(item))} · оплачено ${money(data.paid,currency(item))} из ${money(data.expected,currency(item))} · срок ${formatDate(item.dueAt)}`;const block=`<div class="op-note obligation-operation-link partial-payment-system-note">${esc(label)}</div>`;if(/<div class="op-note obligation-operation-link[^"]*">[\s\S]*?<\/div>/.test(html))return html.replace(/<div class="op-note obligation-operation-link[^"]*">[\s\S]*?<\/div>/,block);return html.replace(/(<div class="op-meta">[\s\S]*?<\/div>)/,`$1${block}`)})
    }
    function render(){deriveAll();installContextAction();decorateRows();updatePlanIndicator()}

    installStyle();installModals();memoryMap();deriveAll();installOperationProjection();
    const previous=runtime.getRenderAll();runtime.setRenderAll(()=>{deriveAll();const result=previous();deriveAll();render();return result});render();

    window.addEventListener('pointerdown',event=>{const toggle=event.target.closest?.('[data-state-payment-toggle],[data-ux-payment-toggle]');if(toggle)contextOccurrenceId=toggle.dataset.statePaymentToggle||toggle.dataset.uxPaymentToggle||''},true);
    window.addEventListener('contextmenu',event=>{const toggle=event.target.closest?.('[data-state-payment-toggle],[data-ux-payment-toggle]');if(toggle)contextOccurrenceId=toggle.dataset.statePaymentToggle||toggle.dataset.uxPaymentToggle||''},true);
    window.addEventListener('click',event=>{
      const closePartial=event.target.closest?.('[data-partial-close]');if(closePartial){event.preventDefault();event.stopImmediatePropagation();close('partialPaymentModal');return}
      const create=event.target.closest?.('[data-partial-create]');if(create){event.preventDefault();event.stopImmediatePropagation();const result=createOperation(partialOccurrenceId,$('partialPaymentAmount').value);if(!result.ok){$('partialPaymentError').textContent=result.error;return}close('partialPaymentModal');runtime.toast(result.summary.status==='paid'?'Платёж оплачен полностью.':'Частичная оплата добавлена.');return}
      const link=event.target.closest?.('[data-partial-link]');if(link){event.preventDefault();event.stopImmediatePropagation();const result=attachOperation(partialOccurrenceId,operation(link.dataset.partialLink));if(result.ok){close('partialPaymentModal');runtime.toast(result.summary.status==='paid'?'Операция связана. Платёж закрыт.':'Операция связана как частичная оплата.')}else $('partialPaymentError').textContent=result.error;return}
      const partialOperation=event.target.closest?.('[data-partial-operation]');if(partialOperation){event.preventDefault();event.stopImmediatePropagation();removeOne(partialOccurrenceId,partialOperation.dataset.operationId,partialOperation.dataset.partialOperation);return}
      const unpay=event.target.closest?.('[data-allocation-unpay]');if(unpay){event.preventDefault();event.stopImmediatePropagation();const action=unpay.dataset.allocationUnpay;if(action==='remove'||action==='keep')completeMultiUnpay(action);else close('allocationUnpayModal');return}
      const single=event.target.closest?.('[data-allocation-single]');if(single){event.preventDefault();event.stopImmediatePropagation();removeOne(unpayOccurrenceId,single.dataset.operationId,single.dataset.allocationSingle);renderUnpayModal();return}
      const contextAction=event.target.closest?.('[data-payment-context-action]');
      if(contextAction){const action=contextAction.dataset.paymentContextAction,item=occurrence(contextOccurrenceId),count=activeAllocations(contextOccurrenceId).length;if(action==='partial'&&item){event.preventDefault();event.stopImmediatePropagation();openPartial(item.id);return}if(item&&(item.status==='partial'||count>1)&&['unpaid','skipped'].includes(action)){event.preventDefault();event.stopImmediatePropagation();openMultiUnpay(item.id,{after:action==='skipped'?'skipped':'planned'});return}}
      const toggle=event.target.closest?.('[data-state-payment-toggle],[data-ux-payment-toggle]');if(!toggle)return;const id=toggle.dataset.statePaymentToggle||toggle.dataset.uxPaymentToggle||'',item=occurrence(id),count=activeAllocations(id).length;contextOccurrenceId=id;
      if(item?.status==='partial'){event.preventDefault();event.stopImmediatePropagation();openPartial(id);return}
      if(item?.status==='paid'&&count>1){event.preventDefault();event.stopImmediatePropagation();openMultiUnpay(id);return}
      if(item?.status==='planned'&&restoreRemembered(id)){event.preventDefault();event.stopImmediatePropagation();return}
    },true);

    const api={summary,activeAllocations,matchingExpenses,attachOperation,createOperation,removeOne,restoreRemembered,openPartial,openMultiUnpay,deriveAll};window.FamilyPilotPartialPayments=Object.freeze(api);
    function installTest(attempt=0){if(!new URLSearchParams(location.search).has('test'))return;if(window.__FP_TEST__){window.__FP_TEST__.partialPayments=api;return}if(attempt<READY_LIMIT)setTimeout(()=>installTest(attempt+1),25)}installTest();
    window.__FP_PARTIAL_PAYMENTS_READY__=true;
  }
  boot();
})();
