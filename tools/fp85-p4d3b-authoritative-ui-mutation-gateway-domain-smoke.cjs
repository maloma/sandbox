const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..'),indexPath=path.join(root,'index.html'),mirrorPath=path.join(root,'src','familypilot.html'),index=fs.readFileSync(indexPath,'utf8');
const stage=process.argv.find(argument=>argument.startsWith('--stage='));
if(stage!=='--stage=r3a'){
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
const production=Object.fromEntries(['performCanonicalUiMutation','revisionBatch','revision','applyOperationMutation','saveOperation','createCategory','setTrashRetentionEnabled','setCurrentActor','setActiveWallet'].map(name=>[name,extractProductionFunction(name)]));
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
async function main(){
  assert(fs.readFileSync(indexPath).equals(fs.readFileSync(mirrorPath)),'root/mirror source bytes are identical');
  assert(index.includes('const P4D3B_INTEGRATION_COMPLETE=false;'),'intermediate integration guard is explicit');
  const activation=index.indexOf('activateAuthoritative:async input=>'),guard=index.indexOf("if(!P4D3B_INTEGRATION_COMPLETE)return{ok:false,error:'p4d3b_integration_incomplete'};",activation),gateway=index.indexOf('createGateway',activation);
  assert(activation>=0&&guard>activation&&gateway>guard,'remote activation fails closed before gateway creation');
  assert(index.includes("permanentDelete:async()=>({ok:false,error:'permanent_delete_unavailable_in_r3a'})"),'test permanent delete is disabled');assert(!index.includes('state = draft'),'draft is never assigned to live state');
  await saveOperationProof();await categoryProof();await wrapperProofs();
  console.log('FP85_P4D3B_R3A_CORE_UI_MUTATION_PASS');
}
main().catch(error=>{console.error(error.stack||error);process.exitCode=1});
