# FamilyPilot #85 — P4D3B A15 Mobile Payment Tap Canonical Closure

TASK_ID: FP85-P4D3B-R3B-R4-R1-A1-R1-A15-MOBILE-PAYMENT-TAP-CANONICAL-CLOSURE
AMENDS: FP85-P4D3B-R3B-R4-R1-A1-R1-A14-OBLIGATION-STATE-READONLY-CANONICAL-CLOSURE
PARENT: maloma/FamilyPilot#85
ERROR_LEDGER_PRODUCT: maloma/decisionos-portfolio-governance#340
ERROR_LEDGER_PROCESS: maloma/decisionos-portfolio-governance#392
ERROR_LEDGER_VALIDATION: maloma/decisionos-portfolio-governance#398
EXECUTION_PROFILE: BOUNDED_DIRECT / PRODUCT_PLUS_DIRECT_VALIDATION_OWNER_CLOSURE
CANDIDATE_STATUS_AFTER_CREATOR_PASS: SELF_VERIFIED / PENDING_INDEPENDENT_REVIEW
P4D3B_FINAL_STATUS: NOT_ACCEPTED

## 1. Governance and exact continuation state

Current Coordination governance exact at A15 publication:
`26bc2fc3f850c7ed76ec9df5c8e8633b88a1d96f`

Registry version: `5.23`.

A14 was authored under older governance. Before substantive A15 execution, check current published `main` of `maloma/decisionos-portfolio-docs`. If it differs from the exact commit above, perform Registry-first re-bootstrap from the new exact commit and obey the newer applicable rules. Do not use A14's old governance pin as current authority.

Product repo: `maloma/sandbox`
Product branch: `fp85-p4d3b-authoritative-ui-mutation-gateway`
Published product base and required local HEAD before candidate publication:
`fea49751c850c1f62cc184843d5c19510d5ddbbf`

A14 task-packet branch head before A15 publication:
`25e49036ffae6d220adbae85b3f769a4ec6d9d0b`

Continue the SAME Codex chat and SAME existing uncommitted worktree. Preserve all valid accumulated A1-R1+A2+A3+A4+A5+A6+A8+A9+A11+A12+A13+A14 changes. Do not restart, rebase, reset, clean, reconstruct, or replace the worktree.

Founder-reported A14 terminal entering A15:
- `STATUS=BLOCKED`;
- current changed-path count = 28;
- `git diff --check` PASS;
- no product commit;
- no product push;
- no further final validation after the blocker;
- exact blocker: `familypilot-mobile-payment-tap.js` normal short-tap path still directly mutates adopted state and calls legacy `save()`;
- M3-04 exposed the incompatibility after canonical skip.

Before any edit verify:
1. local `HEAD` remains exact `fea49751c850c1f62cc184843d5c19510d5ddbbf`;
2. product remote branch remains exact same base;
3. current changed-path count is exactly 28;
4. no unrelated path has appeared;
5. `git diff --check` passes;
6. generated browser harnesses/profiles from prior stopped runs are absent.

If any check fails, return `STATUS=BLOCKED` before editing.

## 2. Independently verified blocker

Exact-base `familypilot-mobile-payment-tap.js` blob:
`47e1170f35131423c8192f7a69ace33d1eaa6d5c`

The exact base module:
- dynamically boots after `__FP_M3_05_READY__` and `__FP_OBLIGATION_STATE_UI_READY__`;
- captures `const state=runtime.state,save=runtime.save,now=runtime.now`;
- defines `occurrence(id)` over the long-lived captured adopted root;
- `restoreSkipped(id)` mutates `item.revisions`, `item.status`, `item.skippedAt`, `item.lastEditedAt` directly on adopted state;
- then calls `save(); runtime.renderAll(); toast(...)`;
- `shortAction(id)` invokes that legacy restore path for a skipped occurrence.

This is incompatible with the A11/A14 read-only adopted-state invariant and with P4D3B's draft-only authoritative mutation boundary.

A14 correctly stopped before a 29th path and did not create a bypass.

## 3. Closed dependency-owner scan before A15

A15 is not a blind `+1` expansion.

The bounded scan proved:

### Runtime loader
`familypilot-scope.js` already loads, in order, the obligation-state package, M3-05 lifecycle, then `familypilot-mobile-payment-tap.js`, then operation mobile/date modules. The loader path is correct and requires no A15 edit.

### Canonical M3-06 owner
`.github/workflows/pf08a-m3-06-mobile-ux-gate.yml` already owns both:
- `familypilot-mobile-payment-tap.js`;
- `tools/pf08a-m3-06-mobile-ux-browser-smoke.mjs`.

The workflow itself requires no edit.

Exact-base M3-06 smoke blob:
`2983655f475e7b8dddb06654cb66fed05ccb6838`

That smoke is also stale for the current canonical asynchronous runtime contract. It currently contains synchronous calls such as `setActiveWallet`, `createRule`, `contextAction`, `addManualExpense`, direct `obligationState.render()` calls, fixed short sleeps, and Linux-only Chrome discovery. Therefore the direct product path and its direct validation owner must be corrected together.

### Already-inside accumulated 28 paths
R02 and R03 are direct payment-toggle consumers and are already part of the accumulated changed set from A13/A14. They may be completed only within their existing authorized caller-reconciliation scope and do not increase the path ceiling.

`tools/fp85-p4d3b-authoritative-ui-mutation-gateway-domain-smoke.cjs` is already inside the accumulated P4D3B changed set and may be strengthened only as necessary to cover this newly proven mobile legacy-save path. It does not increase the ceiling.

`familypilot-obligation-state-ui.js` and `tools/pf08a-m3-04-browser-smoke.mjs` are already paths 27–28 from A14 and may be adjusted only as necessary to complete the same mobile/obligation-state canonical interaction.

### No new path required
- `.github/workflows/pf08a-m3-06-mobile-ux-gate.yml` — already correct owner list;
- `tools/pf08a-m3-06-public-browser-smoke.mjs` — publication-only wrapper that consumes the local M3-06 smoke after publication; do not edit prepublication;
- `.github/workflows/pf08a-m3-06-trusted-public-gate.yml` — public/deploy verification, no prepublication edit;
- R04/R05 — no new mobile short-tap correction path is required by the inspected scenarios;
- `familypilot-scope.js` / `src/familypilot-scope.js` — loader already correct for this dependency.

## 4. Scope — exact ceiling 30

A15 enters with exactly 28 changed tracked paths.

A15 authorizes exactly TWO additional changed tracked paths:

29. `familypilot-mobile-payment-tap.js`
30. `tools/pf08a-m3-06-mobile-ux-browser-smoke.mjs`

Final changed-path count must be exactly 30.

NO 31st tracked path is authorized.

Existing changed paths may be edited only where directly necessary for the same proved interaction:
- `familypilot-obligation-state-ui.js`;
- `tools/pf08a-m3-04-browser-smoke.mjs`;
- `tools/pf08a-m3-07b-r02-browser-smoke.mjs`;
- `tools/pf08a-m3-07b-r03-browser-smoke.mjs`;
- `tools/fp85-p4d3b-authoritative-ui-mutation-gateway-domain-smoke.cjs`.

Do not broaden edits across the rest of the accumulated 30-path set merely because those files are already dirty.

If a 31st tracked path is genuinely required, return `STATUS=BLOCKED` with exact causal evidence and STOP without product commit/push.

## 5. Product objective — one canonical short-tap mutation owner

Make mobile payment-tap behavior compatible with adopted read-only state and the authoritative P4D3B mutation contract while preserving UX semantics.

Required architecture:

```text
pointer/click gesture
  -> read CURRENT adopted state
  -> exactly one canonical command/mutation owner
  -> performCanonicalUiMutation(writable draft)
  -> authoritative commit/adoption
  -> success render/toast only after adoption
```

Forbidden:
- captured writable `runtime.state` as a mutation root;
- `runtime.save` or any legacy `save()` compatibility mutation path;
- direct mutation of an adopted occurrence/revision/config;
- local-first optimistic mutation;
- hidden write-through Proxy or shadow authority;
- duplicate canonical commits for one gesture;
- fake DOM/API/readiness/state for tests;
- success toast/render before commit/adoption;
- fallback to local mutation if the authoritative draft cannot find the occurrence.

## 6. A15-1 — remove stale adopted-state capture

In `familypilot-mobile-payment-tap.js`:
- do not retain a long-lived `const state=runtime.state` for mutable/read-after-adoption behavior;
- read current state dynamically from the current runtime after each adoption;
- `occurrence(id)` and `updateContext(id)` must resolve from the current adopted state, not from a stale pre-commit root;
- stable IDs may be retained; adopted entity object references must not be retained across whole-state adoption.

Boot/read/context behavior must remain write-free.

## 7. A15-2 — canonical short-tap unskip

For a skipped occurrence, one short tap must clear `skipped` through exactly one real canonical mutation route.

Prefer a single mutation owner rather than two implementations fighting the same gesture. It is acceptable to:
- delegate the mobile short-tap to the real obligation-state canonical command/event path; OR
- have the mobile module call `runtime.performCanonicalUiMutation` directly,

provided all of the following are proven:
1. exactly one canonical mutation is attempted per user gesture;
2. the mutator receives the writable draft and finds the occurrence by stable ID inside that draft;
3. revision/audit semantics remain equivalent to `obligation_skip_unchecked`;
4. status becomes `planned`, `skippedAt` becomes null, audit metadata is preserved;
5. adopted state remains unchanged while an authoritative commit is held/pending;
6. success render/toast occurs only after successful adoption;
7. failure shows no success UI and has no local fallback;
8. rapid duplicate pointer/click delivery does not create duplicate commits/revisions.

If the exact current authoritative draft still returns `reason: not-found` for a stable occurrence ID that is present in the current adopted state, do NOT bypass it. Diagnose whether the problem is stale ID/state use inside A14 obligation-state/mobile interaction. You may correct `familypilot-obligation-state-ui.js` within its already-authorized path only if the cause is inside that same interaction. If the authoritative source itself demonstrably lacks a legitimately adopted occurrence and fixing that would require a new authority/persistence path, return `STATUS=BLOCKED` with exact evidence.

## 8. A15-3 — preserve mobile gesture semantics

Preserve existing behavior:
- short tap on skipped payment = canonical unskip;
- short tap on non-skipped payment = ordinary payment proxy behavior;
- long press opens context menu and does not also fire short action;
- movement cancellation remains safe;
- context-action edge tapping remains functional;
- duplicate synthetic/click delivery remains suppressed;
- target size/interaction semantics remain unchanged;
- no external notification behavior is introduced.

If async action handling requires an in-flight guard, it must be bounded to the gesture/action and must not become a queue or offline authority.

Test API, where present, must expose the same real product behavior and return awaitable results; it must not expose an easier mutation bypass.

## 9. A15-4 — M3-06 canonical async regression owner

Edit `tools/pf08a-m3-06-mobile-ux-browser-smoke.mjs` only to make the same historical scenarios valid against the current canonical asynchronous architecture.

Preserve marker:
`PF08A_M3_06_MOBILE_UX_BROWSER_PASS`

Preserve at least the existing assertion inventory:
- edge/full-target short tap clears skipped state;
- short tap does not open context menu;
- manual existing expense can be linked without duplicate operation;
- operation history remains collapsed by default;
- hidden dock does not reserve stale bottom space;
- custom date picker selected/today states remain distinct;
- no runtime exceptions.

Required adaptation:
- await Promise-based `setActiveWallet`, `createRule`, skip/context mutation, manual-expense creation/link actions, and other canonical helpers;
- use stable IDs from successful results, then reacquire adopted state with `getState()` after canonical adoption;
- do not retain stale entity objects across whole-state adoption;
- remove direct `api.obligationState.render()` as a boot/authority crutch;
- use normal `openList()` / real render chain and bounded `waitFor` for actual DOM/state transitions;
- after pointer/click-driven actions, wait for adopted state/DOM instead of fixed 20–30 ms success assumptions;
- do not weaken/remove assertions;
- do not fabricate module readiness, payment toggle DOM, manual link success, or canonical mutation results.

Browser discovery may add support for an already-installed Google Chrome/Chromium supplied by `CHROME_PATH`, while preserving the existing Linux candidates as fallback and preserving the same browser arguments. Do not install software. Do not substitute a different browser engine merely to make the test pass.

Required:
`M3_06_ASSERTION_INVENTORY_PRESERVED=PASS`

## 10. A15-5 — complete A14 M3-04/R02/R03 interaction

Within their already-changed paths, complete only the remaining directly affected caller reconciliation:
- `tools/pf08a-m3-04-browser-smoke.mjs`;
- R02;
- R03;
- obligation-state product module if exact stale-state/command-owner adjustment is needed.

Requirements remain:
- no direct `obligationState.render()` as authority/boot crutch;
- await canonical helpers;
- stable IDs + reacquired adopted state;
- real `[data-state-payment-toggle]` through normal render chain;
- assertion inventories preserved;
- no fake API/DOM;
- no writable adopted-state path.

Required:
- `M3_04_ASSERTION_INVENTORY_PRESERVED=PASS`
- `R02_ASSERTION_INVENTORY_PRESERVED=PASS`
- `R03_ASSERTION_INVENTORY_PRESERVED=PASS`
- `A13_TEST_BYPASS_CREATED=NO`

## 11. A15-6 — dedicated P4D3B regression coverage

Because the newly proven blocker is another concrete legacy mutation path under the same product defect #340, strengthen the already-changed `tools/fp85-p4d3b-authoritative-ui-mutation-gateway-domain-smoke.cjs` only if its current accumulated version does not already prove the mobile closure.

The dedicated smoke must prove at minimum:
- `familypilot-mobile-payment-tap.js` no longer imports/captures/uses legacy runtime `save` for canonical state mutation;
- short-tap unskip cannot mutate an adopted root before authoritative success;
- held commit leaves adopted state and success UI unchanged;
- failure leaves adopted state unchanged and does not emit success UI;
- one gesture cannot result in duplicate authoritative mutations.

Do not replace behavioral proof with only a shallow source grep. Source invariants may supplement behavioral held/failure proof.

## 12. Critical-test sensitivity — mandatory under current governance

Current Rule 98 requires sensitivity evidence for materially changed critical tests when false-pass risk is meaningful.

A14 materially changed M3-04; A15 materially changes M3-06. If the dedicated P4D3B smoke is materially strengthened for mobile coverage, include it in the same sensitivity proof.

Use a bounded disposable negative control OUTSIDE the repository. Do not modify the real worktree to create the defect.

Permitted method:
1. create one disposable copy/snapshot of the current candidate worktree outside the repo, excluding `.git` and generated browser artifacts;
2. in the disposable copy only, replace `familypilot-mobile-payment-tap.js` with the exact defect-present base blob `47e1170f35131423c8192f7a69ace33d1eaa6d5c` from product base `fea49751...`;
3. keep the current corrected critical tests and other corrected product files unchanged in that disposable copy;
4. run the current M3-04 and M3-06 critical tests against the defect-present copy;
5. they must FAIL for a reason causally attributable to the mobile legacy short-tap/adopted-state defect (missing/incorrect canonical unskip, adopted-state write failure, duplicate/early success, or equivalent direct target assertion);
6. if the dedicated P4D3B smoke was materially extended, it must also reject the defect-present copy;
7. run the same tests on the real corrected worktree and require PASS;
8. delete the disposable copy completely.

Do not weaken the test to manufacture a negative result. A launcher/environment failure is NOT sensitivity evidence.

Required:
- `M3_04_TEST_SENSITIVITY=PASS`
- `M3_06_TEST_SENSITIVITY=PASS`
- `P4D3B_MOBILE_TEST_SENSITIVITY=PASS` if dedicated smoke materially changed for this closure
- `SENSITIVITY_TEMP_COPY_CLEANED=YES`

If the corrected critical test still passes against the exact defect-present negative control, return `STATUS=BLOCKED`; do not publish a candidate with an insensitive critical oracle.

## 13. Targeted validation after LAST material edit

Run after the last A15 material edit:

1. exact changed-path gate: entry 28 -> final exactly 30; no 31st path;
2. `git diff --check`;
3. `node --check familypilot-mobile-payment-tap.js`;
4. `node --check familypilot-obligation-state-ui.js`;
5. `node --check tools/pf08a-m3-04-browser-smoke.mjs`;
6. `node --check tools/pf08a-m3-06-mobile-ux-browser-smoke.mjs`;
7. `node --check` R02/R03;
8. `node --check tools/fp85-p4d3b-authoritative-ui-mutation-gateway-domain-smoke.cjs`;
9. read-only boot/render Proxy characterization for obligation-state + mobile package;
10. canonical hide/show/unskip characterization;
11. mobile held/failure/duplicate-gesture short-tap characterization;
12. dedicated P4D3B domain smoke for the current correction stage;
13. M3-04 browser smoke;
14. M3-06 mobile UX browser smoke;
15. R02 browser smoke;
16. R03 browser smoke;
17. R01 post-commit render smoke;
18. planned-income historical smoke, because the full dynamic loader passes through the corrected obligation/mobile chain;
19. M4-03 savings/forecast browser smoke, because the same loader chain must still reach downstream readiness;
20. root/mirror equality/identity gates required by the current accumulated candidate;
21. critical-test sensitivity negative/positive controls from §12.

Use the already-established local Chrome/Chromium mechanism. No software install, live provider action, deploy, or test weakening.

## 14. Preserved Validation Manifest — current Rule 95

Do NOT rerun every historical gate merely because governance changed or because A15 exists.

Preserve prior valid PASS/acceptance evidence that is outside the causal/dependency corridor and whose relevant sources have not changed since its proof. In particular, do not repeat accepted P1/P2/P3A/P3B/P4A/P4B/P4C1/P4C2/P4D1/P4D2/P4D3A work.

For the current uncommitted P4D3B candidate, preserve unaffected creator PASS evidence only if:
- the proof was produced after the last change to its relevant source/dependency set; and
- A14/A15 paths do not invalidate that dependency set.

The required A15 revalidation corridor is the targeted set in §13 plus the current dedicated P4D3B held/failure integration proof. Do not rerun unrelated public/deploy/live tests.

Return a short preserved-validation manifest identifying what was preserved and why.

Required:
`PRESERVED_VALIDATION_MANIFEST=PASS`

## 15. Candidate publication authority

ONLY if all A15 targeted validation, sensitivity evidence, and preserved-validation manifest requirements PASS:

1. re-check remote product branch still equals exact base `fea49751c850c1f62cc184843d5c19510d5ddbbf`;
2. create at most ONE coherent product candidate commit containing the accumulated validated P4D3B correction work;
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

## 16. Stop conditions

Return `STATUS=BLOCKED` and STOP if:
- current governance changed and the new rules invalidate this corridor;
- local HEAD differs from exact product base before publication;
- remote product branch moved;
- entry changed-path count is not 28;
- final changed-path count would exceed 30;
- a 31st tracked path is required;
- a new authority/persistence product source is required to fix `reason:not-found`;
- mobile short-tap cannot be reduced to one canonical mutation owner;
- any product/test path needs fake DOM/API/state or writable adopted state;
- critical assertion inventory would need weakening;
- M3-04 or M3-06 does not detect the exact defect-present negative control;
- software installation/live provider action is required;
- targeted affected/dependent validation fails and cannot be classified environmental.

Do not silently expand scope and do not create a candidate commit on a blocked result.

## 17. Successful producer return

```text
STATUS=SELF_VERIFIED_PENDING_INDEPENDENT_REVIEW
AMENDMENT_ID=FP85-P4D3B-R3B-R4-R1-A1-R1-A15-MOBILE-PAYMENT-TAP-CANONICAL-CLOSURE
GOVERNANCE_COMMIT=<exact current published governance used by executor>
PRODUCT_BASE=fea49751c850c1f62cc184843d5c19510d5ddbbf
ENTRY_CHANGED_PATH_COUNT=28
A15_NEW_PATHS=2
FINAL_CHANGED_PATH_COUNT=30
CHANGED_PATH_GATE=PASS
MOBILE_TAP_READ_CURRENT_ADOPTED_STATE=PASS
MOBILE_TAP_LEGACY_SAVE_REMOVED=PASS
MOBILE_TAP_SINGLE_CANONICAL_UNSKIP=PASS
MOBILE_TAP_HELD_COMMIT_NO_EARLY_SUCCESS=PASS
MOBILE_TAP_FAILURE_NO_LOCAL_FALLBACK=PASS
MOBILE_TAP_DUPLICATE_GESTURE_GUARD=PASS
OBLIGATION_STATE_CANONICAL_INTERACTION=PASS
M3_04_ASSERTION_INVENTORY_PRESERVED=PASS
M3_06_ASSERTION_INVENTORY_PRESERVED=PASS
R02_ASSERTION_INVENTORY_PRESERVED=PASS
R03_ASSERTION_INVENTORY_PRESERVED=PASS
M3_04_TEST_SENSITIVITY=PASS
M3_06_TEST_SENSITIVITY=PASS
P4D3B_MOBILE_TEST_SENSITIVITY=<PASS or NOT_MATERIALLY_CHANGED_WITH_EVIDENCE>
SENSITIVITY_TEMP_COPY_CLEANED=YES
P4D3B_DOMAIN_SMOKE=PASS
M3_04_BROWSER=PASS
M3_06_BROWSER=PASS
R02_BROWSER=PASS
R03_BROWSER=PASS
R01_POST_COMMIT_RENDER=PASS
PLANNED_INCOME_DOWNSTREAM=PASS
M4_03_DOWNSTREAM=PASS
A13_TEST_BYPASS_CREATED=NO
PRESERVED_VALIDATION_MANIFEST=PASS
TARGETED_A15_VALIDATION=PASS
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

Blocked return must identify the exact failing gate/path/evidence, confirm final changed-path count, and confirm no unauthorized product commit/push occurred.