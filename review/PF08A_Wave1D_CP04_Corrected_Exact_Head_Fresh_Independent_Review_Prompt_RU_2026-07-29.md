# FRESH INDEPENDENT CLEAN-ROOM REVIEW PROMPT

## 0. Назначение

Проведи fresh independent clean-room runtime acceptance review исправленного кандидата FamilyPilot PF-08A Wave 1D CP-04.

Работай с нуля. Не наследуй выводы автора исправлений, Codex, Coordination Chat, предыдущих чатов или прежнего review result. Предыдущие findings считаются только обязательствами для повторной независимой проверки, а не доказательством их закрытия.

Используй только приложенный immutable review bundle.

Запрещено:

- GitHub, web и внешние источники;
- память и другие чаты;
- изменение candidate;
- исправление тестов или ослабление assertions;
- repository writes;
- merge, mark ready, изменение PR body;
- Wave 1E;
- объявление P0-04 закрытым.

Верни ровно один итоговый файл:

`PF08A_Wave1D_CP04_Corrected_Exact_Head_Fresh_Independent_Runtime_Acceptance_Result.md`

## 1. Immutable anchors

```text
CANDIDATE_REPOSITORY = maloma/sandbox
CANDIDATE_PR = 141
CANDIDATE_BASE = 1af3694a75230488270dbc6aa8e30ca642f7fb41
CANDIDATE_SHA = a4ecf55c4bbaabf3b258ee86e1c6a7ba55b65e0c
RUNTIME_RUN = 30410818364
RUNTIME_JOB = 90446242760
PUBLIC_VERIFIER_PR = 142
PUBLIC_VERIFIER_HEAD = 515b902ddcb6b23f1606306bcf4d916a40fb9ae8
PUBLIC_VERIFIER_RUN = 30413575358
PUBLIC_VERIFIER_JOB = 90455010165
PUBLIC_ARTIFACT_ID = 8709583866
PUBLIC_JSON_SHA256 = 4c0069077b5a10b7db51878d71db566199fd8cd100ff6636ac025fb5174292fb
DURABLE_EVIDENCE_COMMIT = db311481a3839a49c3391e34b90427a89b2a00d4
DURABLE_EVIDENCE_PATH = evidence/pf08a-wave1d-correction-durable-a4ecf55c4bba.json
CANONICAL_REPOSITORY = maloma/FamilyPilot
CANONICAL_COMMIT = 3b8b15ed3f79cccd6f67c4f9060de6a6901bd98a
```

Canonical source hierarchy:

1. `canonical/docs/119_PF-08A_Wave_1D_Visible_Degraded_Mode_Binding_Corrections.md` supersedes conflicting wording in document 117.
2. Documents 117, 118 and 119 define the binding architecture and corrections.
3. Document 120 authorizes the architecture and defines required runtime evidence; it is not itself runtime acceptance evidence.
4. Candidate source, executable tests, exact-head runs, public verifier output and durable evidence must agree.

## 2. Mandatory bundle integrity gate

Before substantive review:

1. Read `BUNDLE_METADATA.json`.
2. Run `sha256sum -c SHA256SUMS` from the bundle root.
3. Confirm exact candidate SHA using `candidate/CANDIDATE_HEAD.txt` and supplied Git metadata.
4. Confirm public artifact JSON SHA-256 equals the pinned value.
5. Confirm durable evidence pins the same candidate, verifier run/job and public JSON hash.

If any integrity check fails, stop with:

```text
REVIEW_STATUS = BLOCKED
RUNTIME_ACCEPTANCE = PROHIBITED
P0_04 = OPEN
```

Do not continue from a damaged or mismatched bundle.

## 3. Authoritative prior findings to re-evaluate independently

The previous exact result was:

```text
REVIEW_STATUS = FAIL
RUNTIME_ACCEPTANCE = PROHIBITED
P0_04 = OPEN
```

The exact findings were:

### CRITICAL-01 — Incomplete application-shell mutation containment

`application_shell_degraded` hid only `#actionDock`; other financial mutation controls remained enabled and reachable. The corrected candidate must implement a complete financial-mutation barrier while preserving unaffected read-only navigation and recovery controls.

### MAJOR-01 — Runtime exception evidence is non-observational

The former evidence hard-coded or asserted empty arrays without browser `window.error` and `unhandledrejection` collection. The corrected evidence must install observational collectors and fail on captured events.

### MAJOR-02 — Financial fingerprint is incomplete

The former fingerprint omitted financial collections including `debts`, `transfers` and `walletMovements`. The corrected fingerprint must cover the binding financial state and migration-managed collections sufficiently to prove isolation.

### MAJOR-03 — Required reload-recovery scenario is missing

The corrected evidence must execute the full recovery → real reload → healthy Scenario G and prove no duplicated scripts, screens, operations, registry modules or fallback entries, with persistence and financial state preserved.

### MAJOR-04 — Event-handler duplication is not tested

The corrected evidence must deterministically observe the production listener sources and prove required long-lived signatures occur exactly once, with no duplicate signatures before or after reload and stable contract across reload.

### MINOR-01 — Static fallback for scope/base failure is timeout-driven

A real `familypilot-scope.js` load failure must reveal the existing minimal static fallback directly and promptly through the direct failure path, without waiting for registry/UI timeout. The failed frame must not bootstrap scope/persistence runtime, must preserve exact wording, expose reload, and contain no financial mutation controls.

### MINOR-02 — Public `register()` returns mutable internal records

First and duplicate `FamilyPilotModuleRegistry.register()` returns must be detached clones. Top-level and nested external mutation must not alter authoritative metadata. Duplicate registration must not add catalogue entries or registration events.

Do not treat the implementation log or green CI as proof that any finding is closed. Inspect source and tests and execute the required checks independently.

## 4. Complete review scope

Review all files in `candidate/`, with priority to:

```text
.github/workflows/pf08a-wave1d-visible-degraded.yml
index.html
src/familypilot.html
familypilot-scope.js
src/familypilot-scope.js
familypilot-module-registry.js
src/familypilot-module-registry.js
familypilot-module-registry-retry-correction.js
src/familypilot-module-registry-retry-correction.js
familypilot-module-registry-ui.js
src/familypilot-module-registry-ui.js
familypilot-module-entry-bridge.js
src/familypilot-module-entry-bridge.js
familypilot-persistence-runtime.js
familypilot-wallet-management.js
familypilot-planned-income-amount-model.js
tools/pf08a-wave1d-module-registry-domain-smoke.mjs
tools/pf08a-wave1d-financial-fingerprint-domain-smoke.mjs
tools/pf08a-wave1d-listener-sentinel-domain-smoke.mjs
tools/pf08a-wave1d-integrated-browser-smoke.mjs
tools/pf08a-wave1d-visible-degraded-browser-smoke.mjs
tools/pf08a-wave1d-scope-fallback-browser-smoke.mjs
tools/pf08a-wave1d-recovery-reload-browser-smoke.mjs
tools/pf08a-wave1c-persistence-browser-smoke.mjs
tools/pf08a-wave1c-compatibility-migration-smoke.mjs
tools/pf08a-wave1c-integrated-browser-smoke.mjs
```

Also inspect:

```text
candidate.patch
candidate-name-status.txt
candidate-log.txt
canonical/docs/117_*.md
canonical/docs/118_*.md
canonical/docs/119_*.md
canonical/docs/120_*.md
evidence/public-artifact/*
evidence/durable/*.json
metadata/*.json
```

Enumerate every changed path from `candidate-name-status.txt` and account for each path in a complete coverage matrix.

## 5. Required executable verification

Use the bundle's candidate directory. Do not install dependencies. The scripts use Node built-ins and the available Chrome/Chromium binary.

Record:

```text
uname -a
node --version
python3 --version
available Chrome/Chromium path and version
```

Run syntax and mirrors:

```bash
node --check candidate/familypilot-module-registry.js
node --check candidate/src/familypilot-module-registry.js
node --check candidate/tools/pf08a-wave1d-module-registry-domain-smoke.mjs
node --check candidate/tools/pf08a-wave1d-financial-fingerprint-domain-smoke.mjs
node --check candidate/tools/pf08a-wave1d-listener-sentinel-domain-smoke.mjs
node --check candidate/tools/pf08a-wave1d-integrated-browser-smoke.mjs
node --check candidate/tools/pf08a-wave1d-visible-degraded-browser-smoke.mjs
node --check candidate/tools/pf08a-wave1d-scope-fallback-browser-smoke.mjs
node --check candidate/tools/pf08a-wave1d-recovery-reload-browser-smoke.mjs
cmp candidate/index.html candidate/src/familypilot.html
cmp candidate/familypilot-scope.js candidate/src/familypilot-scope.js
cmp candidate/familypilot-module-registry.js candidate/src/familypilot-module-registry.js
cmp candidate/familypilot-module-registry-retry-correction.js candidate/src/familypilot-module-registry-retry-correction.js
cmp candidate/familypilot-module-registry-ui.js candidate/src/familypilot-module-registry-ui.js
cmp candidate/familypilot-module-entry-bridge.js candidate/src/familypilot-module-entry-bridge.js
```

Run from `candidate/`:

```bash
node tools/pf08a-wave1d-module-registry-domain-smoke.mjs
node tools/pf08a-wave1d-financial-fingerprint-domain-smoke.mjs
node tools/pf08a-wave1d-listener-sentinel-domain-smoke.mjs
node tools/pf08a-wave1d-integrated-browser-smoke.mjs
node tools/pf08a-wave1d-visible-degraded-browser-smoke.mjs
node tools/pf08a-wave1d-scope-fallback-browser-smoke.mjs
node tools/pf08a-wave1d-recovery-reload-browser-smoke.mjs
node tools/pf08a-wave1c-persistence-browser-smoke.mjs
node tools/pf08a-wave1c-compatibility-migration-smoke.mjs
node tools/pf08a-wave1c-integrated-browser-smoke.mjs
```

Do not infer PASS from marker strings alone. Inspect each test implementation to ensure its assertions actually enforce the binding obligation and cannot pass through hard-coded output, partial fingerprints, synthetic-only paths, absent collectors or DOM-only proxies for listener uniqueness.

If a long browser smoke reaches its own documented timeout and fails, report the exact failure. Do not modify it or rerun repeatedly to obtain green output.

## 6. Required criterion matrix

At minimum, issue an independent result for:

```text
Exact pinned source and bundle integrity
Complete changed-scope coverage
Registry bootstrap order before scope/persistence
Minimal static fallback
One authoritative registry and catalogue
Ready/degraded/unavailable semantics
Precise data-preservation wording
Complete application-shell financial-mutation containment
Module-level containment and unaffected-function continuity
Retry classes and partial-install safety
Exact test=1 injection isolation
Ownership and collision validation
Root-cause propagation
Bounded privacy-safe diagnostics
One-active-attempt behavior
Visible global/local degraded surfaces
Complete financial fingerprint isolation
Persistence recovery-lock priority
Normal integrated load
Safe same-page recovery
Scenario G recovery → real reload → healthy
No duplicate scripts/screens/operations/modules/fallbacks
Production event-handler uniqueness before and after reload
Observational browser error and unhandledrejection absence
MINOR-01 direct scope/base failure path
MINOR-02 register() detached-return encapsulation
Wave 1C regression preservation
Exact-head workflow consistency
Public artifact consistency
Durable evidence consistency
```

Use only `PASS`, `FAIL` or `BLOCKED` per criterion. A green test whose assertions do not enforce the requirement is `BLOCKED` or `FAIL`, not PASS.

## 7. Verdict rules

Return `PASS` only if:

- bundle integrity is complete;
- every changed path is reviewed;
- no binding implementation failure remains;
- every acceptance obligation has direct and adequate source plus executable evidence;
- all required local checks pass;
- public and durable records exactly match the reviewed candidate and evidence;
- no unexplained browser exception, unhandled rejection, mutation leak, fingerprint gap, duplicate handler or reload defect remains.

On PASS, use:

```text
REVIEW_STATUS = PASS
RUNTIME_ACCEPTANCE = ACCEPTED
P0_04 = READY_FOR_CLOSURE
```

`READY_FOR_CLOSURE` is not a repository write and is not permission to merge PR #141 or start Wave 1E.

If any binding failure remains, use:

```text
REVIEW_STATUS = RETURN_WITH_FINDINGS
RUNTIME_ACCEPTANCE = PROHIBITED
P0_04 = OPEN
```

If evidence or execution is unavailable, use:

```text
REVIEW_STATUS = BLOCKED
RUNTIME_ACCEPTANCE = PROHIBITED
P0_04 = OPEN
```

## 8. Required report structure

The output file must contain:

1. Executive conclusion.
2. Bundle integrity and source-access confirmation.
3. Exact immutable sources reviewed.
4. Complete changed-scope coverage matrix.
5. Acceptance-criteria matrix.
6. Criterion-by-criterion evidence and reasoning.
7. Findings grouped as Critical, Major and Minor, or explicit `NONE` for each severity.
8. Public and durable evidence assessment.
9. Independence and source-boundary confirmation.
10. Exact next action.
11. Final fields.

Final fields must be exactly:

```text
REVIEW_MODE = FRESH / INDEPENDENT / CLEAN_ROOM / READ_ONLY / IMMUTABLE_BUNDLE_ONLY
BUNDLE_INTEGRITY = PASS | FAIL
CANDIDATE_SHA = a4ecf55c4bbaabf3b258ee86e1c6a7ba55b65e0c
REVIEW_STATUS = PASS | RETURN_WITH_FINDINGS | BLOCKED
RUNTIME_ACCEPTANCE = ACCEPTED | PROHIBITED
P0_04 = READY_FOR_CLOSURE | OPEN
GITHUB_WRITES_PERFORMED = NO
CANDIDATE_MODIFIED = NO
```

# END OF REVIEW PROMPT
