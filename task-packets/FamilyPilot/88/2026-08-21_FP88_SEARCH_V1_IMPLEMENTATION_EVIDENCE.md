# FamilyPilot #88 — Search v1 implementation evidence

Status: `CANDIDATE_READY_FOR_INDEPENDENT_REVIEW`

This record is evidence for the bounded Search v1 candidate. It is not acceptance, merge authority, deployment authority, or permission to start FamilyPilot #89.

## Identity

- Issue: `maloma/FamilyPilot#88`
- Accepted FamilyPilot base branch: `fp85-trash-expiry-fixed45-r3`
- Accepted base commit: `1dcb19366ae2f23912ff1f4d32d4ec61e3417943`
- Accepted base tree: `04a5b3cb20fbdf7b8a08321717bf44cb3a5873d2`
- Shared Search Core design owner: `maloma/decisionos-ideas`
- Shared design commit: `366e1db47fc5788da07ed21212ed0fd862d83a42`
- Shared design path: `ideas/IDEA-0009-search-core/README.md`
- Implementation branch: `fp88-search-v1`
- Exact code candidate commit: `e8fd3c177e990dc524c0bd10b54021c04c31c331`
- Exact code candidate tree: `3beeafed49ebca232fd0cafd0d56cebf6c029298`

The exact review target is the code candidate commit above. Later evidence/review-packet commits on the same branch are metadata only and do not replace the candidate identity.

## Bounded file scope versus accepted base

`git compare 1dcb19366ae2f23912ff1f4d32d4ec61e3417943..e8fd3c177e990dc524c0bd10b54021c04c31c331` shows exactly six changed files:

1. `decisionos-search-core-v1.js` — added
2. `familypilot-search-v1.js` — added
3. `familypilot-module-entry-bridge.js` — loader-only integration change
4. `tools/fp88-search-core-v1-domain-smoke.cjs` — added
5. `tools/fp88-search-adapter-v1-domain-smoke.cjs` — added
6. `tools/fp88-search-ui-static-smoke.cjs` — added

No accepted `index.html` rewrite is part of the candidate.

## Shared Search Core v1 conformance implemented

The candidate implements the IDEA-0009 v1 contract:

- `SearchDocument`: `documentId`, `sourceType`, `sourceLabel`, opaque `target`, ordered `fields`;
- `SearchField`: `fieldId`, exact original `text`;
- empty query returns no results;
- literal exact substring only;
- no case, whitespace, punctuation, layout or Unicode normalization;
- deterministic and side-effect free;
- non-overlapping matches left-to-right;
- one result per matched document;
- output: `documentId`, `sourceType`, `sourceLabel`, unchanged `target`, ordered `matches`, `matchCount`;
- each span: `fieldId`, inclusive `start`, exclusive `end`;
- offsets are JavaScript string offsets (UTF-16 code units);
- result order preserves input document order;
- no hidden ranking.

## FamilyPilot v1 explicit indexability policy

The adapter owns the allowlist. V1 indexes only the classes/fields below.

### INDEXABLE — operations

Only operations returned by existing `FamilyPilotScope.visibleOperations(state)` and with `status === 'active'`.

Allowed fields:
- current category name;
- exact operation comment/note;
- wallet name only when that wallet is present in `FamilyPilotScope.accessibleWallets(state)`.

If `accessibleWallets` is unavailable or does not include the wallet, the wallet name is omitted rather than read from raw state.

### INDEXABLE — functions

Only explicitly enumerated, currently existing targets:
- Operations;
- Analytics;
- Plan;
- How to use FamilyPilot / learning entry;
- Data storage/recovery entry.

### INDEXABLE — settings

Only explicitly enumerated, currently existing targets:
- Wallet management;
- Category management;
- Main wallet;
- Appearance/theme;
- Operation author/actor;
- Trash retention policy;
- Future actual operations setting.

A static function/setting document is emitted only when its real accepted target exists in the current DOM.

### NOT INDEXABLE in v1

- deleted/trash/non-active operations;
- operations outside the existing visible-operation scope;
- wallet names outside `accessibleWallets`;
- raw wallet/state collections merely because they exist technically;
- secrets, protection phrases, tokens, keys, backup payloads, security payloads;
- all other data classes not explicitly listed above.

## Privacy and execution boundary

- local-only execution;
- no external AI/model/provider;
- no `fetch`, `XMLHttpRequest`, WebSocket or search telemetry path in Search v1 code;
- no shadow search database;
- Core receives only adapter-prepared allowed documents and does not read FamilyPilot state itself;
- navigation targets do not grant visibility; operation source selection uses the existing visibility boundary first.

## UI placement and navigation

Founder placement decision implemented as a minimal provisional hook:

- no Search entry on `Главная` / `homeScreen`;
- Search entry is injected into the title/header area of internal screens only;
- no fifth bottom navigation item;
- Search opens a local overlay;
- result displays the source label;
- highlighting uses only Core-returned `start/end` spans;
- operation result opens the existing Operations screen and then the real operation detail;
- screen results use existing `showScreen` navigation;
- setting/function targets scroll/focus the real element; only entries whose existing behavior is navigation/opening are activated automatically.

## Verification evidence

Repeated locally on corrected candidate bytes:

```text
node --check decisionos-search-core-v1.js
node --check familypilot-search-v1.js
node --check familypilot-module-entry-bridge.js
node tools/fp88-search-core-v1-domain-smoke.cjs
node tools/fp88-search-adapter-v1-domain-smoke.cjs
node tools/fp88-search-ui-static-smoke.cjs
```

Observed terminal tokens:

```text
FP88_SEARCH_CORE_V1_PASS
FP88_SEARCH_ADAPTER_V1_PASS
FP88_SEARCH_STATIC_ALLOWLIST_PASS
FP88_SEARCH_UI_STATIC_PASS
```

The checks cover exact matching, case sensitivity, literal whitespace/punctuation, UTF-16 offsets, non-overlap, canonical shared result shape, input immutability, visibility filtering, active-only operation indexing, wallet-name fail-closed behavior, static allowlist targets, no Home entry, Core-span consumption, no normalization and no network API in Search v1.

### Authored bytes ↔ published blobs

Local `git hash-object` values were compared with the blobs published at the corrected candidate:

| Path | Blob SHA |
|---|---|
| `decisionos-search-core-v1.js` | `54dd12710508654b1fd79fb36b6fa6865e4d01b6` |
| `familypilot-search-v1.js` | `dc3ad05600834abdbd512cc268e9d90dc258f0e7` |
| `familypilot-module-entry-bridge.js` | `40b60b837d4e0328d23333b71d13bae864cadb68` |
| `tools/fp88-search-core-v1-domain-smoke.cjs` | `4cc14791878c34ed3bda8c87d98e8c5d721c66dc` |
| `tools/fp88-search-adapter-v1-domain-smoke.cjs` | `bfaf34bc7908581ebe4d3f07ee0e259436206845` |
| `tools/fp88-search-ui-static-smoke.cjs` | `586e555a1aa4629c87039121419011547eed2e5a` |

All six local hashes matched the published blobs.

GitHub combined status for exact candidate `e8fd3c177e990dc524c0bd10b54021c04c31c331` returned no status entries. Therefore there is no CI evidence attached to this commit; this is not treated as a CI PASS.

### Verification limitation

The current producer environment did not provide a full accepted-repository browser integration run. Independent review must run the candidate in a fresh checkout/runtime and should perform a browser smoke when that environment supports it.

## Error/deviation record

The producer detected a local contract mismatch in the first, unreviewed branch candidate before independent review or acceptance.

```text
ERROR_KEY = SEARCH_CORE:V1_CONTRACT:NONCANONICAL_RESULT_SHAPE
DETECTED_AT_UTC = 2026-08-20T22:33Z (after initial candidate f9f9ef8bd3523113daef974568b96ff2d99d89d2 and before corrected contract commits)
STATE = CONFIRMED → CONTAINED → CORRECTED → VERIFIED
PRODUCT / PORTFOLIO AREA = FamilyPilot #88 / shared Search Core v1 adapter path
ACTOR / CHAT / RUN = COORDINATOR / FP88 continuation / Search v1 implementation
EVENT_CLASS = shared-contract conformance mismatch
SEVERITY = S3 — Local
EXPECTED = IDEA-0009 canonical result/input field names: documentId/sourceType/sourceLabel/fieldId/matches/matchCount
OBSERVED = first unreviewed candidate used internal names id/source/section/key/matchedFields and lacked canonical matchCount shape
EVIDENCE_REFERENCE = first candidate f9f9ef8bd3523113daef974568b96ff2d99d89d2; corrected candidate e8fd3c177e990dc524c0bd10b54021c04c31c331
IMMEDIATE_IMPACT = first branch revision was not eligible for independent review/acceptance against IDEA-0009
DEPENDENT_ACTIVITY_AT_RISK = FamilyPilot #88 independent review and acceptance
CONTAINMENT_OR_CORRECTION = candidate was not accepted or sent to review; Core, adapter/UI and tests were corrected to the canonical contract
VERIFICATION_STATUS = corrected deterministic tests PASS; corrected authored bytes equal published blobs
RECURRENCE_COUNT = 1 known occurrence
CURRENT_STATUS = substantive defect corrected and verified before review; central Error Ledger synchronization remains pending
ERROR_LEDGER_SYNC = PENDING
```

Central Error Ledger write authority was not established by this product implementation task. Per Rule95 fallback semantics, this already-authorized task evidence packet carries the durable record until a capable authorized Coordination flow synchronizes it to `maloma/decisionos-portfolio-governance`.

## Error inventory for this candidate handoff

```text
ERRORS_DETECTED = 1
ERRORS_CONFIRMED = 1
ERRORS_OPEN = 0
ERROR_LEDGER_REFERENCES = []
ERROR_LEDGER_SYNC_PENDING = 1
```

## Current gate

Producer verification is complete only as producer evidence. Independent clean-context review is still required. No `PASS`, acceptance, merge, deployment, issue closure, or start of FamilyPilot #89 is asserted by this record.
