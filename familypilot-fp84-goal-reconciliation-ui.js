(()=>{
  'use strict';
  if(window.__FP84_GOAL_RECONCILIATION_UI_BOOTSTRAP__)return;
  window.__FP84_GOAL_RECONCILIATION_UI_BOOTSTRAP__=true;
  const deadline=Date.now()+50000;

  function wait(){
    const runtime=window.__FP_RUNTIME__,truth=window.FamilyPilotSavingsTruth,legacy=window.FamilyPilotSavingsGoals,moneyPlanning=window.FamilyPilotMoneyPlanning;
    if(!runtime||!truth||!legacy||!moneyPlanning?.reconcileGoalSavedAmount||!window.__FP_SAVINGS_TRUTH_UI__||!document.getElementById('savingsGoalModal')){
      if(Date.now()>=deadline){window.__FP84_GOAL_RECONCILIATION_UI_ERROR__='Goal reconciliation UI dependencies did not become ready';return}
      setTimeout(wait,25);return;
    }
    install(runtime,truth,legacy,moneyPlanning);
  }

  function install(runtime,truth,legacy,moneyPlanning){
    if(window.__FP84_GOAL_RECONCILIATION_UI__)return;
    window.__FP84_GOAL_RECONCILIATION_UI__=true;
    const{state,$,esc,money,save,open,close,toast,now}=runtime;
    let pending=null,boundGoalId='';
    const strictAmount=value=>{const text=String(value??'').trim().replace(',','.');if(!text||!/^\d+(?:\.\d+)?$/.test(text))return NaN;const number=Number(text);return Number.isFinite(number)?number:NaN};

    const style=document.createElement('style');
    style.id='familypilot-fp84-goal-reconciliation-style';
    style.textContent=`
      .fp84-saved-help{color:var(--muted);font-size:12px;line-height:1.45;margin-top:6px}
      .fp84-question{border:1px solid var(--line);border-radius:15px;background:var(--card2);padding:12px;line-height:1.45}
      .fp84-question strong,.fp84-question small{display:block}.fp84-question small{color:var(--muted);margin-top:5px}
      .fp84-choice-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.fp84-choice-actions .btn{white-space:normal;line-height:1.25;padding:10px}
      @media(max-width:380px){.fp84-choice-actions{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);

    function ensureDom(){
      if(!$('fp84SavedAmountField')){
        const field=document.createElement('div');field.id='fp84SavedAmountField';field.className='field';field.hidden=true;
        field.innerHTML='<label for="fp84DesiredSavedAmount">Уже отложено</label><input id="fp84DesiredSavedAmount" inputmode="decimal" placeholder="0,00"><div class="fp84-saved-help">Это не новый актив и не приход. FamilyPilot сверит сумму с реально существующими деньгами.</div>';
        const dateField=$('savingsGoalDate')?.closest('.field'),host=$('savingsGoalModal')?.querySelector('.sheet');
        if(dateField)dateField.before(field);else host?.appendChild(field);
      }
      if(!$('fp84SavedReconcileModal')){
        const modal=document.createElement('div');modal.id='fp84SavedReconcileModal';modal.className='modal';
        modal.innerHTML=`<div class="sheet"><div class="sheet-head"><h2>Сверить «Уже отложено»</h2><button class="close" type="button" data-fp84-close>Закрыть</button></div><div id="fp84SavedQuestion" class="fp84-question"></div><div class="field"><label for="fp84SavedLocation">Где находятся эти деньги</label><select id="fp84SavedLocation"></select><div id="fp84SavedAvailability" class="fp84-saved-help"></div></div><div id="fp84SavedError" class="error"></div><div class="fp84-choice-actions"><button id="fp84AlreadyCounted" class="btn secondary" type="button">Да, уже учтены</button><button id="fp84ForgottenBalance" class="btn primary" type="button">Нет, я забыл учесть эту сумму</button></div></div>`;
        document.body.appendChild(modal);
      }
    }

    function goalById(id){return(state.savingsGoals||[]).find(item=>item.id===id&&item.status==='active')||null}
    function metadataInput(goalId){return{name:$('savingsGoalName').value,targetAmount:strictAmount($('savingsGoalTarget').value),savedAmount:truth.actualSaved(state,goalId),targetDate:$('savingsGoalDate').value}}
    function syncEditField(force=false){
      ensureDom();const modal=$('savingsGoalModal'),goalId=$('savingsGoalId')?.value||'',field=$('fp84SavedAmountField');if(!field)return;
      const editing=Boolean(goalId&&goalById(goalId));field.hidden=!editing;
      if(!editing){boundGoalId='';return}
      if(force||boundGoalId!==goalId){$('fp84DesiredSavedAmount').value=String(truth.actualSaved(state,goalId));boundGoalId=goalId}
      if(!modal?.classList.contains('open'))boundGoalId='';
    }
    function locationOptions(goalId){
      const trusted=truth.trustedLocation(state,goalId)?.wallet?.id||'',rows=truth.availableSnapshot(state,{scope:runtime.scopeApi});
      $('fp84SavedLocation').innerHTML=rows.map(item=>`<option value="${esc(item.locationId)}"${item.locationId===trusted?' selected':''}>${esc(item.name)} · ${money(item.balance,'EUR')}</option>`).join('');
      if(!trusted&&rows[0])$('fp84SavedLocation').value=rows[0].locationId;
      syncAvailability();
    }
    function syncAvailability(){
      const id=$('fp84SavedLocation')?.value||'',row=truth.availableSnapshot(state,{scope:runtime.scopeApi}).find(item=>item.locationId===id);
      if(!$('fp84SavedAvailability'))return;
      $('fp84SavedAvailability').textContent=row?`Фактический остаток ${money(row.balance,'EUR')} · уже назначено целям ${money(row.allocated,'EUR')} · свободно ${money(Math.max(0,row.rawAvailable),'EUR')}`:'Выберите место хранения.';
    }
    function finishReconciliation(mode){
      if(!pending)return;const locationId=$('fp84SavedLocation').value;
      const result=moneyPlanning.reconcileGoalSavedAmount(state,{goalId:pending.goalId,desiredSavedAmount:pending.desired,mode,locationId},state.currentMemberId,{scope:runtime.scopeApi},now());
      if(!result.ok){$('fp84SavedError').textContent=result.error;return}
      const updated=legacy.updateGoal(state,pending.goalId,{...pending.metadata,savedAmount:truth.actualSaved(state,pending.goalId)},state.currentMemberId,now());
      if(!updated.ok){$('fp84SavedError').textContent=updated.error;return}
      truth.syncGoalCaches(state);save();close('fp84SavedReconcileModal');close('savingsGoalModal');runtime.renderAll();toast(mode==='forgotten_balance'?'Остаток исправлен и сумма отложена на цель':'Сумма отложена из уже учтённых денег');pending=null;boundGoalId='';
    }
    function applyDecrease(goalId,desired,metadata){
      const result=moneyPlanning.reconcileGoalSavedAmount(state,{goalId,desiredSavedAmount:desired,mode:'already_counted'},state.currentMemberId,{scope:runtime.scopeApi},now());
      if(!result.ok){$('savingsGoalError').textContent=result.error;return false}
      const updated=legacy.updateGoal(state,goalId,{...metadata,savedAmount:truth.actualSaved(state,goalId)},state.currentMemberId,now());
      if(!updated.ok){$('savingsGoalError').textContent=updated.error;return false}
      truth.syncGoalCaches(state);save();close('savingsGoalModal');runtime.renderAll();toast('Сумма, отложенная на цель, обновлена');boundGoalId='';return true;
    }

    ensureDom();
    const goalModal=$('savingsGoalModal');if(goalModal)new MutationObserver(()=>{if(goalModal.classList.contains('open'))syncEditField(true);else boundGoalId=''}).observe(goalModal,{attributes:true,attributeFilter:['class']});
    $('fp84SavedLocation').addEventListener('change',syncAvailability);
    $('fp84AlreadyCounted').onclick=()=>finishReconciliation('already_counted');
    $('fp84ForgottenBalance').onclick=()=>finishReconciliation('forgotten_balance');
    document.addEventListener('click',event=>{
      if(event.target.closest('[data-fp84-close]')){event.preventDefault();close('fp84SavedReconcileModal');pending=null;return}
      const saveButton=event.target.closest('#savingsGoalSave');if(!saveButton)return;
      const goalId=$('savingsGoalId')?.value||'';if(!goalId||!goalById(goalId))return;
      const desired=strictAmount($('fp84DesiredSavedAmount').value),current=truth.actualSaved(state,goalId),metadata=metadataInput(goalId),validated=legacy.validateInput(metadata);
      if(!Number.isFinite(desired)||desired<0||desired>truth.MAX_AMOUNT){event.preventDefault();event.stopImmediatePropagation();$('savingsGoalError').textContent='Укажите корректную сумму «Уже отложено».';return}
      if(!validated.ok){event.preventDefault();event.stopImmediatePropagation();$('savingsGoalError').textContent=validated.error;return}
      if(Math.abs(desired-current)<.005)return;
      event.preventDefault();event.stopImmediatePropagation();$('savingsGoalError').textContent='';
      if(desired<current){applyDecrease(goalId,desired,metadata);return}
      pending={goalId,desired,metadata};const delta=Math.round((desired-current)*100)/100;
      $('fp84SavedQuestion').innerHTML=`<strong>Эти ${money(delta,'EUR')} уже учтены в ваших текущих остатках?</strong><small>Сейчас на цель подтверждено ${money(current,'EUR')}. После сверки будет ${money(desired,'EUR')}.</small>`;
      $('fp84SavedError').textContent='';locationOptions(goalId);open('fp84SavedReconcileModal');
    },true);

    const baseRender=runtime.getRenderAll();runtime.setRenderAll(function(){const result=baseRender();syncEditField(false);return result});
    syncEditField(false);
    if(new URLSearchParams(location.search).has('test')&&window.__FP_TEST__){window.__FP_TEST__.goalSavedReconciliation={fieldVisible:()=>!$('fp84SavedAmountField')?.hidden,desired:()=>$('fp84DesiredSavedAmount')?.value||'',question:()=> $('fp84SavedQuestion')?.textContent||'',ready:()=>window.__FP84_GOAL_RECONCILIATION_UI__===true}}
    window.__FP84_GOAL_RECONCILIATION_UI_READY__=true;
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wait,{once:true});else wait();
})();
