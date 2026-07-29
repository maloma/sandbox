# FamilyPilot PF-08A Wave 1D CP-04 — Fresh Independent Clean-Room Review

Проведи fresh independent clean-room runtime acceptance review кандидата FamilyPilot PF-08A Wave 1D CP-04.

Используй только приложенный immutable bundle:

`FamilyPilot_PF08A_Wave1D_CP04_b30b574_Fresh_Independent_Review_Bundle_2026-07-29.zip`

Не используй память, этот или другие чаты, GitHub, web и внешние источники. Не изменяй candidate, тесты или evidence. Repository writes, merge, mark ready, изменение PR body, Wave 1E и закрытие P0-04 запрещены.

Верни один файл:

`FamilyPilot_PF08A_Wave1D_CP04_b30b574_Fresh_Independent_Runtime_Acceptance_Result.md`

## Immutable anchors

```text
CANDIDATE_REPOSITORY = maloma/sandbox
CANDIDATE_PR = 141
CANDIDATE_SHA = b30b57405126527e66415a851e1f6bbe90f6bd98
RUNTIME_RUN = 30450934784
RUNTIME_JOB = 90574680443
PUBLIC_VERIFIER_PR = 147
PUBLIC_VERIFIER_HEAD = 0cc6c9a6ef680e63b8f25f138f26b930054b4c39
PUBLIC_VERIFIER_RUN = 30455085639
PUBLIC_VERIFIER_JOB = 90586497024
PUBLIC_ARTIFACT_ID = 8725668649
PUBLIC_JSON_SHA256 = c18b095c24ba4d15a34b59b32af1fcf3ec01e8019bea8bd0a3c7b7ebbfd51da1
PUBLIC_ZIP_SHA256 = eed91601bb926dd78366e8d7ba6d0dc9bbd8cf110dc102c0b086c00f9b30dcbc
DURABLE_EVIDENCE_COMMIT = 6af436728e8a16a7c284ac85fe9e5989cd73e1eb
DURABLE_EVIDENCE_PATH = evidence/FamilyPilot_PF08A_Wave1D_Durable_b30b574_Evidence.json
PRIOR_REVIEW_SHA256 = ea68cb88611f682d04c5cf0145d5dba532a6673c882ec0a1bbeb9d027bb2d752
PRIOR_REVIEW_SIZE = 35285
```

## 1. Integrity gate

1. Extract the bundle.
2. Read `BUNDLE_METADATA.json` and `README.txt`.
3. From the extracted bundle root run:

```bash
sha256sum -c SHA256SUMS
```

4. Confirm `candidate/CANDIDATE_HEAD.txt` equals the pinned candidate SHA.
5. Confirm the prior review hash/size, public JSON hash and durable evidence anchors.

On any mismatch stop with:

```text
REVIEW_STATUS = BLOCKED
RUNTIME_ACCEPTANCE = PROHIBITED
P0_04 = OPEN
```

## 2. Review basis

Read the complete separate prior review file. Its old verdict is historical only. Its exact findings and binding criteria are the review basis; independently determine whether the final candidate closes them.

Re-evaluate all findings, with special attention to:

```text
MAJOR-02 — canonical financial fingerprint coverage and negative mutation probes
MAJOR-03 — complete financial preservation through Scenario G
MAJOR-04 — production What If/Learning handler uniqueness
MAJOR-05 — reproducible browser execution
MINOR-02 — deep detachment of original registration definitions
MINOR-03 — planned-income workflow trigger and syntax coverage
```

Also confirm no regression of previously closed `CRITICAL-01`, `MAJOR-01` and `MINOR-01`.

The final commit specifically changes readiness-timeout baseline timing. Independently verify that:

- persistence readiness is required before baseline capture;
- opening the degraded card cannot mutate financial state;
- a real mismatch still fails with an exact fingerprint diff;
- the assertion is not weakened, skipped or replaced by arbitrary success output.

## 3. Required source review

Review the complete `candidate/` snapshot, `candidate.patch`, `candidate-name-status.txt`, `candidate-log.txt`, public evidence, durable evidence and prior review basis.

Account for every changed path. A green marker or recorded PASS is not sufficient unless the corresponding assertions enforce the binding criterion.

## 4. Required execution

Do not install dependencies. Record OS, Node, Python and Chrome/Chromium versions.

From the extracted bundle root:

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

Then from `candidate/` run once:

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

Do not repeatedly rerun a failed browser test to seek a green result. Record the exact terminal failure. If the required execution surface is unavailable, return `BLOCKED`, not PASS.

## 5. Mandatory verdict

Return exactly one substantive verdict:

```text
REVIEW_STATUS = PASS
RUNTIME_ACCEPTANCE = PERMITTED
P0_04 = READY_FOR_CLOSURE_DECISION
```

or:

```text
REVIEW_STATUS = RETURN_WITH_FINDINGS
RUNTIME_ACCEPTANCE = PROHIBITED
P0_04 = OPEN
```

or, only for integrity/toolchain impossibility:

```text
REVIEW_STATUS = BLOCKED
RUNTIME_ACCEPTANCE = PROHIBITED
P0_04 = OPEN
```

For every open finding provide severity, exact file/line or command evidence, failed binding criterion and required correction. Do not perform the correction.
