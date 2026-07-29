# FamilyPilot PF-08A CP-04 — Assistant Attempt Design Record

```text
PROJECT = FamilyPilot
ROADMAP = PF-08A Stabilization
WAVE = Wave 1D
CHECKPOINT = CP-04
ATTEMPT_ACTOR = Coordination Chat
ASSISTANT_IMPLEMENTATION_ATTEMPT = 1 / 1
ASSISTANT_CORRECTION_ALLOWANCE = 0 / 1 USED
STARTING_CANDIDATE = b30b57405126527e66415a851e1f6bbe90f6bd98
TARGET_PR = 141
TARGET_BRANCH = agent/pf08a-wave1d-cp04-corrections
STAGING_BRANCH = staging/familypilot-pr141-harness-cleanup-b30b574
```

## Root cause

The three Wave 1D browser harnesses create a long wall-timeout promise but do not clear its timer after a PASS/FAIL report wins `Promise.race`. The active timer keeps Node alive for the complete 30-second or 420-second timeout after the substantive result is already emitted. Their cleanup also uses `child.killed` as if it proved child-process exit; it only reports whether a signal was sent.

This defect is separate from the review-host Chromium failure. The acceptance redesign therefore requires both:

1. deterministic harness termination;
2. pinned browser execution producing immutable evidence;
3. fresh independent review of that evidence without requiring the reviewer host to execute Chromium.

## Bounded implementation scope

Only these paths may change:

```text
tools/pf08a-wave1d-visible-degraded-browser-smoke.mjs
tools/pf08a-wave1d-scope-fallback-browser-smoke.mjs
tools/pf08a-wave1d-recovery-reload-browser-smoke.mjs
```

Changes:

- retain and clear the wall-timeout handle;
- test actual child exit state through `exitCode` and `signalCode`;
- wait bounded time after SIGTERM;
- escalate to SIGKILL only when the child is still alive;
- close active HTTP connections before awaiting server close.

Product/runtime code, assertions, timeout ceilings and test semantics are unchanged.

## Experiment policy

- This is the single authorized assistant implementation attempt.
- One bounded correction is allowed only if exact verification finds an error.
- A second error after correction requires abandoning the assistant implementation and transferring coding to Codex from `b30b57405126527e66415a851e1f6bbe90f6bd98`.
- PR #141 must remain OPEN / DRAFT / NOT MERGED until all later gates pass.
- Merge, mark-ready, PR body changes, Wave 1E and P0-04 closure remain prohibited.
