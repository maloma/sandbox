(()=>{
  'use strict';
  if(window.__FP_PERSISTENCE_RUNTIME_BOOTSTRAP__)return;
  window.__FP_PERSISTENCE_RUNTIME_BOOTSTRAP__=true;

  const deadline=Date.now()+90000;
  const waitMs=50;

  function start(){
    const persistence=window.FamilyPilotPersistence;
    const runtime=window.__FP_RUNTIME__;
    if(!persistence||!runtime){
      if(Date.now()>=deadline){window.__FP_PERSISTENCE_RUNTIME_ERROR__='Persistence runtime dependencies did not become ready';return}
      setTimeout(start,waitMs);
      return;
    }
    if(persistence.isRecoveryLocked()){
      install(runtime,persistence,{locked:true});
      return;
    }
    const ready=
      window.FamilyPilotScope&&
      window.FamilyPilotObligations&&
      window.FamilyPilotDebts&&
      window.FamilyPilotSavingsGoals&&
      window.FamilyPilotSavingsAccounts&&
      window.FamilyPilotSavingsTruth&&
      window.FamilyPilotMoneyPlanning&&
      window.FamilyPilotPlannedIncome&&
      window.__FP_M4_05_PACKAGE_LOADED__===true&&
      window.__FP_SAVINGS_TRUTH_READY__===true;
    if(!ready){
      if(Date.now()>=deadline){window.__FP_PERSISTENCE_RUNTIME_ERROR__='Required migration dependencies did not become ready';install(runtime,persistence,{dependencyFailure:true});return}
      setTimeout(start,waitMs);
      return;
    }
    install(runtime,persistence,{locked:false});
  }

  function install(runtime,persistence,mode){
    if(window.__FP_PERSISTENCE_RUNTIME__)return;
    window.__FP_PERSISTENCE_RUNTIME__=true;
    const{state,$,esc,save,showScreen,toast,now}=runtime;
    const marker=document.createElement('meta');
    marker.name='familypilot-package';
    marker.content='pf08a-wave-1c-persistence-recovery-v1';
    document.head.appendChild(marker);

    const ensureArray=key=>{if(!Array.isArray(state[key]))state[key]=[]};
    const hasApi=name=>Boolean(window[name]);
    const unique=list=>[...new Set((Array.isArray(list)?list:[]).map(String).filter(Boolean))];
    function mergeDuplicateWallets(){
      ensureArray('members');ensureArray('wallets');
      const memberIds=unique([...(state.members||[]).map(item=>item?.id),...(Array.isArray(state.household?.memberIds)?state.household.memberIds:[])]);
      const result=[],byId=new Map();
      for(let index=0;index<state.wallets.length;index++){
        const raw=state.wallets[index];
        if(!raw||typeof raw!=='object'||Array.isArray(raw))continue;
        const wallet={...raw,id:String(raw.id||`wallet-legacy-${index+1}`)};
        wallet.allowedMemberIds=unique(Array.isArray(wallet.allowedMemberIds)?wallet.allowedMemberIds:wallet.visibleToMemberIds);
        wallet.visibleToMemberIds=unique(wallet.visibleToMemberIds);
        if(wallet.nativeCurrency==null&&wallet.baseCurrency)wallet.nativeCurrency=wallet.baseCurrency;
        if(wallet.archivedAt===undefined)wallet.archivedAt=null;
        if(wallet.createdAt===undefined)wallet.createdAt=now();
        const canonical=byId.get(wallet.id);
        if(!canonical){byId.set(wallet.id,wallet);result.push(wallet);continue}
        for(const [key,value] of Object.entries(wallet)){
          if(['allowedMemberIds','visibleToMemberIds','permissions','includedInHouseholdCapital','openingBalance'].includes(key))continue;
          if((canonical[key]===undefined||canonical[key]===null||canonical[key]==='')&&value!==undefined&&value!==null&&value!=='')canonical[key]=value;
        }
        canonical.allowedMemberIds=unique([...(canonical.allowedMemberIds||[]),...(wallet.allowedMemberIds||[])]);
        canonical.visibleToMemberIds=unique([...(canonical.visibleToMemberIds||[]),...(wallet.visibleToMemberIds||[])]);
        canonical.permissions={...(wallet.permissions||{}),...(canonical.permissions||{})};
        if(wallet.includedInHouseholdCapital===true)canonical.includedInHouseholdCapital=true;
        if(canonical.openingBalance==null&&wallet.openingBalance!=null)canonical.openingBalance=wallet.openingBalance;
        if(canonical.nativeCurrency==null&&canonical.baseCurrency)canonical.nativeCurrency=canonical.baseCurrency;
        canonical.createdAt=Math.min(Number(canonical.createdAt)||now(),Number(wallet.createdAt)||now());
      }
      for(const wallet of result){
        const householdLike=!wallet.ownerMemberId&&(String(wallet.type||'').includes('household')||String(wallet.visibilityMode||'').includes('all'));
        if(householdLike&&wallet.allowedMemberIds.length===0)wallet.allowedMemberIds=[...memberIds];
        if(wallet.nativeCurrency==null)wallet.nativeCurrency=state.household?.baseCurrency||'EUR';
        if(!Number.isFinite(Number(wallet.openingBalance)))wallet.openingBalance=0;
      }
      state.wallets=result;
      if(!state.wallets.some(wallet=>wallet.id===state.activeWalletId))state.activeWalletId=state.wallets.find(wallet=>wallet.type==='household_default')?.id||state.wallets[0]?.id||null;
    }
    const phase=(id,order,ready,apply=()=>{},validate=()=>({ok:true}))=>({
      id,
      order,
      fromVersionInclusive:0,
      toVersion:persistence.CURRENT_STATE_SCHEMA_VERSION,
      requiredDependencies:[],
      quarantinableCollections:[],
      idempotencyKey:`pf08a-wave1c:${id}:v1`,
      ready,
      apply,
      validate,
    });

    const descriptors=[
      phase('01_base_structure',10,()=>hasApi('FamilyPilotScope'),()=>{
        window.FamilyPilotScope.migrateState(state,now());
        for(const key of ['members','wallets','operations','transfers','walletMovements'])ensureArray(key);
        mergeDuplicateWallets();
      }),
      phase('02_scope_and_wallets',20,()=>hasApi('FamilyPilotWalletManagement')&&hasApi('FamilyPilotScope'),()=>{
        ensureArray('members');ensureArray('wallets');mergeDuplicateWallets();
      },()=>({ok:Array.isArray(state.wallets)&&Array.isArray(state.members),error:'scope_wallet_validation_failed'})),
      phase('03_operations_and_categories',30,()=>Boolean(runtime.scopeApi),()=>{
        ensureArray('operations');ensureArray('categories');
      }),
      phase('04_obligations_and_payments',40,()=>hasApi('FamilyPilotObligations'),()=>{
        ensureArray('obligationRules');ensureArray('obligationOccurrences');
      }),
      phase('05_debts',50,()=>hasApi('FamilyPilotDebts'),()=>{ensureArray('debts')}),
      phase('06_savings_goals_and_plans',60,()=>hasApi('FamilyPilotSavingsGoals')&&hasApi('FamilyPilotSavingsAccounts'),()=>{
        ensureArray('savingsGoals');ensureArray('savingsPlans');ensureArray('savingsTransfers');
      }),
      phase('07_money_locations_and_purpose_allocations',70,()=>hasApi('FamilyPilotSavingsTruth')&&hasApi('FamilyPilotMoneyPlanning'),()=>{
        window.FamilyPilotSavingsTruth.normalizeState(state,{scope:runtime.scopeApi},now());
        for(const key of ['purposeAllocations','purposeAllocationEvents','savingsLegacyReconciliationIssues','savingsPurposeMigrationResults'])ensureArray(key);
      },()=>{
        const audit=window.FamilyPilotSavingsTruth.audit(state);
        return{ok:audit.singleTruth===true,error:'single_savings_truth_validation_failed'};
      }),
      phase('08_planned_income',80,()=>hasApi('FamilyPilotPlannedIncome'),()=>{ensureArray('plannedIncomeRules');ensureArray('plannedIncomeOccurrences')}),
      phase('09_onboarding_and_income_distribution',90,()=>window.__FP_M4_05_PACKAGE_LOADED__===true,()=>{
        ensureArray('incomeDistributionRules');ensureArray('savingsActionOccurrences');
      }),
      phase('10_what_if_solver_conversion_interest',100,()=>true,()=>{
        ensureArray('whatIfScenarios');ensureArray('whatIfInterestSimulations');ensureArray('scenarioPlanConversions');
      }),
      phase('11_learning_mode',110,()=>true,()=>{
        if(!state.learningModeByMember||typeof state.learningModeByMember!=='object'||Array.isArray(state.learningModeByMember))state.learningModeByMember={};
      }),
      phase('12_global_validation_and_schema_22',120,()=>true,()=>{},()=>{
        const validation=persistence.structuralValidate(state);
        return validation.ok?{ok:true}:{ok:false,error:validation.error};
      }),
    ];

    let finalizeResult={ok:false,error:'not_finalized'};
    let cleanupResult={status:'not_run'};
    if(!mode.locked&&!mode.dependencyFailure){
      finalizeResult=persistence.finalizeBootstrap(state,descriptors);
      if(finalizeResult.ok){
        const runCleanup=()=>{
          if(cleanupResult.status!=='not_run')return;
          try{cleanupResult=persistence.cleanupNonCanonicalArtifacts();}catch(error){cleanupResult={status:'failed',error:String(error?.message||error)}}
        };
        try{
          const saveResult=save();
          if(saveResult&&typeof saveResult.then==='function')saveResult.then(runCleanup,()=>undefined);
          else runCleanup();
        }catch(error){window.__FP_PERSISTENCE_RUNTIME_ERROR__=String(error?.message||error)}
      }else{
        window.__FP_PERSISTENCE_RUNTIME_ERROR__=String(finalizeResult.error||'Persistence finalization failed');
      }
    }

    const style=document.createElement('style');
    style.id='familypilot-persistence-style';
    style.textContent=`
      .persistence-card{border:1px solid var(--line);border-radius:17px;background:var(--card);padding:13px;box-shadow:var(--shadow);margin-bottom:10px}
      .persistence-card h2,.persistence-card h3{margin:0;font-size:15px}.persistence-card p{margin:7px 0 0;color:var(--muted);font-size:12px;line-height:1.5}
      .persistence-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}.persistence-metric{border:1px solid var(--line);border-radius:13px;background:var(--card2);padding:9px}.persistence-metric span,.persistence-metric strong{display:block}.persistence-metric span{font-size:10px;color:var(--muted)}.persistence-metric strong{font-size:13px;margin-top:3px;overflow-wrap:anywhere}
      .persistence-warning{border-color:color-mix(in srgb,#f4b400 48%,var(--line));background:color-mix(in srgb,#f4b400 8%,var(--card))}.persistence-danger{border-color:color-mix(in srgb,var(--red) 45%,var(--line));background:color-mix(in srgb,var(--red) 7%,var(--card))}
      .persistence-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.persistence-actions .btn{min-height:42px;padding:8px 12px}.persistence-state-badge{display:inline-flex;margin-top:8px;border-radius:999px;padding:4px 8px;background:var(--card2);font-size:10px;font-weight:900}.persistence-state-badge.ok{color:var(--green)}.persistence-state-badge.bad{color:var(--red)}
      .persistence-lock-overlay{position:fixed;inset:0;z-index:1200;background:var(--bg);overflow:auto;padding:24px 14px}.persistence-lock-shell{width:min(100%,520px);margin:auto}.persistence-lock-shell h1{font-size:25px;margin:0}.persistence-lock-shell p{color:var(--muted);line-height:1.55}.persistence-lock-shell .persistence-card{margin-top:14px}
      @media(max-width:380px){.persistence-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);

    function formatTime(value){
      if(!Number.isFinite(Number(value))||Number(value)<=0)return'—';
      return new Intl.DateTimeFormat('ru-RU',{dateStyle:'medium',timeStyle:'short'}).format(new Date(Number(value)));
    }
    function safeStatus(){try{return persistence.currentStatus()}catch(error){return{status:'write_failed',messageCode:String(error?.message||error)}}}
    function renderStatus(){
      const screen=$('persistenceScreen');
      if(!screen)return;
      const status=safeStatus();
      const slots=persistence.inspectSlots();
      const healthy=status.status==='healthy';
      const recovered=String(status.status||'').startsWith('recovered_');
      const locked=persistence.isRecoveryLocked()||['recovery_locked','future_schema_blocked','migration_failed'].includes(status.status);
      const revision=Number(status.revision)||Math.max(slots.a?.ok?slots.a.envelope.revision:0,slots.b?.ok?slots.b.envelope.revision:0);
      const headline=locked?'Требуется восстановление':recovered?'Данные восстановлены из резервной локальной копии':healthy?'Локальное сохранение работает':'Сохранение подготавливается';
      screen.innerHTML=`<div class="page-title"><button class="back" type="button" data-persistence-back>‹</button><div class="page-title-copy"><h1>Хранение данных</h1><small class="scope-context">Локальное сохранение и восстановление</small></div></div>
        <section class="persistence-card persistence-warning"><h2>Версия для разработки</h2><p>Текущая версия хранит данные только в этом браузере и остаётся версией для разработки. Это ещё не облачная резервная копия и не перенос между устройствами.</p></section>
        <section class="persistence-card ${locked?'persistence-danger':''}"><h2>${esc(headline)}</h2><span class="persistence-state-badge ${locked?'bad':'ok'}">${esc(status.status||'неизвестно')}</span><div class="persistence-grid"><div class="persistence-metric"><span>Схема данных</span><strong>${Number(status.stateSchemaVersion)||persistence.CURRENT_STATE_SCHEMA_VERSION}</strong></div><div class="persistence-metric"><span>Ревизия</span><strong>${revision||'—'}</strong></div><div class="persistence-metric"><span>Последнее сохранение</span><strong>${esc(formatTime(status.lastSuccessfulSaveAt))}</strong></div><div class="persistence-metric"><span>Источник</span><strong>${esc(status.source||'—')}</strong></div></div><p>${locked?'Не удалось безопасно прочитать или подготовить сохранённые данные. Исходная запись сохранена и не заменена новой. Финансовые изменения заблокированы.':'FamilyPilot проверяет записанную копию после каждого финансового сохранения и сохраняет предыдущую подтверждённую ревизию.'}</p><div class="persistence-actions"><button class="btn secondary" type="button" data-persistence-diagnostic>Скачать диагностику</button>${locked?'<button class="btn primary" type="button" data-persistence-retry>Повторить проверку</button>':''}</div></section>
        <section class="persistence-card"><h3>Что входит в диагностику</h3><p>Только версии, статусы, коды ошибок, количество изолированных записей и готовность модулей. Суммы, названия счетов, заметки и полный финансовый файл не включаются.</p></section>`;
    }

    function installDom(){
      const more=$('moreScreen');
      if(more&&!$('persistenceEntry')){
        const card=document.createElement('section');
        card.id='persistenceEntry';
        card.className='card section';
        card.innerHTML='<div class="section-head"><div><h2>Хранение и восстановление данных</h2><small class="settings-subtitle">Локальное состояние, ревизии и диагностика</small></div></div><button class="btn secondary settings-wide-action" type="button" data-persistence-open>Открыть</button>';
        more.appendChild(card);
      }
      if(!$('persistenceScreen')){
        const screen=document.createElement('section');
        screen.id='persistenceScreen';
        screen.className='screen';
        $('moreScreen')?.parentNode?.insertBefore(screen,$('moreScreen'));
      }
      renderStatus();
    }

    function showRecoveryOverlay(){
      if(!persistence.isRecoveryLocked()||$('persistenceLockOverlay'))return;
      const status=safeStatus();
      const overlay=document.createElement('div');
      overlay.id='persistenceLockOverlay';
      overlay.className='persistence-lock-overlay';
      overlay.innerHTML=`<div class="persistence-lock-shell"><h1>Восстановление данных</h1><p>Не удалось безопасно прочитать сохранённые данные. Исходная запись сохранена и не заменена новой.</p><section class="persistence-card persistence-danger"><h2>Финансовые изменения временно заблокированы</h2><p>Статус: ${esc(status.status||'recovery_locked')}. Можно скачать обезличенную диагностику или повторить проверку. Новая финансовая запись поверх исходных данных не создаётся.</p><div class="persistence-actions" data-persistence-control><button class="btn secondary" type="button" data-persistence-diagnostic>Скачать диагностику</button><button class="btn primary" type="button" data-persistence-retry>Повторить проверку</button></div></section><section class="persistence-card persistence-warning"><p>Текущая версия хранит данные только в этом браузере и остаётся версией для разработки.</p></section></div>`;
      document.body.appendChild(overlay);
    }

    function download(){
      try{persistence.downloadDiagnostic();toast?.('Диагностика подготовлена локально')}catch(error){toast?.('Не удалось подготовить диагностику')}
    }
    function retry(){
      const selected=persistence.test?.retryRecovery?persistence.test.retryRecovery():null;
      if(selected?.source&&selected.source!=='recovery_shell')location.reload();
      else{renderStatus();toast?.('Безопасная копия пока не найдена')}
    }

    installDom();
    showRecoveryOverlay();
    document.addEventListener('click',event=>{
      const openButton=event.target.closest('[data-persistence-open]');
      const backButton=event.target.closest('[data-persistence-back]');
      const diagnostic=event.target.closest('[data-persistence-diagnostic]');
      const retryButton=event.target.closest('[data-persistence-retry]');
      if(openButton){showScreen('persistence');renderStatus()}
      if(backButton)showScreen('more');
      if(diagnostic)download();
      if(retryButton)retry();
    });
    window.addEventListener('familypilot:persistence-status',renderStatus);

    if(new URLSearchParams(location.search).has('test')){
      const test=window.__FP_TEST__=window.__FP_TEST__||{};
      test.persistence={
        status:()=>persistence.currentStatus(),
        slots:()=>persistence.inspectSlots(),
        diagnostic:()=>persistence.diagnosticReport(),
        schema:()=>state.schemaVersion,
        ledger:()=>JSON.parse(JSON.stringify(state.persistenceMigrationLedger||[])),
        finalizeResult:()=>JSON.parse(JSON.stringify(finalizeResult)),
        isLocked:()=>persistence.isRecoveryLocked(),
        storageNamespace:()=>persistence.storageNamespace,
        testApi:()=>persistence.test||null,
        renderStatus,
        statusText:()=>document.getElementById('persistenceScreen')?.textContent||'',
        hasEntry:()=>Boolean(document.querySelector('[data-persistence-open]')),
      };
    }

    window.__FP_PERSISTENCE_READY__=Boolean(finalizeResult.ok||persistence.isRecoveryLocked());
    window.__FP_PERSISTENCE_PACKAGE_LOADED__=true;
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
