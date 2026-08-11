const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..'),indexPath=path.join(root,'index.html'),mirrorPath=path.join(root,'src','familypilot.html'),m302UiPath=path.join(root,'familypilot-obligations-ui-v2.js'),index=fs.readFileSync(indexPath,'utf8'),m302Ui=fs.readFileSync(m302UiPath,'utf8');
const stage=process.argv.find(argument=>argument.startsWith('--stage='));
if(stage!=='--stage=r3b'){
  console.error('p4d3b_incomplete_remaining_legacy_families');
  process.exitCode=1;
  return;
}
const clone=value=>JSON.parse(JSON.stringify(value)),same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
function extractProductionFunction(name){
  const expression=new RegExp(`\\b(?:async\\s+)?function\\s+${name}\\s*\\(`,'g'),starts=[];
  for(let match;(match=expression.exec(index));)starts.push(match.index);
  assert.equal(starts.length,1,`exactly one active production definition for ${name} is required`);
  const start=starts[0],signatureStart=index.indexOf('(',start);
  let parameters=0,bodyStart=-1;
  for(let cursor=signatureStart;cursor<index.length;cursor++){
    if(index[cursor]==='(')parameters++;
    if(index[cursor]===')'&&--parameters===0){bodyStart=index.indexOf('{',cursor);break}
  }
  assert(bodyStart>=0,`${name} production body is present`);
  let depth=0;
  for(let cursor=bodyStart;cursor<index.length;cursor++){
    if(index[cursor]==='{')depth++;
    if(index[cursor]==='}'&&--depth===0)return index.slice(start,cursor+1);
  }
  assert.fail(`${name} production source is unterminated`);
}
function extractEffectiveM302Function(name){
  const expression=new RegExp(`\\b${name}\\s*=\\s*(?:async\\s+)?function\\s*\\(`,'g'),starts=[];
  for(let match;(match=expression.exec(m302Ui));)starts.push(match.index);
  assert.equal(starts.length,1,`exactly one effective M3-02 definition for ${name} is required`);
  const start=starts[0],functionStart=m302Ui.indexOf('function',start),signatureStart=m302Ui.indexOf('(',functionStart);
  let parameters=0,bodyStart=-1;
  for(let cursor=signatureStart;cursor<m302Ui.length;cursor++){
    if(m302Ui[cursor]==='(')parameters++;
    if(m302Ui[cursor]===')'&&--parameters===0){bodyStart=m302Ui.indexOf('{',cursor);break}
  }
  assert(bodyStart>=0,`${name} effective M3-02 body is present`);
  let depth=0;
  for(let cursor=bodyStart;cursor<m302Ui.length;cursor++){
    if(m302Ui[cursor]==='{')depth++;
    if(m302Ui[cursor]==='}'&&--depth===0)return `async function ${name}${m302Ui.slice(signatureStart,cursor+1)}`;
  }
  assert.fail(`${name} effective M3-02 source is unterminated`);
}
const production=Object.fromEntries(['performCanonicalUiMutation','revisionBatch','revision','applyOperationMutation','saveOperation','createCategory','setTrashRetentionEnabled','setCurrentActor','setActiveWallet','saveObligationRule','saveObligationPayment','saveObligationPostpone','skipObligationOccurrence'].map(name=>[name,extractProductionFunction(name)]));
const effectiveM302=Object.fromEntries(['saveObligationRule','saveObligationPayment','saveObligationPostpone'].map(name=>[name,extractEffectiveM302Function(name)]));
function fixture(){return{operations:[],categories:[{id:'cat-exp',kind:'expense',name:'Еда',normalizedName:'еда',createdByMemberId:'m1',createdAt:1,lastEditedByMemberId:'m1',lastEditedAt:1,archivedAt:null,history:[]}],wallets:[{id:'w1',name:'Основной'},{id:'w2',name:'Личный'}],config:{allowFutureActualOperations:false,trashRetentionEnabled:false,quickCategoryIds:{income:[],expense:[]}},currentMemberId:'m1',activeWalletId:'w1'}}
function harness(initial=fixture()){
  const nodes={},ui={close:0,render:0,toasts:[]};
  for(const id of ['amountInput','amountCalculation','entryError','dateInput','editingId','noteInput','categoryInput','saveOperationBtn'])nodes[id]={value:'',textContent:'',disabled:false,classList:{toggle(){}}};
  let serial=0;
  const context={
    state:clone(initial),canonicalUiMutationPending:false,COMMENT_MAX:1000,editKind:'expense',MEMBERS:[{id:'m1',name:'Анна'},{id:'m2',name:'Борис'}],
    $:id=>nodes[id]||(nodes[id]={value:'',textContent:'',disabled:false,classList:{toggle(){}}}),
    now:()=>1700000000000,uid:prefix=>`${prefix}-${++serial}`,sameMeaning:(field,left,right)=>same(left,right),
    updateAmountCalculation:()=>({value:12.5}),isoLocal:value=>new Date(value).toISOString().slice(0,16),
    cleanCategoryName:value=>String(value||'').trim().replace(/\s+/g,' '),categoryNameLength:value=>Array.from(String(value||'')).length,normalizeName:value=>String(value||'').trim().toLowerCase(),CATEGORY_NAME_MAX:50,
    memberName:id=>id==='m2'?'Борис':'Анна',close:()=>{ui.close++},renderAll:()=>{ui.render++},toast:message=>{ui.toasts.push(message)},
    scopeWallet:()=>context.state.wallets.find(wallet=>wallet.id===context.state.activeWalletId),
    scopeApi:{activeWallet:draft=>draft.wallets.find(wallet=>wallet.id===draft.activeWalletId),accessibleWallets:draft=>draft.wallets},
    console,JSON,Date,Promise,setTimeout,queueMicrotask
  };
  vm.createContext(context);
  vm.runInContext(`let canonicalUiMutationPending=false;\n${Object.values(production).join('\n')}`,context);
  return{context,nodes,ui};
}
function installCommit(test,{held=false,result={ok:true}}={}){
  let release,commits=0,writes=0;
  const gate=held?new Promise(resolve=>{release=resolve}):null;
  test.context.commitCanonicalMutation=async mutator=>{
    commits++;
    const before=clone(test.context.state),candidate=clone(before);
    mutator(candidate);
    const response=held?await gate:result;
    if(!response.ok)return response;
    if(!same(before,candidate)){writes++;test.context.state=candidate;return{ok:true,status:'authoritative_mutation_applied'}}
    return{ok:true,status:'authoritative_mutation_noop'};
  };
  return{release:value=>release(value),get commits(){return commits},get writes(){return writes}};
}
function prepareOperationForm(test,{id='',amount='12.5',date='2023-11-14T22:13',categoryId='cat-exp',note='R3A'}={}){
  Object.assign(test.nodes.amountInput,{value:amount});
  Object.assign(test.nodes.editingId,{value:id});
  Object.assign(test.nodes.dateInput,{value:date});
  Object.assign(test.nodes.categoryInput,{value:categoryId});
  Object.assign(test.nodes.noteInput,{value:note});
}
async function saveOperationProof(){
  const held=harness(),commit=installCommit(held,{held:true});prepareOperationForm(held);
  const first=held.context.saveOperation();await Promise.resolve();
  assert.equal(commit.commits,1,'actual saveOperation issues one canonical commit');
  assert.equal(held.context.state.operations.length,0,'saveOperation leaves live operations unchanged while held');
  assert.equal(held.ui.close,0,'saveOperation does not close modal while held');assert.equal(held.ui.toasts.length,0,'saveOperation has no success toast while held');assert.equal(held.ui.render,0,'saveOperation has no success render while held');assert.equal(held.nodes.saveOperationBtn.disabled,true,'actual save button is guarded while pending');
  await held.context.saveOperation();
  assert.equal(commit.commits,1,'second actual saveOperation has no queued canonical commit');assert.equal(held.ui.close,0,'second actual saveOperation has no success UI');
  commit.release({ok:true});await first;
  assert.equal(held.context.state.operations.length,1,'actual saveOperation adopts exactly one operation after success');assert.equal(held.context.state.operations[0].note,'R3A');assert.equal(held.ui.close,1);assert.equal(held.ui.render,1);assert.equal(held.ui.toasts.length,1);assert.equal(held.nodes.saveOperationBtn.disabled,false);

  const failed=harness(),failedCommit=installCommit(failed,{result:{ok:false,error:'held_failure'}});prepareOperationForm(failed);await failed.context.saveOperation();
  assert.equal(failedCommit.commits,1);assert.equal(failedCommit.writes,0);assert.equal(failed.context.state.operations.length,0,'failed saveOperation has no local fallback');assert.equal(failed.ui.close,0);assert.equal(failed.ui.toasts.length,0);assert.equal(failed.ui.render,0);assert.match(failed.nodes.entryError.textContent,/Не удалось сохранить операцию/,'saveOperation surfaces failure through its existing error node');

  const rawDate='2023-11-14T22:13',existing={id:'op-existing',amount:12.5,occurredAt:new Date(rawDate).getTime(),categoryId:'cat-exp',walletId:'w1',note:'R3A',kind:'expense',createdByMemberId:'m1',createdAt:1,lastEditedByMemberId:'m1',lastEditedAt:1,revisions:[],status:'active',deletedAt:null,deletedByMemberId:null,trashExpiresAt:null,receipt:null,links:{},transferGroupId:null};
  const noop=harness({...fixture(),operations:[existing]}),noopCommit=installCommit(noop,{held:true});prepareOperationForm(noop,{id:'op-existing',date:rawDate});const pending=noop.context.saveOperation();await Promise.resolve();assert.equal(noop.ui.toasts.length,0,'no-op feedback waits for the canonical result');noopCommit.release({ok:true});await pending;assert.equal(noopCommit.writes,0,'unchanged saveOperation produces zero canonical state writes');assert.equal(noop.ui.close,0);assert.equal(noop.ui.render,0);assert.deepEqual(noop.ui.toasts,['Изменений нет']);
}
async function categoryProof(){
  const held=harness(),commit=installCommit(held,{held:true}),pending=held.context.createCategory('expense','Транспорт');await Promise.resolve();
  assert.equal(commit.commits,1);assert.equal(held.context.state.categories.length,1,'actual category action leaves live categories unchanged while held');assert.equal(held.ui.render,0,'actual category action has no success render while held');commit.release({ok:true});const result=await pending;assert(result.ok);assert.equal(held.context.state.categories.filter(category=>category.name==='Транспорт').length,1);assert.equal(held.ui.render,1);
  const failed=harness(),failedCommit=installCommit(failed,{result:{ok:false,error:'held_failure'}}),failure=await failed.context.createCategory('expense','Транспорт');assert.equal(failure.error,'held_failure');assert.equal(failedCommit.writes,0);assert.equal(failed.context.state.categories.length,1,'failed category action has no fallback');assert.equal(failed.ui.render,0);
}
async function heldWrapperProof(name,invoke,read,expected){
  const test=harness(),commit=installCommit(test,{held:true}),pending=invoke(test.context);await Promise.resolve();assert.equal(read(test.context),expected.before,`${name} remains live-unchanged while held`);commit.release({ok:true});const result=await pending;assert(result.ok);assert.equal(read(test.context),expected.after,`${name} updates only after successful commit`);assert.equal(commit.writes,1);
}
async function wrapperProofs(){
  await heldWrapperProof('setTrashRetentionEnabled',context=>context.setTrashRetentionEnabled(true),context=>context.state.config.trashRetentionEnabled,{before:false,after:true});
  await heldWrapperProof('setCurrentActor',context=>context.setCurrentActor('m2'),context=>context.state.currentMemberId,{before:'m1',after:'m2'});
  await heldWrapperProof('setActiveWallet',context=>context.setActiveWallet('w2'),context=>context.state.activeWalletId,{before:'w1',after:'w2'});
}
function obligationFixture(){return{schemaVersion:4,household:{id:'household-1',baseCurrency:'EUR'},operations:[],obligationRules:[],obligationOccurrences:[],categories:[{id:'cat-exp',kind:'expense',name:'Еда'}],wallets:[{id:'w1',name:'Основной',nativeCurrency:'EUR'}],config:{},currentMemberId:'m1',activeWalletId:'w1'}}
function obligationHarness(initial=obligationFixture(),functions=production){
  const nodes={},ui={close:0,render:0,screen:[],toasts:[],alerts:[]};
  for(const id of ['obligationAmount','obligationWallet','obligationName','obligationDueDate','obligationCadence','obligationIntervalValue','obligationIntervalUnit','obligationEndingMode','obligationPaymentCount','obligationEndingDate','obligationCategory','obligationNote','obligationRuleError','obligationRuleSave','obligationPayDate','obligationPayAmount','obligationPayWallet','obligationPayCategory','obligationPayNote','obligationPayError','obligationPaySave','obligationPostponeDate','obligationPostponeError','obligationPostponeSave','obligationSkipBtn'])nodes[id]={value:'',textContent:'',disabled:false};
  const context={state:clone(initial),obligationEditingRuleId:'',obligationActionOccurrenceId:'',obligationDetailId:'',paymentCorrectionMode:false,$:id=>nodes[id]||(nodes[id]={value:'',textContent:'',disabled:false}),now:()=>1700000000000,wallet:id=>context.state.wallets.find(item=>item.id===id),dateFromInput:value=>new Date(`${value}T00:00:00`).getTime(),dateInputValue:value=>new Date(value).toISOString().slice(0,10),close:()=>{ui.close++},renderAll:()=>{ui.render++},showScreen:screen=>{ui.screen.push(screen)},toast:message=>{ui.toasts.push(message)},alert:message=>{ui.alerts.push(message)},confirm:()=>true,console,JSON,Date,Promise,setTimeout,queueMicrotask};
  vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'familypilot-obligations.js'),'utf8'),context);vm.runInContext(`const obligationApi=FamilyPilotObligations,api=FamilyPilotObligations;\n${Object.values(functions).join('\n')}`,context);
  return{context,nodes,ui};
}
function installObligationCommit(test,{held=false,result={ok:true}}={}){
  let release,commits=0,writes=0;const gate=held?new Promise(resolve=>{release=resolve}):null;
  test.context.performCanonicalUiMutation=async({mutator,onSuccess,busyElement})=>{commits++;if(busyElement)busyElement.disabled=true;const before=clone(test.context.state),candidate=clone(before);mutator(candidate);if(same(before,candidate)){if(busyElement)busyElement.disabled=false;return{ok:true,status:'authoritative_mutation_noop'}}const response=held?await gate:result;if(busyElement)busyElement.disabled=false;if(!response.ok)return response;writes++;test.context.state=candidate;onSuccess?.();return{ok:true,status:'authoritative_mutation_applied'}};
  return{release:value=>release(value),get commits(){return commits},get writes(){return writes}};
}
function prepareObligationRule(test){Object.assign(test.nodes.obligationAmount,{value:'42.50'});Object.assign(test.nodes.obligationWallet,{value:'w1'});Object.assign(test.nodes.obligationName,{value:'Аренда'});Object.assign(test.nodes.obligationDueDate,{value:'2023-11-15'});Object.assign(test.nodes.obligationCadence,{value:'once'});Object.assign(test.nodes.obligationIntervalValue,{value:'1'});Object.assign(test.nodes.obligationIntervalUnit,{value:'month'});Object.assign(test.nodes.obligationEndingMode,{value:'unlimited'});Object.assign(test.nodes.obligationPaymentCount,{value:'12'});Object.assign(test.nodes.obligationEndingDate,{value:''});Object.assign(test.nodes.obligationCategory,{value:'cat-exp'});Object.assign(test.nodes.obligationNote,{value:'R3B'})}
function seededObligation(){const test=obligationHarness();prepareObligationRule(test);const result=test.context.FamilyPilotObligations.createRule(test.context.state,{name:'Аренда',amount:42.5,dueAt:1700000000000,cadence:'once',walletId:'w1',categoryId:'cat-exp',currency:'EUR',note:'R3B'},'m1',1700000000000);assert(result.ok);return test.context.state}
async function obligationProof(){
  const rule=obligationHarness(obligationFixture(),effectiveM302),ruleCommit=installObligationCommit(rule,{held:true});prepareObligationRule(rule);const pendingRule=rule.context.saveObligationRule();await Promise.resolve();assert.equal(ruleCommit.commits,1);assert.equal(rule.context.state.obligationRules.length,0,'effective M3-02 rule save keeps live obligations unchanged while held');assert.equal(rule.ui.close,0);assert.equal(rule.ui.render,0);assert.equal(rule.nodes.obligationRuleSave.disabled,true);ruleCommit.release({ok:true});const created=await pendingRule;assert(created.ok);assert.equal(rule.context.state.obligationRules.length,1);assert.equal(rule.ui.close,1);assert.equal(rule.ui.render,1);assert.deepEqual(rule.ui.screen,['obligations']);
  const updated=obligationHarness(seededObligation(),effectiveM302),updateCommit=installObligationCommit(updated,{held:true}),ruleId=updated.context.state.obligationRules[0].id;updated.context.obligationEditingRuleId=ruleId;prepareObligationRule(updated);updated.nodes.obligationName.value='Аренда R3B';const pendingUpdate=updated.context.saveObligationRule();await Promise.resolve();assert.equal(updated.context.state.obligationRules[0].name,'Аренда','effective M3-02 rule edit keeps live obligation unchanged while held');assert.equal(updated.ui.close,0);updateCommit.release({ok:true});const updatedResult=await pendingUpdate;assert(updatedResult.ok);assert.equal(updated.context.state.obligationRules[0].name,'Аренда R3B');assert.equal(updated.ui.toasts.at(-1),'Обязательство обновлено');
  const payment=obligationHarness(seededObligation(),effectiveM302),paymentCommit=installObligationCommit(payment,{held:true}),paymentId=payment.context.state.obligationOccurrences[0].id;payment.context.obligationActionOccurrenceId=paymentId;Object.assign(payment.nodes.obligationPayAmount,{value:'42.50'});Object.assign(payment.nodes.obligationPayDate,{value:payment.context.dateInputValue(payment.context.now())});Object.assign(payment.nodes.obligationPayWallet,{value:'w1'});Object.assign(payment.nodes.obligationPayCategory,{value:'cat-exp'});Object.assign(payment.nodes.obligationPayNote,{value:'R3B'});const pendingPayment=payment.context.saveObligationPayment();await Promise.resolve();assert.equal(paymentCommit.commits,1);assert.equal(payment.context.state.operations.length,0,'effective M3-02 payment leaves linked operation unchanged while held');assert.equal(payment.context.state.obligationOccurrences[0].status,'planned');assert.equal(payment.ui.close,0);assert.equal(payment.nodes.obligationPaySave.disabled,true);paymentCommit.release({ok:true});const paid=await pendingPayment;assert(paid.ok);assert.equal(payment.context.state.operations.length,1);assert.equal(payment.context.state.obligationOccurrences[0].status,'paid');assert.equal(payment.ui.close,1);assert.equal(payment.ui.toasts.at(-1),'Оплата сохранена как связанный расход');
  const postponed=obligationHarness(seededObligation(),effectiveM302),postponeCommit=installObligationCommit(postponed,{held:true}),postponeId=postponed.context.state.obligationOccurrences[0].id,beforeDue=postponed.context.state.obligationOccurrences[0].dueAt;postponed.context.obligationActionOccurrenceId=postponeId;Object.assign(postponed.nodes.obligationPostponeDate,{value:'2023-11-20'});const pendingPostpone=postponed.context.saveObligationPostpone();await Promise.resolve();assert.equal(postponed.context.state.obligationOccurrences[0].dueAt,beforeDue,'effective M3-02 postpone leaves live obligation unchanged while held');assert.equal(postponed.ui.close,0);postponeCommit.release({ok:true});const postponedResult=await pendingPostpone;assert(postponedResult.ok);assert.notEqual(postponed.context.state.obligationOccurrences[0].dueAt,beforeDue);assert.equal(postponed.ui.toasts.at(-1),'Изменена только дата этого платежа');
  const failed=obligationHarness(seededObligation(),effectiveM302),failedCommit=installObligationCommit(failed,{result:{ok:false,error:'held_failure'}}),failedId=failed.context.state.obligationOccurrences[0].id;failed.context.obligationActionOccurrenceId=failedId;Object.assign(failed.nodes.obligationPayAmount,{value:'42.50'});Object.assign(failed.nodes.obligationPayDate,{value:failed.context.dateInputValue(failed.context.now())});Object.assign(failed.nodes.obligationPayWallet,{value:'w1'});Object.assign(failed.nodes.obligationPayCategory,{value:'cat-exp'});const failedResult=await failed.context.saveObligationPayment();assert.equal(failedResult.error,'held_failure');assert.equal(failedCommit.writes,0);assert.equal(failed.context.state.operations.length,0,'failed effective M3-02 payment has no local fallback');assert.match(failed.nodes.obligationPayError.textContent,/Не удалось сохранить оплату/);
}
async function main(){
  assert(fs.readFileSync(indexPath).equals(fs.readFileSync(mirrorPath)),'root/mirror source bytes are identical');
  assert(index.includes('const P4D3B_INTEGRATION_COMPLETE=false;'),'intermediate integration guard is explicit');
  const activation=index.indexOf('activateAuthoritative:async input=>'),guard=index.indexOf("if(!P4D3B_INTEGRATION_COMPLETE)return{ok:false,error:'p4d3b_integration_incomplete'};",activation),gateway=index.indexOf('createGateway',activation);
  assert(activation>=0&&guard>activation&&gateway>guard,'remote activation fails closed before gateway creation');
  assert(index.includes("permanentDelete:async()=>({ok:false,error:'permanent_delete_unavailable_in_r3a'})"),'test permanent delete is disabled');assert(!index.includes('state = draft'),'draft is never assigned to live state');
  for(const name of ['saveObligationRule','saveObligationPayment','saveObligationPostpone','skipObligationOccurrence']){assert.match(production[name],/performCanonicalUiMutation/);assert(!production[name].includes('(state,'),`${name} does not pass live state to the obligation domain API`)}
  for(const name of ['saveObligationRule','saveObligationPayment','saveObligationPostpone']){assert.match(effectiveM302[name],/performCanonicalUiMutation/);assert(!effectiveM302[name].includes('(state,'),`effective M3-02 ${name} does not pass live state to the obligation domain API`)}
  await saveOperationProof();await categoryProof();await wrapperProofs();await obligationProof();
  console.log('FP85_P4D3B_R3B_OBLIGATIONS_UI_MUTATION_PASS');
}
main().catch(error=>{console.error(error.stack||error);process.exitCode=1});
