(function installFamilyPilotModuleRegistry(root){
  'use strict';

  if(!root || root.FamilyPilotModuleRegistry || typeof document === 'undefined') return;

  const params = new URLSearchParams(root.location?.search || '');
  const testMode = params.get('test') === '1';
  const allowedFailureStages = new Set([
    'script_load',
    'readiness_timeout',
    'install_error',
    'critical_dependency',
  ]);

  const moduleDefinitions = Object.freeze([
    {
      moduleId:'base_finance', userName:'Основные финансы', criticality:'critical',
      containmentLevel:'application_shell_degraded', retryClass:'reload_required',
      dependencies:[], routes:['home','operations','analytics'], unaffectedRoutes:['more'],
    },
    {
      moduleId:'obligations', userName:'Обязательства и платежи', criticality:'primary',
      containmentLevel:'module_degraded', retryClass:'reload_required',
      dependencies:['base_finance'], routes:['obligations'], unaffectedRoutes:['home','operations','more'],
    },
    {
      moduleId:'planned_income', userName:'Плановые приходы', criticality:'primary',
      containmentLevel:'module_degraded', retryClass:'reload_required',
      dependencies:['base_finance'], routes:['plannedIncome'], unaffectedRoutes:['home','operations','obligations','more'],
    },
    {
      moduleId:'debts', userName:'Долги', criticality:'primary',
      containmentLevel:'module_degraded', retryClass:'reload_required',
      dependencies:['base_finance'], routes:['debts'], unaffectedRoutes:['home','operations','more'],
    },
    {
      moduleId:'savings', userName:'Накопления', criticality:'primary',
      containmentLevel:'module_degraded', retryClass:'reload_required',
      dependencies:['base_finance'], routes:['savingsGoals'], unaffectedRoutes:['home','operations','obligations','more'],
    },
    {
      moduleId:'money_planning', userName:'Деньги, резерв и подарки', criticality:'primary',
      containmentLevel:'module_degraded', retryClass:'reload_required',
      dependencies:['savings'], routes:['moneyLocations','giftPlanning'],
      unaffectedRoutes:['home','operations','obligations','savingsGoals','more'],
    },
    {
      moduleId:'budget_designer', userName:'Проектирование бюджета', criticality:'primary',
      containmentLevel:'module_degraded', retryClass:'reload_required',
      dependencies:['savings'], routes:['budgetDesigner'],
      unaffectedRoutes:['home','operations','obligations','savingsGoals','more'],
    },
    {
      moduleId:'onboarding', userName:'Начальная настройка', criticality:'primary',
      containmentLevel:'module_degraded', retryClass:'reload_required',
      dependencies:['money_planning','planned_income','obligations','debts','budget_designer'],
      routes:['onboarding'], unaffectedRoutes:['home','operations','plans','more'],
    },
    {
      moduleId:'what_if', userName:'Что если', criticality:'primary',
      containmentLevel:'module_degraded', retryClass:'script_only',
      dependencies:['budget_designer','onboarding'], routes:['whatIf'],
      unaffectedRoutes:['home','operations','plans','savingsGoals','more'],
    },
    {
      moduleId:'learning', userName:'Как пользоваться FamilyPilot', criticality:'supporting',
      containmentLevel:'module_degraded', retryClass:'reload_required',
      dependencies:['what_if'], routes:['learningMode'], unaffectedRoutes:['home','operations','plans','more'],
    },
    {
      moduleId:'persistence', userName:'Хранение и восстановление данных', criticality:'critical',
      containmentLevel:'application_shell_degraded', retryClass:'never',
      dependencies:[], routes:['persistence'], unaffectedRoutes:[],
    },
  ]);

  const ownershipContracts = Object.freeze({
    base_finance:{
      navigationSelectors:[],
      screenSelectors:['#homeScreen','#operationsScreen','#analyticsScreen'],
      packageMarkers:['global:__FP_RUNTIME__'],
      listenerSentinel:null,
    },
    obligations:{
      navigationSelectors:['[data-plan-module="obligations"]'],
      screenSelectors:['#obligationsScreen'],
      packageMarkers:['global:FamilyPilotObligations'],
      listenerSentinel:null,
    },
    planned_income:{
      navigationSelectors:['#plannedIncomePlanModule,[data-plan-module="planned-income"]'],
      screenSelectors:['#plannedIncomeScreen'],
      packageMarkers:['global:__FP_M4_01_READY__'],
      listenerSentinel:null,
    },
    debts:{
      navigationSelectors:['#homeDebtReceivable','#homeDebtLiability'],
      screenSelectors:[],
      packageMarkers:['global:FamilyPilotDebts'],
      listenerSentinel:null,
    },
    savings:{
      navigationSelectors:['#planSavingsModule,[data-plan-module="savings"]'],
      screenSelectors:['#savingsGoalsScreen'],
      packageMarkers:['global:__FP_SAVINGS_TRUTH_READY__'],
      listenerSentinel:null,
    },
    money_planning:{
      navigationSelectors:['#m404MoneyEntry','#m404GiftPlanEntry'],
      screenSelectors:['#moneyLocationsScreen'],
      packageMarkers:['global:__FP_M4_04_READY__'],
      listenerSentinel:null,
    },
    budget_designer:{
      navigationSelectors:['#budgetDesignerModule,[data-plan-module="budget-designer"]'],
      screenSelectors:['#budgetDesignerScreen'],
      packageMarkers:['global:__FP_M4_03_BUDGET_PACKAGE_LOADED__'],
      listenerSentinel:null,
    },
    onboarding:{
      navigationSelectors:['#m405OnboardingEntry,[data-onboarding-open]'],
      screenSelectors:[],
      packageMarkers:['global:__FP_M4_05_PACKAGE_LOADED__'],
      listenerSentinel:null,
    },
    what_if:{
      navigationSelectors:['#m406PlanEntry,[data-m406-open]'],
      screenSelectors:['#whatIfScreen'],
      packageMarkers:['global:__FP_M4_06_PACKAGE_LOADED__'],
      listenerSentinel:null,
    },
    learning:{
      navigationSelectors:['#learningModeEntry'],
      screenSelectors:['#learningModeScreen'],
      packageMarkers:['global:__FP_M4_07_LEARNING_READY__'],
      listenerSentinel:null,
    },
    persistence:{
      navigationSelectors:['#persistenceEntry,[data-persistence-open]'],
      screenSelectors:['#persistenceScreen'],
      packageMarkers:['global:__FP_PERSISTENCE_READY__'],
      listenerSentinel:null,
    },
  });

  const records = new Map();
  const safeEvents = [];
  const deferredScripts = new Map();
  const installedAt = Date.now();
  const nativeHeadAppend = document.head?.appendChild?.bind(document.head) || null;
  let reconcileTimer = null;
  let injection = resolveInitialInjection();

  function resolveInitialInjection(){
    const moduleId = params.get('moduleFailure');
    const stage = params.get('moduleFailureStage') || 'script_load';
    if(!testMode || !moduleDefinitions.some(item => item.moduleId === moduleId) || !allowedFailureStages.has(stage)) return null;
    return {moduleId, stage};
  }

  function clone(value){
    if(value == null) return value;
    return JSON.parse(JSON.stringify(value));
  }

  function hash(text){
    let value = 2166136261;
    for(let index = 0; index < text.length; index += 1){
      value ^= text.charCodeAt(index);
      value = Math.imul(value, 16777619);
    }
    return (value >>> 0).toString(36).padStart(7, '0');
  }

  function diagnosticId(moduleId, attempt, reasonCode){
    const minuteBucket = Math.floor(Date.now() / 60000);
    const randomSuffix = Math.random().toString(36).slice(2, 4);
    return `FP-MOD-${hash(`${moduleId}|${attempt}|${reasonCode}|${minuteBucket}|${randomSuffix}`).slice(0, 4).toUpperCase()}`;
  }

  function emit(record, stateFrom, stateTo, extra = {}){
    safeEvents.push({
      eventId:`event-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      moduleId:record.moduleId,
      attemptId:record.activeAttemptId,
      stateFrom,
      stateTo,
      reasonCode:record.reasonCode || null,
      failureStage:record.failureStage || null,
      diagnosticId:record.diagnosticId || null,
      rootDiagnosticId:record.rootDiagnosticId || null,
      occurredAt:Date.now(),
      ...extra,
    });
    while(safeEvents.length > 50) safeEvents.shift();
    try{
      root.dispatchEvent(new CustomEvent('familypilot:module-state', {detail:snapshot()}));
    }catch{}
  }

  function normalizedRecord(definition){
    return {
      version:1,
      state:'registered',
      reasonCode:null,
      failureStage:null,
      attempt:0,
      activeAttemptId:null,
      installStarted:false,
      startedAt:null,
      readyAt:null,
      failedAt:null,
      lastRetryAt:null,
      diagnosticId:null,
      loadFailureDidNotDeletePersistedState:true,
      rootFailureModuleId:null,
      rootDiagnosticId:null,
      blockedByModuleId:null,
      loadedScripts:[],
      ownershipContract:clone(ownershipContracts[definition.moduleId] || definition.ownershipContract || {
        navigationSelectors:[], screenSelectors:[], packageMarkers:[], listenerSentinel:null,
      }),
      ...definition,
    };
  }

  function register(definition){
    const moduleId = String(definition?.moduleId || '');
    if(!moduleId) throw new Error('moduleId required');
    if(records.has(moduleId)) return clone(records.get(moduleId));
    const record = normalizedRecord(definition);
    records.set(moduleId, record);
    emit(record, null, 'registered');
    return clone(record);
  }

  moduleDefinitions.forEach(register);

  function internalGet(moduleId){
    return records.get(String(moduleId || '')) || null;
  }

  function transition(record, nextState, patch = {}){
    const previousState = record.state;
    Object.assign(record, patch, {state:nextState});
    emit(record, previousState, nextState);
    return record;
  }

  function beginLoad(moduleId){
    const record = internalGet(moduleId);
    if(!record) return null;
    if(record.state === 'loading' && record.activeAttemptId) return record.activeAttemptId;
    if(record.state === 'ready') return null;

    const attempt = Number(record.attempt || 0) + 1;
    const activeAttemptId = `${record.moduleId}-attempt-${attempt}`;
    transition(record, 'loading', {
      attempt,
      activeAttemptId,
      startedAt:Date.now(),
      readyAt:null,
      failedAt:null,
      reasonCode:null,
      failureStage:null,
      diagnosticId:null,
      rootFailureModuleId:null,
      rootDiagnosticId:null,
      blockedByModuleId:null,
      installStarted:false,
    });
    return activeAttemptId;
  }

  function noteScriptLoaded(moduleId, path){
    const record = internalGet(moduleId);
    if(!record) return;
    record.loadedScripts = [...new Set([...(record.loadedScripts || []), String(path || '')])];
    record.installStarted = true;
  }

  function shouldInject(moduleId, stage){
    return Boolean(testMode && injection && injection.moduleId === moduleId && injection.stage === stage);
  }

  function countSelector(selector){
    try{return Number(document.querySelectorAll?.(selector)?.length || 0)}catch{return 0}
  }

  function markerAvailable(marker){
    const value = String(marker || '');
    if(value.startsWith('global:')) return Boolean(root[value.slice(7)]);
    return countSelector(value) === 1;
  }

  function validateOwnership(record){
    const contract = record?.ownershipContract || {};
    const missing = [];
    const collisions = [];
    const selectors = [
      ...(contract.navigationSelectors || []),
      ...(contract.screenSelectors || []),
    ];
    for(const selector of selectors){
      const count = countSelector(selector);
      if(count === 0) missing.push(selector);
      if(count > 1) collisions.push({selector,count});
    }
    for(const marker of contract.packageMarkers || []){
      if(!markerAvailable(marker)) missing.push(marker);
    }
    if(contract.listenerSentinel && !root[contract.listenerSentinel]) missing.push(`global:${contract.listenerSentinel}`);
    return {ok:missing.length === 0 && collisions.length === 0, missing, collisions};
  }

  function markReady(moduleId){
    const record = internalGet(moduleId);
    if(!record) return null;
    if(shouldInject(moduleId, 'readiness_timeout')){
      return markDegraded(moduleId, {
        reasonCode:'module_not_ready',
        failureStage:'readiness_timeout',
        installStarted:true,
        retryClass:'reload_required',
      });
    }
    if(record.state === 'ready') return record;
    const ownership = validateOwnership(record);
    if(!ownership.ok){
      return markDegraded(moduleId, {
        reasonCode:'module_contract_failed',
        failureStage:'contract_validation',
        installStarted:true,
        retryClass:'reload_required',
      });
    }
    return transition(record, 'ready', {
      activeAttemptId:null,
      readyAt:Date.now(),
      failedAt:null,
      reasonCode:null,
      failureStage:null,
      diagnosticId:null,
      rootFailureModuleId:null,
      rootDiagnosticId:null,
      blockedByModuleId:null,
    });
  }

  function markDegraded(moduleId, detail = {}){
    const record = internalGet(moduleId);
    if(!record) return null;
    const reasonCode = detail.reasonCode || 'module_not_ready';
    const failureStage = detail.failureStage || 'readiness_timeout';
    const attempt = Math.max(1, Number(record.attempt || 1));
    const id = detail.diagnosticId || record.diagnosticId || diagnosticId(record.moduleId, attempt, reasonCode);
    const nextState = detail.unavailable ? 'unavailable' : 'degraded';
    if(record.state === nextState && record.reasonCode === reasonCode && record.blockedByModuleId === (detail.blockedByModuleId || null)) return record;
    return transition(record, nextState, {
      activeAttemptId:null,
      failedAt:Date.now(),
      reasonCode,
      failureStage,
      diagnosticId:id,
      installStarted:detail.installStarted ?? record.installStarted,
      retryClass:detail.retryClass || record.retryClass,
      rootFailureModuleId:detail.rootFailureModuleId || record.moduleId,
      rootDiagnosticId:detail.rootDiagnosticId || id,
      blockedByModuleId:detail.blockedByModuleId || null,
    });
  }

  function moduleForPath(path){
    const cleanPath = String(path || '').split('?')[0];
    if(cleanPath.includes('m4-07')) return 'learning';
    if(cleanPath.includes('m4-06')) return 'what_if';
    if(cleanPath.includes('m4-05')) return 'onboarding';
    if(cleanPath.includes('m4-04') || cleanPath.includes('savings-money-bridge')) return 'money_planning';
    if(cleanPath.includes('budget') || cleanPath.includes('forecast-correction') || cleanPath.includes('additive-reserve')) return 'budget_designer';
    if(cleanPath.includes('m4-03') || cleanPath.includes('savings-truth') || cleanPath.includes('savings-accounts')) return 'savings';
    if(cleanPath.includes('planned-income')) return 'planned_income';
    if(cleanPath.includes('debt')) return 'debts';
    if(cleanPath.includes('obligation') || cleanPath.includes('payment') || cleanPath.includes('partial')) return 'obligations';
    if(cleanPath.includes('persistence')) return 'persistence';
    return null;
  }

  function installScriptInterceptor(){
    if(!document.head || !nativeHeadAppend || document.head.__fpRegistryAppendInstalled) return;
    document.head.__fpRegistryAppendInstalled = true;

    document.head.appendChild = function appendWithRegistry(node){
      if(node?.tagName === 'SCRIPT' && node.src){
        const moduleId = moduleForPath(node.src);
        if(moduleId){
          beginLoad(moduleId);
          node.addEventListener('load', () => {
            noteScriptLoaded(moduleId, new URL(node.src, location.href).pathname);
            if(shouldInject(moduleId, 'readiness_timeout')){
              markDegraded(moduleId, {
                reasonCode:'module_not_ready',
                failureStage:'readiness_timeout',
                installStarted:true,
                retryClass:'reload_required',
              });
            }
          }, {once:true});
          node.addEventListener('error', () => {
            const loadedCount = internalGet(moduleId)?.loadedScripts?.length || 0;
            markDegraded(moduleId, {
              reasonCode:'script_unavailable',
              failureStage:'script_load',
              installStarted:false,
              retryClass:loadedCount ? 'reload_required' : 'script_only',
            });
          }, {once:true});

          if(shouldInject(moduleId, 'script_load') && (internalGet(moduleId)?.loadedScripts?.length || 0) === 0){
            deferredScripts.set(moduleId, node);
            queueMicrotask(() => {
              markDegraded(moduleId, {
                reasonCode:'script_unavailable',
                failureStage:'script_load',
                installStarted:false,
                retryClass:'script_only',
              });
              try{ node.dispatchEvent(new Event('error')); }catch{}
            });
            return node;
          }
        }
      }
      return nativeHeadAppend(node);
    };
  }

  installScriptInterceptor();

  const readyPredicates = {
    base_finance:() => Boolean(root.__FP_RUNTIME__),
    obligations:() => Boolean(root.FamilyPilotObligations && document.getElementById('obligationsScreen')),
    planned_income:() => Boolean(root.__FP_M4_01_READY__ && document.getElementById('plannedIncomeScreen')),
    debts:() => Boolean(root.FamilyPilotDebts && root.__FP_M4_01_READY__),
    savings:() => Boolean(root.__FP_SAVINGS_TRUTH_READY__ && document.getElementById('savingsGoalsScreen')),
    money_planning:() => Boolean(root.__FP_M4_04_READY__ && document.getElementById('moneyLocationsScreen')),
    budget_designer:() => Boolean(root.__FP_M4_03_BUDGET_PACKAGE_LOADED__ && document.getElementById('budgetDesignerScreen')),
    onboarding:() => Boolean(root.__FP_M4_05_PACKAGE_LOADED__),
    what_if:() => Boolean(root.__FP_M4_06_PACKAGE_LOADED__ && document.getElementById('whatIfScreen')),
    learning:() => Boolean(root.__FP_M4_07_LEARNING_READY__ && document.getElementById('learningModeScreen')),
    persistence:() => Boolean(root.__FP_PERSISTENCE_READY__ && document.getElementById('persistenceScreen')),
  };

  function legacyFailureFor(moduleId){
    if(moduleId === 'onboarding' && root.__FP_M4_05_BOOTSTRAP_ERROR__) return String(root.__FP_M4_05_BOOTSTRAP_ERROR__);
    if(moduleId === 'learning' && root.__FP_M4_07_LEARNING_UI_ERROR__) return String(root.__FP_M4_07_LEARNING_UI_ERROR__);
    if(moduleId === 'persistence' && root.__FP_PERSISTENCE_RUNTIME_ERROR__) return String(root.__FP_PERSISTENCE_RUNTIME_ERROR__);
    const generic = String(root.__FP_PACKAGE_BOOTSTRAP_ERROR__ || '');
    return generic && moduleForPath(generic) === moduleId ? generic : '';
  }

  function dependencyRoot(record){
    for(const dependencyId of record.dependencies || []){
      const dependency = internalGet(dependencyId);
      if(dependency && ['degraded','unavailable'].includes(dependency.state)) return dependency;
    }
    return null;
  }

  function persistenceLocked(){
    try{return Boolean(root.FamilyPilotPersistence?.isRecoveryLocked?.())}catch{return false}
  }

  function revealStaticFallback(record){
    const fallback = document.getElementById('fpStaticFallback');
    if(!fallback) return;
    fallback.hidden = false;
    const title = fallback.querySelector('[data-fp-fallback-title]');
    const message = fallback.querySelector('[data-fp-fallback-message]');
    const code = fallback.querySelector('[data-fp-fallback-code]');
    if(title) title.textContent = 'FamilyPilot не удалось запустить полностью';
    if(message) message.textContent = 'Сохранённые данные не удалены из-за этой ошибки. Перезагрузите страницу.';
    if(code) code.textContent = record?.diagnosticId ? `Код: ${record.diagnosticId}` : '';
  }

  function reconcile(){
    if(persistenceLocked()){
      markDegraded('persistence', {
        reasonCode:'persistence_recovery_locked',
        failureStage:'critical_dependency',
        retryClass:'never',
        unavailable:true,
      });
    }

    for(const record of records.values()){
      const rootFailure = dependencyRoot(record);
      if(rootFailure && record.moduleId !== 'persistence'){
        markDegraded(record.moduleId, {
          reasonCode:'dependency_not_ready',
          failureStage:'critical_dependency',
          retryClass:'never',
          rootFailureModuleId:rootFailure.rootFailureModuleId || rootFailure.moduleId,
          rootDiagnosticId:rootFailure.rootDiagnosticId || rootFailure.diagnosticId,
          blockedByModuleId:rootFailure.moduleId,
        });
        continue;
      }

      if(record.blockedByModuleId && !rootFailure && ['degraded','unavailable'].includes(record.state)){
        beginLoad(record.moduleId);
      }

      const legacyFailure = legacyFailureFor(record.moduleId);
      if(legacyFailure && !['degraded','unavailable'].includes(record.state)){
        markDegraded(record.moduleId, {
          reasonCode:'module_install_failed',
          failureStage:'install_error',
          installStarted:true,
          retryClass:'reload_required',
        });
        continue;
      }

      const ready = readyPredicates[record.moduleId]?.() === true;
      if(ready){
        const ownership = validateOwnership(record);
        if(ownership.ok){
          if(!shouldInject(record.moduleId, 'readiness_timeout') && record.state !== 'ready') markReady(record.moduleId);
        }else if(ownership.collisions.length && !['degraded','unavailable'].includes(record.state)){
          markDegraded(record.moduleId, {
            reasonCode:'module_contract_failed',
            failureStage:'contract_validation',
            installStarted:true,
            retryClass:'reload_required',
          });
        }
        continue;
      }

      if(record.state === 'registered') beginLoad(record.moduleId);
      if(record.state === 'loading' && Date.now() - Number(record.startedAt || Date.now()) > 90000){
        markDegraded(record.moduleId, {
          reasonCode:'module_not_ready',
          failureStage:'readiness_timeout',
          installStarted:record.installStarted,
          retryClass:record.installStarted ? 'reload_required' : record.retryClass,
        });
      }
    }

    const base = internalGet('base_finance');
    if(base && ['degraded','unavailable'].includes(base.state)) revealStaticFallback(base);
  }

  function retry(moduleId){
    const record = internalGet(moduleId);
    if(!record) return null;
    if(record.state === 'loading') return record.activeAttemptId;
    if(record.blockedByModuleId || record.retryClass === 'never') return null;

    record.lastRetryAt = Date.now();
    const retryClass = record.retryClass;
    const attemptId = beginLoad(moduleId);

    if(retryClass === 'script_only' && deferredScripts.has(moduleId)){
      const node = deferredScripts.get(moduleId);
      deferredScripts.delete(moduleId);
      nativeHeadAppend(node);
      return attemptId;
    }

    if(retryClass === 'reload_required'){
      try{
        const url = new URL(location.href);
        url.searchParams.delete('moduleFailure');
        url.searchParams.delete('moduleFailureStage');
        history.replaceState(null, '', url);
      }catch{}
      setTimeout(() => location.reload(), 30);
      return attemptId;
    }

    return null;
  }

  function snapshot(){
    return {
      installedAt,
      catalogue:[...records.values()].map(record => clone(record)),
      events:clone(safeEvents),
      degraded:[...records.values()].filter(record => ['degraded','unavailable'].includes(record.state)).map(record => record.moduleId),
    };
  }

  function financialFingerprint(){
    const state = root.__FP_RUNTIME__?.state || {};
    const financialKeys = [
      'operations','wallets','obligationRules','obligationOccurrences','debtEvents','savingsGoals',
      'purposeAllocations','savingsTransfers','walletTransfers','investmentAccounts','balanceAdjustments',
      'plannedIncomeRules','plannedIncomeOccurrences','birthdays','giftFund','whatIfScenarios',
      'scenarioPlanConversions','whatIfInterestSimulations','onboardingState',
    ];
    const output = {};
    for(const key of financialKeys) output[key] = clone(state[key] || (key === 'onboardingState' ? {} : []));
    return JSON.stringify(output);
  }

  const api = {
    register,
    beginLoad,
    noteScriptLoaded,
    markReady,
    markDegraded,
    get:moduleId => clone(internalGet(moduleId)),
    snapshot,
    retry,
    reconcile,
    moduleForPath,
    validateOwnership:moduleId => clone(validateOwnership(internalGet(moduleId))),
    financialFingerprint,
  };

  if(testMode){
    api.test = {
      setFailure(moduleId, stage = 'script_load'){
        if(!records.has(moduleId) || !allowedFailureStages.has(stage)) return false;
        injection = {moduleId, stage};
        return true;
      },
      clearFailure(){
        injection = null;
        try{
          const url = new URL(location.href);
          url.searchParams.delete('moduleFailure');
          url.searchParams.delete('moduleFailureStage');
          history.replaceState(null, '', url);
        }catch{}
        return true;
      },
      currentInjection:() => clone(injection),
      forceDegraded(moduleId, stage = 'readiness_timeout'){
        return markDegraded(moduleId, {
          reasonCode:stage === 'critical_dependency' ? 'dependency_not_ready' : 'module_not_ready',
          failureStage:stage,
          installStarted:stage !== 'script_load',
          retryClass:stage === 'script_load' ? 'script_only' : 'reload_required',
        });
      },
      forceUnavailable(moduleId, reasonCode = 'module_contract_failed'){
        return markDegraded(moduleId, {reasonCode, failureStage:'contract_validation', retryClass:'never', unavailable:true});
      },
      events:() => clone(safeEvents),
      deferredScriptCount:() => deferredScripts.size,
    };
  }

  root.FamilyPilotModuleRegistry = Object.freeze(api);
  root.__FP_MODULE_REGISTRY_READY__ = true;
  const fallback = document.getElementById('fpStaticFallback');
  if(fallback) fallback.hidden = true;

  reconcileTimer = setInterval(reconcile, 250);
  document.addEventListener('DOMContentLoaded', reconcile, {once:true});
  queueMicrotask(reconcile);
})(typeof window !== 'undefined' ? window : globalThis);
