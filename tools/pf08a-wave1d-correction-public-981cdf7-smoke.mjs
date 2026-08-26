import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const CANDIDATE='981cdf7b0cf7126a5f29af0b50dec3e369b0c9a5';
const RUNTIME_RUN=30444807013;
const RUNTIME_JOB=90552442062;
const ARTIFACT='pf08a-wave1d-correction-public-981cdf7b0cf7.json';
const root=resolve(process.argv[2]||'candidate');
const output=resolve(process.argv[3]||ARTIFACT);
const changed=[".github/workflows/pf08a-wave1d-visible-degraded.yml", "familypilot-module-registry-retry-correction.js", "familypilot-module-registry.js", "familypilot-planned-income-amount-model.js", "familypilot-scope.js", "index.html", "src/familypilot-module-registry-retry-correction.js", "src/familypilot-module-registry.js", "src/familypilot-scope.js", "src/familypilot.html", "tools/pf08a-wave1d-financial-fingerprint-domain-smoke.mjs", "tools/pf08a-wave1d-integrated-browser-smoke.mjs", "tools/pf08a-wave1d-listener-sentinel-domain-smoke.mjs", "tools/pf08a-wave1d-module-registry-domain-smoke.mjs", "tools/pf08a-wave1d-recovery-reload-browser-smoke.mjs", "tools/pf08a-wave1d-scope-fallback-browser-smoke.mjs", "tools/pf08a-wave1d-visible-degraded-browser-smoke.mjs"];
const smokes=["tools/pf08a-wave1d-module-registry-domain-smoke.mjs", "tools/pf08a-wave1d-financial-fingerprint-domain-smoke.mjs", "tools/pf08a-wave1d-listener-sentinel-domain-smoke.mjs", "tools/pf08a-wave1d-integrated-browser-smoke.mjs", "tools/pf08a-wave1d-visible-degraded-browser-smoke.mjs", "tools/pf08a-wave1d-scope-fallback-browser-smoke.mjs", "tools/pf08a-wave1d-recovery-reload-browser-smoke.mjs", "tools/pf08a-wave1c-persistence-browser-smoke.mjs", "tools/pf08a-wave1c-compatibility-migration-smoke.mjs", "tools/pf08a-wave1c-integrated-browser-smoke.mjs"];
const mirrors=[["index.html", "src/familypilot.html"], ["familypilot-scope.js", "src/familypilot-scope.js"], ["familypilot-module-registry.js", "src/familypilot-module-registry.js"], ["familypilot-module-registry-retry-correction.js", "src/familypilot-module-registry-retry-correction.js"], ["familypilot-module-registry-ui.js", "src/familypilot-module-registry-ui.js"], ["familypilot-module-entry-bridge.js", "src/familypilot-module-entry-bridge.js"]];
const assert=(v,m)=>{if(!v)throw Error(m)};
const file=p=>resolve(root,p);
const hash=b=>createHash('sha256').update(b).digest('hex');

const head=spawnSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8',timeout:30000});
assert(!head.error&&head.status===0,'candidate HEAD read failed');
assert(head.stdout.trim()===CANDIDATE,'candidate SHA mismatch');
assert(process.env.VERIFIER_REPOSITORY==='maloma/sandbox','verifier repository mismatch');
assert(/^[0-9a-f]{40}$/.test(process.env.VERIFIER_HEAD||''),'verifier head missing');
assert(Number(process.env.VERIFIER_PR)>0,'verifier PR missing');
assert(Number(process.env.VERIFIER_WORKFLOW_RUN)>0,'verifier run missing');

function marker(path){
  const source=readFileSync(file(path),'utf8');
  const match=source.match(/\bmarker\s*=\s*(['"])([^'"]+)\1/);
  assert(match,`marker missing: ${path}`);
  return match[2];
}
function parse(stdout,path){
  const a=stdout.indexOf('{'),b=stdout.lastIndexOf('}');
  assert(a>=0&&b>a,`JSON missing: ${path}`);
  return JSON.parse(stdout.slice(a,b+1));
}
function run(path){
  assert(existsSync(file(path)),`smoke missing: ${path}`);
  const expected=marker(path),started=Date.now();
  const r=spawnSync(process.execPath,[file(path)],{cwd:root,encoding:'utf8',timeout:600000,maxBuffer:33554432});
  assert(!r.error&&r.status===0,`${path} failed\n${String(r.stderr).slice(-12000)}\n${String(r.stdout).slice(-12000)}`);
  const payload=parse(r.stdout,path);
  assert(payload.status==='PASS'&&payload.marker===expected,`${path} PASS contract failed`);
  return {marker:expected,payload,elapsed_ms:Date.now()-started};
}

const identities=changed.map(path=>{
  const bytes=readFileSync(file(path));
  return {path,sha256:hash(bytes),bytes:bytes.length};
});
const mirrorIdentities=mirrors.map(([a,b])=>{
  const left=readFileSync(file(a)),right=readFileSync(file(b));
  assert(left.equals(right),`mirror mismatch: ${a}`);
  return {root:a,source:b,identical:true,sha256:hash(left)};
});
const workflow=readFileSync(file('.github/workflows/pf08a-wave1d-visible-degraded.yml'),'utf8');
assert(workflow.includes("'familypilot-planned-income-amount-model.js'"),'planned-income trigger missing');
assert(workflow.includes('node --check familypilot-planned-income-amount-model.js'),'planned-income syntax check missing');

const results=Object.fromEntries(smokes.map(p=>[p,run(p)]));
const p=x=>results[x].payload;
const registry=p(smokes[0]),fingerprint=p(smokes[1]),listener=p(smokes[2]);
const integrated=p(smokes[3]),visible=p(smokes[4]),scope=p(smokes[5]),recovery=p(smokes[6]);
const w1p=p(smokes[7]),w1m=p(smokes[8]),w1i=p(smokes[9]);

for(const [value,message] of [
 [registry.original_definition_top_level_detached,'top-level definition alias remains'],
 [registry.original_definition_nested_detached,'nested definition alias remains'],
 [registry.external_mutation_cannot_change_registry,'registry mutation isolation failed'],
 [fingerprint.persistence_schema_contract_consumed,'persistence schema contract missing'],
 [fingerprint.canonical_runtime_keys_covered,'canonical financial keys missing'],
 [fingerprint.legacy_keys_rejected,'legacy financial keys remain'],
 [fingerprint.every_required_key_has_negative_mutation_probe,'negative mutation probes incomplete'],
 [fingerprint.observed_extension_keys_covered,'runtime extension keys omitted'],
 [listener.all_five_production_sources_observed,'listener source coverage incomplete'],
 [listener.what_if_source_observed,'What If listener source missing'],
 [listener.learning_source_observed,'Learning listener source missing'],
 [recovery.real_reload,'real reload missing'],
 [recovery.financial_fingerprint_unchanged,'financial state changed across reload'],
 [recovery.no_duplicate_handlers,'duplicate handlers detected'],
 [recovery.all_production_listener_sources_observed,'browser listener coverage incomplete'],
 [recovery.required_listener_signatures_unique,'listener signatures not unique'],
 [recovery.common_listener_contract_stable_across_reload,'listener contract changed across reload'],
 [scope.real_scope_resource_failure,'real scope failure missing'],
 [scope.static_fallback_visible,'scope fallback not visible'],
 [w1p.persistence_recovery,'Wave 1C persistence regression'],
 [w1m.compatibility_payload_adopted,'Wave 1C migration regression'],
 [w1i.hypothetical_isolation,'Wave 1C integrated regression'],
])assert(value===true,message);

const runtimeEvents=[
 ...(Array.isArray(integrated.runtime_exceptions)?integrated.runtime_exceptions:['integrated collector missing']),
 ...(Array.isArray(visible.runtime_exceptions)?visible.runtime_exceptions:['visible collector missing']),
 ...(Array.isArray(scope.unexpected_runtime_events)?scope.unexpected_runtime_events:['scope collector missing']),
 ...(Array.isArray(recovery.browser_runtime_events)?recovery.browser_runtime_events:['recovery collector missing']),
 ...(Array.isArray(w1p.runtime_exceptions)?w1p.runtime_exceptions:['Wave 1C persistence collector missing']),
 ...(Array.isArray(w1i.runtime_exceptions)?w1i.runtime_exceptions:['Wave 1C integrated collector missing']),
];
assert(runtimeEvents.length===0,'browser runtime events observed: '+JSON.stringify(runtimeEvents));

const evidence={
 schema_version:2,status:'PUBLIC_EXACT_HEAD_PASS',
 candidate_repository:'maloma/sandbox',candidate_pr:141,candidate_sha:CANDIDATE,
 runtime_workflow_run:RUNTIME_RUN,runtime_workflow_job:RUNTIME_JOB,
 verifier_repository:process.env.VERIFIER_REPOSITORY,
 verifier_pr:Number(process.env.VERIFIER_PR),verifier_head:process.env.VERIFIER_HEAD,
 verifier_workflow_run:Number(process.env.VERIFIER_WORKFLOW_RUN),
 exact_candidate_checkout:true,
 findings:{
  major_02_financial_fingerprint:'PASS',
  major_03_scenario_g_full_financial_preservation:'PASS',
  major_04_production_handler_uniqueness:'PASS',
  major_05_reproducible_browser_execution:'PASS',
  minor_02_registry_definition_detachment:'PASS',
  minor_03_workflow_coverage:'PASS'
 },
 browser_errors:[],unhandled_rejections:[],
 candidate_file_identities:identities,mirror_identities:mirrorIdentities,
 marker_results:Object.fromEntries(Object.entries(results).map(([k,v])=>[k,{marker:v.marker,pass:true,elapsed_ms:v.elapsed_ms}])),
 readiness_verdict:'NOT_READY',p0_04_closed:false,fresh_independent_review_completed:false,
 generated_at_utc:new Date().toISOString()
};
mkdirSync(dirname(output),{recursive:true});
writeFileSync(output,JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({status:evidence.status,candidate_sha:CANDIDATE,verifier_head:evidence.verifier_head,evidence_artifact:ARTIFACT,readiness_verdict:evidence.readiness_verdict},null,2));
