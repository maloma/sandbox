# FamilyPilot #88 — Search v1 independent review packet

Role: `INDEPENDENT_REVIEWER`
Mode: `REVIEW ONLY`
Context requirement: separate ordinary ChatGPT chat in fresh clean context.

Do not modify, repair, rebase, merge, deploy, close issues, or create replacement implementation. Review the exact candidate only and return the independent result.

## Exact target identity

- Repository: `maloma/sandbox`
- Accepted base commit: `1dcb19366ae2f23912ff1f4d32d4ec61e3417943`
- Accepted base tree: `04a5b3cb20fbdf7b8a08321717bf44cb3a5873d2`
- Candidate branch: `fp88-search-v1`
- Exact code candidate commit: `e8fd3c177e990dc524c0bd10b54021c04c31c331`
- Exact code candidate tree: `3beeafed49ebca232fd0cafd0d56cebf6c029298`
- Shared Search Core contract repository: `maloma/decisionos-ideas`
- Shared contract commit: `366e1db47fc5788da07ed21212ed0fd862d83a42`
- Shared contract path: `ideas/IDEA-0009-search-core/README.md`
- Product issue: `maloma/FamilyPilot#88`

Implementation evidence is stored separately at:
- repository: `maloma/sandbox`
- metadata commit: `693d3cda9a4d4b080b7c6b24048cd64c79f0885d`
- path: `task-packets/FamilyPilot/88/2026-08-21_FP88_SEARCH_V1_IMPLEMENTATION_EVIDENCE.md`

The review target is always exact code commit `e8fd3c177e990dc524c0bd10b54021c04c31c331`; later task-packet commits are evidence only.

## Candidate scope

The compare from accepted base to candidate must contain exactly these six files:

1. `decisionos-search-core-v1.js`
2. `familypilot-search-v1.js`
3. `familypilot-module-entry-bridge.js`
4. `tools/fp88-search-core-v1-domain-smoke.cjs`
5. `tools/fp88-search-adapter-v1-domain-smoke.cjs`
6. `tools/fp88-search-ui-static-smoke.cjs`

Treat unexpected additional production changes as a blocking finding unless independently explained by exact evidence.

## Required review questions

### A. Shared Search Core contract

Verify against exact IDEA-0009 contract at `366e1db47fc5788da07ed21212ed0fd862d83a42`:

- input names and semantics are exactly `documentId`, `sourceType`, `sourceLabel`, opaque `target`, ordered `fields[{fieldId,text}]`;
- output names and semantics are exactly `documentId`, `sourceType`, `sourceLabel`, unchanged `target`, ordered `matches[{fieldId,start,end}]`, `matchCount`;
- empty query returns no results;
- literal exact substring only;
- case-sensitive;
- no whitespace/punctuation/layout/Unicode normalization;
- non-overlapping left-to-right spans;
- UTF-16 JavaScript string offsets;
- one result per matching document;
- field/match order is stable and result order preserves input order;
- Core is side-effect free and contains no product-specific FamilyPilot knowledge;
- no hidden ranking.

### B. Exact highlight integrity

Verify that FamilyPilot UI consumes the spans produced by Core and does not recompute match positions from transformed or normalized text.

Check Unicode/emoji and repeated-match cases, not only ASCII.

### C. FamilyPilot allowlist and privacy boundary

Verify that the adapter, not Core, selects data and that v1 stays fail-closed:

- operation documents come only from existing `FamilyPilotScope.visibleOperations(state)`;
- only active operations are indexed;
- permitted operation fields are category name, exact comment/note, and accessible wallet name;
- wallet name is emitted only from `FamilyPilotScope.accessibleWallets(state)`; absence of that visibility API does not fall back to raw wallet state;
- trash/deleted/non-active/hidden operations are not searchable;
- no secrets, tokens, backup payloads, protection phrases or raw security data are indexed;
- functions/settings are a finite explicit allowlist and are emitted only when the real target exists;
- no other FamilyPilot class becomes searchable merely because it is present in state.

### D. Local-only execution

Verify Search v1 has no external provider/model dependency, no search telemetry, no network request path, and no shadow search database.

### E. Founder UI placement decision

Verify the provisional hook respects the recorded Founder decision:

- no Search entry on Home / `homeScreen`;
- Search appears on internal screens in the header/title area, visually on the right side;
- no fifth bottom navigation tab is added;
- full redesign/Figma is not introduced as a prerequisite.

### F. Navigation correctness and authorization preservation

Verify result targets open only existing reachable product locations and do not extend visibility:

- operation result goes to Operations and opens the real operation detail;
- screen results use existing screen navigation;
- setting/function targets reach the intended real element;
- setting results do not silently change a setting merely because the result was opened;
- only entries whose normal purpose is to open/navigate are activated automatically.

### G. Loader/integration containment

Verify the change to `familypilot-module-entry-bridge.js` is bounded:

- accepted bridge behavior remains intact apart from Search loading;
- Core loads before FamilyPilot adapter/UI;
- Search load failure is contained and does not make the rest of the application unusable;
- there is no broad accepted `index.html` rewrite.

### H. Regression risk

Review the cumulative diff from accepted base to candidate, not producer claims in isolation. Look for collisions with existing screen injection, module bridge observers, runtime navigation, personal wallet visibility, and action dock/bottom navigation behavior.

## Reproducible producer checks to rerun independently

From a checkout at exact candidate commit:

```text
node --check decisionos-search-core-v1.js
node --check familypilot-search-v1.js
node --check familypilot-module-entry-bridge.js
node tools/fp88-search-core-v1-domain-smoke.cjs
node tools/fp88-search-adapter-v1-domain-smoke.cjs
node tools/fp88-search-ui-static-smoke.cjs
```

Expected producer tokens are evidence to verify independently, not facts to trust:

```text
FP88_SEARCH_CORE_V1_PASS
FP88_SEARCH_ADAPTER_V1_PASS
FP88_SEARCH_STATIC_ALLOWLIST_PASS
FP88_SEARCH_UI_STATIC_PASS
```

## Browser/runtime smoke when supported

If the review environment can run the accepted prototype in a browser, verify at minimum:

1. Home has no Search entry.
2. Multiple internal screens show one Search entry at the header/title right side; duplicate injection does not accumulate.
3. Exact case-sensitive query returns only literal matches.
4. An operation comment/note hit highlights exactly the original substring.
5. A function/setting hit shows the correct source label.
6. Selecting an operation result opens that operation's real detail.
7. Selecting a setting result reaches the intended setting without changing its value merely by navigation.
8. A private/inaccessible wallet name or hidden operation cannot appear through Search.
9. No Search network request is emitted.
10. Closing/reopening Search and moving among internal screens does not break existing navigation or action dock behavior.

If browser smoke cannot be run, report that limitation explicitly; do not convert static evidence into browser evidence.

## Known producer correction to review, not ignore

Producer evidence records one pre-review local deviation:

- `ERROR_KEY = SEARCH_CORE:V1_CONTRACT:NONCANONICAL_RESULT_SHAPE`
- first unreviewed candidate `f9f9ef8bd3523113daef974568b96ff2d99d89d2` used noncanonical result/input field names;
- producer corrected it before review;
- corrected review target is `e8fd3c177e990dc524c0bd10b54021c04c31c331`;
- central Error Ledger synchronization remains `PENDING` in producer evidence because this task did not establish central governance-issue write authority.

Independently verify the correction in the exact review target. Do not treat the producer's local verification as independent acceptance.

## Reviewer output contract

Return a concise terminal review result with:

```text
VERDICT: PASS | FAIL
TARGET: e8fd3c177e990dc524c0bd10b54021c04c31c331
BASE: 1dcb19366ae2f23912ff1f4d32d4ec61e3417943
CONTRACT: maloma/decisionos-ideas@366e1db47fc5788da07ed21212ed0fd862d83a42 / IDEA-0009
TESTS: exact commands/results independently observed
BROWSER_SMOKE: PASS | FAIL | NOT_RUN with reason
BLOCKING_FINDINGS: none | numbered blocking findings with file/line or exact evidence
NONBLOCKING_NOTES: optional bounded notes
```

A `PASS` requires no blocking finding against shared contract, privacy/allowlist, highlight integrity, navigation, Founder placement, loader containment, or material regression boundary. Do not edit the candidate even if the verdict is `FAIL`.
