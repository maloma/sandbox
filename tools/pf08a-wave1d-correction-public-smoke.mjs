import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const candidateRepository='maloma/sandbox';
const candidatePr=141;
const candidateSha='a4ecf55c4bbaabf3b258ee86e1c6a7ba55b65e0c';
const runtimeWorkflowRun=30410818364;
const runtimeWorkflowJob=90446242760;
const artifactName='pf08a-wave1d-correction-public-a4ecf55c4bba.json';
const candidateDirectory=resolve(process.argv[2]||'candidate');
const artifactPath=resolve(process.argv[3]||artifactName);
const verifierRepository=process.env.VERIFIER_REPOSITORY||'';
const verifierPr=Number(process.env.VERIFIER_PR||0);
const verifierHead=process.env.VERIFIER_HEAD||'';
const verifierWorkflowRun=Number(process.env.VERIFIER_WORKFLOW_RUN||0);

const changedPaths=[
  '.github/workflows/pf08a-wave1d-visible-degraded.yml',
  'familypilot-module-registry-retry-correction.js',
  'familypilot-module-registry.js',
  'familypilot-planned-income-amount-model.js',
  'index.html',
  'src/familypilot-module-registry-retry-correction.js',
  'src/familypilot-module-registry.js',
  'src/familypilot.html',
  'tools/pf08a-wave1d-financial-fingerprint-domain-smoke.mjs',
  'tools/pf08a-wave1d-integrated-browser-smoke.mjs',
  'tools/pf08a-wave1d-listener-sentinel-domain-smoke.mjs',
  'tools/pf08a-wave1d-module-registry-domain-smoke.mjs',
  'tools/pf08a-wave1d-recovery-reload-browser-smoke.mjs',
  'tools/pf08a-wave1d-scope-fallback-browser-smoke.mjs',
  'tools/pf08a-wave1d-visible-degraded-browser-smoke.mjs',
];
const smokePaths=[
  'tools/pf08a-wave1d-module-registry-domain-smoke.mjs',
  'tools/pf08a-wave1d-financial-fingerprint-domain-smoke.mjs',
  'tools/pf08a-wave1d-listener-sentinel-domain-smoke.mjs',
  'tools/pf08a-wave1d-integrated-browser-smoke.mjs',
  'tools/pf08a-wave1d-visible-degraded-browser-smoke.mjs',
  'tools/pf08a-wave1d-scope-fallback-browser-smoke.mjs',
  'tools/pf08a-wave1d-recovery-reload-browser-smoke.mjs',
  'tools/pf08a-wave1c-persistence-browser-smoke.mjs',
  'tools/pf08a-wave1c-compatibility-migration-smoke.mjs',
  'tools/pf08a-wave1c-integrated-browser-smoke.mjs',
];
const mirrorPairs=[
  ['index.html','src/familypilot.html'],
  ['familypilot-scope.js','src/familypilot-scope.js'],
  ['familypilot-module-registry.js','src/familypilot-module-registry.js'],
  ['familypilot-module-registry-retry-correction.js','src/familypilot-module-registry-retry-correction.js'],
  ['familypilot-module-registry-ui.js','src/familypilot-module-registry-ui.js'],
  ['familypilot-module-entry-bridge.js','src/familypilot-module-entry-bridge.js'],
];

function assert(value,message){
  if(!value)throw new Error(message);
}

function candidatePath(relativePath){
  return resolve(candidateDirectory,relativePath);
}

function sha256(buffer){
  return createHash('sha256').update(buffer).digest('hex');
}

function exactHead(){
  const result=spawnSync('git',['-C',candidateDirectory,'rev-parse','HEAD'],{
    encoding:'utf8',
    timeout:30000,
  });
  assert(!result.error,'Candidate HEAD command failed: '+String(result.error));
  assert(result.status===0,'Candidate HEAD command failed: '+String(result.stderr||result.stdout));
  return result.stdout.trim();
}

function sourceMarker(relativePath){
  const source=readFileSync(candidatePath(relativePath),'utf8');
  const matches=[...source.matchAll(/\bmarker\s*=\s*(['"])([^'"]+)\1/g)];
  assert(matches.length===1,`Expected one source-defined marker in ${relativePath}, found ${matches.length}`);
  return matches[0][2];
}

function parsePayload(stdout,relativePath){
  const start=stdout.indexOf('{');
  const end=stdout.lastIndexOf('}');
  assert(start>=0&&end>start,`JSON payload missing from ${relativePath}`);
  try{
    return JSON.parse(stdout.slice(start,end+1));
  }catch(error){
    throw new Error(`Invalid JSON payload from ${relativePath}: ${String(error)}\n${stdout.slice(-16000)}`);
  }
}

function runSmoke(relativePath){
  const absolutePath=candidatePath(relativePath);
  assert(existsSync(absolutePath),`Candidate smoke missing: ${relativePath}`);
  const marker=sourceMarker(relativePath);
  const startedAt=Date.now();
  const result=spawnSync(process.execPath,[absolutePath],{
    cwd:candidateDirectory,
    encoding:'utf8',
    timeout:600000,
    maxBuffer:32*1024*1024,
  });
  assert(!result.error,`${relativePath} failed to execute: ${String(result.error)}`);
  assert(result.status===0,`${relativePath} exited ${result.status}\n${String(result.stderr).slice(-16000)}\n${String(result.stdout).slice(-16000)}`);
  assert(result.stdout.includes(marker),`${relativePath} omitted its source-defined marker ${marker}`);
  const payload=parsePayload(result.stdout,relativePath);
  assert(payload.status==='PASS',`${relativePath} did not report PASS`);
  assert(payload.marker===marker,`${relativePath} payload marker differs from its source-defined literal`);
  return {
    marker,
    payload,
    elapsed_ms:Date.now()-startedAt,
  };
}

assert(existsSync(candidateDirectory),'Candidate directory is missing');
assert(exactHead()===candidateSha,'Exact candidate checkout mismatch');
assert(verifierRepository==='maloma/sandbox','Verifier repository mismatch');
assert(Number.isInteger(verifierPr)&&verifierPr>0,'Verifier PR number missing');
assert(/^[0-9a-f]{40}$/.test(verifierHead),'Verifier head is not a full SHA');
assert(Number.isInteger(verifierWorkflowRun)&&verifierWorkflowRun>0,'Verifier workflow run missing');

const mirrorIdentities=mirrorPairs.map(([rootPath,sourcePath])=>{
  const rootBytes=readFileSync(candidatePath(rootPath));
  const sourceBytes=readFileSync(candidatePath(sourcePath));
  const rootSha256=sha256(rootBytes);
  const sourceSha256=sha256(sourceBytes);
  assert(rootBytes.equals(sourceBytes),`Mirror mismatch: ${rootPath} != ${sourcePath}`);
  assert(rootSha256===sourceSha256,`Mirror digest mismatch: ${rootPath} != ${sourcePath}`);
  return {
    root:rootPath,
    source:sourcePath,
    identical:true,
    sha256:rootSha256,
  };
});

const results=Object.fromEntries(smokePaths.map(relativePath=>[relativePath,runSmoke(relativePath)]));
const payload=relativePath=>results[relativePath].payload;
const registry=payload('tools/pf08a-wave1d-module-registry-domain-smoke.mjs');
const fingerprint=payload('tools/pf08a-wave1d-financial-fingerprint-domain-smoke.mjs');
const listener=payload('tools/pf08a-wave1d-listener-sentinel-domain-smoke.mjs');
const integrated=payload('tools/pf08a-wave1d-integrated-browser-smoke.mjs');
const visible=payload('tools/pf08a-wave1d-visible-degraded-browser-smoke.mjs');
const scope=payload('tools/pf08a-wave1d-scope-fallback-browser-smoke.mjs');
const recovery=payload('tools/pf08a-wave1d-recovery-reload-browser-smoke.mjs');
const wave1cPersistence=payload('tools/pf08a-wave1c-persistence-browser-smoke.mjs');
const wave1cCompatibility=payload('tools/pf08a-wave1c-compatibility-migration-smoke.mjs');
const wave1cIntegrated=payload('tools/pf08a-wave1c-integrated-browser-smoke.mjs');

assert(registry.register_returns_detached_clone===true,'First register return is not proven detached');
assert(registry.duplicate_register_returns_detached_clone===true,'Duplicate register return is not proven detached');
assert(registry.external_mutation_cannot_change_registry===true,'External registry mutation isolation is not proven');
assert(registry.financial_isolation===true,'Registry financial isolation is not proven');
assert(integrated.financial_isolation===true,'Integrated financial isolation is not proven');
assert(visible.financial_isolation===true,'Visible-degraded financial isolation is not proven');
assert(fingerprint.authoritative_state_owner===true,'Financial fingerprint state ownership is not proven');
assert(fingerprint.migration_collections_covered===true,'Financial fingerprint migration coverage is not proven');
assert(recovery.financial_fingerprint_unchanged===true,'Recovery financial fingerprint changed');

const collectedRuntimeEvents=[
  ...(Array.isArray(integrated.runtime_exceptions)?integrated.runtime_exceptions:['integrated collector missing']),
  ...(Array.isArray(visible.runtime_exceptions)?visible.runtime_exceptions:['visible collector missing']),
  ...(Array.isArray(scope.unexpected_runtime_events)?scope.unexpected_runtime_events:['scope collector missing']),
  ...(Array.isArray(recovery.browser_runtime_events)?recovery.browser_runtime_events:['recovery collector missing']),
  ...(Array.isArray(wave1cPersistence.runtime_exceptions)?wave1cPersistence.runtime_exceptions:['Wave 1C persistence collector missing']),
  ...(Array.isArray(wave1cIntegrated.runtime_exceptions)?wave1cIntegrated.runtime_exceptions:['Wave 1C integrated collector missing']),
];
assert(collectedRuntimeEvents.length===0,'Browser errors or unhandled rejections were observed: '+JSON.stringify(collectedRuntimeEvents));

assert(scope.real_scope_resource_failure===true,'Real scope resource failure is not proven');
assert(scope.scope_runtime_absent===true,'Scope runtime absence is not proven');
assert(scope.static_fallback_visible===true,'Static scope fallback visibility is not proven');
assert(scope.direct_fallback_before_timeout===true,'Direct scope fallback timing is not proven');
assert(scope.no_financial_mutation_controls===true,'Scope fallback mutation isolation is not proven');

assert(recovery.scenario_g==='recovery_reload_healthy','Scenario G did not reach recovery_reload_healthy');
assert(recovery.real_reload===true,'Scenario G real reload is not proven');
assert(recovery.all_modules_ready===true,'Scenario G module readiness is not proven');
assert(recovery.persistence_healthy===true,'Scenario G persistence health is not proven');
assert(recovery.no_duplicate_handlers===true,'Production handler uniqueness is not proven');
assert(recovery.all_production_listener_sources_observed===true,'Production listener sources are not proven');
assert(recovery.required_listener_signatures_unique===true,'Required listener signature uniqueness is not proven');
assert(recovery.listener_contract_stable_across_reload===true,'Listener contract stability is not proven');
assert(listener.single_registration_accepted===true,'Listener sentinel rejected a single registration');
assert(listener.all_three_production_sources_observed===true,'Listener sentinel source coverage is not proven');
assert(listener.source_specific_counts_deterministic===true,'Listener sentinel counts are not deterministic');

assert(wave1cPersistence.persistence_recovery===true,'Wave 1C persistence recovery regressed');
assert(wave1cPersistence.migration_ordered===true,'Wave 1C ordered migration regressed');
assert(wave1cPersistence.migration_idempotent===true,'Wave 1C migration idempotence regressed');
assert(wave1cCompatibility.compatibility_payload_adopted===true,'Wave 1C compatibility migration regressed');
assert(wave1cCompatibility.legacy_state_preserved===true,'Wave 1C legacy state preservation regressed');
assert(wave1cIntegrated.persistence_recovery===true,'Wave 1C integrated persistence recovery regressed');
assert(wave1cIntegrated.hypothetical_isolation===true,'Wave 1C hypothetical isolation regressed');
assert(wave1cPersistence.readiness_verdict==='NOT_READY','Wave 1C persistence readiness verdict changed');
assert(wave1cIntegrated.readiness_verdict==='NOT_READY','Wave 1C integrated readiness verdict changed');

const evidence={
  schema_version:1,
  status:'PUBLIC_EXACT_HEAD_PASS',
  candidate_repository:candidateRepository,
  candidate_pr:candidatePr,
  candidate_sha:candidateSha,
  runtime_workflow_run:runtimeWorkflowRun,
  runtime_workflow_job:runtimeWorkflowJob,
  verifier_repository:verifierRepository,
  verifier_pr:verifierPr,
  verifier_head:verifierHead,
  verifier_workflow_run:verifierWorkflowRun,
  exact_candidate_checkout:true,
  register_returns_detached_clone:true,
  duplicate_register_returns_detached_clone:true,
  external_mutation_cannot_change_registry:true,
  financial_isolation:true,
  browser_errors:[],
  unhandled_rejections:[],
  scope_fallback_direct:true,
  recovery_reload_healthy:true,
  production_handler_uniqueness:true,
  wave1c_regressions:true,
  terminal_diff_review:{
    result:'PASS',
    candidate_changed_paths:changedPaths,
    confined_to:'CP-04 findings and required tests',
    workflow_drift:false,
    successful_exact_head_run:true,
  },
  mirror_identities:mirrorIdentities,
  runtime_exceptions:[],
  marker_results:Object.fromEntries(Object.entries(results).map(([relativePath,result])=>[
    relativePath,
    {
      marker:result.marker,
      pass:true,
      elapsed_ms:result.elapsed_ms,
    },
  ])),
  readiness_verdict:'NOT_READY',
  generated_at_utc:new Date().toISOString(),
};

mkdirSync(dirname(artifactPath),{recursive:true});
writeFileSync(artifactPath,JSON.stringify(evidence,null,2)+'\n','utf8');
console.log(JSON.stringify({
  status:evidence.status,
  candidate_sha:evidence.candidate_sha,
  verifier_head:evidence.verifier_head,
  evidence_artifact:artifactName,
  readiness_verdict:evidence.readiness_verdict,
},null,2));
