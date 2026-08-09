(()=>{
  'use strict';
  if(window.__FP_MODULE_ENTRY_BRIDGE_BOOTSTRAP__)return;
  window.__FP_MODULE_ENTRY_BRIDGE_BOOTSTRAP__=true;

  const readabilityStyle=document.createElement('style');
  readabilityStyle.id='familypilot-readability-style';
  readabilityStyle.textContent=`
    .wallet-copy small,.filter-button small,.wallet-notice small,.entry-wallet-warning small,#moreScreen .settings-subtitle,
    .op-time,.op-meta,.op-note,.filter-toggle small,.analytics-summary-actions span,.analytics-operation .kind-label,
    .analytics-operation .op-date,.category-kind,.category-status,.analytics-data-basis,.obligation-summary span,
    .obligation-row small,.obligation-status,.obligation-sequence,.debt-principal .debt-kind,.debt-filter button,
    .debt-chain-card small,.debt-chain-status,.debt-history-row small,.debt-derived-note,.savings-head small,
    .savings-actions .btn,.savings-remaining,.savings-readonly,.wallet-manager-head small,.wallet-badge,
    .wallet-manager-actions .btn,.wallet-toggle small,.wallet-class-option small,.fp-module-list-row small,
    .fp-module-code,.fp-module-actions .btn,.fp-module-state{font-size:12px}
    .meta-note,.settings-subtitle,.manager-help,.plan-intro p,.obligation-help,.debt-direction-note,
    .debt-readonly,.savings-note,.wallet-manager-note{font-size:13px;line-height:1.45}
    .nav{font-size:11px}
  `;
  document.head.appendChild(readabilityStyle);

  const deadline=Date.now()+120000;
  const selectors={
    obligations:['[data-plan-module="obligations"]'],
    planned_income:['[data-plan-module="planned-income"]'],
    debts:['#homeDebtReceivable','#homeDebtLiability','[data-plan-module="debts"]'],
    savings:['[data-plan-module="savings"]','#planSavingsModule'],
    money_planning:['#m404MoneyEntry','#m404GiftPlanEntry'],
    budget_designer:['#budgetDesignerModule','[data-plan-module="budget-designer"]'],
    onboarding:['[data-onboarding-open]','#m405OnboardingEntry'],
    what_if:['#m406PlanEntry','[data-m406-open]'],
    learning:['#learningModeEntry'],
    persistence:['[data-persistence-open]','#persistenceEntry'],
  };
  const planModules=new Set(['obligations','planned_income','debts','savings','money_planning','budget_designer','onboarding','what_if']);
  const labels={
    obligations:['Обязательства и платежи','Платежи и сроки'],
    planned_income:['Плановые приходы','Ожидаемые поступления'],
    debts:['Долги','Я должен и мне должны'],
    savings:['Накопления','Цели, резерв и правила'],
    money_planning:['Деньги, резерв и подарки','Места хранения и события'],
    budget_designer:['Проектирование бюджета','Прогноз и дефицит'],
    onboarding:['Начальная настройка','Основные доходы, расходы и цели'],
    what_if:['Что если','Сравнить варианты без изменения фактов'],
    learning:['Как пользоваться FamilyPilot','Короткие темы и подсказки'],
    persistence:['Хранение и восстановление данных','Локальные ревизии и диагностика'],
  };

  function existing(moduleId){
    return (selectors[moduleId]||[]).some(selector=>document.querySelector(selector));
  }
  function failed(record){return record&&['degraded','unavailable'].includes(record.state)}
  function fallbackExists(moduleId){
    return Boolean(document.querySelector(`[data-fp-fallback-entry="${moduleId}"]`));
  }
  function removeFallback(moduleId){
    document.querySelectorAll(`[data-fp-fallback-entry="${moduleId}"]`).forEach(node=>node.remove());
  }
  function normalizePersistenceOwnership(){
    const entry=document.getElementById('persistenceEntry');
    const button=entry?.querySelector('[data-persistence-open]');
    if(!entry||!button)return;
    entry.setAttribute('data-persistence-open','');
    button.removeAttribute('data-persistence-open');
  }
  function makePlanEntry(moduleId){
    const grid=document.querySelector('#plansScreen .plan-grid');
    if(!grid)return null;
    const [title,subtitle]=labels[moduleId]||[moduleId,'Временно недоступно'];
    const button=document.createElement('button');
    button.type='button';
    button.className='plan-module fp-module-entry-degraded';
    button.dataset.fpModule=moduleId;
    button.dataset.fpModuleState='degraded';
    button.dataset.fpFallbackEntry=moduleId;
    button.innerHTML=`<span class="plan-module-icon">!</span><span class="plan-module-copy"><strong>${title}</strong><small>${subtitle}</small></span><span class="plan-module-state">Временно недоступно</span>`;
    grid.appendChild(button);
    return button;
  }
  function makeMoreEntry(moduleId){
    const more=document.getElementById('moreScreen');
    if(!more)return null;
    const [title,subtitle]=labels[moduleId]||[moduleId,'Временно недоступно'];
    const section=document.createElement('section');
    section.className='card section';
    section.dataset.fpFallbackEntry=moduleId;
    section.innerHTML=`<button type="button" class="m404-more-button fp-module-entry-degraded" data-fp-module="${moduleId}" data-fp-module-state="degraded"><span><strong>${title}</strong><small>${subtitle}</small></span><span class="plan-module-state">Временно недоступно</span></button>`;
    more.appendChild(section);
    return section;
  }
  function sync(){
    normalizePersistenceOwnership();
    const registry=window.FamilyPilotModuleRegistry;
    if(!registry)return;
    for(const record of registry.snapshot().catalogue){
      if(!failed(record)){
        removeFallback(record.moduleId);
        continue;
      }
      if(existing(record.moduleId)){
        const realExists=(selectors[record.moduleId]||[]).some(selector=>[...document.querySelectorAll(selector)].some(node=>!node.closest('[data-fp-fallback-entry]')));
        if(realExists)removeFallback(record.moduleId);
        continue;
      }
      if(fallbackExists(record.moduleId))continue;
      if(planModules.has(record.moduleId))makePlanEntry(record.moduleId);else makeMoreEntry(record.moduleId);
    }
  }
  function wait(){
    if(window.FamilyPilotModuleRegistry&&window.__FP_RUNTIME__){
      sync();
      window.addEventListener('familypilot:module-state',sync);
      new MutationObserver(sync).observe(document.querySelector('main'),{subtree:true,childList:true});
      window.__FP_MODULE_ENTRY_BRIDGE_READY__=true;
      return;
    }
    if(Date.now()<deadline)setTimeout(wait,50);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wait,{once:true});else wait();
})();
