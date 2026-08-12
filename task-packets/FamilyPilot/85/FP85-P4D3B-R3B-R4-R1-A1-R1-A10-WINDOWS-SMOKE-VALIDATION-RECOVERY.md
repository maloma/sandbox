# FamilyPilot #85 — P4D3B A10 Windows Smoke Validation Recovery

TASK_ID: FP85-P4D3B-R3B-R4-R1-A1-R1-A10-WINDOWS-SMOKE-VALIDATION-RECOVERY
AMENDS_VALIDATION_ONLY: FP85-P4D3B-R3B-R4-R1-A1-R1-A9-PLANNED-INCOME-READONLY-CLOSURE-FINAL-CANDIDATE
PARENT: maloma/FamilyPilot#85
ERROR_LEDGER_PRODUCT: maloma/decisionos-portfolio-governance#340
ERROR_LEDGER_PROCESS: maloma/decisionos-portfolio-governance#392
ERROR_LEDGER_VALIDATION: maloma/decisionos-portfolio-governance#398
EXECUTION_PROFILE: BOUNDED_DIRECT / VALIDATION_RECOVERY
PRODUCT_SOURCE_EDIT_AUTHORITY: NONE
P4D3B_FINAL_STATUS: NOT_ACCEPTED

## 1. Exact baselines

Product repo: `maloma/sandbox`
Product branch: `fp85-p4d3b-authoritative-ui-mutation-gateway`
Published product base and required local HEAD before candidate commit: `fea49751c850c1f62cc184843d5c19510d5ddbbf`
Governance: `c886102d0350166ae429ea755963a92285367cd6`
A9 packet: `maloma/sandbox@bfddc5aaef07637128f2830864993efcaf98d2f5`

Continue the SAME Codex chat and SAME existing worktree. Preserve the completed A9 implementation and all valid A1-R1+A2+A3+A4+A5+A6+A8 changes.

Producer-reported current state entering A10:
- local HEAD unchanged at exact base;
- product commit/push: none;
- current changed paths: 25, within the A9 26-path allowlist;
- `git diff --check`: PASS;
- planned-income read-only Proxy characterization: PASS;
- A9 implementation completed in only the two authorized planned-income files;
- final creator validation stopped only because the mandatory historical planned-income browser smoke reports `Error: Chrome unavailable` in Windows before product assertions execute.

## 2. Why A10 exists

The unchanged historical oracle `tools/pf08a-m4-01-planned-income-browser-smoke.mjs` discovers browsers only through these Linux paths:

- `/usr/bin/google-chrome`
- `/usr/bin/google-chrome-stable`
- `/usr/bin/chromium`
- `/usr/bin/chromium-browser`

The active executor runtime is Windows. Those four paths are absent, so the smoke stops before exercising product behavior.

This is a validation-runner portability defect recorded in Error Ledger #398, not a demonstrated product failure.

A10 does NOT authorize editing the smoke, adding a 26th/27th product path, or changing product behavior. It authorizes only an ephemeral execution adapter outside tracked repository paths so the exact unchanged smoke can run against an already-installed local Chrome/Chromium executable.

## 3. Source immutability and path boundary

During A10 validation recovery:

- ZERO product source edits are authorized;
- ZERO historical test edits are authorized;
- do not modify `tools/pf08a-m4-01-planned-income-browser-smoke.mjs`;
- do not modify any of the existing 25 changed product paths;
- do not add tracked or untracked files inside the repository for the adapter;
- do not install Chrome, Chromium, Node packages, browsers, drivers or system packages;
- do not use Edge or another browser as a substitute unless the historical smoke already identifies it as Chrome/Chromium (it currently does not);
- do not stage/commit/push until ALL required creator validation is PASS.

The exact base blob SHA of the historical smoke is:

`5ecb287edc945abcb4fb944c55ebfe9155d1867b`

Before and after the recovery run, prove the tracked smoke still hashes to that exact Git blob identity or is byte-identical to the base version through an equivalent Git check.

## 4. Allowed Windows execution adapter

First locate an already-installed local Google Chrome or Chromium executable using only read-only environment inspection. Standard Windows install locations and PATH discovery may be checked. If no existing Chrome/Chromium executable is present, STOP with environment blocker; do not install one.

If an existing Chrome/Chromium is present, create one temporary Node preload module OUTSIDE the repository, preferably under the OS temporary directory.

The temporary preload module may do ONLY the following:

1. patch Node's `fs.existsSync` so exactly ONE of the four Linux browser paths listed above appears present;
2. patch Node's `child_process.spawn` so a spawn request for that exact chosen virtual Linux browser path is redirected to the already-installed local Chrome/Chromium executable;
3. preserve the smoke's original argv array and spawn options unchanged;
4. delegate every other `existsSync` and `spawn` call to the original Node functions unchanged;
5. call `syncBuiltinESMExports()` after patching so the unchanged target smoke's named imports receive the constrained adapter.

No product/test module may be copied, rewritten or patched in the repository. The adapter exists only to bridge browser executable discovery.

Execute the EXACT tracked smoke source itself with the temporary preload active, e.g. conceptually:

`node --import <temporary-preload-outside-repo> tools/pf08a-m4-01-planned-income-browser-smoke.mjs`

The target file must remain the tracked unchanged historical smoke.

Required success marker:

`PF08A_M4_01_PLANNED_INCOME_BROWSER_PASS`

Immediately after the run:
- delete the temporary preload module;
- verify the smoke-generated harness/profile artifacts are cleaned;
- verify no new repository files remain;
- verify current changed-path count remains exactly the pre-A10 accumulated set unless Git proves an already-existing A9 path was merely reported differently; any new path is a blocker;
- verify the historical smoke source remains unchanged.

If the preload adapter cannot execute the unchanged smoke without broader interception or source alteration, return `STATUS=BLOCKED`; do not improvise a weaker oracle.

## 5. Resume A9 final creator validation after recovery PASS

Only if the unchanged historical planned-income smoke passes through the constrained adapter, resume the COMPLETE accumulated final creator validation required by A9 after the last material A9 edit.

All A9 requirements remain in force, including:
- exact A9 changed-path gate, maximum 26 allowed paths;
- planned-income read-only Proxy characterization;
- R01 post-commit browser smoke;
- A8 transfer/base-render closure preservation;
- M4-03 historical savings/forecast regression when required/available under prior packet rules;
- all prior required domain stages/browser regressions;
- root/mirror identity/equality gates;
- node checks and `git diff --check`;
- held-commit / authoritative mutation checks required by prior packets;
- no historical test weakening or editing.

A10 itself adds no new product test semantics and no new product path.

## 6. Candidate publication after full PASS only

The conditional publication authority from A9 remains valid only after COMPLETE final creator validation PASS.

Then and only then:
- create at most ONE coherent product candidate commit containing the accumulated A1-R1+A2+A3+A4+A5+A6+A8+A9 source work;
- perform at most ONE normal fast-forward push to `fp85-p4d3b-authoritative-ui-mutation-gateway`;
- no force push;
- exact remote branch readback required;
- remote SHA must exactly equal the locally created candidate SHA.

The temporary Windows preload adapter MUST NOT be included in the candidate.

After push/readback, status remains only:

`SELF_VERIFIED / PENDING_INDEPENDENT_REVIEW`

No PR, merge, deploy, workflow dispatch, live Supabase or authority cutover.

## 7. Stop conditions

Return `STATUS=BLOCKED` without product edits if:
- no already-installed Chrome/Chromium exists;
- the constrained preload adapter cannot run the exact unchanged smoke;
- historical smoke blob/source changes;
- any new repository path appears;
- any required creator validation fails;
- fixing a validation failure would require source edits (A10 grants none);
- remote product branch moved before candidate publication;
- live provider action or software installation would be required.

Any actual product correction after A10 requires a new Coordination amendment; do not edit under A10.

## 8. Successful producer return

On full success return at least:

```text
STATUS=SELF_VERIFIED_PENDING_INDEPENDENT_REVIEW
AMENDMENT_ID=FP85-P4D3B-R3B-R4-R1-A1-R1-A10-WINDOWS-SMOKE-VALIDATION-RECOVERY
GOVERNANCE_COMMIT=c886102d0350166ae429ea755963a92285367cd6
PRODUCT_BASE=fea49751c850c1f62cc184843d5c19510d5ddbbf
PRODUCT_SOURCE_EDITS_DURING_A10=0
A9_CHANGED_PATH_GATE=PASS
FINAL_CHANGED_PATH_COUNT=<n>
HISTORICAL_SMOKE_SOURCE_UNCHANGED=YES
HISTORICAL_SMOKE_BLOB_SHA=5ecb287edc945abcb4fb944c55ebfe9155d1867b
EXISTING_LOCAL_CHROME_OR_CHROMIUM_FOUND=YES
TEMP_PRELOAD_OUTSIDE_REPO=YES
TEMP_PRELOAD_CLEANED=YES
PLANNED_INCOME_HISTORICAL_SMOKE=PASS
PLANNED_INCOME_RENDER_READONLY_COMPATIBLE=PASS
R01_POST_COMMIT_RENDER=PASS
A8_CLOSURE_PRESERVED=PASS
M4_03_CLOSURE_PRESERVED=PASS
FINAL_READONLY_PROXY_CHARACTERIZATION=PASS
COMPLETE_FINAL_CREATOR_VALIDATION=PASS
PRODUCT_CANDIDATE_COMMIT=<sha>
PRODUCT_PUSH_PERFORMED=YES
REMOTE_READBACK_SHA=<same sha>
REMOTE_READBACK_MATCH=YES
PR_CREATED=NO
MERGE_PERFORMED=NO
DEPLOY_PERFORMED=NO
WORKFLOW_DISPATCH_PERFORMED=NO
LIVE_SUPABASE_ACTION=NO
AUTHORITY_CUTOVER=NO
NEXT_STATUS=PENDING_NEW_CLEAN_CONTEXT_INDEPENDENT_REVIEW
```

If recovery or validation cannot complete, return `STATUS=BLOCKED` with exact evidence and STOP.