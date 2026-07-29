(()=>{
'use strict';
if(window.__FP_PLANNED_INCOME_AMOUNT_MODEL__)return;
const base=window.FamilyPilotPlannedIncome;
if(!base){window.__FP_PLANNED_INCOME_AMOUNT_MODEL_ERROR__='Base planned-income model unavailable';return}
const EPS=.005;
const num=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
function activeOperations(state,id){
  return(state.operations||[]).filter(op=>op.status==='active'&&op.kind==='income'&&op?.links?.plannedIncomeOccurrenceId===id).sort((a,b)=>num(a.occurredAt)-num(b.occurredAt));
}
function summary(state,id){
  const item=(state.plannedIncomeOccurrences||[]).find(entry=>entry.id===id)||null;
  const operations=activeOperations(state,id);
  const expected=num(item?.expectedAmount);
  const received=operations.reduce((sum,operation)=>sum+num(operation.amount),0);
  const remaining=Math.max(0,expected-received);
  const excess=Math.max(0,received-expected);
  const status=!operations.length?'planned':received+EPS>=expected?'received':'partial';
  return{item,operations,expected,received,remaining,shortfall:0,excess,status};
}
function normalizeOperationLink(operation){
  if(!operation?.links?.plannedIncomeOccurrenceId)return operation;
  operation.links.plannedIncomeSettlementMode='amount';
  operation.links.relation='contributes_to_planned_income';
  return operation;
}
function sync(state){
  for(const operation of state.operations||[])normalizeOperationLink(operation);
  for(const item of state.plannedIncomeOccurrences||[]){
    if(item.status==='skipped'){item.status='planned';item.skippedAt=null}
    const data=summary(state,item.id);
    item.status=data.status;
    item.linkedOperationIds=data.operations.map(operation=>operation.id);
    item.receivedAmount=data.received;
    item.receivedAt=data.operations.length?Math.max(...data.operations.map(operation=>num(operation.occurredAt))):null;
  }
  return state;
}
function normalizeState(state,at=Date.now()){
  base.normalizeState(state,at);
  return sync(state);
}
function attach(state,id,operation,options={},actor='member-anna',at=Date.now()){
  const result=base.attach(state,id,operation,{...options,mode:'partial'},actor,at);
  if(result.ok){normalizeOperationLink(result.operation);sync(state);result.summary=summary(state,id)}
  return result;
}
function createOperation(state,id,amount,options={},actor='member-anna',at=Date.now()){
  const result=base.createOperation(state,id,amount,{...options,mode:'partial'},actor,at);
  if(result.ok){normalizeOperationLink(result.operation);sync(state);result.summary=summary(state,id)}
  return result;
}
function detach(state,id,operationId,options={},actor='member-anna',at=Date.now()){
  const result=base.detach(state,id,operationId,options,actor,at);
  sync(state);
  result.summary=summary(state,id);
  return result;
}
function clearAll(state,id,options={},actor='member-anna',at=Date.now()){
  const result=base.clearAll(state,id,options,actor,at);
  sync(state);
  result.summary=summary(state,id);
  return result;
}
function skip(){return{ok:false,error:'Плановый приход не закрывается вручную. Если поступления нет, запись со временем переходит в историю.'}}
function unskip(state,id){
  const item=(state.plannedIncomeOccurrences||[]).find(entry=>entry.id===id);
  if(!item)return{ok:false,error:'Плановый приход не найден.'};
  item.status='planned';item.skippedAt=null;sync(state);
  return{ok:true,occurrence:item};
}
function displayStatus(state,item,at=Date.now()){
  const data=summary(state,item.id);
  if(data.status==='received')return'received';
  if(data.status==='partial')return'partial';
  const today=new Date(at);today.setHours(0,0,0,0);
  const due=new Date(item.dueAt);due.setHours(0,0,0,0);
  if(due.getTime()<today.getTime())return'overdue';
  if(due.getTime()===today.getTime())return'due';
  return'planned';
}
const api=Object.freeze({...base,activeOperations,summary,sync,normalizeState,attach,createOperation,detach,clearAll,skip,unskip,displayStatus});
window.FamilyPilotPlannedIncome=api;
const runtime=window.__FP_RUNTIME__;
if(runtime?.toast&&!window.__FP_PLANNED_INCOME_AMOUNT_TOAST_PATCHED__){
  const descriptor=Object.getOwnPropertyDescriptor(runtime,'toast');
  if(descriptor&&(descriptor.writable||descriptor.set)){
    const original=runtime.toast.bind(runtime);
    runtime.toast=message=>original(message==='Приход отмечен полученным.'||message==='Частичный приход добавлен.'?'Поступление записано.':message);
  }
  window.__FP_PLANNED_INCOME_AMOUNT_TOAST_PATCHED__=true;
}
window.__FP_PLANNED_INCOME_AMOUNT_MODEL__=true;
window.__FP_M4_02_AMOUNT_MODEL_READY__=true;
})();