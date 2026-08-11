(()=>{
  'use strict';
  if(window.FamilyPilotDestructiveLifecycleUI)return;

  const DEADLINE_MS=30000;
  const startedAt=Date.now();
  let active=false,pending=false,detailOperationId='';
  const linked=operation=>{const links=operation?.links;return Boolean(links&&(links.obligationOccurrenceId||links.obligationAllocationOccurrenceId||links.obligationRuleId))};
  const dependencies=()=>({runtime:window.__FP_RUNTIME__,persistence:window.FamilyPilotPersistence,core:window.FamilyPilotDestructiveLifecycleCore});
  const ready=()=>{const{runtime,persistence,core}=dependencies();return Boolean(active&&runtime&&persistence&&core&&persistence.isRecoveryLocked?.()!==true)};
  const operation=id=>{const state=window.__FP_RUNTIME__?.state;return Array.isArray(state?.operations)?state.operations.find(item=>String(item?.id)===String(id))||null:null};
  const notify=message=>{const runtime=window.__FP_RUNTIME__;if(typeof runtime?.toast==='function')runtime.toast(message);else window.alert?.(message)};
  const unavailable=()=>notify('Безопасное действие временно недоступно. Обновите страницу и попробуйте снова.');
  const reload=()=>{if(typeof window.location?.reload==='function')window.location.reload()};
  const bridgeFailure=outcome=>({ok:false,error:String(outcome?.error||'canonical_mutation_failed')});
  function run(action,id,question){
    if(pending)return{ok:false,error:'lifecycle_action_pending'};
    if(!ready()){unavailable();return{ok:false,error:'ui_dependencies_unavailable'}};
    const{runtime,core}=dependencies(),current=operation(id);
    if(!current||linked(current)){return{ok:false,error:'not_ordinary_operation'}};
    let prepared;
    try{prepared=core.prepare(runtime.state,{action,entityType:'operation',id:String(id),now:runtime.now()})}catch{unavailable();return{ok:false,error:'safe_lifecycle_unavailable'}}
    if(!prepared?.ok){unavailable();return prepared||{ok:false,error:'safe_lifecycle_unavailable'}};
    if(!window.confirm(question))return{ok:false,cancelled:true};
    const confirmed=core.confirm(prepared.plan,{action:prepared.plan.action,acknowledged:true,confirmedAt:runtime.now()});
    if(!confirmed?.ok){unavailable();return confirmed||{ok:false,error:'confirmation_unavailable'}};
    if(typeof runtime.commitCanonicalMutation==='function'){
      pending=true;
      const mutate=draft=>{
        const applied=core.applyToDraft(prepared.plan,confirmed.confirmation,draft);
        if(!applied?.ok){const failure=new Error(String(applied?.error||'destructive_draft_apply_failed'));failure.code=applied?.error;throw failure}
        return applied;
      };
      const finish=outcome=>{
        pending=false;
        if(!outcome?.ok){const failed=bridgeFailure(outcome);unavailable();return failed}
        return{...outcome,requiresReload:false};
      };
      try{
        const outcome=runtime.commitCanonicalMutation(mutate);
        if(outcome&&typeof outcome.then==='function')return outcome.then(finish,reason=>finish({ok:false,error:String(reason?.code||reason?.message||'canonical_mutation_failed')}));
        return finish(outcome);
      }catch(err){return finish({ok:false,error:String(err?.code||err?.message||'canonical_mutation_failed')})}
    }
    const applied=core.apply(prepared.plan,confirmed.confirmation,runtime.state);
    if(!applied?.ok){unavailable();return applied||{ok:false,error:'safe_lifecycle_unavailable'}};
    if(applied.requiresReload===true)reload();
    return applied;
  }
  const trashOrdinaryOperation=id=>run('trash',id,'Переместить операцию в Корзину?');
  const restoreOrdinaryOperation=id=>run('restore_from_trash',id,'Восстановить операцию из Корзины?');
  function click(event){
    const target=event.target;
    const row=target?.closest?.('[data-op-id]');if(row)detailOperationId=row.dataset.opId||'';
    const view=target?.closest?.('[data-trash-view]');if(view)detailOperationId=view.dataset.trashView||'';
    const remove=target?.closest?.('#detailDeleteBtn');
    if(remove){const current=operation(detailOperationId);if(current?.status==='active'&&!linked(current)){event.preventDefault();event.stopImmediatePropagation();trashOrdinaryOperation(detailOperationId)}return}
    const restore=target?.closest?.('[data-trash-restore]');
    if(restore){const id=restore.dataset.trashRestore,current=operation(id);if(current?.status==='trash'&&!linked(current)){event.preventDefault();event.stopImmediatePropagation();restoreOrdinaryOperation(id)}}
  }
  function boot(){
    const{runtime,persistence,core}=dependencies();
    if(runtime&&persistence&&core){active=true;window.__FP_DESTRUCTIVE_LIFECYCLE_UI_READY__=true;return}
    if(Date.now()-startedAt>=DEADLINE_MS){window.__FP_DESTRUCTIVE_LIFECYCLE_UI_ERROR__='Safe Trash UI dependencies did not become ready';return}
    setTimeout(boot,25);
  }
  window.addEventListener('click',click,true);
  const api={isLinkedOperation:linked,trashOrdinaryOperation,restoreOrdinaryOperation,isReady:ready};
  if(new URLSearchParams(window.location?.search||'').has('test'))api.setDetailOperationId=id=>{detailOperationId=String(id||'')};
  window.FamilyPilotDestructiveLifecycleUI=Object.freeze(api);
  boot();
})();
