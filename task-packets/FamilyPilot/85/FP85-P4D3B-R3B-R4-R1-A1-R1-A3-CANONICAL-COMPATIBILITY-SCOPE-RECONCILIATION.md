# FamilyPilot #85 — P4D3B A1-R1 A3 Canonical Compatibility Scope Reconciliation

TASK_ID: FP85-P4D3B-R3B-R4-R1-A1-R1-A3-CANONICAL-COMPATIBILITY-SCOPE-RECONCILIATION
AMENDS: FP85-P4D3B-R3B-R4-R1-A1-R1-A2-HISTORICAL-BROWSER-ASYNC-AMENDMENT
PARENT: maloma/FamilyPilot#85
ERROR_LEDGER: maloma/decisionos-portfolio-governance#340
EXECUTION_PROFILE: BOUNDED_DIRECT
P4D3B_FINAL_STATUS: NOT_ACCEPTED

## 1. Why A3 exists

The current A1-R1+A2 run is still uncommitted and unpublished.

Exact published product branch base remains:

`fea49751c850c1f62cc184843d5c19510d5ddbbf`

A2 correctly authorized four historical browser harnesses for async adaptation, but its allowlist was incomplete relative to the already-existing uncommitted canonical-compatibility worktree.

The current worktree reports five additional changed paths:

- `familypilot-partial-payments.js`
- `familypilot-payment-attention.js`
- `familypilot-scope.js`
- `src/familypilot-scope.js`
- `tools/pf08a-m3-07b-browser-smoke.mjs`

Independent review of the exact published base confirms that these files contain legacy synchronous/write-through assumptions relevant to the current migration:

- `familypilot-partial-payments.js` captures `runtime.state`, captures `runtime.save`, mutates canonical obligation/operation/config state directly, and calls `save()` from linked/partial-payment actions;
- the demo/test layer inside `familypilot-payment-attention.js` also captures `runtime.state` and `runtime.save` and performs direct canonical fixture mutation;
- `familypilot-scope.js` and `src/familypilot-scope.js` contain the persistence/scope runtime surfaces that may require bounded read-only/current-state compatibility for the async canonical bridge;
- the generic `pf08a-m3-07b-browser-smoke.mjs` uses the same historical synchronous test API pattern as the R01–R05 harnesses.

Therefore these paths may be preserved and completed ONLY for the narrowly defined compatibility roles below. A3 does not authorize general product expansion.

## 2. Continue SAME Codex chat and SAME worktree

Continue the SAME Codex chat and SAME existing uncommitted worktree.

Before any new edit, verify:

1. `HEAD` is exactly `fea49751c850c1f62cc184843d5c19510d5ddbbf`;
2. no commit has been created;
3. no push has occurred;
4. current changed paths are a subset of the A3 allowlist below;
5. no unrelated untracked product files exist.

If any changed path lies outside the A3 allowlist, return `STATUS=BLOCKED` before further editing.

Do not discard or recreate valid current work merely because earlier amendments had an incomplete allowlist.

## 3. Complete A3 allowlist — maximum 14 paths

The complete amended allowlist is exactly these FOURTEEN tracked paths:

### Existing A1-R1 paths
1. `familypilot-linked-obligation-operation-lifecycle.js`
2. `index.html`
3. `src/familypilot.html`
4. `tools/fp85-p4d3b-authoritative-ui-mutation-gateway-domain-smoke.cjs`
5. `tools/pf08a-m3-07b-r04-browser-smoke.mjs`

### A2 historical async harnesses
6. `tools/pf08a-m3-07b-r01-browser-smoke.mjs`
7. `tools/pf08a-m3-07b-r02-browser-smoke.mjs`
8. `tools/pf08a-m3-07b-r03-browser-smoke.mjs`
9. `tools/pf08a-m3-07b-r05-browser-smoke.mjs`

### A3 canonical-compatibility paths
10. `familypilot-partial-payments.js`
11. `familypilot-payment-attention.js`
12. `familypilot-scope.js`
13. `src/familypilot-scope.js`
14. `tools/pf08a-m3-07b-browser-smoke.mjs`

No fifteenth tracked path.

A COMPLETE result may change fewer than 14 files. The final changed set only needs to be a subset of this exact allowlist.

## 4. Role of `familypilot-partial-payments.js`

This file is authorized only to remove canonical write-through assumptions that conflict with P4D3B and to support the existing partial-payment / linked-obligation behavior under the authoritative mutation boundary.

Required direction:

- no long-lived mutable capture of `runtime.state` as authority;
- no dependency on public `runtime.save` for canonical writes;
- current-state reads must resolve current adopted runtime state;
- canonical writes must occur only inside the existing application canonical mutation bridge / supplied draft;
- no local-first write followed by capture;
- no writable `runtime.state` restoration;
- no second authority implementation;
- no hidden retry/queue;
- existing partial-payment semantics and historical regression coverage must be preserved.

Where the file exposes actions through `__FP_TEST__`, Promise-based APIs are allowed and expected.

If correct draft-bound behavior requires changing the partial-payment domain semantics or another product file outside A3, return `STATUS=BLOCKED`.

## 5. Role of `familypilot-payment-attention.js`

The pure payment-attention calculation API must remain semantically stable.

A3 authorizes only the legacy demo/test/runtime mutation layer to become compatible with the canonical mutation model.

Requirements:

- do not change attention classification, lead-day, grouping, visibility, or business semantics merely for this task;
- demo/test fixture creation/removal must not mutate live canonical state followed by legacy `save()`;
- current-state reads after whole-state adoption;
- fixture mutations through the existing canonical mutation bridge / draft only;
- Promise-based demo/test API allowed;
- no restoration of `runtime.save` or writable `runtime.state`.

## 6. Role of `familypilot-scope.js` and `src/familypilot-scope.js`

These two files are authorized only for bounded persistence/scope/runtime compatibility needed by the current P4D3B async canonical test/runtime flow.

Do not redesign persistence, schema, retention, recovery, wallet visibility, financial truth, or scope semantics.

Allowed examples:

- expose/use a read-only current-state access surface required by already-authorized runtime adapters;
- preserve a read-only runtime proxy across whole-state adoption;
- make test/runtime bridge behavior Promise-safe without introducing write-through authority;
- keep canonical persistence owner and accepted persistence semantics unchanged.

Forbidden:

- writable runtime state setter;
- public legacy canonical `save` restoration;
- persistence schema changes;
- migration changes;
- financial/scope logic redesign;
- new authority mode.

Treat `familypilot-scope.js` and `src/familypilot-scope.js` according to their existing repository relationship. Do not assume byte identity if the exact base is not byte-identical; preserve intentional pre-existing differences except for corresponding compatibility changes that are actually required.

## 7. Role of generic `tools/pf08a-m3-07b-browser-smoke.mjs`

This file is TEST-ONLY compatibility scope.

Preserve its existing scenario and marker:

`PF08A_M3_07B_BROWSER_PASS`

Adapt only as required by the current Promise-based canonical test API:

- await current canonical helpers;
- refresh state after committed mutations rather than relying on stale snapshots;
- use bounded deterministic waiting for async UI commits;
- preserve existing modal/date/home-transfer/wallet-transfer/partial-payment assertions;
- do not replace the scenario with a smaller compatibility harness;
- do not remove assertions to get PASS.

## 8. Existing A1-R1+A2 requirements remain mandatory

A3 does NOT relax earlier requirements.

Still required before commit:

- linked lifecycle has no stale `runtime.state` authority capture;
- linked edit + obligation recalculation are atomic canonical mutation;
- linked delete canonical;
- linked restore canonical with recalculation;
- prepared obligations-list opening;
- month ordering preserved;
- effective obligation test runtime draft-only;
- `--stage=r3a` emits exactly `FP85_P4D3B_R3A_CORE_UI_MUTATION_PASS`;
- `--stage=r3b` emits exactly `FP85_P4D3B_R3B_OBLIGATIONS_PASS`;
- optional `--stage=a1-r1` diagnostic may exist;
- default/full P4D3B remains expected-incomplete with NO final gateway PASS marker;
- R01–R05 historical coverage preserved in async form;
- R04 broad linked lifecycle regression preserved;
- generic M3-07B historical coverage preserved;
- root `index.html` / `src/familypilot.html` byte identity preserved;
- remote activation guard remains closed.

## 9. Scope reconciliation before continuing

Because the worktree currently contains more paths than A2 allowed, perform a reconciliation pass BEFORE new semantic edits:

For each currently changed A3-only file (10–14):

1. inspect the uncommitted diff against exact base;
2. classify every hunk as one of:
   - `REQUIRED_CANONICAL_COMPATIBILITY`
   - `REQUIRED_ASYNC_TEST_ADAPTATION`
   - `UNRELATED_OR_UNNECESSARY`
3. revert only `UNRELATED_OR_UNNECESSARY` hunks to exact base;
4. preserve required current work;
5. report a short per-file classification before commit.

Do not bulk-revert entire files when they contain valid compatibility work.

## 10. Environment failure handling

The A2 `VirtualAlloc failed` rule remains in force.

After final edits:

- clean up only task-created stale browser/Node child processes if present;
- retry the exact failed domain command once without code changes;
- if it passes, continue validation;
- if `VirtualAlloc failed` recurs on the same command without a product/test assertion failure, return `STATUS=BLOCKED`, preserve the worktree, and do NOT commit/push.

Do not weaken tests or change product semantics to work around an environment allocation failure.

## 11. Required final validation

Run the complete A1-R1+A2 validation after the LAST edit, including:

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

Run canonical root/mirror characterization.

Run, when an already-installed supported browser is available:

```text
node tools/pf08a-m3-07b-browser-smoke.mjs
node tools/pf08a-m3-07b-r01-browser-smoke.mjs
node tools/pf08a-m3-07b-r02-browser-smoke.mjs
node tools/pf08a-m3-07b-r03-browser-smoke.mjs
node tools/pf08a-m3-07b-r04-browser-smoke.mjs
node tools/pf08a-m3-07b-r05-browser-smoke.mjs
```

Also discover/run existing partial-payment / linked-obligation / payment-attention Node smokes relevant to changed product paths.

Do not install browsers or packages.

## 12. Changed-path gate

Before commit, exact changed paths relative to:

`fea49751c850c1f62cc184843d5c19510d5ddbbf`

must be a subset of the 14-path A3 allowlist.

No fifteenth tracked path.

No unrelated untracked product artifact may be committed.

## 13. Git authority

The Founder’s existing authorization for one normal fast-forward push remains valid for this SAME continuation only after full validation PASS.

Then:

- create at most one commit;
- preferred message: `Finalize FP85 R3B canonical compatibility regressions`;
- normal fast-forward push only to `HEAD:refs/heads/fp85-p4d3b-authoritative-ui-mutation-gateway`;
- exact remote readback required.

No force push.
No PR.
No merge.
No deploy.
No workflow dispatch.
No live Supabase.

If final validation is BLOCKED, do not commit or push.

## 14. Stop conditions

Return `STATUS=BLOCKED` before scope expansion if:

- HEAD is no longer exact base;
- any fifteenth tracked path is required;
- controller/P3B/P4A/P4D3A contract must change;
- persistence schema/migration semantics must change;
- obligation/payment-attention/partial-payment product semantics require a new architecture decision;
- a generic/public regression would need to be weakened;
- recurring `VirtualAlloc failed` prevents final validation;
- any live-provider action is required.

Do not create a successor task automatically.

## 15. Final report additions

Return the previous A1-R1+A2 report plus:

```text
AMENDMENT_ID=FP85-P4D3B-R3B-R4-R1-A1-R1-A3-CANONICAL-COMPATIBILITY-SCOPE-RECONCILIATION
CONTINUED_EXISTING_WORKTREE=YES|NO
AMENDED_ALLOWED_PATHS=14
CHANGED_PATH_GATE=PASS|FAIL

PARTIAL_PAYMENTS_DIFF_CLASSIFICATION=REQUIRED_CANONICAL_COMPATIBILITY|REVERTED|MIXED|NA
PAYMENT_ATTENTION_DIFF_CLASSIFICATION=REQUIRED_CANONICAL_COMPATIBILITY|REVERTED|MIXED|NA
SCOPE_ROOT_DIFF_CLASSIFICATION=REQUIRED_CANONICAL_COMPATIBILITY|REVERTED|MIXED|NA
SCOPE_SRC_DIFF_CLASSIFICATION=REQUIRED_CANONICAL_COMPATIBILITY|REVERTED|MIXED|NA
GENERIC_M307B_DIFF_CLASSIFICATION=REQUIRED_ASYNC_TEST_ADAPTATION|REVERTED|MIXED|NA

PARTIAL_PAYMENTS_LEGACY_RUNTIME_SAVE=ABSENT|PRESENT|NA
PARTIAL_PAYMENTS_LONG_LIVED_STATE_CAPTURE=ABSENT|PRESENT|NA
PAYMENT_ATTENTION_LEGACY_RUNTIME_SAVE=ABSENT|PRESENT|NA
PAYMENT_ATTENTION_LONG_LIVED_STATE_CAPTURE=ABSENT|PRESENT|NA
SCOPE_WRITE_THROUGH_AUTHORITY_INTRODUCED=NO|YES|NA
GENERIC_M307B_HISTORICAL_COVERAGE_PRESERVED=PASS|FAIL|NA

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
