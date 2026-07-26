(()=>{
  'use strict';
  if(window.__FP_M4_03_ADDITIVE_RESERVE_UI_BOOTSTRAP__)return;
  window.__FP_M4_03_ADDITIVE_RESERVE_UI_BOOTSTRAP__=true;

  const deadline=Date.now()+30000;
  const wait=()=>{
    const runtime=window.__FP_RUNTIME__;
    const budget=window.FamilyPilotBudgetDesigner;
    const accounts=window.FamilyPilotSavingsAccounts;
    const legacy=window.FamilyPilotSavingsGoals;
    if(!runtime||!budget?.__additiveReserveCorrection||!accounts||!legacy||window.__FP_M4_03_BUDGET_READY__!==true){
      if(Date.now()>=deadline){window.__FP_M4_03_ADDITIVE_RESERVE_UI_ERROR__='Additive reserve dependencies did not become ready';return}
      setTimeout(wait,25);
      return;
    }
    install(runtime,budget,accounts,legacy);
  };

  function install(runtime,budget,accounts,legacy){
    if(window.__FP_M4_03_ADDITIVE_RESERVE_UI__)return;
    window.__FP_M4_03_ADDITIVE_RESERVE_UI__=true;
    const{state,scopeApi,$,esc,money,save,toast,now}=runtime;
    const capital=()=>Number(scopeApi.capitalSnapshot(state)?.capital)||0;

    const marker=document.createElement('meta');
    marker.name='familypilot-package';
    marker.content='m4-03-additive-reserve-v1';
    document.head.appendChild(marker);

    const style=document.createElement('style');
    style.textContent=`
      .reserve-additive-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}
      .reserve-additive-field{display:grid;gap:5px;color:var(--muted);font-size:10px}
      .reserve-additive-field input{width:100%;border:1px solid var(--line);border-radius:11px;background:var(--card2);color:var(--text);padding:10px;font:inherit;font-size:13px}
      .reserve-additive-confirm{display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px;align-items:start;border:1px solid var(--line);border-radius:13px;padding:9px;background:var(--card2);font-size:11px}
      .reserve-additive-confirm input{margin-top:2px}
      .reserve-additive-alert{border-color:color-mix(in srgb,var(--red) 45%,var(--line));color:var(--red)}
      @media(max-width:380px){.reserve-additive-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);

    function renderReserve(){
      const card=$('budgetReserveCard');
      if(!card)return;
      const proposal=budget.reserveProposal(state,accounts,{baseCapital:capital(),asOf:now()});
      const existing=(state.savingsGoals||[]).find(item=>item.id===state.reserveSavingsGoalId&&item.status==='active');
      const policy=proposal.policy;
      const target=Number(policy?.targetAmount||proposal.targetAmount||proposal.recommendedTargetAmount)||0;
      const monthly=Number(policy?.monthlyContribution||proposal.monthlyContribution)||0;
      const changePercent=Math.round((proposal.recommendationChangeRatio||0)*100);
      const status=existing?'Настроено':'Нужно настроить';
      card.innerHTML=`
        <div class="budget-head">
          <div>
            <h2>Резерв (непредвиденные расходы)</h2>
            <small>Отдельное дополнительное накопление на непредвиденные расходы.</small>
          </div>
          <span class="budget-badge ${proposal.reviewRequired?'alert':existing?'ok':''}">${proposal.reviewRequired?'Пересмотреть':status}</span>
        </div>
        <div class="budget-note" style="margin-top:10px">
          Резерв помогает покрывать дефицит и непредвиденные расходы. Он не создаётся за счёт уменьшения взносов на отпуск, автомобиль, подарок или другие цели, а получает собственный дополнительный ежемесячный взнос.
        </div>
        ${proposal.reviewRequired?`<div class="budget-note reserve-additive-alert" style="margin-top:8px">Системная рекомендация изменилась на ${changePercent}% относительно последнего подтверждения. Правило нужно проверить заново.</div>`:''}
        <div class="budget-summary" style="margin-top:10px">
          <div class="budget-metric"><span>Рекомендация системы</span><strong>${money(proposal.recommendedTargetAmount,'EUR')}</strong></div>
          <div class="budget-metric"><span>${existing?'Сейчас в резерве':'Стартовый баланс'}</span><strong>${money(existing?.savedAmount||0,'EUR')}</strong></div>
        </div>
        <div class="reserve-additive-grid">
          <label class="reserve-additive-field">Целевая сумма резерва
            <input id="reserveAdditiveTarget" inputmode="decimal" value="${esc(String(target||proposal.recommendedTargetAmount))}" aria-label="Целевая сумма резерва">
          </label>
          <label class="reserve-additive-field">Дополнительный взнос в месяц
            <input id="reserveAdditiveMonthly" inputmode="decimal" value="${monthly?esc(String(monthly)):''}" placeholder="Например, 50" aria-label="Дополнительный взнос в резерв">
          </label>
        </div>
        <div class="budget-stack" style="margin-top:9px">
          <label class="reserve-additive-confirm">
            <input type="checkbox" name="reserve-additive-confirm" value="${esc(proposal.createItemId)}">
            <span>${existing?'Подтверждаю новую целевую сумму резерва':'Подтверждаю создание отдельного резервного накопления'}</span>
          </label>
          <label class="reserve-additive-confirm">
            <input type="checkbox" name="reserve-additive-confirm" value="${esc(proposal.contributionItemId)}">
            <span>Подтверждаю дополнительный ежемесячный взнос. Другие цели не уменьшаются.</span>
          </label>
        </div>
        <button class="btn primary budget-apply" data-reserve-additive-apply>${existing?'Обновить правило резерва':'Создать правило резерва'}</button>
        <div class="budget-note" style="margin-top:8px">
          После подтверждения правило действует без повторных вопросов. Пересмотр потребуется, когда расчётная рекомендация изменится минимум на 33%.
        </div>
      `;
    }

    function apply(){
      const proposal=budget.reserveProposal(state,accounts,{baseCapital:capital(),asOf:now()});
      const target=Number(String($('reserveAdditiveTarget')?.value||'').replace(',','.'));
      const monthly=Number(String($('reserveAdditiveMonthly')?.value||'').replace(',','.'));
      const confirmed=[...document.querySelectorAll('input[name="reserve-additive-confirm"]:checked')].map(input=>input.value);
      proposal.userTargetAmount=target;
      proposal.userMonthlyContribution=monthly;
      const result=budget.applyReserveProposal(state,accounts,legacy,proposal,confirmed,state.currentMemberId,now());
      if(!result.ok){toast(result.error||'Не удалось настроить резерв');return}
      save();
      runtime.renderAll();
      toast('Правило резервного накопления сохранено');
    }

    const previous=runtime.getRenderAll();
    runtime.setRenderAll(function(){
      const result=previous();
      renderReserve();
      return result;
    });

    document.addEventListener('click',event=>{
      const button=event.target.closest('[data-reserve-additive-apply]');
      if(!button)return;
      event.preventDefault();
      event.stopImmediatePropagation();
      apply();
    },true);

    if(new URLSearchParams(location.search).has('test')){
      const test=window.__FP_TEST__=window.__FP_TEST__||{};
      test.additiveReserve={
        proposal:()=>budget.reserveProposal(state,accounts,{baseCapital:capital(),asOf:now()}),
        apply:(proposal,confirmed)=>{
          const result=budget.applyReserveProposal(state,accounts,legacy,proposal,confirmed,state.currentMemberId,now());
          save();
          runtime.renderAll();
          return result;
        },
        render:renderReserve,
        policy:()=>budget.reservePolicy(state),
      };
    }

    runtime.renderAll();
    window.__FP_M4_03_ADDITIVE_RESERVE_READY__=true;
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wait,{once:true});
  else wait();
})();
