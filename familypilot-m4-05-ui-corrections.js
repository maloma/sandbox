(()=>{
  'use strict';
  if(window.__FP_M4_05_UI_CORRECTIONS__)return;
  window.__FP_M4_05_UI_CORRECTIONS__=true;

  const deadline=Date.now()+40000;
  const wait=()=>{
    const runtime=window.__FP_RUNTIME__,api=window.FamilyPilotOnboardingDistribution,moneyApi=window.FamilyPilotMoneyPlanning;
    if(!runtime||!api?.__m405ProductCorrections||!moneyApi||window.__FP_M4_05_READY__!==true){
      if(Date.now()>=deadline){window.__FP_M4_05_UI_CORRECTION_ERROR__='M4-05 correction dependencies did not become ready';return}
      setTimeout(wait,25);return;
    }
    install(runtime,api,moneyApi);
  };

  function install(runtime,api,moneyApi){
    if(window.__FP_M4_05_UI_CORRECTION_READY__)return;
    const{state,$,esc,money,save,showScreen,toast,now}=runtime;
    const deps={money:moneyApi,wallets:window.FamilyPilotWalletManagement,transfers:window.FamilyPilotWalletTransfers,savings:window.FamilyPilotSavingsGoals,accounts:window.FamilyPilotSavingsAccounts,budget:window.FamilyPilotBudgetDesigner,plannedIncome:window.FamilyPilotPlannedIncome,obligations:window.FamilyPilotObligations,debts:window.FamilyPilotDebts,scope:runtime.scopeApi};
    const locations=()=>moneyApi.activeWallets(state);
    const locationOptions=selected=>locations().map(item=>`<option value="${esc(item.id)}"${item.id===selected?' selected':''}>${esc(item.name)} · ${item.moneyForm==='cash'?'наличные':'банковский счёт'}</option>`).join('');

    function installHomePrompt(){
      const home=$('homeScreen');if(!home||$('m405IncomeHomePrompt'))return;
      const section=document.createElement('section');section.id='m405IncomeHomePrompt';section.className='card section';section.hidden=true;
      const anchor=$('m404CapitalBreakdown')||home.querySelector('.balance');anchor?.after(section);
    }

    function renderHomePrompt(){
      installHomePrompt();const section=$('m405IncomeHomePrompt');if(!section)return;
      const batches=api.incomeDistributionBatches(state,deps,now());section.hidden=!batches.length;if(!batches.length){section.innerHTML='';return}
      const latest=batches[0],remaining=latest.totalPlanned;
      section.innerHTML=`<button class="m405-entry" type="button" data-m405-open-income-distribution><span><strong>Распределить полученный доход</strong><small>Получено ${money(latest.operation.amount,'EUR')}. Подтвердите переводы в накопления на ${money(remaining,'EUR')}.</small></span><span>›</span></button>`;
      state.m405NotifiedIncomeBatchIds=Array.isArray(state.m405NotifiedIncomeBatchIds)?state.m405NotifiedIncomeBatchIds:[];
      if(!state.m405NotifiedIncomeBatchIds.includes(latest.id)){
        state.m405NotifiedIncomeBatchIds.push(latest.id);save();toast('Доход сохранён. Проверьте распределение в накоплениях.');
      }
    }

    function goalFields(card){
      if(!card||card.querySelector('#m405GoalEnabled'))return;
      const question=card.querySelector('.m405-question');if(!question||!question.textContent.includes('Хотите регулярно откладывать'))return;
      const draft=api.onboardingDraft(state,deps,now()),defaultLocation=draft.goalLocationId||locations().find(item=>item.locationKind==='bank_savings')?.id||moneyApi.defaultLocation(state)?.id||'';
      const block=document.createElement('details');block.className='m405-optional';block.open=Boolean(draft.goalEnabled);block.innerHTML=`<summary>Первое целевое накопление</summary><label class="m405-check" style="margin-top:8px"><input id="m405GoalEnabled" type="checkbox"${draft.goalEnabled?' checked':''}><span>Добавить одну первую цель. Остальные можно создать позже.</span></label><div class="m405-grid" style="margin-top:8px"><div class="m405-field"><label>Название</label><input id="m405GoalName" value="${esc(draft.goalName||'')}"></div><div class="m405-field"><label>Целевая сумма</label><input id="m405GoalTarget" inputmode="decimal" value="${esc(String(draft.goalTarget||''))}"></div><div class="m405-field"><label>Уже накоплено</label><input id="m405GoalSaved" inputmode="decimal" value="${esc(String(draft.goalSaved||0))}"></div><div class="m405-field"><label>Режим</label><select id="m405GoalMode"><option value="fixed_date"${draft.goalMode!=='fixed_contribution'?' selected':''}>Достичь к дате</option><option value="fixed_contribution"${draft.goalMode==='fixed_contribution'?' selected':''}>Откладывать фиксированную сумму</option></select></div><div class="m405-field" id="m405GoalDateField"><label>Дата цели</label><input id="m405GoalDate" type="date" value="${esc(draft.goalDate||'')}"></div><div class="m405-field" id="m405GoalMonthlyField"><label>Сумма в месяц</label><input id="m405GoalMonthly" inputmode="decimal" value="${esc(String(draft.goalMonthly||''))}"></div><div class="m405-field"><label>Место хранения</label><select id="m405GoalLocation">${locationOptions(defaultLocation)}</select></div></div>`;
      const optional=card.querySelector('.m405-optional');optional?.before(block);
      syncGoalMode();
    }

    function syncGoalMode(){const mode=$('m405GoalMode')?.value||'fixed_date';if($('m405GoalDateField'))$('m405GoalDateField').style.display=mode==='fixed_date'?'grid':'none';if($('m405GoalMonthlyField'))$('m405GoalMonthlyField').style.display=mode==='fixed_contribution'?'grid':'none'}
    function persistGoalFields(){
      if(!$('m405GoalEnabled'))return;
      const draft=api.onboardingDraft(state,deps,now());
      Object.assign(draft,{goalEnabled:$('m405GoalEnabled').checked,goalName:$('m405GoalName').value,goalTarget:Number(String($('m405GoalTarget').value||'').replace(',','.'))||0,goalSaved:Number(String($('m405GoalSaved').value||'').replace(',','.'))||0,goalMode:$('m405GoalMode').value,goalDate:$('m405GoalDate').value,goalMonthly:Number(String($('m405GoalMonthly').value||'').replace(',','.'))||0,goalLocationId:$('m405GoalLocation').value});
      api.saveOnboardingDraft(state,draft,state.starterOnboarding?.currentStep||3,deps,now());save();
    }

    const previous=runtime.getRenderAll();runtime.setRenderAll(function(){const result=previous();renderHomePrompt();goalFields($('m405OnboardingCard'));return result});
    installHomePrompt();renderHomePrompt();goalFields($('m405OnboardingCard'));

    const observer=new MutationObserver(()=>goalFields($('m405OnboardingCard')));if($('m405OnboardingCard'))observer.observe($('m405OnboardingCard'),{childList:true,subtree:true});
    document.addEventListener('click',event=>{const open=event.target.closest('[data-m405-open-income-distribution]');if(!open)return;event.preventDefault();event.stopImmediatePropagation();showScreen('savingsGoals');runtime.renderAll();$('m405IncomeDistribution')?.scrollIntoView({behavior:'smooth',block:'start'})},true);
    document.addEventListener('input',event=>{if(event.target.closest('#m405GoalEnabled,#m405GoalName,#m405GoalTarget,#m405GoalSaved,#m405GoalMode,#m405GoalDate,#m405GoalMonthly,#m405GoalLocation')){persistGoalFields();if(event.target.id==='m405GoalMode')syncGoalMode()}},true);
    document.addEventListener('change',event=>{if(event.target.closest('#m405GoalEnabled,#m405GoalMode,#m405GoalLocation')){persistGoalFields();syncGoalMode()}},true);

    if(new URLSearchParams(location.search).has('test')){
      window.__FP_TEST__=window.__FP_TEST__||{};
      window.__FP_TEST__.m405Correction={renderHomePrompt,persistGoalFields,homePromptVisible:()=>!$('m405IncomeHomePrompt')?.hidden,goalFieldsPresent:()=>!!$('m405GoalEnabled')};
    }
    window.__FP_M4_05_UI_CORRECTION_READY__=true;
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wait,{once:true});else wait();
})();
