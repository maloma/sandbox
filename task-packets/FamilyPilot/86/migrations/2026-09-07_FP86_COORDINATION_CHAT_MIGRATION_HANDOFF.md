# FamilyPilot — Coordination Chat Migration Handoff

MIGRATION_ID: `FP86-COORDINATION-CHAT-MIGRATION-2026-09-07`
PROJECT / PRODUCT: `FamilyPilot / DecisionOS`
MIGRATION DATE: `2026-09-07`
PREDECESSOR CHAT: current FamilyPilot Coordinator chat
SUCCESSOR CHAT: new ordinary ChatGPT FamilyPilot Coordinator chat
OLD CHAT ROLE: `COORDINATOR`
TARGET CHAT ROLE: `COORDINATOR`
MIGRATION REASON: `PREVENTIVE_MIGRATION_AT_NATURAL_BOUNDARY`
MIGRATION STATUS: `PREPARED`

## 0. Receiving-chat mandatory start

This is continuation, not a new FamilyPilot start.

Receiving chat must execute controlled migration bootstrap strictly:

`PASS 1 → READ STATE → PASS 2`

PASS 1:
1. independently resolve current published `maloma/decisionos-portfolio-docs/main` to exact commit;
2. read `docs/governance/00_Document_Registry.md` FIRST from that exact commit;
3. load required L0 + known `COORDINATOR` L1 governance from that same exact commit.

READ STATE:
4. read this migration handoff completely;
5. independently read current durable FamilyPilot state, especially `maloma/FamilyPilot#86`, `maloma/sandbox#164`, current CI/artifact state, and referenced Error Ledger records;
6. do not reconstruct state from predecessor chat memory or transcript.

PASS 2:
7. recompute actual L1/L2/L3 applicability from the recovered state;
8. prove required-vs-loaded governance owner closure and enforce applicable rules;
9. continue from `FIRST UNFINISHED ACTION`; do not repeat `DO_NOT_REPEAT`.

Historical governance exact commit used by predecessor at migration:
`400a2335520e2e378991d708e1f3389956fd2aee`

At handoff time this is also the independently confirmed current published `main` commit. Receiving chat must still check current published main again before substantive work.

## 1. Current stream

Primary product issue:
`maloma/FamilyPilot#86` — voice input / visible editable operation draft.

Current stream identifier:
`FP86_ENTRY_UX_RESET_R1`

Current repository / PR:
- repository: `maloma/sandbox`
- PR: `#164`
- branch: `fp86-entry-ux-reset-r1`
- PR state at migration: `OPEN / DRAFT / UNMERGED`

Current accepted correction target:
- BASE / direct parent: `249f6bbde3a6c253c35099aa2c774b642be5ccb7`
- TARGET: `5ca41531d1a9d6df2438fb011b41c7dfbc4243a0`
- TREE: `2563e902bed5a96a66d4dcb4f6a62cbb824aba56`
- exact correction relation: ahead by 1 commit, behind 0
- correction delta: exactly 14 changed paths

Cumulative PR #164 contains 18 paths because Reset R1 predates this final correction. Do not confuse cumulative PR scope with the final 14-path correction delta.

## 2. Producer / CI / artifact — COMPLETED

CODEX assignment:
`maloma/FamilyPilot#86` comment `5571613725`.

Producer terminal:
`maloma/FamilyPilot#86` comment `5572618660`.

Producer result:
`CODEX-RESULT: PASS`

Workflow:
- run `34136643949`
- Android job `101789077015` — `SUCCESS`
- iOS job `101789076707` — `SUCCESS`

Android artifact:
- id `10024302836`
- name `FamilyPilot-ru-RU-entry-ux-reset-r1`
- digest `sha256:7bebaa4a2cf4077ae9883eb1e82f64f585ecb9a3818ce315d8784ec6dc50a68f`
- workflow head SHA `5ca41531d1a9d6df2438fb011b41c7dfbc4243a0`
- expires `2026-09-14T15:09:41Z`

Do not rebuild or rerun CI unless a real later reason appears. Existing CI is successful and bound to exact TARGET.

## 3. Fresh independent review — COMPLETED / ACCEPTED

Review assignment:
`maloma/FamilyPilot#86` comment `5572904622`.

Independent reviewer terminal:
`maloma/FamilyPilot#86` comment `5573257110`.

Verdict:
`VERDICT: PASS`

Verified dimensions:
- `SCOPE: PASS`
- `TEST_EXECUTION: PASS` — all seven required exact JS smokes actually executed
- `CI_AND_ARTIFACT: PASS`
- `ORIENTATION_DRAFT_PRESERVATION: PASS`
- `ACTIVE_SPEECH_LIFECYCLE_TEARDOWN: PASS`
- `NATIVE_READY_SIGNAL: PASS`
- `ACTIVE_CANCEL: PASS`
- `ACTIVE_RESTART: PASS`
- `ASYNC_RACE_STATE_SAFETY: PASS`
- `AFTER_FINAL_UNDO_RETRY_PRESERVED: PASS`
- `ON_DEVICE_SECURITY_BOUNDARY: PASS`
- `NO_AUTO_SAVE_OR_DURABLE_DRAFT_WORKAROUND: PASS`
- `BLOCKING_FINDINGS: NONE`
- `PHYSICAL_ANDROID: NOT_PRESENT_BY_STAGE`

Coordinator acceptance:
`maloma/FamilyPilot#86` comment `5573377298`.

Current accepted state:
`CODE_BUILD_REVIEW_ACCEPTED / PHYSICAL_ANDROID_REVALIDATION_REQUIRED / PRODUCT_ISSUE_REMAINS_OPEN`

## 4. Error Ledger synchronization — COMPLETED

Final correction/review evidence has been synchronized and read back for:

- `maloma/decisionos-portfolio-governance#1033`
  - Android orientation/config change loses open entry draft
  - latest acceptance comment `5573379033`
  - state: `CORRECTED / INDEPENDENTLY_VERIFIED / OPEN_PENDING_PHYSICAL_ANDROID`

- `#1034`
  - UI previously declared listening before native `onReadyForSpeech`
  - latest acceptance comment `5573380197`
  - state: `CORRECTED / INDEPENDENTLY_VERIFIED / OPEN_PENDING_PHYSICAL_ANDROID`
  - important: code/review fixes readiness signaling; do not claim Android OS STT can never misrecognize the first number

- `#1035`
  - no direct cancel/restart while actively listening
  - latest acceptance comment `5573381398`
  - state: `CORRECTED / INDEPENDENTLY_VERIFIED / OPEN_PENDING_PHYSICAL_ANDROID`

- `#1036`
  - stale/hidden active recognizer can survive host recreation
  - latest acceptance comment `5573382673`
  - state: `CORRECTED / INDEPENDENTLY_VERIFIED / OPEN_PENDING_PHYSICAL_ANDROID`

- `#917`
  - after-final Undo/Retry missing in historical V3; Reset R1 implementation preserved
  - latest acceptance comment `5573383838`
  - state: `CORRECTED / INDEPENDENTLY_VERIFIED / OPEN_PENDING_PHYSICAL_ANDROID`

Other relevant still-open physical/product Error Ledger records include historical Reset R1/V3 correction chain items such as `#751`, `#906`, `#907`, `#913`, `#916`, `#918`. Their physical closure must use the current exact artifact, not historical V3 evidence.

`#752` is a separate pre-existing test-bridge defect and is not caused by this correction.

## 5. Critical historical correction — DO NOT REPEAT

Historical V3:
- target `1b2d71778360c8961a6e746ece10777e25247e20`
- artifact `9817477698`

V3 was already physically rejected. The predecessor chat twice mistakenly reissued V3 for physical testing; this recurrence is recorded in Error Ledger `maloma/decisionos-portfolio-governance#928`.

DO_NOT_REPEAT:
- do not give Founder V3 APK again;
- do not ask Founder to retest V3;
- do not use V3 physical observations as PASS evidence for current Reset R1;
- do not restart the V1/V2/V3 correction chain;
- do not create `V4` for this stream.

Current physical target is only:
`maloma/sandbox@5ca41531d1a9d6df2438fb011b41c7dfbc4243a0`, artifact `10024302836`.

## 6. Founder observations that caused the final correction

Historical V3 physical observations were used only to discover defect classes, then each relevant class was independently confirmed against current Reset R1 code before correction:

1. first number at beginning of dictation was often captured poorly;
2. no convenient reset while actively listening — user had to Stop, then Undo, then start again;
3. rotating phone with open operation made the entry sheet disappear;
4. rotating while listening could leave the old hidden speech session/microphone effectively busy; new visible operation could not start listening until app restart;
5. Founder said the rest of the historical checklist looked generally normal, but this is not current Reset R1 physical PASS evidence.

## 7. CURRENT INCOMPLETE ACTION

`PHYSICAL_ANDROID_REVALIDATION` of exact accepted artifact `10024302836`.

No current Coordinator code/review/CI work remains before that external device boundary.

## 8. FIRST UNFINISHED ACTION

Receiving Coordinator must first independently confirm artifact `10024302836` is still available and still belongs to exact TARGET.

Then deliver/extract the exact APK for Founder and request one bounded physical Android pass against the current build.

Minimum physical validation set:

1. **Voice readiness / first token**
   - start dictation;
   - before Android ready event the UI must show preparation, not falsely claim active listening;
   - after real ready state, speak an amount beginning immediately with a number (for example `200 ...`);
   - record actual first-token behavior without claiming OS STT perfection.

2. **Live partial safety**
   - while listening, visible partial `Слышу: ...` appears;
   - Amount / Category / Comment do not mutate from live partial before finalization/Stop.

3. **Final routing**
   - `200 <exact category> <note>` routes `200` to Amount, exact existing category to Category, remainder to Comment;
   - natural money form such as `11 29` should be checked for `11,29` behavior from Reset R1 money grammar;
   - if no exact category is recognized, Category stays manual/blank rather than silently inventing one.

4. **Active cancel**
   - during listening press `Отменить ввод` or equivalent;
   - current recognition is discarded immediately;
   - pre-session visible draft remains unchanged;
   - no final transcript is applied and no auto-save occurs.

5. **Active restart**
   - during listening press `Начать заново`;
   - one fresh session starts directly;
   - no Stop → Undo → Dictate choreography;
   - no stale transcript from previous session is applied.

6. **After-final recovery**
   - after a completed recognition result, `Отменить результат` restores exact pre-dictation draft;
   - `Продиктовать заново` restores it and starts a fresh session.

7. **Orientation with open draft, not listening**
   - create/edit an operation with unsaved values;
   - rotate portrait ↔ landscape;
   - the same open sheet and unsaved visible values remain.

8. **Orientation while listening / stale mic**
   - rotate during an active visible voice session and return;
   - visible draft/session remains coherent and no hidden/background microphone session survives improperly;
   - after ending/cancelling, a new operation can start a new voice session without app restart or `recognition_busy` behavior.

9. **Category/save rules**
   - NEW operation starts with Category blank;
   - Save blocked until valid Amount + explicit Category;
   - EDIT retains existing category.

10. **Close/unsaved confirmation**
    - unchanged entry closes directly;
    - changed entry asks `Сохранить?`;
    - discard closes without save;
    - save uses normal validation; incomplete input remains open.

11. **Amount arithmetic**
    - `+ − × ÷` controls survive real input and visible result is correct.

12. **Receipt/layout regression**
    - `Прикрепить чек` opens usable Android chooser for supported image/PDF;
    - account/cloud readiness is not stray/covered content below the operation dock and remains in the intended `Ещё` area;
    - no obvious hints-on/hints-off layout regression.

Founder does not need to repeat already-observed historical V3 details. Only current exact artifact results matter for current acceptance.

## 9. Exact resume logic after physical test

If all required current physical checks PASS:
1. durably record physical PASS evidence in `maloma/FamilyPilot#86`;
2. sync/close only Error Ledger items whose exact resolution criterion is now satisfied;
3. determine current #86 product verdict from durable evidence;
4. only then evaluate whether PR #164 merge/release/issue closure is authorized by current product/governance state — do not infer merge authorization merely from physical PASS.

If any physical defect appears:
1. immediately capture it under the existing ERROR_KEY if same defect, otherwise create exactly one new Error Ledger issue for a genuinely distinct defect;
2. contain only affected/dependent path;
3. do not silently patch or merge;
4. continue according to current Rule94/Rule98 correction/reset semantics and current task authority.

## 10. ALLOWED WRITES

After receiving bootstrap and state recovery:
- bounded FamilyPilot #86 coordination/evidence comments;
- necessary Error Ledger synchronization under current Rule95/GitHub authority;
- implementation/review routing only if a new physical defect actually requires it and current governance permits it.

## 11. PROHIBITED ACTIONS

Until current physical acceptance and later explicit acceptance boundaries are satisfied:
- no merge of `maloma/sandbox#164`;
- no deploy/release/store publication;
- no closure of `maloma/FamilyPilot#86`;
- no closure of pending physical Error Ledger items without exact physical evidence;
- no historical V3 retest;
- no new V4 / unnecessary architecture reset;
- no cloud/browser STT fallback;
- no automatic financial save;
- no unrelated parser/category/UI redesign.

## 12. LAST COMPLETED VERIFIED ACTION

Predecessor Coordinator completed and read back:
- fresh independent reviewer PASS acceptance for exact TARGET;
- Coordinator acceptance `maloma/FamilyPilot#86` comment `5573377298`;
- Error Ledger independent-verification synchronization for `#1033/#1034/#1035/#1036/#917`.

## 13. LAST ACCEPTED ARTIFACT

`FamilyPilot-ru-RU-entry-ux-reset-r1`, artifact id `10024302836`, exact target `5ca41531d1a9d6df2438fb011b41c7dfbc4243a0`, digest `sha256:7bebaa4a2cf4077ae9883eb1e82f64f585ecb9a3818ce315d8784ec6dc50a68f`.

## 14. UNCONFIRMED / POSSIBLE PARTIAL WRITES

`NONE` known at migration preparation.

## 15. CURRENT BLOCKER

Only the real external boundary:
`PHYSICAL_ANDROID_REVALIDATION_REQUIRED`.

## 16. ACTIVE EXECUTOR / OWNERSHIP

No CODEX or reviewer execution is active.

Coordinator owns stream continuation.
Founder becomes temporary owner only for the actual physical Android interaction that connected tools cannot perform.

## 17. TERMINAL CONDITIONS

This handoff is successfully consumed only when successor:
- completes PASS 1 / READ STATE / PASS 2;
- independently verifies current exact durable state;
- does not repeat historical V3 testing or completed code/review work;
- continues from current physical Android boundary.

MIGRATION STATUS: `PREPARED`
