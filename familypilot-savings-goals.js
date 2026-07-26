(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FamilyPilotSavingsGoals=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const MAX_AMOUNT=9999999.99;

  function makeId(prefix='id',at=Date.now()){return `${prefix}-${Number(at).toString(36)}-${Math.random().toString(36).slice(2,9)}`}
  function asNumber(value,fallback=0){const number=Number(value);return Number.isFinite(number)?number:fallback}
  function rounded(value){return Math.round((Number(value)||0)*100)/100}
  function revisions(value){return Array.isArray(value)?value:[]}
  function cleanName(value){return String(value||'').trim().replace(/\s+/g,' ')}
  function normalizeDate(value){
    const text=String(value||'').trim();
    if(!text)return null;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(text))return null;
    const parsed=new Date(`${text}T00:00:00Z`);
    return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===text?text:null;
  }
  function normalizeGoal(raw,householdId='household-demo',at=Date.now()){
    const createdAt=asNumber(raw?.createdAt,at),status=raw?.status==='archived'?'archived':'active';
    return{
      id:String(raw?.id||makeId('savings-goal',at)),
      scope:'household',
      householdId:String(raw?.householdId||householdId),
      name:cleanName(raw?.name)||'Цель',
      targetAmount:Math.max(0,rounded(raw?.targetAmount??raw?.target)),
      savedAmount:Math.max(0,rounded(raw?.savedAmount??raw?.saved)),
      targetDate:normalizeDate(raw?.targetDate??raw?.deadline),
      status,
      archivedAt:status==='archived'?asNumber(raw?.archivedAt,raw?.updatedAt||at):null,
      createdAt,
      createdByMemberId:raw?.createdByMemberId||'member-anna',
      updatedAt:asNumber(raw?.updatedAt,createdAt),
      updatedByMemberId:raw?.updatedByMemberId||raw?.createdByMemberId||'member-anna',
      revisions:revisions(raw?.revisions)
    };
  }
  function normalizeState(state,at=Date.now()){
    if(!state||typeof state!=='object')throw new Error('FamilyPilot state is required');
    state.schemaVersion=Math.max(6,asNumber(state.schemaVersion,2));
    const householdId=String(state.household?.id||'household-demo');
    state.savingsGoals=(Array.isArray(state.savingsGoals)?state.savingsGoals:[])
      .filter(item=>item&&typeof item==='object')
      .map(item=>normalizeGoal(item,householdId,at));
    return state;
  }
  function validateInput(input){
    const name=cleanName(input?.name),targetAmount=rounded(asNumber(input?.targetAmount,NaN)),savedAmount=rounded(asNumber(input?.savedAmount,NaN));
    const rawDate=String(input?.targetDate||'').trim(),targetDate=normalizeDate(rawDate);
    if(!name)return{ok:false,error:'Введите название цели.'};
    if(name.length>80)return{ok:false,error:'Название цели должно быть не длиннее 80 символов.'};
    if(!Number.isFinite(targetAmount)||targetAmount<=0||targetAmount>MAX_AMOUNT)return{ok:false,error:'Целевая сумма должна быть от 0,01 до 9 999 999,99.'};
    if(!Number.isFinite(savedAmount)||savedAmount<0||savedAmount>MAX_AMOUNT)return{ok:false,error:'Уже накопленная сумма должна быть от 0 до 9 999 999,99.'};
    if(rawDate&&!targetDate)return{ok:false,error:'Укажите корректную желаемую дату.'};
    return{ok:true,value:{name,targetAmount,savedAmount,targetDate}};
  }
  function revision(goal,changes,actorId='member-anna',at=Date.now(),source='user'){
    const actual=changes.filter(change=>String(change.oldValue??'')!==String(change.newValue??''));
    if(!actual.length)return null;
    const item={id:makeId('savings-goal-rev',at),sequence:revisions(goal.revisions).length+1,changedAt:at,changedByMemberId:actorId,source,changes:actual};
    goal.revisions=revisions(goal.revisions);goal.revisions.push(item);goal.updatedAt=at;goal.updatedByMemberId=actorId;return item;
  }
  function createGoal(state,input,actorId='member-anna',at=Date.now()){
    normalizeState(state,at);const validated=validateInput(input);if(!validated.ok)return validated;
    const goal=normalizeGoal({...validated.value,householdId:state.household?.id,createdAt:at,createdByMemberId:actorId,updatedAt:at,updatedByMemberId:actorId},state.household?.id,at);
    state.savingsGoals.push(goal);return{ok:true,goal};
  }
  function updateGoal(state,goalId,input,actorId='member-anna',at=Date.now()){
    normalizeState(state,at);const goal=state.savingsGoals.find(item=>item.id===goalId);if(!goal)return{ok:false,error:'Цель не найдена.'};
    if(goal.status==='archived')return{ok:false,error:'Архивная цель доступна только для чтения.'};
    const validated=validateInput(input);if(!validated.ok)return validated;
    const changes=Object.entries(validated.value).map(([field,newValue])=>({field,oldValue:goal[field],newValue}));
    revision(goal,changes,actorId,at);Object.assign(goal,validated.value,{updatedAt:at,updatedByMemberId:actorId});return{ok:true,goal};
  }
  function archiveGoal(state,goalId,actorId='member-anna',at=Date.now()){
    normalizeState(state,at);const goal=state.savingsGoals.find(item=>item.id===goalId);if(!goal)return{ok:false,error:'Цель не найдена.'};
    if(goal.status==='archived')return{ok:true,goal,unchanged:true};
    revision(goal,[{field:'status',oldValue:goal.status,newValue:'archived'}],actorId,at,'archive');
    goal.status='archived';goal.archivedAt=at;goal.updatedAt=at;goal.updatedByMemberId=actorId;return{ok:true,goal};
  }
  function activeGoals(state){return(Array.isArray(state?.savingsGoals)?state.savingsGoals:[]).filter(goal=>goal.status==='active').sort((a,b)=>b.updatedAt-a.updatedAt||a.name.localeCompare(b.name,'ru'))}
  function archivedGoals(state){return(Array.isArray(state?.savingsGoals)?state.savingsGoals:[]).filter(goal=>goal.status==='archived').sort((a,b)=>(b.archivedAt||b.updatedAt)-(a.archivedAt||a.updatedAt)||a.name.localeCompare(b.name,'ru'))}
  function progress(goal){const target=Math.max(0,rounded(goal?.targetAmount)),saved=Math.max(0,rounded(goal?.savedAmount)),remaining=Math.max(0,rounded(target-saved)),percent=target?Math.min(100,Math.max(0,saved/target*100)):0;return{target,saved,remaining,percent}}
  function summary(state){return{active:activeGoals(state).length,archived:archivedGoals(state).length,status:'green',optional:true}}

  return Object.freeze({MAX_AMOUNT,normalizeDate,normalizeGoal,normalizeState,validateInput,createGoal,updateGoal,archiveGoal,activeGoals,archivedGoals,progress,summary});
});