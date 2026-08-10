const assert=require('assert');
const childProcess=require('child_process');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const {webcrypto}=require('crypto');

const root=path.join(__dirname,'..');
const migration=fs.readFileSync(path.join(root,'supabase/migrations/20260810_fp85_p4b_remote_state.sql'),'utf8');
const transportSource=fs.readFileSync(path.join(root,'familypilot-supabase-transport.js'),'utf8');
const scopeSource=fs.readFileSync(path.join(root,'familypilot-scope.js'),'utf8');
const adapterSource=fs.readFileSync(path.join(root,'familypilot-production-persistence-adapter.js'),'utf8');

class Storage{constructor(){this.data=new Map()}getItem(key){return this.data.get(String(key))??null}setItem(key,value){this.data.set(String(key),String(value))}removeItem(key){this.data.delete(String(key))}clear(){this.data.clear()}key(index){return[...this.data.keys()][index]??null}get length(){return this.data.size}}
function clone(value){return JSON.parse(JSON.stringify(value))}
function response(status,body){return{status,ok:status>=200&&status<300,json:async()=>clone(body)}}
function state(id='household-1'){return{schemaVersion:22,household:{id,name:'Žofia',baseCurrency:'EUR'},currentMemberId:'member-1',wallets:[],operations:[],walletMovements:[],transfers:[],purposeAllocations:[],savingsTransfers:[],obligationRules:[],obligationOccurrences:[]}}
function load(fetchImpl){
  const context={console,TextEncoder,URL,URLSearchParams,localStorage:new Storage(),location:{search:'?test=1&persistenceTest=p4b'},crypto:webcrypto,fetch:fetchImpl};
  context.window=context;context.globalThis=context;vm.createContext(context);
  vm.runInContext(scopeSource,context);vm.runInContext(adapterSource,context);vm.runInContext(transportSource,context);
  return context;
}
function snake(row){return{household_id:row.householdId,revision:row.revision,state_schema_version:row.stateSchemaVersion,payload:row.payload,payload_sha256:row.payloadSha256,updated_at:row.updatedAt,updated_by:row.updatedBy}}
class FakeSupabase{
  constructor(){this.rows=new Map();this.calls=[];this.status=200;this.throwNetwork=false;this.malformed=false}
  async fetch(url,init){
    this.calls.push({url,init:clone({...init,headers:init.headers})});
    if(this.throwNetwork)throw new Error('network');
    if(this.status!==200)return response(this.status,{code:'blocked'});
    const parsed=new URL(url);
    if(parsed.pathname==='/rest/v1/familypilot_remote_state'){
      if(this.malformed)return response(200,{not:'an array'});
      const filter=parsed.searchParams.get('household_id');
      const householdId=filter&&filter.startsWith('eq.')?filter.slice(3):null;
      return response(200,householdId&&this.rows.has(householdId)?[snake(this.rows.get(householdId))]:[]);
    }
    if(parsed.pathname==='/rest/v1/rpc/familypilot_compare_and_swap_state'){
      if(this.malformed)return response(200,{ok:true,row:{revision:1}});
      const input=JSON.parse(init.body),current=this.rows.get(input.p_household_id),currentRevision=current?current.revision:0;
      if(currentRevision!==input.p_expected_revision)return response(200,{ok:false,error:'revision_conflict',currentRevision});
      const row={householdId:input.p_household_id,revision:input.p_revision,stateSchemaVersion:input.p_state_schema_version,payload:input.p_payload,payloadSha256:input.p_payload_sha256,updatedAt:input.p_updated_at,updatedBy:input.p_updated_by};
      this.rows.set(row.householdId,row);return response(200,{ok:true,row:snake(row)});
    }
    return response(404,{});
  }
}
function persistence(p,tracker){return{CURRENT_STATE_SCHEMA_VERSION:p.CURRENT_STATE_SCHEMA_VERSION,canonicalSerialize:p.canonicalSerialize,structuralValidate:p.structuralValidate,isRecoveryLocked:()=>false,commitState:value=>{tracker.writes++;return p.commitState(value)}}}
function makeTransport(context,fake,token=async()=> 'user-jwt'){return context.FamilyPilotSupabaseTransport.createTransport({projectUrl:'https://example.supabase.co',publishableKey:'sb_publishable_testKey123',getAccessToken:token,fetchImpl:fake.fetch.bind(fake)})}

async function main(){
  // Backend contract assertions: public reads are RLS-scoped and authoritative writes only use the guarded RPC.
  assert(/create table public\.familypilot_household_access/i.test(migration));
  assert(/create table public\.familypilot_remote_state/i.test(migration));
  assert(/alter table public\.familypilot_household_access enable row level security/i.test(migration));
  assert(/alter table public\.familypilot_remote_state enable row level security/i.test(migration));
  assert(/user_id uuid not null references auth\.users\(id\) on delete cascade/i.test(migration));
  assert((migration.match(/auth\.uid\(\)/g)||[]).length>=3);
  assert(/familypilot_remote_state[\s\S]*?for select[\s\S]*?familypilot_household_access[\s\S]*?auth\.uid\(\)/i.test(migration));
  assert(/revoke all on table public\.familypilot_remote_state from anon, authenticated/i.test(migration));
  assert(!/grant\s+(insert|update|delete|all)\s+on\s+table\s+public\.familypilot_remote_state\s+to\s+(anon|authenticated)/i.test(migration));
  assert(/create or replace function public\.familypilot_compare_and_swap_state/i.test(migration));
  assert(/from public\.familypilot_household_access as access_row[\s\S]*?access_row\.user_id = auth\.uid\(\)/i.test(migration));
  assert(/where household_id = p_household_id\s+and revision = p_expected_revision/i.test(migration));
  assert(/on conflict \(household_id\) do nothing/i.test(migration));
  assert(/'error', 'revision_conflict'/i.test(migration));
  assert(!/do update|upsert|last.write.wins/i.test(migration));
  assert(/revoke all on function[\s\S]*?from public/i.test(migration));
  assert(/revoke all on function[\s\S]*?from anon/i.test(migration));
  assert(/grant execute on function[\s\S]*?to authenticated/i.test(migration));
  assert(/security definer\s+set search_path = ''/i.test(migration));
  assert(!/create table public\.familypilot_(?!household_access|remote_state)/i.test(migration));

  const fake=new FakeSupabase(),context=load(fake.fetch.bind(fake)),module=context.FamilyPilotSupabaseTransport;
  assert(module&&Object.isFrozen(module)&&typeof module.createTransport==='function');
  const invalidKeys=['','publishable-test-key','sb_secret_testSecret123','service_role_testKey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature','eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.signature','sb_publishable_'];
  for(const publishableKey of invalidKeys){const callsBefore=fake.calls.length;assert.throws(()=>module.createTransport({projectUrl:'https://example.supabase.co',publishableKey,getAccessToken:async()=> 'user-jwt',fetchImpl:fake.fetch.bind(fake)}),/invalid_transport_configuration/);assert.strictEqual(fake.calls.length,callsBefore,'invalid API keys make zero provider requests')}
  for(const projectUrl of ['http://example.supabase.co','https://evil.example.com','https://example.supabase.co/path','https://example.supabase.co/?query=1','https://example.supabase.co/#hash','https://user:password@example.supabase.co']){const callsBefore=fake.calls.length;assert.throws(()=>module.createTransport({projectUrl,publishableKey:'sb_publishable_testKey123',getAccessToken:async()=> 'user-jwt',fetchImpl:fake.fetch.bind(fake)}),/invalid_transport_configuration/);assert.strictEqual(fake.calls.length,callsBefore,'invalid project URLs make zero provider requests')}
  const noSession=makeTransport(context,fake,async()=> '');assert.strictEqual((await noSession.read('household-1')).error,'auth_session_unavailable');assert.strictEqual(fake.calls.length,0);
  const transport=makeTransport(context,fake);
  const absent=await transport.read('household-1');assert.deepStrictEqual(clone(absent),{ok:true,row:null});
  assert.strictEqual(fake.calls.length,1);const getCall=fake.calls[0];assert.strictEqual(getCall.init.method,'GET');assert(new URL(getCall.url).pathname==='/rest/v1/familypilot_remote_state');assert(new URL(getCall.url).searchParams.get('household_id')==='eq.household-1');assert.strictEqual(getCall.init.headers.apikey,'sb_publishable_testKey123');assert.strictEqual(getCall.init.headers.Authorization,'Bearer user-jwt');assert.notStrictEqual(getCall.init.headers.apikey,getCall.init.headers.Authorization.slice('Bearer '.length));
  const input={householdId:'household-1',expectedRevision:0,revision:1,stateSchemaVersion:22,payload:'{"schemaVersion":22}',payloadSha256:'a'.repeat(64),updatedAt:1700000000000,updatedBy:'member-1'};
  const created=await transport.compareAndSwap(input);assert(created.ok&&created.row.householdId==='household-1'&&created.row.stateSchemaVersion===22);assert.strictEqual(fake.calls.length,2);const post=fake.calls[1];assert.strictEqual(post.init.method,'POST');assert.strictEqual(new URL(post.url).pathname,'/rest/v1/rpc/familypilot_compare_and_swap_state');assert.deepStrictEqual(JSON.parse(post.init.body),{p_household_id:input.householdId,p_expected_revision:0,p_revision:1,p_state_schema_version:22,p_payload:input.payload,p_payload_sha256:input.payloadSha256,p_updated_at:input.updatedAt,p_updated_by:input.updatedBy});
  const mapped=await transport.read('household-1');assert(mapped.ok&&mapped.row.payload===input.payload&&mapped.row.payloadSha256===input.payloadSha256);
  const callsBeforeConflict=fake.calls.length;const conflict=await transport.compareAndSwap(input);assert.deepStrictEqual(clone(conflict),{ok:false,error:'revision_conflict',currentRevision:1});assert.strictEqual(fake.calls.length,callsBeforeConflict+1,'CAS performs one request with no retry');
  fake.status=403;assert.strictEqual((await transport.read('household-1')).error,'remote_authorization_failed');assert.strictEqual((await transport.compareAndSwap(input)).error,'remote_authorization_failed');fake.status=200;
  fake.throwNetwork=true;assert.strictEqual((await transport.read('household-1')).error,'remote_read_failed');fake.throwNetwork=false;
  fake.malformed=true;assert.strictEqual((await transport.read('household-1')).error,'remote_read_failed');assert.strictEqual((await transport.compareAndSwap(input)).error,'remote_compare_and_swap_failed');fake.malformed=false;
  assert(!/console\.(log|error|warn|info)/.test(transportSource));assert(!/service_role|eyJ[a-zA-Z0-9_-]{20,}/.test(transportSource));

  // P4A accepts this transport as its authoritative boundary: cache writes follow only a valid RPC success.
  const integrationFake=new FakeSupabase(),integrationContext=load(integrationFake.fetch.bind(integrationFake)),tracker={writes:0};
  const adapter=integrationContext.FamilyPilotProductionPersistenceAdapter.createAdapter({transport:makeTransport(integrationContext,integrationFake),persistence:persistence(integrationContext.FamilyPilotPersistence,tracker),crypto:webcrypto,now:()=>1700000000000});
  const initial=state(),prepared=await adapter.prepareCommit(initial,{expectedRevision:0});const initialResult=await adapter.commitAuthoritative(prepared.plan,initial);assert(initialResult.ok&&initialResult.revision===1);assert.strictEqual(integrationFake.calls.length,1);assert.strictEqual(tracker.writes,1);
  const stale=await adapter.prepareCommit(initial,{expectedRevision:0}),writesBeforeStale=tracker.writes;assert.strictEqual((await adapter.commitAuthoritative(stale.plan,initial)).error,'revision_conflict');assert.strictEqual(tracker.writes,writesBeforeStale);
  const changed=state();changed.operations.push({id:'operation-1'});const update=await adapter.prepareCommit(changed,{expectedRevision:1});assert((await adapter.commitAuthoritative(update.plan,changed)).ok);assert.strictEqual(integrationFake.rows.get('household-1').revision,2);const read=await adapter.readAuthoritative('household-1');assert(read.ok&&read.revision===2&&read.state.household.id==='household-1');
  integrationFake.status=403;const writesBeforeAuth=tracker.writes;assert.strictEqual((await adapter.readAuthoritative('household-1')).error,'remote_read_failed');assert.strictEqual(tracker.writes,writesBeforeAuth);integrationFake.status=500;const failed=await adapter.prepareCommit(changed,{expectedRevision:2});assert.strictEqual((await adapter.commitAuthoritative(failed.plan,changed)).error,'remote_commit_failed');assert.strictEqual(tracker.writes,writesBeforeAuth);

  for(const file of ['fp85-p1-lifecycle-retention-domain-smoke.cjs','fp85-p2-backup-restore-core-domain-smoke.cjs','fp85-p3a-destructive-lifecycle-core-domain-smoke.cjs','fp85-p3b-safe-trash-ui-domain-smoke.cjs','fp85-p4a-production-persistence-adapter-domain-smoke.cjs']){const run=childProcess.spawnSync(process.execPath,[path.join(__dirname,file)],{encoding:'utf8'});assert.strictEqual(run.status,0,run.stderr||run.stdout)}
  console.log('FP85_P4B_SUPABASE_AUTH_RLS_TRANSPORT_PASS');
}
main().catch(error=>{console.error(error.stack||error);process.exitCode=1});
