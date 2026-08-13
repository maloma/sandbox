# FamilyPilot #85 — A16 R4 Exact Scope Set Reconciliation

TASK_ID: FP85-P4D3B-R3B-R4-R1-A1-R1-A16-R4-EXACT-SCOPE-SET-RECONCILIATION
TYPE: DIAGNOSTIC_RESULT_CORRECTION / ZERO PRODUCT EDITS / ZERO TEST EDITS
PARENT: maloma/FamilyPilot#85
A16_BASE: maloma/sandbox@95fb9be0f58595f078eaff11ec29e2ae02fe3323
A16_R3: maloma/sandbox@5de9719232d5b66e9384a8b3ca3aaa37cbb621a6
ERROR_LEDGER: maloma/decisionos-portfolio-governance#425
PRODUCT_BASE_AND_LOCAL_HEAD_EXPECTED: fea49751c850c1f62cc184843d5c19510d5ddbbf

## 1. Governance

Current published governance at packet publication:
`maloma/decisionos-portfolio-docs@881952097f16b8cdd5622ba605322bf038042e1a`
Registry `5.24`.

Before substantive work, re-check current published `main`. If it changed, perform Registry-first re-bootstrap and apply the newer rules.

## 2. Execution contract

`EXECUTION_PROFILE = BOUNDED_DIRECT`
`MODEL = GPT-5.6 Terra`
`REASONING_DEPTH = MEDIUM`
`REASONING_SPEED = NORMAL`

Why this is minimum sufficient:
- the full runtime scan is already complete and MUST NOT be repeated;
- no architecture discovery or product implementation is authorized;
- the task is deterministic reconciliation of already-produced exact path sets, classifications and counts;
- MEDIUM is appropriate for a bounded, well-defined, reproducibly checkable result correction;
- HIGH is not justified merely because the underlying product migration is complex.

Do not require unavailable in-agent effective model/depth self-introspection as a blocker. A positively evidenced conflicting configuration is blocking; absence of introspection is recorded, not guessed.

This is one successor Codex request. No automatic retry chain.

## 3. Hard zero-write boundary

Continue in the SAME Codex chat and SAME existing uncommitted 29-path product worktree.

Forbidden:
- product edits;
- test edits;
- staging;
- local product commit;
- push;
- branch creation;
- PR;
- workflow dispatch;
- deploy;
- live provider action;
- authority cutover;
- full runtime rescan.

Temporary calculation files are allowed only outside the repository and must be removed before return.

## 4. Entry state

Verify only the already-established continuation facts:
- local HEAD = `fea49751c850c1f62cc184843d5c19510d5ddbbf`;
- changed-path count = `29`;
- exact changed-path set matches A16-R3;
- staged path count = `0`;
- `git diff --check` = PASS;
- no generated repo artifacts.

If this differs, return `STATUS=BLOCKED` with exact delta. Do not modify anything.

## 5. Exact inconsistency to reconcile

The prior A16 terminal stated:
- product paths = `54`;
- validation paths = `33`;
- overlap with current 29 = `20`;
- new paths = `68`;
- final recommended changed-path count = `97`.

Coordination independently recounted the literal returned lists and obtained:
- literal product list = `53` paths;
- literal validation list = `33` paths;
- product+validation union = `86` paths;
- overlap with current 29 = `20` paths;
- returned-list paths not already changed = `66`;
- current29 union returned lists = `95` paths;
- 9 current changed paths are outside the returned recommended lists.

Do NOT assume either `97` or `95` is the intended final implementation scope. Determine which exact path(s), if any, were omitted/misclassified in the prior terminal and return internally self-consistent sets.

## 6. Required source of truth

Use ONLY:
1. the already-completed A16 analysis/evidence available in this same Codex chat/session;
2. the exact current 29-path worktree inventory from A16-R3;
3. deterministic set arithmetic.

Do not redo the 80-module loaded-runtime scan unless a specific missing path cannot be classified from the already-completed A16 evidence. If one exact unresolved item genuinely requires new source inspection, bounded read-only inspection of that item is allowed, but do not restart a broad scan.

## 7. Required classification sets

Return exact lexicographically sorted lists with no duplicates and no wildcard/group shorthand:

### A. `PRODUCT_EDIT_REQUIRED`
Only product paths for which the completed A16 evidence proves a product-code change is actually required to close the authoritative read-only/canonical mutation invariant.

Do NOT place a path here merely because it is loaded, impacted, a mutator library, or must be regression-tested.

### B. `PRODUCT_INSPECT_OR_VALIDATE_ONLY`
Product paths that are relevant dependencies or draft-only mutator libraries but do not currently require an edit if their caller contract is corrected.

### C. `VALIDATION_EDIT_REQUIRED`
Only validation/test paths whose completed A16 evidence proves the test itself must change because it directly mutates adopted state, uses stale synchronous/async assumptions, stale entity references, artificial render forcing, or otherwise cannot validly verify the corrected product.

### D. `VALIDATION_RUN_ONLY`
Validation/test paths that must be run for coverage/preservation but for which A16 did not prove a test edit is required.

### E. `CURRENT29_PRESERVE_ONLY`
Current changed paths that are not in A/B/C/D but must remain preserved in the worktree and later undergo continuity/reverification as applicable.

Every current changed path and every prior A16 recommended product/validation path must appear in exactly one applicable primary set. No path may silently disappear.

## 8. Exact arithmetic proof

Return these machine-checkable counts and identities:

```text
CURRENT29_COUNT=29
PRODUCT_EDIT_REQUIRED_COUNT=<n>
PRODUCT_INSPECT_OR_VALIDATE_ONLY_COUNT=<n>
VALIDATION_EDIT_REQUIRED_COUNT=<n>
VALIDATION_RUN_ONLY_COUNT=<n>
CURRENT29_PRESERVE_ONLY_COUNT=<n>
ALL_CLASSIFIED_UNION_COUNT=<n>
CURRENT29_OVERLAP_WITH_EDIT_REQUIRED=<n>
NEW_EDIT_REQUIRED_PATH_COUNT=<n>
MAXIMUM_POSSIBLE_FINAL_CHANGED_PATH_COUNT=<n>
```

Definitions:
- `EDIT_REQUIRED = PRODUCT_EDIT_REQUIRED ∪ VALIDATION_EDIT_REQUIRED`;
- `NEW_EDIT_REQUIRED = EDIT_REQUIRED - CURRENT29`;
- `MAXIMUM_POSSIBLE_FINAL_CHANGED_PATHS = CURRENT29 ∪ EDIT_REQUIRED`;
- inspect/run-only paths do NOT increase changed-path count unless a later separately evidenced defect reclassifies them through Coordination.

Also return sorted:
- `CURRENT29_INTERSECT_EDIT_REQUIRED`;
- `NEW_EDIT_REQUIRED_PATHS`;
- `CURRENT29_PRESERVE_ONLY`.

Use a deterministic set script or equivalent exact calculation and include its result summary. Arithmetic must reproduce exactly from the listed paths.

## 9. Scope-quality checks

Required checks:

`NO_LOADED_PATH_DROPPED_FROM_CLASSIFICATION=PASS`

`NO_DUPLICATE_PRIMARY_CLASSIFICATION=PASS`

`MUTATOR_LIBRARY_NOT_AUTOMATICALLY_EDIT_REQUIRED=PASS`

`RUN_ONLY_TEST_NOT_AUTOMATICALLY_EDIT_REQUIRED=PASS`

`CURRENT29_PRESERVATION_ACCOUNTED=PASS`

`SET_ARITHMETIC_REPRODUCIBLE=PASS`

If the prior A16 terminal omitted one or more paths, identify them explicitly as:
`A16_TERMINAL_OMITTED_PATHS=<exact list>`
with the evidence/classification for each.

If no path was omitted and the prior numeric claims were simply wrong, return:
`A16_TERMINAL_OMITTED_PATHS=NONE`
`A16_COUNT_ERROR_ONLY=YES`.

## 10. Implementation-profile conclusion

Do NOT build the implementation Batch in this task, but classify the next implementation profile from the reconciled result.

Given the broad multi-stage dependency graph, the expected result is `EXECUTION_BATCH`; if the reconciled edit-required set somehow proves truly bounded enough for `BOUNDED_DIRECT`, that contrary conclusion requires explicit evidence against Rule 91 complexity/risk triggers.

Return:
`RECOMMENDED_NEXT_EXECUTION_PROFILE=EXECUTION_BATCH|BOUNDED_DIRECT`
with one concise reason.

## 11. Terminal contract

Successful terminal:

```text
STATUS=SCOPE_RECONCILIATION_COMPLETE
A16_R4=PASS
GOVERNANCE_COMMIT=<actual current published commit>
PRODUCT_BASE=fea49751c850c1f62cc184843d5c19510d5ddbbf
CURRENT_CHANGED_PATH_COUNT=29
CURRENT_CHANGED_PATH_SET_MATCH_R3=PASS
PRODUCT_EDIT_REQUIRED_COUNT=<n>
PRODUCT_INSPECT_OR_VALIDATE_ONLY_COUNT=<n>
VALIDATION_EDIT_REQUIRED_COUNT=<n>
VALIDATION_RUN_ONLY_COUNT=<n>
CURRENT29_PRESERVE_ONLY_COUNT=<n>
ALL_CLASSIFIED_UNION_COUNT=<n>
NEW_EDIT_REQUIRED_PATH_COUNT=<n>
MAXIMUM_POSSIBLE_FINAL_CHANGED_PATH_COUNT=<n>
A16_TERMINAL_OMITTED_PATHS=<list|NONE>
A16_COUNT_ERROR_ONLY=YES|NO
NO_LOADED_PATH_DROPPED_FROM_CLASSIFICATION=PASS
NO_DUPLICATE_PRIMARY_CLASSIFICATION=PASS
MUTATOR_LIBRARY_NOT_AUTOMATICALLY_EDIT_REQUIRED=PASS
RUN_ONLY_TEST_NOT_AUTOMATICALLY_EDIT_REQUIRED=PASS
CURRENT29_PRESERVATION_ACCOUNTED=PASS
SET_ARITHMETIC_REPRODUCIBLE=PASS
RECOMMENDED_NEXT_EXECUTION_PROFILE=EXECUTION_BATCH|BOUNDED_DIRECT
PRODUCT_OR_TEST_EDIT_PERFORMED=NO
COMMIT_CREATED=NO
PUSH_PERFORMED=NO
NEXT_STATUS=READY_FOR_COORDINATION_BATCH_PLANNING
```

Then print all five exact primary sorted path lists.

If exact set reconciliation cannot be proven from already-completed evidence, return `STATUS=BLOCKED` with the smallest exact unresolved classification question. Do not change product/test files.