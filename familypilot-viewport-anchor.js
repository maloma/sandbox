(()=>{
  'use strict';
  if(window.__FP_VIEWPORT_ANCHOR__)return;
  window.__FP_VIEWPORT_ANCHOR__=true;
  const READY_LIMIT=1200;

  function loadScript(path,ready){
    const existing=[...document.scripts].find(script=>script.src&&script.src.endsWith(`/${path}`));
    if(existing){if(existing.dataset.loaded==='true')ready?.();else existing.addEventListener('load',()=>ready?.(),{once:true});return}
    const script=document.createElement('script');
    script.src=`./${path}`;script.async=false;script.dataset.familyPilotPackage='integrated-planning';
    script.addEventListener('load',()=>{script.dataset.loaded='true';ready?.()},{once:true});
    script.addEventListener('error',()=>{window.__FP_PACKAGE_BOOTSTRAP_ERROR__=`Failed to load ${path}`},{once:true});
    document.head.appendChild(script);
  }
  function m405DependenciesReady(){return window.__FP_M4_04_READY__===true&&window.__FP_RUNTIME__&&window.FamilyPilotMoneyPlanning&&window.FamilyPilotWalletManagement&&window.FamilyPilotWalletTransfers&&window.FamilyPilotSavingsGoals&&window.FamilyPilotSavingsAccounts&&window.FamilyPilotBudgetDesigner&&window.FamilyPilotPlannedIncome&&window.FamilyPilotObligations&&window.FamilyPilotDebts}
  function loadM405(attempt=0){
    if(!m405DependenciesReady()){if(attempt<READY_LIMIT)setTimeout(()=>loadM405(attempt+1),25);else window.__FP_M4_05_BOOTSTRAP_ERROR__='M4-05 domain dependencies did not become ready';return}
    loadScript('familypilot-m4-05-onboarding-income-distribution.js',()=>loadScript('familypilot-m4-05-product-corrections.js',()=>loadScript('familypilot-m4-05-income-activation-correction.js',()=>loadScript('familypilot-m4-05-onboarding-income-distribution-ui.js',()=>loadScript('familypilot-m4-05-ui-corrections.js',()=>loadScript('familypilot-m4-05-current-state-actions.js',()=>{
      window.__FP_M4_05_PACKAGE_LOADED__=true;
      loadScript('familypilot-m4-06-what-if.js',()=>loadScript('familypilot-m4-06-what-if-ui.js',()=>loadScript('familypilot-m4-06-goal-deficit-solver.js',()=>loadScript('familypilot-m4-06-goal-deficit-solver-ui.js',()=>loadScript('familypilot-m4-06-scenario-plan-conversion.js',()=>loadScript('familypilot-m4-06-scenario-plan-conversion-ui.js',()=>loadScript('familypilot-m4-06-manual-interest.js',()=>loadScript('familypilot-m4-06-manual-interest-ui.js',()=>loadScript('familypilot-m4-07-learning-mode.js',()=>loadScript('familypilot-m4-07-learning-mode-ui.js',()=>{
        window.__FP_M4_06_PACKAGE_LOADED__=true;
        window.__FP_M4_06_SOLVER_PACKAGE_LOADED__=true;
        window.__FP_M4_06_CONVERSION_PACKAGE_LOADED__=true;
        window.__FP_M4_06_INTEREST_PACKAGE_LOADED__=true;
        window.__FP_M4_07_LEARNING_PACKAGE_LOADED__=true;
      }))))))))));
    }))))));
  }
  loadScript('familypilot-m4-03-forecast-correction.js',()=>loadScript('familypilot-m4-03-budget-safety-correction.js',()=>loadScript('familypilot-m4-03-budget-designer.js',()=>loadScript('familypilot-m4-03-budget-designer-ui.js',()=>loadScript('familypilot-m4-03-additive-reserve-ui.js',()=>loadScript('familypilot-m4-04-money-planning.js',()=>{
    window.DAY=window.FamilyPilotMoneyPlanning?.DAY||86400000;
    loadScript('familypilot-m4-04-money-planning-ui.js',()=>{
      window.__FP_M4_03_BUDGET_PACKAGE_LOADED__=true;
      window.__FP_M4_04_PACKAGE_LOADED__=true;
      loadM405();
    });
  }))))));

  function boot(attempt=0){
    const nav=document.querySelector('.bottom'),dock=document.getElementById('actionDock'),app=document.querySelector('.app');
    if(!nav||!dock||!app){if(attempt<READY_LIMIT)setTimeout(()=>boot(attempt+1),25);return}
    if(nav.parentElement!==document.body)document.body.appendChild(nav);
    if(dock.parentElement!==document.body)document.body.insertBefore(dock,nav);
    const style=document.createElement('style');
    style.id='familypilot-viewport-anchor-style';
    style.textContent=`
      body>.bottom{position:fixed!important;left:50%!important;right:auto!important;top:auto!important;bottom:0!important;transform:translate3d(-50%,var(--fp-visual-shift,0px),0)!important;width:min(100%,520px)!important;z-index:600!important;will-change:transform;isolation:isolate}
      body>#actionDock{position:fixed!important;left:50%!important;right:auto!important;top:auto!important;bottom:var(--fp-nav-height,62px)!important;transform:translate3d(-50%,var(--fp-visual-shift,0px),0)!important;width:min(100%,520px)!important;z-index:590!important;will-change:transform;isolation:isolate}
      body>.bottom,body>#actionDock{margin:0!important}
      body>.modal,body>.overlay{z-index:900!important}
      body>.modal.open,body>.overlay.open{position:fixed!important;inset:0!important}
      body>.modal .sheet,body>.overlay .panel{max-height:calc(100dvh - 10px)!important;padding-bottom:calc(24px + env(safe-area-inset-bottom))!important}
    `;
    document.head.appendChild(style);
    function removeHomeTransfer(){const actions=dock.querySelector('.actions');actions?.querySelector('[data-open-transfer]')?.remove();actions?.classList.remove('wf02-actions')}
    let syncing=false;
    function sync(){
      if(syncing)return;syncing=true;
      requestAnimationFrame(()=>{
        try{
          removeHomeTransfer();
          document.documentElement.style.setProperty('--fp-visual-shift','0px');
          const navVisible=getComputedStyle(nav).display!=='none',navHeight=navVisible?Math.ceil(nav.getBoundingClientRect().height):0;
          document.documentElement.style.setProperty('--fp-nav-height',`${navHeight}px`);
          const vv=window.visualViewport,visualBottom=vv?vv.offsetTop+vv.height:window.innerHeight,rect=nav.getBoundingClientRect(),shift=Math.round(visualBottom-rect.bottom);
          document.documentElement.style.setProperty('--fp-visual-shift',`${Number.isFinite(shift)?shift:0}px`);
          const dockVisible=getComputedStyle(dock).display!=='none'&&!dock.classList.contains('hidden'),dockHeight=dockVisible?Math.ceil(dock.getBoundingClientRect().height):0,total=Math.max(0,navHeight+dockHeight);
          document.documentElement.style.setProperty('--fp-fixed-bottom',`${total}px`);app.style.paddingBottom=`calc(${total}px + 16px + env(safe-area-inset-bottom))`;
        }finally{syncing=false}
      });
    }
    sync();
    new MutationObserver(sync).observe(dock,{attributes:true,childList:true,subtree:true,attributeFilter:['class']});
    new MutationObserver(sync).observe(nav,{attributes:true,attributeFilter:['class']});
    for(const target of [window,window.visualViewport].filter(Boolean)){target.addEventListener('resize',sync,{passive:true});target.addEventListener('scroll',sync,{passive:true})}
    document.addEventListener('focusin',sync,true);document.addEventListener('focusout',()=>setTimeout(sync,120),true);
    const api={sync,removeHomeTransfer,parents:()=>({nav:nav.parentElement===document.body,dock:dock.parentElement===document.body}),positions:()=>({nav:nav.getBoundingClientRect(),dock:dock.getBoundingClientRect(),visualBottom:(window.visualViewport?.offsetTop||0)+(window.visualViewport?.height||window.innerHeight)}),modalLayer:id=>{const modal=document.getElementById(id);return modal?{modal:Number(getComputedStyle(modal).zIndex)||0,nav:Number(getComputedStyle(nav).zIndex)||0}:null},homeTransferVisible:()=>!!dock.querySelector('[data-open-transfer]')};
    if(new URLSearchParams(location.search).has('test')){const install=(n=0)=>{if(window.__FP_TEST__){window.__FP_TEST__.viewportAnchor=api;return}if(n<READY_LIMIT)setTimeout(()=>install(n+1),25)};install()}
    window.__FP_VIEWPORT_ANCHOR_READY__=true;
  }
  boot();
})();
