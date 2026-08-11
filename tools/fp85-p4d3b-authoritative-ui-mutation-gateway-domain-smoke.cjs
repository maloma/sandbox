const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..'),index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const stage=process.argv.find(argument=>argument.startsWith('--stage='));
if(stage!=='--stage=r3a'){
  console.error('p4d3b_incomplete_remaining_legacy_families');
  process.exitCode=1;
  return;
}
function productionHelper(commit){
  const match=index.match(/async function performCanonicalUiMutation\([^]*?\nconst captureLegacyCanonicalMutation/);
  assert(match,'production canonical UI helper is present');
  const source=`let canonicalUiMutationPending=false;\n${match[0].replace(/\nconst captureLegacyCanonicalMutation[^]*/,'')}`;
  const context={commitCanonicalMutation:commit};
  vm.createContext(context);
  vm.runInContext(source,context);
  return context.performCanonicalUiMutation;
}
async function heldCommitProof(){
  let release,adopted={operations:[]},success=0,closeCount=0,toastCount=0,commits=0;
  const gate=new Promise(resolve=>{release=resolve});
  const helper=productionHelper(async mutator=>{
    commits++;
    const candidate=JSON.parse(JSON.stringify(adopted));
    mutator(candidate);
    const result=await gate;
    if(!result.ok)return result;
    adopted=candidate;
    return result;
  });
  const first=helper({mutator:draft=>draft.operations.push({id:'op-r3a'}),onSuccess:()=>{success++;closeCount++;toastCount++;}});
  await Promise.resolve();
  assert.deepEqual(adopted.operations,[],'live canonical state is unchanged while held');
  assert.equal(success,0,'success UI is not run while held');
  const second=await helper({mutator:draft=>draft.operations.push({id:'queued'})});
  assert.equal(second.error,'canonical_ui_mutation_in_progress','second action is rejected without a queue');
  assert.equal(commits,1,'one canonical mutation is issued while pending');
  release({ok:true});
  assert((await first).ok);
  assert.equal(adopted.operations.length,1);
  assert.equal(success,1);assert.equal(closeCount,1);assert.equal(toastCount,1);
  let failed={categories:[]},failedSuccess=0;
  const failureHelper=productionHelper(async mutator=>{const candidate=JSON.parse(JSON.stringify(failed));mutator(candidate);return{ok:false,error:'held_failure'};});
  const failure=await failureHelper({mutator:draft=>draft.categories.push({id:'cat-r3a'}),onSuccess:()=>{failedSuccess++;}});
  assert.equal(failure.error,'held_failure');assert.deepEqual(failed.categories,[]);assert.equal(failedSuccess,0,'failure has no success UI');
}
async function main(){
  assert(index.includes('const P4D3B_INTEGRATION_COMPLETE=false;'),'intermediate integration guard is explicit');
  const activation=index.indexOf('activateAuthoritative:async input=>'),guard=index.indexOf("if(!P4D3B_INTEGRATION_COMPLETE)return{ok:false,error:'p4d3b_integration_incomplete'};",activation),gateway=index.indexOf('createGateway',activation);
  assert(activation>=0&&guard>activation&&gateway>guard,'remote activation fails closed before gateway creation');
  for(const name of ['saveOperation','toggleQuickCategory','createCategory','renameCategory','deleteCategory','archiveCategory','mergeCategory','setCurrentActor','setActiveWallet','setTrashRetentionEnabled'])assert(index.includes(`function ${name}`)||index.includes(`function ${name}(`),`${name} production path exists`);
  assert(index.includes('applyOperationMutation(targetState,input)'),'operation mutation accepts explicit target state');
  assert(index.includes('revisionBatch(targetState,op'),'revision helper accepts explicit target state');
  assert(index.includes("permanentDelete:async()=>({ok:false,error:'permanent_delete_unavailable_in_r3a'})"),'test permanent delete is disabled');
  assert(!index.includes('state = draft'),'draft is never assigned to live state');
  await heldCommitProof();
  console.log('FP85_P4D3B_R3A_CORE_UI_MUTATION_PASS');
}
main().catch(error=>{console.error(error.stack||error);process.exitCode=1});
