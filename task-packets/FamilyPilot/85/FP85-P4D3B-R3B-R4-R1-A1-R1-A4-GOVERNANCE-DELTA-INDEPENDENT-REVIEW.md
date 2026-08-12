# FamilyPilot #85 — P4D3B A1-R1 A4 Governance Delta / Independent Review Amendment

TASK_ID: FP85-P4D3B-R3B-R4-R1-A1-R1-A4-GOVERNANCE-DELTA-INDEPENDENT-REVIEW
AMENDS: FP85-P4D3B-R3B-R4-R1-A1-R1-A3-CANONICAL-COMPATIBILITY-SCOPE-RECONCILIATION
PARENT: maloma/FamilyPilot#85
ERROR_LEDGER: maloma/decisionos-portfolio-governance#340
EXECUTION_PROFILE: BOUNDED_DIRECT
P4D3B_FINAL_STATUS: NOT_ACCEPTED

## 1. Governance snapshot update

Published DecisionOS governance changed during the capacity interruption.

Current exact governance commit:

`c886102d0350166ae429ea755963a92285367cd6`

Current Registry:

`docs/governance/00_Document_Registry.md` v5.22

Relevant updated owners include:

- `91_Work_Execution_Protocol.md` v1.3;
- `93_Autonomous_Agent_and_Launcher_Standard.md` v1.7;
- `94_Automation_and_Execution_Design_Principles.md` v1.4;
- `95_Evidence_and_Communication_Standard.md` v1.7;
- `90_Command_Library.md` v2.10;
- `92_GitHub_Resource_Discipline.md` v1.1.

This A4 is a product-task delta only. It does not copy or replace universal governance. The exact governance commit above remains authoritative.

## 2. Continue SAME Codex chat and SAME worktree

Do not restart the implementation.

Continue the SAME Codex chat and SAME existing uncommitted worktree if:

1. product HEAD remains exact `fea49751c850c1f62cc184843d5c19510d5ddbbf`;
2. no product commit/push has occurred after that base;
3. current changed paths remain within the A3 maximum 14-path allowlist;
4. no unrelated changes exist.

The capacity interruption is an execution-environment interruption, not a product rejection and not a correction-attempt consumption event.

Do not repeat A3 per-hunk reconciliation unless the changed-path set or relevant hunks materially changed after the last completed reconciliation.

## 3. Scope is unchanged

A4 does NOT add any product path.

The A3 maximum 14-path allowlist remains the complete ceiling.

Current work may contain 13 changed paths. A fourteenth path is permitted only if already authorized by A3 and actually necessary. No fifteenth path.

No PR, merge, deploy, workflow dispatch or live Supabase action is authorized.

## 4. Current implementation continuation

The currently identified remaining canonical-compatibility gap is allowed to continue:

### Partial payments

`familypilot-partial-payments.js`

Finish conversion of legacy mutation entry points away from captured `runtime.state` / `runtime.save` to the already-authorized canonical draft bridge.

Requirements remain:

- current-state reads after whole-state adoption;
- no writable runtime state;
- no `runtime.save` canonical authority;
- canonical writes only inside draft mutation;
- preserve existing payment/partial-payment semantics;
- do not expand into unrelated payment feature redesign.

### Payment attention demo/test layer

`familypilot-payment-attention.js`

Finish only the legacy demo/test canonical compatibility needed by the current regression suite.

Requirements remain:

- no direct live-state mutation outside canonical draft flow;
- no `runtime.save` canonical authority;
- no change to payment-attention product semantics;
- no demo redesign;
- preserve existing fixtures/behavior needed by historical tests.

## 5. Rule 91 v1.3 small-step/self-check semantics

For remaining implementation, use small independently verifiable steps with one objective per step.

At minimum treat these as separate steps unless evidence shows they are inseparable:

### STEP-A4-1

SINGLE_OBJECTIVE: partial-payment canonical compatibility

EXPECTED_RESULT: partial-payment mutation entry points use current-state reads and canonical draft mutation only.

VERIFICATION: targeted partial-payment / linked-obligation tests plus structural no-legacy-authority checks.

### STEP-A4-2

SINGLE_OBJECTIVE: payment-attention demo/test canonical compatibility

EXPECTED_RESULT: demo/test fixture mutations use canonical draft mutation without changing attention semantics.

VERIFICATION: targeted payment-attention / historical browser tests plus structural no-legacy-authority checks.

### STEP-A4-3

SINGLE_OBJECTIVE: coherent final regression validation

EXPECTED_RESULT: all A1-R1+A2+A3 required smokes and stage contracts pass on the final worktree.

VERIFICATION: exact final validation set from A3/A2/A1-R1.

Creator self-check is mandatory after each step.

A self-checked step is not independently accepted. Its status is:

`SELF_VERIFIED / PENDING_INDEPENDENT_REVIEW`

Related steps may remain in one bounded dependent review pool while implementation continues, because they share the same canonical runtime compatibility boundary. Do not enlarge that pool beyond the A3 task scope.

## 6. Candidate commit / push semantics

After all final creator-side validations pass:

- creating one coherent product candidate commit remains allowed by the existing Founder authorization;
- one normal fast-forward push to `fp85-p4d3b-authoritative-ui-mutation-gateway` remains allowed as publication of an INTERMEDIATE CANDIDATE for review;
- that push MUST NOT be reported as Governance Acceptance, R3B acceptance, merge readiness, release or final P4D3B PASS;
- exact remote readback remains required;
- no force push.

The durable candidate status after successful creator verification is:

`SELF_VERIFIED / PENDING_INDEPENDENT_REVIEW`

`R3B_FINAL_ACCEPTED=NO`

`P4D3B_FINAL_ACCEPTED=NO`

`ERROR_LEDGER_340_CLOSE_ALLOWED=NO`

`LIVE_CUTOVER_ALLOWED=NO`

## 7. Independent clean-context review is mandatory before acceptance

Under Rule 91 v1.3 and Rule 95 v1.6/v1.7, creator self-verification does not constitute independent review.

After an exact candidate is pushed and remote readback succeeds, stop implementation and return the exact candidate identity to Coordination for a separate clean-context review.

The independent reviewer must receive only bounded review inputs, including:

- exact authoritative product baseline;
- exact candidate commit;
- exact changed scope;
- acceptance criteria;
- producer test/evidence output;
- authority boundaries and prohibited scope.

The independent reviewer must not silently modify the candidate or manufacture missing producer evidence.

Only after independent review PASS may Coordination perform Governance Acceptance of R3B.

No merge/release/live cutover is authorized by this amendment.

## 8. Model / reasoning / request discipline

Existing exact task authorization remains:

`GPT-5.6 Terra / High / Normal`

Do not switch model automatically because of capacity.

Do not escalate above HIGH.

Do not use accelerated reasoning speed.

Capacity interruption does not justify blind retry chains. Resume the same task when the authorized route becomes available.

## 9. VirtualAlloc environment failure remains fail-closed

The A2/A3 `VirtualAlloc failed` handling remains unchanged.

After final edits, if the exact failed command encounters `VirtualAlloc failed`, retry the same command once without code changes after clearing only stale task-created child processes.

If it recurs without a product assertion failure:

`STATUS=BLOCKED`

`ENVIRONMENT_BLOCKER=VIRTUALALLOC_FAILURE`

No commit/push in that blocked state.

## 10. Final validation

All A1-R1+A2+A3 validation remains mandatory after the LAST material edit.

At minimum preserve exact stage contracts:

- `--stage=r3a` → `FP85_P4D3B_R3A_CORE_UI_MUTATION_PASS`
- `--stage=r3b` → `FP85_P4D3B_R3B_OBLIGATIONS_PASS`
- `--stage=a1-r1` diagnostic stage if retained
- no-stage/full → deterministic expected incomplete result and NO final P4D3B PASS marker.

Run all required historical M3-07B browser regressions that are available in the current route, preserving historical assertions.

Root/mirror identity and changed-path gate remain mandatory.

## 11. Git / external-action boundary

Allowed after full creator-side PASS:

- one coherent candidate commit;
- one normal fast-forward push to the authorized feature branch;
- one exact remote readback.

Not allowed:

- force push;
- PR create/update;
- merge;
- deploy;
- workflow dispatch;
- live Supabase actions;
- live user/membership/canonical-state writes;
- authority activation/cutover.

## 12. Final producer return

If creator-side work completes and candidate is pushed, return at least:

```text
STATUS=SELF_VERIFIED_PENDING_INDEPENDENT_REVIEW
TASK_ID=FP85-P4D3B-R3B-R4-R1-A1-R1-A4-GOVERNANCE-DELTA-INDEPENDENT-REVIEW
GOVERNANCE_COMMIT=c886102d0350166ae429ea755963a92285367cd6
BASE=fea49751c850c1f62cc184843d5c19510d5ddbbf
FINAL_COMMIT=<exact-sha>
PUSHED=YES
REMOTE_BRANCH_READBACK=PASS
CHANGED_PATH_GATE=PASS
CHANGED_PATHS=<exact-list>

STEP_A4_1_SELF_CHECK=PASS|FAIL
STEP_A4_2_SELF_CHECK=PASS|FAIL
STEP_A4_3_FINAL_CREATOR_VALIDATION=PASS|FAIL|BLOCKED

R3A_STAGE_SMOKE=PASS|FAIL
R3B_STAGE_SMOKE=PASS|FAIL
A1_R1_STAGE_SMOKE=PASS|FAIL|NA
HISTORICAL_BROWSER_REGRESSIONS=<PASS-list-or-blocker>
ROOT_MIRROR_BYTE_IDENTICAL=PASS|FAIL
GIT_DIFF_CHECK=PASS|FAIL
ENVIRONMENT_BLOCKER=NONE|VIRTUALALLOC_FAILURE|OTHER

INDEPENDENT_REVIEW_STATUS=PENDING
R3B_FINAL_ACCEPTED=NO
P4D3B_FINAL_ACCEPTED=NO
ERROR_LEDGER_340_CLOSE_ALLOWED=NO
LIVE_CUTOVER_ALLOWED=NO

PR_ACTIONS=0
MERGE_ACTIONS=0
DEPLOY_ACTIONS=0
WORKFLOW_DISPATCH_ACTIONS=0
LIVE_SUPABASE_CALLS=0
```

If blocked before candidate publication, return `STATUS=BLOCKED`, preserve the worktree, and do not commit/push unless the existing task contract explicitly allows a durable non-published local checkpoint and it does not violate the blocker.
