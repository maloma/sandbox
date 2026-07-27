(()=>{
  'use strict';
  if(window.__FP_M4_05_CURRENT_ACTIONS_BOOTSTRAP__)return;
  window.__FP_M4_05_CURRENT_ACTIONS_BOOTSTRAP__=true;
  const deadline=Date.now()+40000;
  const wait=()=>{
    const runtime=window.__FP_RUNTIME__,api=window.FamilyPilotMoneyPlanning,distribution=window.FamilyPilotOnboardingDistribution;
    if(!runtime||!api||!distribution||window.__FP_M4_05_READY__!==true){if(Date.now()>=deadline){window.__FP_M4_05_CURRENT_ACTIONS_ERROR__='Current-state action dependencies did not become ready';return}setTimeout(wait,25);return}
    install(runtime,api);
  };

  function install(runtime,api){
    if(window.__FP_M4_05_CURRENT_ACTIONS_READY__)return;
    const{$,esc,money,open,close,toast,isoLocal,now}=runtime;
    let activeActionId='',activeOutcome='full';
    const state=()=>runtime.state;
    const distribution=()=>window.FamilyPilotOnboardingDistribution;
    const deps=()=>({money:window.FamilyPilotMoneyPlanning,wallets:window.FamilyPilotWalletManagement,transfers:window.FamilyPilotWalletTransfers,savings:window.FamilyPilotSavingsGoals,accounts:window.FamilyPilotSavingsAccounts,budget:window.FamilyPilotBudgetDesigner,plannedIncome:window.FamilyPilotPlannedIncome,obligations:window.FamilyPilotObligations,debts:window.FamilyPilotDebts,scope:runtime.scopeApi});
    const locations=()=>api.activeWallets(state());
    const options=selected=>locations().map(item=>`<option value="${esc(item.id)}"${item.id===selected?' selected':''}>${esc(item.name)} · ${item.moneyForm==='cash'?'наличные':'банковский счёт'}</option>`).join('');
    const action=id=>(state().savingsActionOccurrences||[]).find(item=>item.id===id);
    const remaining=item=>Math.max(0,Number(item?.plannedAmount||0)-Number(item?.actualAmount||0));
    const goalName=id=>(state().savingsGoals||[]).find(item=>item.id===id)?.name||'Накопления';
    const fmtDate=value=>value?new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short',year:'numeric'}).format(new Date(value)):'—';

    if(!$('m405CurrentActionModal')){const modal=document.createElement('div');modal.id='m405CurrentActionModal';modal.className='modal';modal.innerHTML=`<div class="sheet"><div class="sheet-head"><h2 id="m405CurrentActionTitle">Подтвердить перевод</h2><button class="close" data-m405-current-close="m405CurrentActionModal">Закрыть</button></div><div id="m405CurrentActionPlan" class="m405-note"></div><div class="field"><label>Фактически переведено</label><input id="m405CurrentActionAmount" class="amount" inputmode="decimal"></div><div class="field"><label>Откуда</label><select id="m405CurrentActionSource"></select></div><div class="field"><label>Куда реально помещены деньги</label><select id="m405CurrentActionDestination"></select></div><div class="field"><label>Дата</label><input id="m405CurrentActionDate" type="datetime-local"></div><div id="m405CurrentActionError" class="error"></div><div class="sheet-actions"><button class="btn secondary" data-m405-current-close="m405CurrentActionModal">Отмена</button><button id="m405CurrentActionSave" class="btn primary">Подтвердить</button></div></div>`;document.body.appendChild(modal)}
    if(!$('m405CurrentPostponeModal')){const modal=document.createElement('div');modal.id='m405CurrentPostponeModal';modal.className='modal';modal.innerHTML=`<div class="sheet"><div class="sheet-head"><h2>Перенести перевод</h2><button class="close" data-m405-current-close="m405CurrentPostponeModal">Закрыть</button></div><div class="field"><label>Новая дата</label><input id="m405CurrentPostponeDate" type="date"></div><div id="m405CurrentPostponeError" class="error"></div><div class="sheet-actions"><button class="btn secondary" data-m405-current-close="m405CurrentPostponeModal">Отмена</button><button id="m405CurrentPostponeSave" class="btn primary">Перенести</button></div></div>`;document.body.appendChild(modal)}

    function batches(){return distribution().incomeDistributionBatches(state(),deps(),now())}
    function renderDistribution(){
      const section=$('m405IncomeDistribution');if(!section)return;
      const items=batches();section.hidden=!items.length;if(!items.length){section.innerHTML='';return}
      section.innerHTML=`<div class="m405-head"><div><h2>Распределить полученный доход</h2><small>Напоминание появляется сразу после фактического прихода. Каждый перевод подтверждается отдельно.</small></div><span class="m405-badge m405-alert">${items.reduce((sum,batch)=>sum+batch.actions.length,0)}</span></div><div class="m405-stack" style="margin-top:10px">${items.map(batch=>`<article class="m405-distribution"><div class="m405-income"><div><strong>Получен доход</strong><small>${fmtDate(batch.operation.occurredAt)} · ${esc((state().wallets||[]).find(item=>item.id===batch.operation.walletId)?.name||'Основной счёт')}</small></div><strong>${money(batch.operation.amount,'EUR')}</strong></div><div class="m405-stack">${batch.actions.map(item=>`<div class="m405-item"><div class="m405-item-title"><div><strong>${esc(goalName(item.goalId))}</strong><small>${esc(item.title)} · ${esc((state().wallets||[]).find(location=>location.id===item.destinationLocationId)?.name||'место хранения не выбрано')}</small></div><strong>${money(remaining(item),'EUR')}</strong></div>${item.actualAmount?`<div class="m405-muted">Уже подтверждено ${money(item.actualAmount,'EUR')}</div>`:''}<div class="m405-actions"><button class="btn primary" data-m405-action="full" data-m405-action-id="${esc(item.id)}">Выполнено полностью</button><button class="btn secondary" data-m405-action="partial" data-m405-action-id="${esc(item.id)}">Выполнено частично</button><button class="btn secondary" data-m405-action="different" data-m405-action-id="${esc(item.id)}">Другая сумма</button><button class="btn secondary" data-m405-action="skipped" data-m405-action-id="${esc(item.id)}">Не выполнено</button><button class="btn secondary" data-m405-action="postponed" data-m405-action-id="${esc(item.id)}">Перенести</button></div></div>`).join('')}</div></article>`).join('')}</div>`;
    }
    function renderHomePrompt(){
      const section=$('m405IncomeHomePrompt');if(!section)return;
      const items=batches();section.hidden=!items.length;if(!items.length){section.innerHTML='';return}
      const latest=items[0];section.innerHTML=`<button class="m405-entry" type="button" data-m405-open-income-distribution><span><strong>Распределить полученный доход</strong><small>Получено ${money(latest.operation.amount,'EUR')}. Подтвердите переводы в накопления на ${money(latest.totalPlanned,'EUR')}.</small></span><span>›</span></button>`;
      const current=state();current.m405NotifiedIncomeBatchIds=Array.isArray(current.m405NotifiedIncomeBatchIds)?current.m405NotifiedIncomeBatchIds:[];
      if(!current.m405NotifiedIncomeBatchIds.includes(latest.id)){current.m405NotifiedIncomeBatchIds.push(latest.id);runtime.save();toast('Доход сохранён. Проверьте распределение в накоплениях.')}
    }
    function recordExecution(result){
      const current=state(),item=result?.action;if(!item)return;
      current.m405ActionExecutionLedger=Array.isArray(current.m405ActionExecutionLedger)?current.m405ActionExecutionLedger:[];
      let entry=current.m405ActionExecutionLedger.find(value=>value.actionId===item.id);
      const value={actionId:item.id,actualAmount:Number(item.actualAmount)||0,status:item.status,savingsTransferIds:[...(item.savingsTransferIds||[])],walletTransferIds:[...(item.walletTransferIds||[])],updatedAt:Number(item.updatedAt)||now(),dueAt:Number(item.dueAt)||null,sourceLocationId:item.sourceLocationId||'',destinationLocationId:item.destinationLocationId||'',incomeTriggerOperationId:item.incomeTriggerOperationId||'',note:String(item.note||'')};
      if(entry)Object.assign(entry,value);else current.m405ActionExecutionLedger.push(value);
    }
    function refreshCurrent(){distribution().normalizeState(state(),deps(),now());runtime.save();renderDistribution();renderHomePrompt()}
    function complete(id,input){const current=state(),result=api.completeAction(current,id,input,current.currentMemberId,deps(),now());if(result.ok){recordExecution(result);refreshCurrent()}return result}
    function openAction(id,outcome){const item=action(id);if(!item)return;activeActionId=id;activeOutcome=outcome;
      if(outcome==='skipped'){if(confirm('Отметить перевод как не выполненный?')){const result=complete(id,{outcome:'skipped'});toast(result.ok?'Отмечено как не выполнено':result.error)}return}
      if(outcome==='postponed'){$('m405CurrentPostponeDate').value=new Date(Math.max(now(),item.dueAt)+86400000).toISOString().slice(0,10);$('m405CurrentPostponeError').textContent='';open('m405CurrentPostponeModal');return}
      const left=remaining(item);$('m405CurrentActionTitle').textContent=outcome==='full'?'Выполнено полностью':outcome==='partial'?'Выполнено частично':'Другая сумма';$('m405CurrentActionPlan').textContent=`План: ${money(item.plannedAmount,'EUR')}. Уже подтверждено: ${money(item.actualAmount,'EUR')}. Осталось: ${money(left,'EUR')}.`;$('m405CurrentActionAmount').value=String(left).replace('.',',');$('m405CurrentActionAmount').readOnly=outcome==='full';$('m405CurrentActionSource').innerHTML=options(item.sourceLocationId);$('m405CurrentActionDestination').innerHTML=options(item.destinationLocationId);$('m405CurrentActionDate').value=isoLocal(now());$('m405CurrentActionError').textContent='';open('m405CurrentActionModal')}
    function saveAction(){const result=complete(activeActionId,{outcome:activeOutcome,amount:Number(String($('m405CurrentActionAmount').value||'').replace(',','.')),sourceLocationId:$('m405CurrentActionSource').value,destinationLocationId:$('m405CurrentActionDestination').value,effectiveDate:new Date($('m405CurrentActionDate').value).getTime()});if(!result.ok){$('m405CurrentActionError').textContent=result.error;return}close('m405CurrentActionModal');toast('Фактический перевод подтверждён')}
    function savePostpone(){const dueAt=new Date(`${$('m405CurrentPostponeDate').value}T12:00:00`).getTime(),result=complete(activeActionId,{outcome:'postponed',dueAt});if(!result.ok){$('m405CurrentPostponeError').textContent=result.error;return}close('m405CurrentPostponeModal');toast('Перевод перенесён')}
    function seedIncome(amount,locationId=api.defaultLocation(state())?.id,occurredAt=now()){const current=state(),operation={id:`m405-income-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,kind:'income',amount:Number(amount),categoryId:(current.categories||[]).find(item=>item.kind==='income')?.id||null,walletId:locationId,note:'Тестовый фактический доход',occurredAt,createdByMemberId:current.currentMemberId,createdAt:occurredAt,lastEditedByMemberId:current.currentMemberId,lastEditedAt:occurredAt,revisions:[],status:'active',deletedAt:null,deletedByMemberId:null,trashExpiresAt:null,receipt:null,links:{},transferGroupId:null};current.operations.push(operation);refreshCurrent();return operation}
    function configureReserve(input){const current=state(),result=distribution().configureReserveRule(current,input,current.currentMemberId,deps(),now());if(result.ok)refreshCurrent();return result}
    function bridge(){return distribution().giftReserveBridgeProposal(state(),deps(),now())}
    function applyBridge(input,confirmed){const current=state(),result=distribution().applyGiftReserveBridge(current,input,confirmed,current.currentMemberId,deps(),now());if(result.ok)refreshCurrent();return result}

    const previous=runtime.getRenderAll();runtime.setRenderAll(function(){const result=previous();renderDistribution();renderHomePrompt();return result});
    renderDistribution();renderHomePrompt();
    document.addEventListener('click',event=>{const button=event.target.closest('#m405IncomeDistribution [data-m405-action]'),openDistribution=event.target.closest('[data-m405-open-income-distribution]'),closer=event.target.closest('[data-m405-current-close]');if(button){event.preventDefault();event.stopImmediatePropagation();openAction(button.dataset.m405ActionId,button.dataset.m405Action);return}if(openDistribution){event.preventDefault();showScreen('savingsGoals');renderDistribution();$('m405IncomeDistribution')?.scrollIntoView({behavior:'smooth',block:'start'});return}if(closer){event.preventDefault();close(closer.dataset.m405CurrentClose)}},true);
    $('m405CurrentActionSave').onclick=saveAction;$('m405CurrentPostponeSave').onclick=savePostpone;

    if(new URLSearchParams(location.search).has('test')){window.__FP_TEST__=window.__FP_TEST__||{};window.__FP_TEST__.m405Current={complete,batches,seedIncome,configureReserve,bridge,applyBridge,renderDistribution,renderHomePrompt,action:id=>JSON.parse(JSON.stringify(action(id)||null))}}
    window.__FP_M4_05_CURRENT_ACTIONS_READY__=true;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wait,{once:true});else wait();
})();
