(function attachFamilyPilotSavings(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FamilyPilotSavings=api;
})(typeof window!=='undefined'?window:globalThis,function createSavingsApi(){
  'use strict';

  const EPSILON=0.000001;
  const now=()=>Date.now();
  const uid=prefix=>`${prefix}-${now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  const text=value=>String(value??'').trim();
  const amount=value=>{const number=Number(String(value??'').replace(',','.'));return Number.isFinite(number)?Math.max(0,Math.round(number*100)/100):0};
  const targetDate=value=>{if(value===null||value===undefined||value==='')return null;const number=Number(value);return Number.isFinite(number)&&number>0?number:null};

  function normalizeGoal(raw,state,index){
    const createdAt=Number(raw?.createdAt)||now()+index;
    const status=raw?.status==='archived'?'archived':'active';
    return {
      id:text(raw?.id)||uid('goal'),
      name:text(raw?.name)||'Цель без названия',
      targetAmount:amount(raw?.targetAmount),
      savedAmount:amount(raw?.savedAmount),
      currency:text(raw?.currency)||state?.household?.baseCurrency||'EUR',
      targetDate:targetDate(raw?.targetDate),
      status,
      createdAt,
      updatedAt:Number(raw?.updatedAt)||createdAt,
      archivedAt:status==='archived'?(Number(raw?.archivedAt)||Number(raw?.updatedAt)||createdAt):null
    };
  }

  function normalizeState(state){
    if(!state||typeof state!=='object')throw new Error('FamilyPilot state is required');
    state.schemaVersion=Math.max(Number(state.schemaVersion)||0,6);
    const source=Array.isArray(state.savingsGoals)?state.savingsGoals:[];
    const seen=new Set();
    state.savingsGoals=source.map((raw,index)=>normalizeGoal(raw,state,index)).filter(goal=>{
      if(seen.has(goal.id))return false;
      seen.add(goal.id);
      return true;
    });
    return state;
  }

  function validateInput(state,input){
    const name=text(input?.name);
    const targetAmount=amount(input?.targetAmount);
    const savedAmount=amount(input?.savedAmount);
    if(!name)throw new Error('Укажите название цели');
    if(targetAmount<=EPSILON)throw new Error('Укажите сумму цели больше нуля');
    return {name,targetAmount,savedAmount,currency:text(input?.currency)||state?.household?.baseCurrency||'EUR',targetDate:targetDate(input?.targetDate)};
  }

  function createGoal(state,input,at=now()){
    normalizeState(state);
    const data=validateInput(state,input);
    const goal={id:uid('goal'),...data,status:'active',createdAt:at,updatedAt:at,archivedAt:null};
    state.savingsGoals.push(goal);
    return goal;
  }

  function getGoal(state,id){
    normalizeState(state);
    return state.savingsGoals.find(goal=>goal.id===id)||null;
  }

  function updateGoal(state,id,patch,at=now()){
    const goal=getGoal(state,id);
    if(!goal)throw new Error('Цель не найдена');
    if(goal.status==='archived')throw new Error('Архивную цель нельзя изменить');
    Object.assign(goal,validateInput(state,{...goal,...patch}),{updatedAt:at});
    return goal;
  }

  function archiveGoal(state,id,at=now()){
    const goal=getGoal(state,id);
    if(!goal)throw new Error('Цель не найдена');
    if(goal.status==='archived')return goal;
    goal.status='archived';goal.archivedAt=at;goal.updatedAt=at;
    return goal;
  }

  function activeGoals(state){
    normalizeState(state);
    return state.savingsGoals.filter(goal=>goal.status==='active').sort((a,b)=>a.createdAt-b.createdAt||a.name.localeCompare(b.name,'ru'));
  }

  function archivedGoals(state){
    normalizeState(state);
    return state.savingsGoals.filter(goal=>goal.status==='archived').sort((a,b)=>(b.archivedAt||0)-(a.archivedAt||0));
  }

  function progress(goal){
    const target=amount(goal?.targetAmount),saved=amount(goal?.savedAmount);
    return {target,saved,remaining:Math.max(0,Math.round((target-saved)*100)/100),percent:target>EPSILON?Math.min(100,Math.max(0,saved/target*100)):0,completed:target>EPSILON&&saved+EPSILON>=target};
  }

  function summary(state){
    const items=activeGoals(state);
    return items.reduce((result,goal)=>{const view=progress(goal);result.count+=1;result.target+=view.target;result.saved+=view.saved;result.remaining+=view.remaining;return result},{count:0,target:0,saved:0,remaining:0});
  }

  return Object.freeze({EPSILON,normalizeState,createGoal,getGoal,updateGoal,archiveGoal,activeGoals,archivedGoals,progress,summary});
});