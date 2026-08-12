# FamilyPilot #85 — Coordination Chat Migration Handoff

MIGRATION_ID: FP85-COORDINATION-CHAT-MIGRATION-2026-08-12
PROJECT: FamilyPilot / DecisionOS
PARENT: maloma/FamilyPilot#85
STATUS: ACTIVE_CONTINUATION
LANGUAGE: RU

## 0. Как продолжать в новом Coordination-чате

Это продолжение действующего FamilyPilot/DecisionOS потока, не новый старт.

Перед первым существенным действием новый чат обязан:
1. проверить актуальный published `main` governance;
2. если governance exact commit изменился — выполнить re-bootstrap по Registry-first правилам нового exact commit;
3. только после этого принять этот handoff как рабочее состояние;
4. не использовать handoff как замену проверке текущего published governance;
5. писать Founder простым русским языком;
6. при фактической coordination-management работе заканчивать ответ ровно одним каноническим `Next Action`.

Последний подтверждённый governance exact commit на момент миграции:

`c886102d0350166ae429ea755963a92285367cd6`

Registry: `docs/governance/00_Document_Registry.md` v5.22.

Ключевая новая семантика действующего governance:
- creator-side Codex PASS = только `SELF_VERIFIED / PENDING_INDEPENDENT_REVIEW`;
- отдельный clean-context reviewer обязателен до Governance Acceptance;
- reviewer не исправляет candidate и не создаёт отсутствующие producer evidence;
- BOUNDED_DIRECT остаётся допустим, но работа ведётся маленькими независимо проверяемыми шагами;
- feature-branch candidate push допустим как промежуточная публикация кандидата, но не как acceptance/merge readiness/release.

## 1. Текущее каноническое состояние product branch

Repository:
`maloma/sandbox`

Branch:
`fp85-p4d3b-authoritative-ui-mutation-gateway`

Последний опубликованный product commit:

`fea49751c850c1f62cc184843d5c19510d5ddbbf`

На момент миграции remote branch = exact `fea4975...`.
После него product commit/push НЕ было.

Текущий Codex worktree:
- тот же worktree поверх exact `fea4975...`;
- содержит незакоммиченные изменения;
- до A5 сохранялись 13 changed paths;
- commit/push после base не выполнялись;
- рабочая работа должна сохраняться, не перезапускаться с нуля.

No live actions:
- live Supabase = 0;
- PR = 0;
- merge = 0;
- deploy = 0;
- workflow dispatch = 0;
- force push = 0;
- authority activation/cutover = 0.

## 2. Accepted history до активного repair-chain

Уже принятые ключевые этапы #85:

- P1 `55547773982f5ba33e9595ec72ab3d17b3e1a6f1`
- P2 `e397f89e08854bf4c507faa106ca045789406f18`
- P3A `8ebe7c7eec8fe557ab2ac4e76037557897baa006`
- P3B `109f073661705389c33563cf802705e1a2d3f20e`
- P4A `49da59e09132eac98d40f3bd03792de6c102aa94`
- P4B `d4cb249c4f90971e9f2e319538a6ea27aee610a6`
- P4C1 `cebfd74722231b2fe58762fb23985ca4112e6b69`
- P4C2 `4e8eb6dfe3fd50818e9532fa5be1da517537d9e4`
- P4D1 `1d9776a8cc02befc65088c38f7bb0469239069ef`
- P4D2 final accepted `8d57e6a240d6cf888dfd86206a80dd56c69dd3e1`
- P4D3A implementation `f05f70366d80e1c1939fe3f1135e2812c15c6d5b`
- P4D3A final smoke `caa898fa2b08ed0d028de04d3e53512e7e7e02db`
- P3B authority reconciliation `5b77d8c81688a2871de1ca35bc718173f9b511a9`
- R3A accepted intermediate `ca29f62f981a82e21f97b4a47065eb9299a286b8`

P4D3B FINAL ACCEPTED = NO.
Live authority activation remains blocked.

Target architecture remains:

UI canonical action
→ isolated draft mutation
→ P4D3A expected-revision CAS
→ exact remote readback
→ P4A verified recovery-cache update
→ adopt exact committed state
→ success UI/render

Forbidden architecture:
- local-first;
- dual authority;
- public legacy `save`;
- writable external canonical state;
- fallback remote→local;
- offline authoritative queue;
- automatic authority activation.

## 3. Product defect / Error Ledger

### #340 — OPEN

Repository:
`maloma/decisionos-portfolio-governance`

Issue:
`#340`

ERROR_KEY:
`FAMILYPILOT:FP85:P4D3B:OPTIMISTIC_LEGACY_UI_MUTATION_PATH`

Смысл:
активные UI/runtime paths исторически могли менять live canonical state до authoritative commit либо обходить gateway.

#340 остаётся OPEN до полного P4D3B acceptance.

### #392 — OPEN

Issue:
`#392`

ERROR_KEY:
`FAMILYPILOT:FP85:P4D3B:TASK_SCOPE_DEPENDENCY_UNDERSCAN`

Это процессная ошибка Coordination, отдельная от #340:
последовательные task packets несколько раз недообследовали прямые dependency callers одной и той же canonical migration, что приводило к лишним BLOCKED/amendment cycles.

Correction:
перед будущими mutation-boundary assignments делать bounded direct-caller/dependency scan; при новом 18-м пути в текущем repair-chain — не расширять allowlist вслепую, а re-plan.

## 4. Текущий repair-chain A1-R1 → A5

Все task packets хранятся в:

Repository:
`maloma/sandbox`

Branch:
`decisionos-task-packets`

### A2

Commit:
`9f06f3739d87267caaff4502ed55706334e0881a`

Historical browser async compatibility для R01/R02/R03/R05.

### A3

Commit:
`cde800ed15f97712784c6d3c50de3423b13c3d50`

Canonical compatibility scope reconciliation.
Максимум был расширен до 14 путей.

### A4

Commit:
`43d76b2b4e2efdeefb32e49641670821fa67172a`

Path:
`task-packets/FamilyPilot/85/FP85-P4D3B-R3B-R4-R1-A1-R1-A4-GOVERNANCE-DELTA-INDEPENDENT-REVIEW.md`

Добавил governance delta:
creator result после PASS = `SELF_VERIFIED / PENDING_INDEPENDENT_REVIEW`;
после candidate push обязателен отдельный clean-context review.

### A5 — CURRENT ACTIVE PACKET

Exact task-packet commit:

`997b680e1b933c40eef4cf77645144254c7a3253`

Path:

`task-packets/FamilyPilot/85/FP85-P4D3B-R3B-R4-R1-A1-R1-A5-PARTIAL-PAYMENT-CALLER-CLOSURE.md`

A5 применяется поверх A1-R1 + A2 + A3 + A4.

Полный ceiling:
максимум 17 exact tracked paths.

Если потребуется 18-й путь:
`STATUS=BLOCKED`
и Coordination обязана re-plan вместо ещё одного blind allowlist increment.

## 5. Почему появился A5

STEP-A4-1 остановился корректно.

Canonical/async refactor `familypilot-partial-payments.js` требует согласования трёх существующих product callers, которые были вне A3 14-path allowlist:

1. `familypilot-partial-payment-removal-v2.js`
2. `familypilot-partial-payment-entry-ui.js`
3. `familypilot-overpayment-resolution.js`

Независимая exact-base проверка подтвердила:

- removal-v2 держит legacy `runtime.state/runtime.save` и синхронный restore path;
- entry UI синхронно потребляет `attachOperation` / overpayment mutation results;
- overpayment-resolution держит `runtime.state/runtime.save`, напрямую меняет canonical state и вызывает `ensureOccurrencesWindow(state, ...)` из nextOccurrence/preview flow.

Поэтому три caller-файла — реальные прямые зависимости, а не случайное расширение.

## 6. Что уже сделано локально в текущем Codex worktree

По последнему producer report до A5:

- stale capture `runtime.state` в linked lifecycle устранён;
- linked-operation edit + obligation recalculation объединены в canonical mutation;
- linked delete/restore сохранены canonical и расширены пересчётом;
- stage contracts `--stage=r3a`, `--stage=r3b`, diagnostic `a1-r1` были восстановлены;
- R3A/R3B/R4-R1/A1-R1 ранее проходили на промежуточном состоянии;
- R04 browser smoke проходил;
- async opening M3-07B исправлялся через read-only runtime proxy;
- historical R01–R03/R05 потребовали async adaptation;
- partial-payments/payment-attention начали переводиться на canonical draft bridge;
- `node --check` для двух текущих compatibility-файлов и `git diff --check` проходили;
- full final validation после последних изменений ещё НЕ завершён.

Эти claims до принятия нового candidate должны быть подтверждены producer final report и затем независимым review.

## 7. Текущий Codex next action

Нужно продолжать:

**ТОТ ЖЕ Codex-чат и ТОТ ЖЕ незакоммиченный worktree.**

Codex должен самостоятельно прочитать A5 по exact commit/path, без ручного attachment:

Repository:
`maloma/sandbox`

Branch:
`decisionos-task-packets`

Commit:
`997b680e1b933c40eef4cf77645144254c7a3253`

Path:
`task-packets/FamilyPilot/85/FP85-P4D3B-R3B-R4-R1-A1-R1-A5-PARTIAL-PAYMENT-CALLER-CLOSURE.md`

Продолжение:
- сохранить уже сделанные незакоммиченные изменения;
- закрыть partial-payment core + три A5 callers;
- не выходить за 17-path ceiling;
- провести полный creator-side validation после ПОСЛЕДНЕЙ правки;
- только после полного PASS создать максимум один coherent candidate commit;
- один normal fast-forward push;
- exact remote readback;
- итог producer status: `SELF_VERIFIED / PENDING_INDEPENDENT_REVIEW`.

Не разрешены:
- force push;
- PR;
- merge;
- deploy;
- workflow dispatch;
- live Supabase;
- live authority switch/cutover.

Model:
`GPT-5.6 Terra / High / Normal`

## 8. Что делать, когда Codex вернёт candidate SHA

Coordination НЕ принимает R3B по producer PASS.

Сначала:
1. проверить published governance `main`;
2. проверить exact remote candidate;
3. проверить changed-path set относительно `fea4975...`;
4. проверить remote readback/no forbidden actions;
5. собрать bounded clean-context review packet.

Затем:
- **НОВЫЙ ЧИСТЫЙ Codex-review / clean-context reviewer**;
- reviewer получает exact base, candidate, changed scope, acceptance criteria, producer evidence, authority boundaries;
- reviewer не исправляет candidate.

Только при independent review PASS:
- Coordination может выполнить Governance Acceptance R3B как промежуточного tranche;
- #340 всё ещё не закрывать, если P4D3B в целом не завершён;
- после R3B acceptance готовить следующий минимальный tranche (ожидаемо debts-only / R3C, если current code inspection не докажет иной минимальный связный scope).

Если independent review FAIL:
- сохранить полезный candidate;
- findings ограничить реально затронутыми paths;
- новый correction task готовить поверх exact candidate;
- не использовать Founder как reviewer.

## 9. Live Supabase boundary

Не выполнять live Supabase actions для review/task prep.

Actual cutover остаётся запрещён до полного P4D3B acceptance.

Последнее известное production Supabase состояние до этой repair-chain было пустым/containment-safe:
- auth users 0;
- household access 0;
- remote canonical state 0;
- backup objects 0;
- live authority switch 0.

Не перепроверять live provider без фактической необходимости live-step.

## 10. Durable task-packet convention

Все новые Codex task/amendment/migration packets сначала сохраняются в:
`maloma/sandbox` → `decisionos-task-packets`

и только затем Founder получает короткую команду.

Founder не должен вручную скачивать/прикладывать task packets, если Codex может получить exact repo path самостоятельно.

Product branch и governance main не используются как хранилище черновых task packets.

## 11. Management response requirement

Когда новый Coordination-чат выполняет governed continuation, Founder-facing ответ строится:

1. Что произошло
2. Что это означает для проекта
3. Что уже сделано
4. При необходимости готовая короткая инструкция
5. Ровно один canonical `Next Action`

Ничего после `Next Action`.

## 12. Immediate continuation state

На момент миграции:

- governance exact: `c886102d0350166ae429ea755963a92285367cd6`
- product remote exact: `fea49751c850c1f62cc184843d5c19510d5ddbbf`
- current active task packet: A5 @ `997b680e1b933c40eef4cf77645144254c7a3253`
- current Codex worktree: uncommitted, preserve
- product commit/push after base: NO
- #340: OPEN
- #392: OPEN
- R3B acceptance: NO
- P4D3B acceptance: NO
- live cutover: NO
- next execution: SAME Codex chat/worktree, read A5, continue
- after candidate publication: NEW CLEAN independent review

END OF HANDOFF
