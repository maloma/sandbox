# FamilyPilot #85 — P4D3B A6 M4-03 Read-Only Adopted-State Closure

TASK_ID: FP85-P4D3B-R3B-R4-R1-A1-R1-A6-M4-03-READONLY-ADOPTED-STATE-CLOSURE
AMENDS: FP85-P4D3B-R3B-R4-R1-A1-R1-A5-PARTIAL-PAYMENT-CALLER-CLOSURE
PARENT: maloma/FamilyPilot#85
ERROR_LEDGER_PRODUCT: maloma/decisionos-portfolio-governance#340
ERROR_LEDGER_PROCESS: maloma/decisionos-portfolio-governance#392
EXECUTION_PROFILE: BOUNDED_DIRECT
CANDIDATE_STATUS_AFTER_CREATOR_PASS: SELF_VERIFIED / PENDING_INDEPENDENT_REVIEW
P4D3B_FINAL_STATUS: NOT_ACCEPTED

## 1. Exact baselines

Product repository: `maloma/sandbox`

Product branch: `fp85-p4d3b-authoritative-ui-mutation-gateway`

Exact published product base remains:

`fea49751c850c1f62cc184843d5c19510d5ddbbf`

Current governance exact commit:

`c886102d0350166ae429ea755963a92285367cd6`

Current task-packet chain is A1-R1 + A2 + A3 + A4 + A5 + this A6.

A6 does not replace earlier requirements except where it explicitly expands the compatibility allowlist and defines the M4-03 closure below.

## 2. Why A6 exists

A5 stopped correctly before scope expansion.

Producer evidence from the SAME uncommitted worktree reports that R01 browser regression reaches post-commit `runtime.renderAll()` and fails because `familypilot-m4-03-savings-accounts.js` tries to write `schemaVersion` into the new read-only adopted-state Proxy. The stack passes through `familypilot-m4-03-savings-accounts-ui.js`.

Independent inspection of exact base `fea49751c850c1f62cc184843d5c19510d5ddbbf` confirms the direct compatibility surface:

- `familypilot-m4-03-savings-accounts.js` `normalizeState()` mutates `state.schemaVersion` and several collections in-place;
- read/render helpers including `planSnapshot`, `capitalSnapshot` and `forecast` call that mutating normalizer;
- `familypilot-m4-03-savings-accounts-ui.js` calls `api.normalizeState(state, ...)` from `renderExtension()` and from its `runtime.setRenderAll(...)` wrapper while holding a long-lived runtime `state` reference;
- the historical M4-03 browser smoke exercises savings accounts, transfers, investments, valuations and forecast semantics and must remain a regression oracle.

This is not another partial-payment caller. It is a direct compatibility dependency of the new post-commit read-only adopted-state contract exposed by the R01 regression.

The process recurrence is recorded in Error Ledger #392. A6 is therefore a re-plan, not another blind single-path allowlist increment.

## 3. Continue SAME Codex chat and SAME worktree

Continue the SAME Codex chat and SAME existing uncommitted worktree.

Before any new edit verify:

1. `HEAD` is exact `fea49751c850c1f62cc184843d5c19510d5ddbbf`;
2. no product commit has been created;
3. no product push has occurred;
4. current changed paths are a subset of the A6 allowlist below;
5. no unrelated tracked/untracked product changes exist.

Preserve all valid existing A1-R1+A2+A3+A4+A5 work.

Do not restart implementation or repeat completed reconciliation unless a relevant changed hunk materially changed.

## 4. Complete A6 allowlist — maximum 19 tracked paths

The complete ceiling is exactly these NINETEEN paths:

1. `familypilot-linked-obligation-operation-lifecycle.js`
2. `index.html`
3. `src/familypilot.html`
4. `tools/fp85-p4d3b-authoritative-ui-mutation-gateway-domain-smoke.cjs`
5. `tools/pf08a-m3-07b-r04-browser-smoke.mjs`
6. `tools/pf08a-m3-07b-r01-browser-smoke.mjs`
7. `tools/pf08a-m3-07b-r02-browser-smoke.mjs`
8. `tools/pf08a-m3-07b-r03-browser-smoke.mjs`
9. `tools/pf08a-m3-07b-r05-browser-smoke.mjs`
10. `familypilot-partial-payments.js`
11. `familypilot-payment-attention.js`
12. `familypilot-scope.js`
13. `src/familypilot-scope.js`
14. `tools/pf08a-m3-07b-browser-smoke.mjs`
15. `familypilot-partial-payment-removal-v2.js`
16. `familypilot-partial-payment-entry-ui.js`
17. `familypilot-overpayment-resolution.js`
18. `familypilot-m4-03-savings-accounts.js`
19. `familypilot-m4-03-savings-accounts-ui.js`

No twentieth tracked path.

The two newly authorized files are allowed only for the coherent M4-03 read/render compatibility boundary with post-commit read-only adopted state.

If any twentieth product path is required, or if another M4-03 module must change, return `STATUS=BLOCKED` and Coordination must reconsider the tranche rather than issue another blind path increment.

A path being allowed does not require it to be changed.

## 5. A6 bounded objective

SINGLE_OBJECTIVE: make the existing M4-03 savings-accounts read/render path compatible with the post-commit read-only adopted-state contract without redesigning M4-03 product semantics.

Required outcome:

- post-commit render/read/forecast/account-summary paths do not mutate adopted canonical state;
- no read helper writes `schemaVersion`, collections or other canonical fields merely to normalize for display/calculation;
- read-side normalization is pure, clone-based, or otherwise non-mutating;
- writable normalization needed by actual mutation code remains explicitly limited to writable draft/state contexts and must not be silently applied to read-only adopted state;
- `runtime.renderAll()` and `renderExtension()` are safe against read-only adopted state;
- no silent writable `runtime.state` compatibility layer, setter, write-through Proxy, hidden retry, queue, local-first state or second authority is introduced;
- no change to savings-account, investment, transfer, valuation, planning or forecast product semantics except what is strictly necessary to preserve them under the read-only adopted-state contract.

## 6. Important scope boundary: do not silently absorb full M4-03 mutation migration

A6 is a read/render compatibility closure revealed by R01.

Do NOT turn A6 into a general rewrite of all M4-03 mutation handlers merely because the current historical UI also contains legacy `state` / `save()` assumptions.

If real user mutation flows in M4-03 require a broader authoritative-gateway migration to satisfy P4D3B, classify that as a separate bounded P4D3B tranche and return `STATUS=BLOCKED` with exact evidence. Do not widen A6 beyond the two-file read/render closure.

Within A6 it is permitted to adjust M4-03 UI only where directly necessary to stop render/read normalization from writing through the adopted state or to refresh current read state after commit.

Do not change M4-03 feature semantics, UX text, calculations, business rules or historical test assertions.

## 7. Small-step plan

### STEP-A6-1 — classify the two-file M4-03 surface

SINGLE_OBJECTIVE: identify which uses of normalization/state are read/render-only versus genuine mutation preparation.

Inspect only the two newly authorized files plus read-only evidence/tests as needed. No product edit outside the 19-path ceiling.

Creator self-check: classification is sufficient to choose a minimal coherent fix.

### STEP-A6-2 — core read-only normalization closure

SINGLE_OBJECTIVE: make read/render helpers in `familypilot-m4-03-savings-accounts.js` non-mutating on adopted canonical state.

Required checks include at least the read-side call paths used by:

- `accounts` / account lookup;
- `planSnapshot` / `capitalSnapshot`;
- `forecast`;
- other M4-03 display/calculation helpers reached by render.

Do not make mutation APIs silently succeed against immutable input by mutating hidden copies and discarding the result.

Creator self-check after this step.

### STEP-A6-3 — UI render compatibility

SINGLE_OBJECTIVE: remove only the directly demonstrated write-on-render dependency in `familypilot-m4-03-savings-accounts-ui.js`.

Required result:

- `renderExtension()` and the `runtime.setRenderAll(...)` wrapper do not mutate the adopted canonical state;
- render uses current verified state/read results rather than requiring a writable long-lived object;
- no success UI, mutation semantic or feature behavior is redesigned in this step.

If no UI source edit is required after the core fix, leave the file unchanged and prove that through the R01 and M4-03 regression tests.

Creator self-check after this step.

### STEP-A6-4 — targeted regression first

SINGLE_OBJECTIVE: prove the demonstrated blocker is removed before running the expensive full suite.

Run R01 browser regression first:

`node tools/pf08a-m3-07b-r01-browser-smoke.mjs`

When an already-installed supported browser is available, also run the existing M4-03 historical regression without modifying it:

`node tools/pf08a-m4-03-savings-accounts-forecast-browser-smoke.mjs`

Required result:

- R01 no longer fails on write to read-only adopted state;
- M4-03 historical product behavior remains intact;
- runtime exception list remains empty.

If the existing M4-03 smoke itself requires source modification to pass, stop and return exact evidence; its path is not authorized for edit by A6.

### STEP-A6-5 — complete final creator validation

SINGLE_OBJECTIVE: rerun the complete A1-R1+A2+A3+A4+A5 validation after the LAST material edit.

All A5 required validation, stage markers, browser regressions, root/mirror identity and changed-path gates remain mandatory.

No candidate publication before the complete final validation is PASS.

## 8. Historical regression preservation

A6 does not permit shrinking any A5 historical coverage.

In addition, preserve the exact product semantics covered by the existing M4-03 savings accounts/forecast browser smoke, including:

- module title and account actions;
- fixed-date and fixed-contribution planning;
- purpose and investment accounts;
- internal transfers not becoming ordinary Income/Expense;
- investment valuation delta;
- forecast timeline/events;
- transfer history;
- zero runtime exceptions.

The M4-03 smoke is a validation input, not an authorized changed path.

## 9. Changed-path gate

Before candidate commit, exact changed paths relative to `fea49751c850c1f62cc184843d5c19510d5ddbbf` must be a subset of the exact 19-path A6 allowlist.

No twentieth path.

A path being allowed does not require it to be changed.

## 10. Candidate publication authority

After full creator-side validation PASS only:

- create at most one coherent candidate commit;
- one normal fast-forward push to `fp85-p4d3b-authoritative-ui-mutation-gateway` is allowed under the existing Founder authorization;
- exact remote readback required;
- no force push.

The pushed result is only:

`SELF_VERIFIED / PENDING_INDEPENDENT_REVIEW`

It is NOT R3B Governance Acceptance, P4D3B final acceptance, merge readiness, release readiness or cutover authority.

No PR, merge, deploy, workflow dispatch or live Supabase action.

## 11. Independent review boundary

After exact candidate push/readback, implementation stops.

A separate NEW CLEAN CONTEXT reviewer must independently review the exact candidate under current governance before Coordination may accept R3B.

Reviewer must not modify the candidate or manufacture missing producer evidence.

## 12. Stop conditions

Return `STATUS=BLOCKED` before scope expansion if:

- HEAD/base changed;
- any twentieth tracked path is required;
- any additional M4-03 product module or test source must change;
- M4-03 user mutation flows require full authoritative-gateway migration rather than the bounded read/render compatibility closure;
- preserved M4-03 semantics cannot be maintained inside the two-file closure;
- obligations domain / controller / P4D3A / unrelated product module must change;
- live provider action is required;
- recurring environment failure prevents final validation.

Do not weaken tests to obtain PASS.

## 13. Final producer return additions

Return the A5 report plus:

```text
AMENDMENT_ID=FP85-P4D3B-R3B-R4-R1-A1-R1-A6-M4-03-READONLY-ADOPTED-STATE-CLOSURE
GOVERNANCE_COMMIT=c886102d0350166ae429ea755963a92285367cd6
A6_ALLOWED_PATHS=19
CHANGED_PATH_GATE=PASS|FAIL

M4_03_CORE_READS_NONMUTATING=PASS|FAIL|NA
M4_03_RENDER_READONLY_COMPATIBLE=PASS|FAIL|NA
M4_03_UI_SOURCE_CHANGED=YES|NO|NA
R01_POST_COMMIT_RENDER=PASS|FAIL|NA
M4_03_HISTORICAL_BROWSER=PASS|FAIL|NA

STEP_A6_1_SELF_CHECK=PASS|FAIL|NA
STEP_A6_2_SELF_CHECK=PASS|FAIL|NA
STEP_A6_3_SELF_CHECK=PASS|FAIL|NA
STEP_A6_4_TARGETED_VALIDATION=PASS|FAIL|BLOCKED|NA
STEP_A6_5_FINAL_CREATOR_VALIDATION=PASS|FAIL|BLOCKED|NA

STATUS=SELF_VERIFIED_PENDING_INDEPENDENT_REVIEW|BLOCKED|FAILED
INDEPENDENT_REVIEW_STATUS=PENDING|NA
R3B_FINAL_ACCEPTED=NO
P4D3B_FINAL_ACCEPTED=NO
ERROR_LEDGER_340_CLOSE_ALLOWED=NO
LIVE_CUTOVER_ALLOWED=NO
```
