# FamilyPilot #88 — Search v1 independent review launch addendum

Status: `REVIEW_EXECUTION_READY`

This file is metadata-only. It does not change the Search v1 code candidate.

## Exact review target

- Repository: `maloma/sandbox`
- Accepted base: `1dcb19366ae2f23912ff1f4d32d4ec61e3417943`
- Exact code candidate: `e8fd3c177e990dc524c0bd10b54021c04c31c331`
- Candidate tree: `3beeafed49ebca232fd0cafd0d56cebf6c029298`
- Shared contract: `maloma/decisionos-ideas@366e1db47fc5788da07ed21212ed0fd862d83a42`, `ideas/IDEA-0009-search-core/README.md`
- Main review packet: `task-packets/FamilyPilot/88/reviews/2026-08-21_FP88_SEARCH_V1_INDEPENDENT_REVIEW_PACKET.md`

The exact candidate remains `e8fd3c177e990dc524c0bd10b54021c04c31c331`. This addendum does not authorize review of later metadata commits as product code.

## Reviewer profile

Use a separate ordinary ChatGPT chat in fresh clean context.

- Role: `INDEPENDENT_REVIEWER`
- Mode: `REVIEW ONLY`
- Model profile: `GPT-5.6 Sol / High / Normal`
- Codex: prohibited
- Candidate mutation: prohibited
- Repair/reimplementation/rebase/merge/deploy/issue closure: prohibited

## Authorized durable result-return path

Actual GitHub mode for the review is bounded `GH-2` only for the terminal result sink below while the reviewed candidate remains strictly read-only.

Authorized write:
- exactly one top-level terminal comment to `maloma/FamilyPilot#88`;
- after posting, perform one readback of that exact comment;
- then STOP.

All other GitHub writes are prohibited. In particular, the reviewer must not modify `maloma/sandbox`, update/close `FamilyPilot#88`, or write directly to the central Error Ledger.

If the reviewer finds a material error/deviation, the same one terminal comment remains the durable result sink and must include `ERROR_LEDGER_SYNC = PENDING`; the Coordination flow will synchronize the central Error Ledger after readback.

## Central Error Ledger correction

The main review packet was prepared before central Error Ledger write authority was established and therefore contains a historical `ERROR_LEDGER_SYNC = PENDING` statement for the producer correction.

That statement is now superseded for launch purposes:

- producer correction `ERROR_KEY = SEARCH_CORE:V1_CONTRACT:NONCANONICAL_RESULT_SHAPE` is synchronized at `maloma/decisionos-portfolio-governance#674`;
- current state: corrected and producer-verified; independent product acceptance remains pending;
- the reviewer must still independently verify the corrected exact candidate and must not treat Error Ledger synchronization as acceptance.

Review-control correction is recorded at `maloma/decisionos-portfolio-governance#675`.

## Terminal output

The terminal comment in `maloma/FamilyPilot#88` must contain exactly one review result with at least:

```text
VERDICT: PASS | FAIL
TARGET: e8fd3c177e990dc524c0bd10b54021c04c31c331
BASE: 1dcb19366ae2f23912ff1f4d32d4ec61e3417943
CONTRACT: maloma/decisionos-ideas@366e1db47fc5788da07ed21212ed0fd862d83a42 / IDEA-0009
TESTS: exact commands/results independently observed
BROWSER_SMOKE: PASS | FAIL | NOT_RUN with reason
BLOCKING_FINDINGS: none | numbered findings with exact evidence
NONBLOCKING_NOTES: optional bounded notes
ERROR_LEDGER_SYNC: NOT_NEEDED | PENDING
```

A `PASS` does not itself merge, deploy, close #88, or start #89. Those remain Coordinator actions after terminal readback and acceptance checks.
