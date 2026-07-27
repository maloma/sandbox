(()=>{
  'use strict';
  if(window.__FP_M4_05_CURRENT_ACTIONS_BOOTSTRAP__)return;
  window.__FP_M4_05_CURRENT_ACTIONS_BOOTSTRAP__=true;
  const deadline=Date.now()+40000;
  const wait=()=>{
    const runtime=window.__FP_RUNTIME__,api=window.FamilyPilotMoneyPlanning;
    if(!runtime||!api||window.__FP_M4_05_READY__!==true){if(Date.now()>=deadline){window.__FP_M4_05_CURRENT_ACTIONS_ERROR__='Current-state action dependencies did not become ready';return}setTimeout(wait,25);return}
    install(runtime,api);
  };

  function install(runtime,api){
    if(window.__FP_M4_05_CURRENT_ACTIONS_READY__)return;
    const{$,esc,money,open,close,toast,isoLocal,now}=runtime;
    let activeActionId='',activeOutcome='full';
    const state=()=>runtime.state;
    const deps=()=>({wallets:window.FamilyPilotWalletManagement,transfers:window.FamilyPilotWalletTransfers,savings:window.FamilyPilotSavingsGoals,accounts:window.FamilyPilotSavingsAccounts,scope:runtime.scopeApi});
    const locations=()=>api.activeWallets(state());
    const options=selected=>locations().map(item=>`<option value="${esc(item.id)}"${item.id===selected?' selected':''}>${esc(item.name)} · ${item.moneyForm==='cash'?'наличные':'банковский счёт'}</option>`).join('');
    const action=id=>(state().savingsActionOccurrences||[]).find(item=>item.id===id);
    const remaining=item=>Math.max(0,Number(item?.plannedAmount||0)-Number(item?.actualAmount||0));

    if(!$('m405CurrentActionModal')){const modal=document.createElement('div');modal.id='m405CurrentActionModal';modal.className='modal';modal.innerHTML=`<div class="sheet"><div class="sheet-head"><h2 id="m405CurrentActionTitle">Подтвердить перевод</h2><button class="close" data-m405-current-close="m405CurrentActionModal">Закрыть</button></div><div id="m405CurrentActionPlan" class="m405-note"></div><div class="field"><label>Фактически переведено</label><input id="m405CurrentActionAmount" class="amount" inputmode="decimal"></div><div class="field"><label>Откуда</label><select id="m405CurrentActionSource"></select></div><div class="field"><label>Куда реально помещены деньги</label><select id="m405CurrentActionDestination"></select></div><div class="field"><label>Дата</label><input id="m405CurrentActionDate" type="datetime-local"></div><div id="m405CurrentActionError" class="error"></div><div class="sheet-actions"><button class="btn secondary" data-m405-current-close="m405CurrentActionModal">Отмена</button><button id="m405CurrentActionSave" class="btn primary">Подтвердить</button></div></div>`;document.body.appendChild(modal)}
    if(!$('m405CurrentPostponeModal')){const modal=document.createElement('div');modal.id='m405CurrentPostponeModal';modal.className='modal';modal.innerHTML=`<div class="sheet"><div class="sheet-head"><h2>Перенести перевод</h2><button class="close" data-m405-current-close="m405CurrentPostponeModal">Закрыть</button></div><div class="field"><label>Новая дата</label><input id="m405CurrentPostponeDate" type="date"></div><div id="m405CurrentPostponeError" class="error"></div><div class="sheet-actions"><button class="btn secondary" data-m405-current-close="m405CurrentPostponeModal">Отмена</button><button id="m405CurrentPostponeSave" class="btn primary">Перенести</button></div></div>`;document.body.appendChild(modal)}

    function rewriteButtons(){document.querySelectorAll('#m405IncomeDistribution [data-m404-action]').forEach(button=>{button.dataset.m405Action=button.dataset.m404Action;delete button.dataset.m404Action})}
    function complete(id,input){const result=api.completeAction(state(),id,input,state().currentMemberId,deps(),now());if(result.ok){runtime.save();runtime.renderAll()}return result}
    function openAction(id,outcome){const item=action(id);if(!item)return;activeActionId=id;activeOutcome=outcome;
      if(outcome==='skipped'){if(confirm('Отметить перевод как не выполненный?')){const result=complete(id,{outcome:'skipped'});toast(result.ok?'Отмечено как не выполнено':result.error)}return}
      if(outcome==='postponed'){$('m405CurrentPostponeDate').value=new Date(Math.max(now(),item.dueAt)+86400000).toISOString().slice(0,10);$('m405CurrentPostponeError').textContent='';open('m405CurrentPostponeModal');return}
      const left=remaining(item);$('m405CurrentActionTitle').textContent=outcome==='full'?'Выполнено полностью':outcome==='partial'?'Выполнено частично':'Другая сумма';$('m405CurrentActionPlan').textContent=`План: ${money(item.plannedAmount,'EUR')}. Уже подтверждено: ${money(item.actualAmount,'EUR')}. Осталось: ${money(left,'EUR')}.`;$('m405CurrentActionAmount').value=String(left).replace('.',',');$('m405CurrentActionAmount').readOnly=outcome==='full';$('m405CurrentActionSource').innerHTML=options(item.sourceLocationId);$('m405CurrentActionDestination').innerHTML=options(item.destinationLocationId);$('m405CurrentActionDate').value=isoLocal(now());$('m405CurrentActionError').textContent='';open('m405CurrentActionModal')}
    function saveAction(){const result=complete(activeActionId,{outcome:activeOutcome,amount:Number(String($('m405CurrentActionAmount').value||'').replace(',','.')),sourceLocationId:$('m405CurrentActionSource').value,destinationLocationId:$('m405CurrentActionDestination').value,effectiveDate:new Date($('m405CurrentActionDate').value).getTime()});if(!result.ok){$('m405CurrentActionError').textContent=result.error;return}close('m405CurrentActionModal');toast('Фактический перевод подтверждён')}
    function savePostpone(){const dueAt=new Date(`${$('m405CurrentPostponeDate').value}T12:00:00`).getTime(),result=complete(activeActionId,{outcome:'postponed',dueAt});if(!result.ok){$('m405CurrentPostponeError').textContent=result.error;return}close('m405CurrentPostponeModal');toast('Перевод перенесён')}

    const previous=runtime.getRenderAll();runtime.setRenderAll(function(){const result=previous();rewriteButtons();return result});
    rewriteButtons();
    new MutationObserver(rewriteButtons).observe($('m405IncomeDistribution')||document.body,{childList:true,subtree:true});
    document.addEventListener('click',event=>{const button=event.target.closest('#m405IncomeDistribution [data-m405-action]'),closer=event.target.closest('[data-m405-current-close]');if(button){event.preventDefault();event.stopImmediatePropagation();openAction(button.dataset.m404ActionId,button.dataset.m405Action);return}if(closer){event.preventDefault();close(closer.dataset.m405CurrentClose)}},true);
    $('m405CurrentActionSave').onclick=saveAction;$('m405CurrentPostponeSave').onclick=savePostpone;

    if(new URLSearchParams(location.search).has('test')){window.__FP_TEST__=window.__FP_TEST__||{};window.__FP_TEST__.m405Current={complete,rewriteButtons,action:id=>JSON.parse(JSON.stringify(action(id)||null))}}
    window.__FP_M4_05_CURRENT_ACTIONS_READY__=true;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wait,{once:true});else wait();
})();
