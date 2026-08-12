# FamilyPilot #85 — P4D3B A1-R1 A2 Historical Browser Async Compatibility Amendment

TASK_ID: FP85-P4D3B-R3B-R4-R1-A1-R1-A2-HISTORICAL-BROWSER-ASYNC-AMENDMENT
AMENDS: FP85-P4D3B-R3B-R4-R1-A1-R1-LINKED-LIFECYCLE-FINAL-REPAIR
PARENT: maloma/FamilyPilot#85
ERROR_LEDGER: maloma/decisionos-portfolio-governance#340
EXECUTION_PROFILE: BOUNDED_DIRECT
P4D3B_FINAL_STATUS: NOT_ACCEPTED

## 1. Reason for this amendment

The current A1-R1 run is NOT complete and has NOT committed or pushed.

Exact published branch base remains:

`fea49751c850c1f62cc184843d5c19510d5ddbbf`

Useful uncommitted A1-R1 work already exists in the target worktree and must be preserved if it remains within the amended allowlist.

Independent source review confirms that four historical M3-07B browser harnesses still use the old synchronous test-runtime contract while current canonical test helpers are Promise-based:

- `tools/pf08a-m3-07b-r01-browser-smoke.mjs`
- `tools/pf08a-m3-07b-r02-browser-smoke.mjs`
- `tools/pf08a-m3-07b-r03-browser-smoke.mjs`
- `tools/pf08a-m3-07b-r05-browser-smoke.mjs`

Examples at the exact base include synchronous calls to current async-capable APIs such as `a.setActiveWallet(...)`, `a.obligations.createRule(...)`, `a.obligations.openList()` and other canonical test/runtime actions whose result is consumed immediately.

This is a regression-harness compatibility consequence of the canonical mutation migration, not permission to change more product code.

A2 therefore authorizes ONLY test-only async adaptation of these four historical harnesses.

## 2. Continue SAME chat / SAME worktree

Continue the SAME Codex chat and SAME existing uncommitted A1-R1 worktree.

Do NOT discard or recreate the current work if all of the following remain true:

1. `HEAD` is exactly `fea49751c850c1f62cc184843d5c19510d5ddbbf`;
2. no commit has been created;
3. no push has occurred;
4. worktree/index changes are only within the amended allowlist below;
5. no unrelated tracked or untracked product changes exist.

Before continuing, check the exact changed-path set.

If any current changed path is outside the amended allowlist, return `STATUS=BLOCKED` before further editing.

## 3. Complete amended allowlist

The complete A1-R1+A2 allowlist is exactly these NINE tracked paths:

1. `familypilot-linked-obligation-operation-lifecycle.js`
2. `index.html`
3. `src/familypilot.html`
4. `tools/fp85-p4d3b-authoritative-ui-mutation-gateway-domain-smoke.cjs`
5. `tools/pf08a-m3-07b-r04-browser-smoke.mjs`
6. `tools/pf08a-m3-07b-r01-browser-smoke.mjs`
7. `tools/pf08a-m3-07b-r02-browser-smoke.mjs`
8. `tools/pf08a-m3-07b-r03-browser-smoke.mjs`
9. `tools/pf08a-m3-07b-r05-browser-smoke.mjs`

No tenth tracked path.

The newly authorized four files are TEST-ONLY adaptation scope.

Do NOT modify generic/public M3-07B harnesses, other historical Rxx harnesses, obligations domain, partial-payment implementation, controller/gateway, P3A/P3B/P4A/P4D3A, debts/savings/wallet-management, package/workflow/SQL/Supabase files, PR metadata, or main.

If another file becomes necessary, stop `STATUS=BLOCKED`; do not extend scope automatically.

## 4. Preserve historical behavior coverage

For R01/R02/R03/R05, the goal is NOT to rewrite scenarios.

Preserve the existing scenario intent, fixtures, assertions, marker, and behavioral coverage.

Allowed changes:

- add `await` to Promise-based canonical helpers;
- make local wrapper functions `async` where required;
- await returned canonical results before dereferencing them;
- use bounded deterministic `waitFor(...)` instead of fixed sleeps where the UI must wait for an async canonical commit;
- refresh state using `a.getState()` after committed mutations instead of relying on stale previously captured objects;
- adapt helper call ordering only as required by the new async contract.

Forbidden:

- removing assertions because they fail;
- weakening expected statuses/amounts/counts;
- replacing broad historical scenarios with smaller compatibility scenarios;
- bypassing real UI/runtime paths with fake local state mutation;
- restoring writable `runtime.state` or `runtime.save`;
- adding arbitrary sleeps as the sole fix for a missing await;
- changing product semantics from within a browser smoke.

## 5. R01 coverage

Preserve exact-candidate matching, invalid-candidate exclusion, already-linked exclusion, no duplicate before/after user choice, reconciliation candidate count/comments, linking selected existing operation, no-match creation of exactly one operation, and entered-date preservation.

Do not change marker:
`PF08A_M3_07B_R01_BROWSER_PASS`

## 6. R02 coverage

Preserve partial/full payment-removal flows, linked group summary, obsolete keep option absence, all linked operations removed from accounting, technical removal staying out of user Trash, remembered partial group, single full-payment removal, and user Trash remaining clean.

Do not change marker:
`PF08A_M3_07B_R02_BROWSER_PASS`

## 7. R03 coverage

Preserve remembered partial group, ordinary short-tap full payment, remembered-group retention, restore action availability, confirmed replacement of later full payment, voiding later full operation, partial group restoration, empty restoration, and no restore action without remembered group.

Do not change marker:
`PF08A_M3_07B_R03_BROWSER_PASS`

## 8. R05 coverage

Preserve three overpayment choices, correction prefill without creating operation, leave-overpayment result, carry split across current/next occurrence, date preservation, reconciliation before overpayment choice, selected existing source retention until explicit resolution, source voiding after explicit carry choice, and one-time carry hidden.

Do not change marker:
`PF08A_M3_07B_R05_BROWSER_PASS`

## 9. Read-only runtime proxy / async opening

The executor reports an async-opening compatibility fix through a read-only runtime proxy.

That work is allowed only if it stays inside the existing five A1-R1 paths and preserves:

- no writable `runtime.state`;
- no `runtime.save`;
- no second canonical authority;
- no local-first mutation;
- no hidden queue/retry;
- current-state reads after whole-state adoption;
- prepared obligations opening before success UI.

Historical harnesses must adapt to that real async opening rather than restoring synchronous product behavior.

## 10. Existing A1-R1 requirements remain mandatory

A2 does not replace or relax any A1-R1 requirement.

Still required before commit:

- stale `runtime.state` capture eliminated;
- linked edit + obligation recalculation atomic in one canonical mutation;
- linked delete canonical;
- linked restore canonical with full payment-link recalculation;
- prepared obligations-list opening;
- month ordering preserved;
- R3A stage contract restored;
- R3B stage contract restored;
- A1-R1 diagnostic stage may exist;
- R04 broad historical coverage preserved in async form;
- root/mirror byte-identical;
- remote activation guard closed.

Required exact acceptance markers remain:

`FP85_P4D3B_R3A_CORE_UI_MUTATION_PASS`

`FP85_P4D3B_R3B_OBLIGATIONS_PASS`

Default/full P4D3B must remain expected-incomplete and must NOT emit the final P4D3B PASS marker.

## 11. VirtualAlloc environment failure

The reported `VirtualAlloc failed` is treated as an environment/process-allocation failure unless reproducibly tied to code.

Do NOT modify product/test semantics to work around it.

After final code/test edits:

1. ensure no stale child browser/Node processes created by this task remain running;
2. retry the exact failed domain command once without code changes;
3. if it passes, continue normal validation;
4. if `VirtualAlloc failed` recurs on the same command without a product assertion/test failure:
   - do not claim PASS;
   - do not weaken tests;
   - do not install packages or change machine configuration;
   - return `STATUS=BLOCKED`;
   - report `ENVIRONMENT_BLOCKER=VIRTUALALLOC_FAILURE`;
   - preserve the uncommitted worktree;
   - do not commit/push.

Prior R3A/R3B PASS is useful evidence but does not replace final post-edit validation.

## 12. Required final validation

Run the complete A1-R1 validation plus all R01-R05 browser harnesses.

At minimum:

```text
node --check tools/fp85-p4d3b-authoritative-ui-mutation-gateway-domain-smoke.cjs
node tools/fp85-p4d3b-authoritative-ui-mutation-gateway-domain-smoke.cjs --stage=r3a
node tools/fp85-p4d3b-authoritative-ui-mutation-gateway-domain-smoke.cjs --stage=r3b
node tools/fp85-p4d3b-authoritative-ui-mutation-gateway-domain-smoke.cjs --stage=a1-r1
node tools/fp85-p4d3b-authoritative-ui-mutation-gateway-domain-smoke.cjs
node tools/pf08a-m3-01-verify-plan-obligations.mjs
node tools/fp85-p3b-safe-trash-ui-domain-smoke.cjs
node tools/fp85-p4d3a-authoritative-mutation-gateway-domain-smoke.cjs
git diff --check
```

Run exact canonical root/mirror characterization.

When an already-installed supported browser is available, run:

```text
node tools/pf08a-m3-07b-r01-browser-smoke.mjs
node tools/pf08a-m3-07b-r02-browser-smoke.mjs
node tools/pf08a-m3-07b-r03-browser-smoke.mjs
node tools/pf08a-m3-07b-r04-browser-smoke.mjs
node tools/pf08a-m3-07b-r05-browser-smoke.mjs
```

Do not install browsers/packages.

## 13. Changed-path gate

Before commit, changed paths relative to exact base `fea49751c850c1f62cc184843d5c19510d5ddbbf` must be a subset of the exact nine-path amended allowlist.

No tenth path.

## 14. Git authority

The Founder’s existing permission for one normal fast-forward push remains valid for this amended continuation only after full required validation passes.

Then:

- create at most one commit;
- preferred message: `Finalize FP85 R3B async historical regressions`;
- normal fast-forward push only to `HEAD:refs/heads/fp85-p4d3b-authoritative-ui-mutation-gateway`;
- exact remote readback required.

No force push.
No PR.
No merge.
No deploy.
No workflow dispatch.
No live Supabase action.

If validation is BLOCKED by recurring `VirtualAlloc failed`, do NOT commit or push.

## 15. Stop conditions

Return `STATUS=BLOCKED` before scope expansion if:

- HEAD/base is no longer exact;
- any tenth tracked path is required;
- any product file beyond the existing A1-R1 five must change;
- generic/public historical harness must change;
- product semantics must be weakened to make an old regression pass;
- controller/domain/partial-payment implementation must change;
- recurring `VirtualAlloc failed` prevents final validation;
- live provider action is required.

Do not start a successor task automatically.

## 16. Final report additions

Return the existing A1-R1 final report plus:

```text
AMENDMENT_ID=FP85-P4D3B-R3B-R4-R1-A1-R1-A2-HISTORICAL-BROWSER-ASYNC-AMENDMENT
CONTINUED_EXISTING_WORKTREE=YES|NO
AMENDED_ALLOWED_PATHS=9
CHANGED_PATH_GATE=PASS|FAIL
R01_ASYNC_COMPATIBILITY=PASS|FAIL|NA
R01_HISTORICAL_COVERAGE_PRESERVED=PASS|FAIL|NA
R02_ASYNC_COMPATIBILITY=PASS|FAIL|NA
R02_HISTORICAL_COVERAGE_PRESERVED=PASS|FAIL|NA
R03_ASYNC_COMPATIBILITY=PASS|FAIL|NA
R03_HISTORICAL_COVERAGE_PRESERVED=PASS|FAIL|NA
R04_BROWSER_REGRESSION=PASS|FAIL|NA
R05_ASYNC_COMPATIBILITY=PASS|FAIL|NA
R05_HISTORICAL_COVERAGE_PRESERVED=PASS|FAIL|NA
R3A_STAGE_SMOKE=PASS|FAIL|NA
R3B_STAGE_SMOKE=PASS|FAIL|NA
A1_R1_STAGE_SMOKE=PASS|FAIL|NA
FULL_P4D3B_SMOKE_DEFAULT_RESULT=EXPECTED_INCOMPLETE_FAIL|OTHER|NA
ENVIRONMENT_BLOCKER=NONE|VIRTUALALLOC_FAILURE|OTHER
FINAL_VALIDATION_AFTER_LAST_EDIT=PASS|BLOCKED|FAIL
COMMIT_CREATED=YES|NO
PUSHED=YES|NO
REMOTE_BRANCH_READBACK=PASS|FAIL|NA
```
