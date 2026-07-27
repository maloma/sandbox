(()=>{
  'use strict';

  if(window.__FP_MODULE_REGISTRY_UI_BOOTSTRAP__) return;
  window.__FP_MODULE_REGISTRY_UI_BOOTSTRAP__ = true;

  const deadline = Date.now() + 120000;
  const entrySelectors = Object.freeze({
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
  });

  function waitForRuntime(){
    const registry = window.FamilyPilotModuleRegistry;
    const runtime = window.__FP_RUNTIME__;
    if(registry && runtime){
      install(registry, runtime);
      return;
    }
    if(Date.now() >= deadline){
      const base = registry?.get?.('base_finance');
      registry?.markDegraded?.('base_finance', {
        reasonCode:'module_not_ready',
        failureStage:'readiness_timeout',
        installStarted:true,
        retryClass:'reload_required',
        unavailable:true,
      });
      const fallback = document.getElementById('fpStaticFallback');
      if(fallback){
        fallback.hidden = false;
        fallback.querySelector('[data-fp-fallback-code]')?.replaceChildren(document.createTextNode(base?.diagnosticId ? `Код: ${base.diagnosticId}` : ''));
      }
      return;
    }
    setTimeout(waitForRuntime, 50);
  }

  function install(registry, runtime){
    if(window.__FP_MODULE_REGISTRY_UI__) return;
    window.__FP_MODULE_REGISTRY_UI__ = true;

    const {$, esc, showScreen} = runtime;
    let activeModuleId = '';
    let lastAnnouncement = '';

    const style = document.createElement('style');
    style.id = 'familypilot-module-registry-style';
    style.textContent = `
      .fp-module-summary{border:1px solid color-mix(in srgb,#f4b400 52%,var(--line));background:color-mix(in srgb,#f4b400 8%,var(--card));border-radius:18px;padding:13px;margin-bottom:10px;box-shadow:var(--shadow)}
      .fp-module-summary[hidden]{display:none}.fp-module-summary h2,.fp-module-degraded h2{margin:0;font-size:16px}.fp-module-summary p,.fp-module-degraded p{margin:7px 0 0;color:var(--muted);font-size:12px;line-height:1.5}.fp-module-list{display:grid;gap:6px;margin-top:10px}.fp-module-list-row{border:1px solid var(--line);border-radius:13px;background:var(--card);padding:9px 10px;display:flex;justify-content:space-between;gap:10px;align-items:center}.fp-module-list-row strong,.fp-module-list-row small{display:block}.fp-module-list-row small{font-size:10px;color:var(--muted);margin-top:2px}.fp-module-code{font-size:10px;font-weight:900;color:var(--muted);white-space:nowrap}.fp-module-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:11px}.fp-module-actions .btn{min-height:40px;padding:7px 11px;font-size:11px}.fp-module-degraded{border:1px solid color-mix(in srgb,#f4b400 52%,var(--line));background:color-mix(in srgb,#f4b400 7%,var(--card));border-radius:18px;padding:15px;box-shadow:var(--shadow)}.fp-module-degraded.application-shell{border-color:color-mix(in srgb,var(--red) 52%,var(--line));background:color-mix(in srgb,var(--red) 7%,var(--card))}.fp-module-state{display:inline-flex;margin-top:9px;border-radius:999px;padding:4px 8px;background:var(--card2);color:#9a6900;font-size:10px;font-weight:900}.fp-module-entry-degraded{border-color:color-mix(in srgb,#f4b400 55%,var(--line))!important}.fp-module-entry-degraded .plan-module-state{color:#9a6900!important}.fp-module-live{position:fixed;width:1px;height:1px;overflow:hidden;clip:rect(1px,1px,1px,1px);white-space:nowrap}.fp-module-retry[disabled]{opacity:.55}.fp-shell-degraded #actionDock{display:none!important}@media(prefers-reduced-motion:reduce){.fp-module-summary,.fp-module-degraded{scroll-behavior:auto}}
    `;
    document.head.appendChild(style);

    function ensureDom(){
      const more = $('moreScreen');
      if(more && !$('fpModuleSummary')){
        const summary = document.createElement('section');
        summary.id = 'fpModuleSummary';
        summary.className = 'fp-module-summary';
        summary.hidden = true;
        const title = more.querySelector('.page-title');
        if(title) title.after(summary); else more.prepend(summary);
      }
      if(!$('moduleDegradedScreen')){
        const screen = document.createElement('section');
        screen.id = 'moduleDegradedScreen';
        screen.className = 'screen';
        screen.innerHTML = '<div class="page-title"><button class="back" type="button" data-fp-module-back>‹</button><div class="page-title-copy"><h1>Раздел временно недоступен</h1><small class="scope-context">Остальные функции продолжают работать</small></div></div><section id="fpModuleDegradedCard" class="fp-module-degraded"></section>';
        more?.parentNode?.insertBefore(screen, more);
      }
      if(!$('fpModuleLive')){
        const live = document.createElement('div');
        live.id = 'fpModuleLive';
        live.className = 'fp-module-live';
        live.setAttribute('aria-live', 'polite');
        live.setAttribute('aria-atomic', 'true');
        document.body.appendChild(live);
      }
    }

    function snapshot(){return registry.snapshot()}
    function record(moduleId){return snapshot().catalogue.find(item => item.moduleId === moduleId) || null}
    function isFailed(item){return Boolean(item && ['degraded','unavailable'].includes(item.state))}
    function rootFailures(){
      const failed = snapshot().catalogue.filter(isFailed);
      const byRoot = new Map();
      for(const item of failed){
        const rootId = item.rootFailureModuleId || item.moduleId;
        if(!byRoot.has(rootId)) byRoot.set(rootId, record(rootId) || item);
      }
      return [...byRoot.values()];
    }
    function persistenceHealthy(){
      try{
        const status = window.FamilyPilotPersistence?.currentStatus?.()?.status || '';
        return status === 'healthy' || status.startsWith('recovered_');
      }catch{return false}
    }
    function announce(text){
      if(!text || text === lastAnnouncement) return;
      lastAnnouncement = text;
      const live = $('fpModuleLive');
      if(live) live.textContent = text;
    }
    function rootFor(item){return item ? (record(item.rootFailureModuleId || item.moduleId) || item) : null}
    function retryLabel(item){
      if(!item || item.retryClass === 'never' || item.blockedByModuleId) return '';
      return item.retryClass === 'reload_required' ? 'Перезагрузить FamilyPilot' : 'Повторить';
    }
    function entryNodes(moduleId){
      return (entrySelectors[moduleId] || []).flatMap(selector => [...document.querySelectorAll(selector)]);
    }

    function decorateEntries(){
      for(const item of snapshot().catalogue){
        const failed = isFailed(item);
        for(const node of entryNodes(item.moduleId)){
          node.dataset.fpModule = item.moduleId;
          node.dataset.fpModuleState = item.state;
          node.classList.toggle('fp-module-entry-degraded', failed);
          node.removeAttribute('disabled');
          const stateNode = node.querySelector('.plan-module-state') || node.querySelector('[id$="State"]');
          if(stateNode && failed) stateNode.textContent = 'Временно недоступно';
        }
      }
    }

    function renderSummary(){
      ensureDom();
      const host = $('fpModuleSummary');
      if(!host) return;
      const roots = rootFailures();
      host.hidden = roots.length === 0;
      if(!roots.length){host.innerHTML = '';return}
      const rows = roots.map(item => {
        const dependents = snapshot().catalogue.filter(row => isFailed(row) && row.moduleId !== item.moduleId && (row.rootFailureModuleId || row.moduleId) === item.moduleId);
        const detail = dependents.length ? `Также недоступно: ${dependents.map(row => row.userName).join(', ')}` : 'Остальные разделы продолжают работать.';
        return `<div class="fp-module-list-row"><div><strong>${esc(item.userName)}</strong><small>${esc(detail)}</small></div><span class="fp-module-code">${esc(item.diagnosticId || '')}</span></div>`;
      }).join('');
      host.innerHTML = `<h2>Некоторые разделы временно недоступны</h2><p>Сохранённые данные не удалены из-за этой ошибки.</p><div class="fp-module-list">${rows}</div><div class="fp-module-actions"><button class="btn secondary" type="button" data-fp-module-details="${esc(roots[0].moduleId)}">Подробнее</button>${retryLabel(roots[0]) ? `<button class="btn primary fp-module-retry" type="button" data-fp-module-retry="${esc(roots[0].moduleId)}">${esc(retryLabel(roots[0]))}</button>` : ''}</div>`;
    }

    function renderDegraded(moduleId){
      ensureDom();
      const item = record(moduleId);
      if(!item) return;
      activeModuleId = moduleId;
      const rootItem = rootFor(item);
      const card = $('fpModuleDegradedCard');
      const dependent = Boolean(item.blockedByModuleId && rootItem && rootItem.moduleId !== item.moduleId);
      const persistenceNote = persistenceHealthy() ? '' : '<p>Статус последнего сохранения проверьте в разделе «Хранение данных».</p>';
      const explanation = dependent
        ? `Раздел временно недоступен, потому что не запустился модуль «${esc(rootItem.userName)}».`
        : 'Не удалось полностью запустить этот раздел. Остальные доступные функции продолжают работать.';
      const actionModule = dependent ? rootItem : item;
      const label = retryLabel(actionModule);
      card.className = `fp-module-degraded${item.containmentLevel === 'application_shell_degraded' ? ' application-shell' : ''}`;
      card.innerHTML = `<h2 tabindex="-1" id="fpModuleDegradedHeading">${esc(item.userName)}</h2><span class="fp-module-state">Временно недоступно</span><p>${explanation}</p><p><strong>Сохранённые данные не удалены из-за этой ошибки.</strong></p>${persistenceNote}<p>Код диагностики: <strong>${esc(rootItem?.rootDiagnosticId || rootItem?.diagnosticId || item.diagnosticId || '—')}</strong></p><div class="fp-module-actions">${label ? `<button class="btn primary fp-module-retry" type="button" data-fp-module-retry="${esc(actionModule.moduleId)}">${esc(label)}</button>` : ''}<button class="btn secondary" type="button" data-fp-module-back>Вернуться</button></div>`;
      showScreen('moduleDegraded');
      queueMicrotask(() => $('fpModuleDegradedHeading')?.focus());
    }

    function updateShellContainment(){
      const shellFailed = snapshot().catalogue.some(item => isFailed(item) && item.containmentLevel === 'application_shell_degraded');
      document.body.classList.toggle('fp-shell-degraded', shellFailed);
    }

    function render(){
      ensureDom();
      decorateEntries();
      renderSummary();
      updateShellContainment();
      const failed = rootFailures();
      if(failed.length) announce(`Временно недоступен раздел ${failed[0].userName}`);
      if(activeModuleId && !isFailed(record(activeModuleId))){
        activeModuleId = '';
        announce('Раздел снова доступен');
      }
    }

    function openModuleFailure(moduleId){
      const item = record(moduleId);
      if(!isFailed(item)) return false;
      renderDegraded(moduleId);
      return true;
    }

    function moduleFromEntry(target){
      const explicit = target.closest?.('[data-fp-module]')?.dataset.fpModule;
      if(explicit) return explicit;
      for(const [moduleId, selectors] of Object.entries(entrySelectors)){
        if(selectors.some(selector => target.closest?.(selector))) return moduleId;
      }
      return '';
    }

    function performRetry(moduleId, button){
      const item = record(moduleId);
      if(!item || item.state === 'loading') return;
      if(button) button.disabled = true;
      const attemptId = registry.retry(moduleId);
      render();
      if(!attemptId && button){button.disabled = false;button.focus()}
      else announce(`Повторный запуск раздела ${item.userName}`);
    }

    ensureDom();
    render();

    document.addEventListener('click', event => {
      const retryButton = event.target.closest('[data-fp-module-retry]');
      const detailsButton = event.target.closest('[data-fp-module-details]');
      const backButton = event.target.closest('[data-fp-module-back]');
      if(retryButton){
        event.preventDefault();event.stopImmediatePropagation();
        performRetry(retryButton.dataset.fpModuleRetry, retryButton);
        return;
      }
      if(detailsButton){
        event.preventDefault();event.stopImmediatePropagation();
        renderDegraded(detailsButton.dataset.fpModuleDetails);
        return;
      }
      if(backButton){
        event.preventDefault();event.stopImmediatePropagation();
        activeModuleId = '';
        showScreen('more');
        return;
      }
      const moduleId = moduleFromEntry(event.target);
      if(moduleId && openModuleFailure(moduleId)){
        event.preventDefault();event.stopImmediatePropagation();
      }
    }, true);

    window.addEventListener('familypilot:module-state', render);
    new MutationObserver(render).observe(document.querySelector('main'), {subtree:true, childList:true});

    if(new URLSearchParams(location.search).has('test')){
      const test = window.__FP_TEST__ = window.__FP_TEST__ || {};
      test.moduleRegistry = {
        snapshot,
        record,
        render,
        open:openModuleFailure,
        summaryText:() => $('fpModuleSummary')?.textContent || '',
        degradedText:() => $('moduleDegradedScreen')?.textContent || '',
        entryVisible:moduleId => entryNodes(moduleId).some(node => !node.hidden && getComputedStyle(node).display !== 'none'),
        entryState:moduleId => entryNodes(moduleId)[0]?.dataset.fpModuleState || '',
        retry:moduleId => registry.retry(moduleId),
        financialFingerprint:() => registry.financialFingerprint(),
        activeModule:() => activeModuleId,
        shellDegraded:() => document.body.classList.contains('fp-shell-degraded'),
        ownershipCounts:moduleId => ({
          entries:entryNodes(moduleId).length,
          screens:(record(moduleId)?.routes || []).reduce((sum, route) => sum + (document.getElementById(`${route}Screen`) ? 1 : 0), 0),
        }),
      };
    }

    window.__FP_MODULE_REGISTRY_UI_READY__ = true;
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', waitForRuntime, {once:true});
  else waitForRuntime();
})();
