# FamilyPilot #85 — P4D3B A14 Obligation-State Read-Only Canonical Closure

TASK_ID: FP85-P4D3B-R3B-R4-R1-A1-R1-A14-OBLIGATION-STATE-READONLY-CANONICAL-CLOSURE
AMENDS: FP85-P4D3B-R3B-R4-R1-A1-R1-A13-R02-R03-OBLIGATION-STATE-HISTORICAL-CONTRACT-CLOSURE
PARENT: maloma/FamilyPilot#85
ERROR_LEDGER_PRODUCT: maloma/decisionos-portfolio-governance#340
ERROR_LEDGER_PROCESS: maloma/decisionos-portfolio-governance#392
ERROR_LEDGER_VALIDATION: maloma/decisionos-portfolio-governance#398
EXECUTION_PROFILE: BOUNDED_DIRECT / PRODUCT_PLUS_VALIDATION_OWNER_CLOSURE
CANDIDATE_STATUS_AFTER_CREATOR_PASS: SELF_VERIFIED / PENDING_INDEPENDENT_REVIEW
P4D3B_FINAL_STATUS: NOT_ACCEPTED

## 1. Exact continuation state

Product repo: `maloma/sandbox`
Product branch: `fp85-p4d3b-authoritative-ui-mutation-gateway`
Published product base and required local HEAD before candidate publication: `fea49751c850c1f62cc184843d5c19510d5ddbbf`
Governance: `c886102d0350166ae429ea755963a92285367cd6`
A13 packet: `maloma/sandbox@aab28efc14393c14e875fbb4712c27d8f9af48ef`

Continue the SAME Codex chat and SAME existing uncommitted worktree. Preserve all valid accumulated A1-R1+A2+A3+A4+A5+A6+A8+A9+A11+A12+A13 changes. Do not restart, rebase, clean, reset, or reconstruct the worktree.

Producer-reported A13 terminal:
- `STATUS=BLOCKED`;
- local HEAD remained exact product base;
- `FINAL_CHANGED_PATH_COUNT=26`;
- `A13_PRODUCT_SOURCE_EDITS=0`;
- no product commit or push;
- no fake obligation-state API/DOM/writable runtime bypass;
- blocker proven as `familypilot-obligation-state-ui.js`;
- R02 normal canonical `openList()` + `renderAll()` did not produce real `[data-state-payment-toggle]`;
- module set `__FP_OBLIGATION_STATE_UI__` but never reached `__FP_OBLIGATION_STATE_UI_READY__`;
- exact boot path calls writable `hiddenMap()` against adopted read-only runtime state.

Before editing verify:
1. `git rev-parse HEAD` = exact base above;
2. no product commit/push has occurred;
3. current changed-path count = 26;
4. current changed paths contain no unrelated additions;
5. generated harnesses are absent.

If any check fails, return `STATUS=BLOCKED` before editing.

## 2. Verified blocker and dependency scan

A13 proved this is a real product compatibility path, not merely a stale historical test-helper call.

Exact-base `familypilot-obligation-state-ui.js`:
- captures `runtime.state`;
- references legacy `runtime.save`;
- `hiddenMap()` assigns `state.config` and `state.config[hiddenObligationOccurrencesById]`;
- boot calls `hiddenMap()` before reaching `__FP_OBLIGATION_STATE_UI_READY__`;
- `restoreSkipped`, `hideOccurrence`, and `showOccurrence` mutate captured root state and then call `save()`.

That is incompatible with the A11/P4D3B adopted read-only runtime invariant.

A bounded validation-owner scan also confirmed the canonical M3-04 gate owns both:
- `familypilot-obligation-state-ui.js`;
- `tools/pf08a-m3-04-browser-smoke.mjs`.

The M3-04 historical smoke itself still contains stale synchronous callers (`setActiveWallet`, `createRule`, `skip`) and direct `api.obligationState.render()` assumptions. Therefore A14 pre-authorizes exactly these two new paths together rather than performing another blind one-path expansion.

## 3. Scope — exact ceiling 28

A13 entered with exactly 26 changed tracked paths.

A14 authorizes exactly TWO additional changed tracked paths:

27. `familypilot-obligation-state-ui.js`
28. `tools/pf08a-m3-04-browser-smoke.mjs`

The already-changed A13 paths remain editable only as needed to finish their already-authorized async caller reconciliation:
- `tools/pf08a-m3-07b-r02-browser-smoke.mjs`
- `tools/pf08a-m3-07b-r03-browser-smoke.mjs`

They do not increase the changed-path ceiling.

Final changed-path count must be exactly 28.

NO 29th tracked path is authorized.

Frozen unless already changed by an earlier accepted tranche:
- `familypilot-scope.js` and `src/familypilot-scope.js` — loader already points to the correct module; do not edit for A14;
- `index.html` and `src/familypilot.html`;
- `.github/workflows/pf08a-m3-04-obligation-state-gate.yml`;
- `tools/pf08a-m3-04-public-browser-smoke.mjs`;
- all other product/test files outside the accumulated earlier allowlist.

If any additional product/test path is genuinely required, return `STATUS=BLOCKED` with exact evidence. Do not create a 29th changed path.

## 4. Single product objective

Make the real obligation-state product module boot, render, and mutate correctly with the adopted read-only runtime architecture while preserving its existing user-visible semantics.

Required architecture:

```text
read/render -> zero canonical writes
user action -> performCanonicalUiMutation(writable draft) -> authoritative commit/adoption -> render/read
```

Forbidden:
- restoring writable `runtime.state`;
- reintroducing or emulating `runtime.save`;
- write-through proxy;
- hidden mutable shadow authority;
- local-first fallback;
- fake test-only state/DOM authority;
- direct mutation of adopted root state;
- automatic authority activation/cutover.

## 5. A14-1 — pure boot/read/render

Replace the current mutating read helper pattern.

`hiddenMap()` or its replacement used by boot/read/render MUST be pure:
- if `state.config` and `hiddenObligationOccurrencesById` already exist and are valid objects, return/read them;
- otherwise return an empty read view such as `{}`;
- DO NOT assign `state.config`;
- DO NOT assign `state.config[HIDDEN_KEY]`;
- DO NOT materialize any missing collection/object during boot or render.

Boot must reach:
`window.__FP_OBLIGATION_STATE_UI_READY__=true`

with a root Proxy that rejects writes.

Normal product render must produce the existing real `[data-state-payment-toggle]` DOM without a direct test-only `obligationState.render()` call being necessary.

Read/render helpers including hidden filtering, hidden section rendering, grouping, attention indicators, context state decoration, and plan indicators must remain pure against adopted runtime state.

## 6. A14-2 — canonicalize obligation-state mutations

Convert the state-changing flows to the real canonical mutation route using `runtime.performCanonicalUiMutation`.

At minimum:
- `restoreSkipped(id)`;
- `hideOccurrence(id)`;
- `showOccurrence(id)`.

Each mutation must:
1. use stable IDs captured before the mutation;
2. locate the current record inside the writable `draft` passed to the mutator;
3. materialize `draft.config` / `draft.config[HIDDEN_KEY]` only inside the writable draft when needed;
4. append the same meaningful revision/audit semantics using the draft's current member and the module's `now()`;
5. preserve all existing status/hidden semantics;
6. render/toast only after successful canonical commit/adoption;
7. return an async result that tests/callers can await deterministically.

Do not mutate captured adopted objects before calling the canonical controller.

If a mutation fails, do not display success UI or silently fall back to local mutation.

The module test API may expose these same real canonical functions; it must not add a bypass mutation path.

## 7. A14-3 — async-safe event behavior

Update event handlers only inside `familypilot-obligation-state-ui.js` as needed so user actions remain correct when mutations are asynchronous.

Preserve:
- short tap on skipped payment clears `skipped` only through canonical mutation;
- normal short tap still proxies to ordinary payment behavior;
- long press/context menu behavior;
- current-state actions disabled correctly;
- hide replaces delete;
- hidden payments section;
- show again;
- hidden urgent payments excluded from attention indicators;
- backdrop-close behavior;
- touch target sizing;
- no conversion to `cancelled`;
- no external notification behavior.

Do not manufacture synchronous success assumptions. Await or deterministically observe adopted state before dependent UI assertions/actions.

## 8. A14-4 — canonical M3-04 smoke adaptation

Edit `tools/pf08a-m3-04-browser-smoke.mjs` only to adapt the historical harness to the current canonical asynchronous contract while preserving its scenario and assertions.

Preserve marker:
`PF08A_M3_04_BROWSER_PASS`

Preserve the existing coverage including at least:
- short-tap unskip;
- long-press context menu;
- large context touch targets;
- current state disabled;
- hide instead of delete;
- hidden storage/section;
- hidden attention exclusion;
- show again;
- no cancelled occurrences;
- backdrop close;
- no runtime exceptions;
- existing today-blue/skipped visual contract.

Required caller adaptation:
- await Promise-based `api.setActiveWallet(...)`;
- await Promise-based `api.obligations.createRule(...)`;
- await Promise-based `api.obligations.skip(...)` and any other canonical helper;
- after whole-state adoption, reacquire state via `api.getState()` and use stable IDs rather than stale entity/state references;
- do not require direct `api.obligationState.render()` as an authority/boot crutch;
- use the real render chain and bounded deterministic waits for actual product DOM/state transitions;
- after async click-driven hide/show/unskip, wait for adopted state/DOM before asserting;
- do not weaken/remove assertions;
- do not fake module readiness, toggle DOM, hidden state, or canonical mutation success.

Required gate:
`M3_04_ASSERTION_INVENTORY_PRESERVED=PASS`

## 9. A14-5 — finish R02/R03 A13 caller reconciliation

Within their already-authorized changed paths, finish R02 and R03 using the now-fixed real obligation-state module.

Requirements:
- no direct writable runtime mutation;
- no fake `obligationState` API/DOM;
- no need for direct `obligationState.render()` authority call;
- await canonical helpers;
- use stable IDs and reacquired adopted state;
- bounded deterministic wait for real `[data-state-payment-toggle]`;
- preserve all existing R02/R03 assertions and PASS markers.

Required:
- `R02_ASSERTION_INVENTORY_PRESERVED=PASS`
- `R03_ASSERTION_INVENTORY_PRESERVED=PASS`
- `A13_TEST_BYPASS_CREATED=NO`

## 10. Targeted validation after LAST A14 material edit

Run at least:

1. `node --check familypilot-obligation-state-ui.js`
2. `node --check tools/pf08a-m3-04-browser-smoke.mjs`
3. `node --check tools/pf08a-m3-07b-r02-browser-smoke.mjs`
4. `node --check tools/pf08a-m3-07b-r03-browser-smoke.mjs`
5. `git diff --check`
6. exact changed-path gate: final count exactly 28, no 29th path
7. read-only boot/render characterization using a root Proxy that rejects writes:
   - real dynamic product load reaches `__FP_OBLIGATION_STATE_UI_READY__`;
   - no root write trap during boot/render;
   - real `[data-state-payment-toggle]` appears through normal product render chain
8. canonical mutation characterization using real `performCanonicalUiMutation`/adoption:
   - hide canonical mutation PASS;
   - show-again canonical mutation PASS;
   - unskip canonical mutation PASS;
   - no direct root mutation
9. `tools/pf08a-m3-04-browser-smoke.mjs`
10. R02 browser smoke
11. R03 browser smoke
12. R01 post-commit render browser smoke
13. preserve A12 planned-income targeted closure and prior A8/M4-03 closures as required by the accumulated chain.

Use the already-working `CHROME_PATH`/browser method from the current worktree when needed. Do not install software or alter semantics for launcher portability.

Targeted success requires:
- `OBLIGATION_STATE_BOOT_READONLY_COMPATIBLE=PASS`
- `OBLIGATION_STATE_RENDER_READONLY_COMPATIBLE=PASS`
- `OBLIGATION_STATE_CANONICAL_MUTATIONS=PASS`
- `M3_04_BROWSER=PASS`
- `R02_BROWSER=PASS`
- `R03_BROWSER=PASS`
- `R01_POST_COMMIT_RENDER=PASS`
- assertion inventories preserved;
- no test bypass.

If any NEW unrelated product blocker appears, STOP. Do not add a 29th path.

## 11. Complete accumulated final creator validation

Only after targeted A14 PASS, rerun the COMPLETE accumulated final creator validation required by the full A1-R1+A2+A3+A4+A5+A6+A8+A9+A11+A12+A13+A14 chain after the LAST material edit.

All prior required gates remain mandatory, including:
- all required domain stages;
- R01-R05 and umbrella browser regressions required by the chain;
- canonical M3-04 obligation-state browser smoke;
- planned-income historical regression;
- M4-03 savings/forecast regression;
- A8 transfer/base render compatibility;
- final post-commit read-only Proxy characterization;
- held-commit/authoritative mutation checks;
- root/mirror equality/identity gates;
- node checks;
- `git diff --check`;
- exact changed-path subset/count = 28.

Do not weaken or edit unrelated historical tests to make the suite pass.

## 12. Candidate publication authority

ONLY if COMPLETE final creator validation PASS:

1. re-check remote product branch still equals exact base `fea49751c850c1f62cc184843d5c19510d5ddbbf`;
2. create at most ONE coherent product candidate commit containing the accumulated validated A1-R1 through A14 changes;
3. perform at most ONE normal fast-forward push to `fp85-p4d3b-authoritative-ui-mutation-gateway`;
4. perform exact remote readback;
5. remote readback SHA must equal the candidate commit SHA.

No force push.

After successful push/readback status is only:
`SELF_VERIFIED / PENDING_INDEPENDENT_REVIEW`

This is NOT Governance Acceptance and NOT P4D3B final acceptance.

Forbidden:
- PR creation;
- merge;
- deploy;
- workflow dispatch;
- live Supabase action;
- authority cutover/activation.

After candidate publication STOP. A NEW CLEAN CONTEXT independent review is mandatory.

## 13. Stop conditions

Return `STATUS=BLOCKED` and STOP if:
- local HEAD differs from exact base before publication;
- current entry changed-path count is not 26;
- final changed-path count would exceed 28;
- a 29th tracked path is required;
- another product source outside the authorized two new paths must change;
- R02/R03/M3-04 requires fake DOM/API or assertion weakening;
- obligation-state semantics cannot be preserved through canonical mutation/adoption;
- a regression fails outside authorized scope and cannot be shown to be environmental;
- software installation/live provider action is required;
- remote product branch moves before publication.

Do not silently expand scope.

## 14. Successful producer return

```text
STATUS=SELF_VERIFIED_PENDING_INDEPENDENT_REVIEW
AMENDMENT_ID=FP85-P4D3B-R3B-R4-R1-A1-R1-A14-OBLIGATION-STATE-READONLY-CANONICAL-CLOSURE
GOVERNANCE_COMMIT=c886102d0350166ae429ea755963a92285367cd6
PRODUCT_BASE=fea49751c850c1f62cc184843d5c19510d5ddbbf
A14_NEW_PATHS=2
FINAL_CHANGED_PATH_COUNT=28
CHANGED_PATH_GATE=PASS
OBLIGATION_STATE_BOOT_READONLY_COMPATIBLE=PASS
OBLIGATION_STATE_RENDER_READONLY_COMPATIBLE=PASS
OBLIGATION_STATE_CANONICAL_MUTATIONS=PASS
M3_04_ASSERTION_INVENTORY_PRESERVED=PASS
M3_04_BROWSER=PASS
R02_ASSERTION_INVENTORY_PRESERVED=PASS
R03_ASSERTION_INVENTORY_PRESERVED=PASS
R02_BROWSER=PASS
R03_BROWSER=PASS
R01_POST_COMMIT_RENDER=PASS
A13_TEST_BYPASS_CREATED=NO
A12_TARGETED_CLOSURE_PRESERVED=PASS
A8_CLOSURE_PRESERVED=PASS
M4_03_CLOSURE_PRESERVED=PASS
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

Blocked return must identify the exact failing gate/path/evidence and confirm no unauthorized path, product commit, or push occurred.