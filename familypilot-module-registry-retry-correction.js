(()=>{
  'use strict';
  if(window.__FP_MODULE_REGISTRY_RETRY_CORRECTION__)return;
  window.__FP_MODULE_REGISTRY_RETRY_CORRECTION__=true;

  const registry=window.FamilyPilotModuleRegistry;
  if(!registry)return;

  function clearGeneric(moduleId){
    const value=String(window.__FP_PACKAGE_BOOTSTRAP_ERROR__||'');
    if(value&&registry.moduleForPath(value)===moduleId)window.__FP_PACKAGE_BOOTSTRAP_ERROR__=null;
  }

  function clearSpecific(moduleId){
    if(moduleId==='onboarding')window.__FP_M4_05_BOOTSTRAP_ERROR__=null;
    if(moduleId==='what_if'){
      window.__FP_M4_06_UI_ERROR__=null;
      window.__FP_M4_06_SOLVER_UI_ERROR__=null;
      window.__FP_M4_06_CONVERSION_UI_ERROR__=null;
      window.__FP_M4_06_INTEREST_UI_ERROR__=null;
    }
    if(moduleId==='learning')window.__FP_M4_07_LEARNING_UI_ERROR__=null;
    if(moduleId==='persistence')window.__FP_PERSISTENCE_RUNTIME_ERROR__=null;
  }

  function reconcileCompatibilityErrors(snapshot=registry.snapshot()){
    for(const record of snapshot.catalogue||[]){
      const retrying=record.state==='loading'&&Number(record.lastRetryAt)>0;
      const recovered=record.state==='ready'&&Number(record.attempt)>1;
      if(!retrying&&!recovered)continue;
      clearGeneric(record.moduleId);
      clearSpecific(record.moduleId);
    }
  }

  window.addEventListener('familypilot:module-state',event=>reconcileCompatibilityErrors(event.detail));
  reconcileCompatibilityErrors();
})();
