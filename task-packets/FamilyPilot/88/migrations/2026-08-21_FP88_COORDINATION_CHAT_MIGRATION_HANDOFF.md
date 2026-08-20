# FamilyPilot — Coordination Chat Migration Handoff

MIGRATION_ID: FP88-COORDINATION-CHAT-MIGRATION-2026-08-21
PROJECT: FamilyPilot / DecisionOS
ACTIVE_STREAM: FamilyPilot#88 Search v1 → FamilyPilot#89 Protection
STATUS: ACTIVE_CONTINUATION
LANGUAGE: RU

## 0. Как продолжать в новом Coordination-чате

Это продолжение действующего FamilyPilot/DecisionOS Coordination-потока, не новый старт.

Перед первым существенным действием новый чат обязан:
1. проверить текущий published `main` репозитория `maloma/decisionos-portfolio-docs`;
2. сравнить exact commit с последним подтверждённым governance commit из этого handoff;
3. если commit изменился, неизвестен или его актуальность нельзя надёжно подтвердить — выполнить Registry-first re-bootstrap из нового exact commit;
4. только после этого использовать этот handoff как рабочее состояние;
5. не использовать handoff, память чата, старые snapshots или Project Sources как замену текущей governance-проверке;
6. продолжать с первой незавершённой работы, а не начинать FamilyPilot заново;
7. если следующий разрешённый шаг уже доступен Coordinator, выполнить его до остановки;
8. не останавливаться на обычной технической границе, если можно продолжить; останавливаться только на реальном Founder gate;
9. Founder-facing ответы писать нормальным понятным русским языком, не внутренним протоколом и не длинными техническими листингами;
10. если действующие правила требуют canonical `Next Action`, заканчивать ровно одним таким блоком.

Последний подтверждённый governance exact commit на момент миграции:

`aa96d32cc0ee2d3b6f285467df4d9e6393c1c818`

Последний подтверждённый набор:
- Document Registry v5.33;
- Rule04 Project Context v3.11;
- Coordinator Turn Kernel: `TARGET → AUTHORITY → FIRST UNFINISHED ACTION → CAN EXECUTE NOW? → EXECUTE/VERIFY/LOOP → REAL BOUNDARY → RESPOND/HANDOFF`.

Ключевые действующие принципы:
- `NO EVIDENCE = NO FACT`;
- `NO VERIFICATION = NO ACCEPTANCE`;
- material Coordinator/assistant errors фиксируются в central Error Ledger;
- creator-side result не заменяет independent review там, где governance требует независимое принятие;
- не создавать лишние task/review cycles, если есть прямое выполнимое действие.

## 1. Текущий принятый FamilyPilot baseline

Repository:
`maloma/sandbox`

Accepted product branch:
`fp85-trash-expiry-fixed45-r3`

Exact accepted commit:
`1dcb19366ae2f23912ff1f4d32d4ec61e3417943`

Tree:
`04a5b3cb20fbdf7b8a08321717bf44cb3a5873d2`

Parent:
`b29e977c3ef55cbaad8c7b3817f67dc70a532209`

На момент миграции remote branch всё ещё указывает точно на `1dcb1936...`.

Этот commit — текущий принятый FamilyPilot functional baseline. Не заменять его старым `3b40cc3...`, `5b77d8c...`, P4D3B worktree или любым историческим candidate.

## 2. FamilyPilot#85 завершён

Issue:
`maloma/FamilyPilot#85`

State:
`CLOSED / COMPLETED`

Fresh independent terminal:
`5361310502`

Terminal:
- `TERMINAL_REVIEW=PASS`
- `CANDIDATE_ACCEPTED=YES`
- candidate `1dcb19366ae2f23912ff1f4d32d4ec61e3417943`
- classification `ACCEPTABLE_R3_FIXED45_TRASH_EXPIRY_IMPLEMENTATION`

Coordinator acceptance:
`5361419609`

#85 current-scope result включает принятые Data Lifecycle возможности, в том числе:
- protected backup/restore flow;
- protected `.fpbackup` container;
- local protected download;
- native share/email delivery path без собственного mail provider;
- validated/staged restore;
- safe recoverable Trash/restore;
- fixed 45-day Trash retention semantics;
- automatic technical housekeeping без пользовательской cleanup-кнопки;
- canonical history preservation;
- separation `cleanup != reset != irreversible privacy erase`.

Связанные S2 Error Ledger issues `#637` и `#642` закрыты после full exact execution PASS + fresh independent acceptance.

## 3. Что Founder сознательно отложил после #85

Founder решил: **«отложить обе»** для двух destructive функций.

Они вынесены из #85 в отдельные будущие задачи:

### FamilyPilot#91 — Полный сброс приложения
Status:
`DEFERRED / NOT_ACTIVE / FUTURE_PRODUCT_SCOPE`

Смысл:
отдельный безопасный `reset_application` с сильным подтверждением, предложением backup/export и отдельным canonical reset initializer до активации apply.

### FamilyPilot#92 — Безвозвратное удаление данных для приватности
Status:
`DEFERRED / NOT_ACTIVE / FUTURE_PRODUCT_SCOPE`

Смысл:
отдельный явный irreversible privacy erase; нельзя обещать уничтожение данных, если storage/adapter не имеет доказуемой erase-authority.

Создание #91/#92 НЕ авторизует их реализацию сейчас.

## 4. Другие текущие product boundaries

Сохраняются без изменений:
- cloud/Supabase backup destination — HOLD;
- email/native share достаточно как текущий внешний backup delivery path;
- scheduled backup/delivery не активирован и не подразумевается;
- P4D3B remote-authority work остаётся `QUARANTINED_TECHNICAL_DEBT / NOT_CURRENT_PRODUCT_BASELINE`;
- live remote-authority cutover не активирован;
- Primary Setup `FamilyPilot#83` остаётся на Founder HOLD;
- полный UI/UX redesign будет отдельным более поздним этапом;
- Figma сейчас не требуется;
- текущий интерфейс — функциональный прототип/рабочая оболочка, не final visual design.

Не возвращать эти отложенные темы в активный scope без нового Founder решения или доказанной прямой зависимости.

## 5. Founder priority после закрытия #85

Founder выбрал последовательность:

1. **Search** — `maloma/FamilyPilot#88`;
2. **Protection / abuse protection** — `maloma/FamilyPilot#89`.

Голосовой ввод `#86`, финансовое обучение `#87`, reset `#91`, privacy erase `#92` — не текущий первый приоритет.

Не менять эту последовательность автоматически.

## 6. FamilyPilot#88 — Search v1: текущее состояние

Issue:
`maloma/FamilyPilot#88`

State:
`OPEN`

### 6.1 Исправленная shared dependency

Исторический `decisionos-portfolio-governance#236` закрыт НЕ потому, что Search Core был реализован, а потому что idea была мигрирована в правильный durable owner.

Canonical idea owner:
`maloma/decisionos-ideas/ideas/IDEA-0009-search-core/README.md`

Current `decisionos-ideas/main` exact commit:
`366e1db47fc5788da07ed21212ed0fd862d83a42`

IDEA-0009 current status:
`In Design`

Это bounded design candidate, а не уже принятая implementation architecture.

### 6.2 Search Core v1 design candidate

Текущий дизайн-кандидат намеренно минимальный:
- local-only execution;
- literal exact substring search;
- пустой query → пустой результат;
- v1 не нормализует регистр, пробелы, пунктуацию или раскладку;
- fuzzy / typo correction / semantic / vector / external AI search отсутствуют;
- Core не знает внутреннюю модель FamilyPilot;
- FamilyPilot adapter сам формирует только разрешённые searchable documents/fields;
- Core возвращает exact original-text match spans (`start` inclusive / `end` exclusive) для честной подсветки;
- UI не пересчитывает highlight по нормализованному тексту;
- Core не вводит скрытый ranking;
- no external model/provider;
- no hidden telemetry of query/financial text;
- no search shadow database;
- navigation target opaque для Core и не может расширять права пользователя.

FamilyPilot adapter должен явно определить allowlist индексируемых классов/полей по accepted schema. Не индексировать данные просто потому, что поле существует технически.

### 6.3 Последние #88 durable comments

- `5361708915` — исправлена зависимость; Search выбран Founder приоритетом №1;
- `5361759790` — исторический A/B/C placement gate; SUPERSEDED;
- `5361872247` — историческая попытка сделать redesign prerequisite; также superseded последующим Founder correction;
- `5362430588` — Founder UI semantics: на Главной Search не нужен; на внутренних экранах Search в правом верхнем углу;
- `5362483077` — текущая финальная коррекция scope: **full redesign НЕ prerequisite для Search v1; Figma не требуется; Search можно минимально встроить в текущий функциональный prototype**.

### 6.4 Текущее UI-решение Founder для Search

Действующая семантика:
- **на Главной Search entry нет**;
- **на внутренних экранах Search entry находится справа вверху**;
- текущий hook может быть минимальным/provisional;
- это не финальное visual-design authority;
- будущий full redesign может изменить styling/layout, сохранив эту access-семантику, если Founder позже её не изменит.

Не возвращаться к вопросу A/B/C и не блокировать Search из-за отсутствия Figma или финального дизайна.

## 7. Что известно о текущем functional shell

Accepted baseline `1dcb1936...` имеет функциональные разделы:
- Главная;
- Операции;
- План;
- Ещё;
- внутренние экраны аналитики/обязательств и связанные detail/modal flows.

Продуктовые принципы, которые нельзя ломать Search-работой:
- FamilyPilot открывается на стабильной Главной;
- `+ Приход` / `− Расход` — два главных ежедневных действия;
- fast capture важнее декоративной аналитики;
- analytics — второй уровень;
- редкие настройки/модули не должны мешать ежедневному вводу;
- обычный save path должен работать локально без обязательной сети/AI;
- новый Search не должен вытеснять `Приход/Расход` на Главной, поэтому Founder прямо запретил Search entry на Home.

Канонический product context:
- `maloma/FamilyPilot/docs/39_Core_Product_Thesis_and_Financial_Interaction_Model.md`
- `maloma/FamilyPilot/docs/40_Main_Financial_Screen_and_Fast_Entry_Specification.md`

## 8. Первая незавершённая работа после миграции

Активная цель:
**довести Search v1 до implementation-ready и затем реализовать bounded Search Core + FamilyPilot adapter + minimal internal-screen UI hook на accepted baseline.**

Новый Coordination-чат не должен спрашивать Founder заново, нужен ли Search или нужен ли redesign: это уже решено.

Правильный порядок:
1. выполнить обязательную governance `main` проверку/re-bootstrap при необходимости;
2. подтвердить accepted FamilyPilot baseline `1dcb1936...` и current #88 state;
3. прочитать exact IDEA-0009 design candidate из `decisionos-ideas@366e1db...`;
4. определить по текущему governance минимальный требуемый acceptance/review path для shared design candidate — не считать `In Design` автоматически принятым;
5. без лишних amendment cycles довести shared Search Core v1 contract до необходимого acceptance состояния;
6. подготовить/выполнить один bounded implementation package на accepted FamilyPilot baseline:
   - generic local Search Core v1;
   - FamilyPilot adapter с explicit searchable-field allowlist;
   - minimal Search UI hook только на внутренних экранах справа вверху;
   - result navigation к правильному объекту/экрану;
   - exact match highlighting из Core spans;
7. deterministic verification;
8. fresh independent review до acceptance там, где его требует governance;
9. только после Search acceptance переходить к #89 Protection.

Если для независимого clean-context review действительно нужен отдельный ChatGPT-контекст, сначала полностью подготовить exact review packet и только тогда ставить реальный Founder gate. Не использовать Founder как ручной переносчик файлов или длинных команд.

## 9. Search v1 scope guardrails

Не добавлять в v1 без нового Founder решения:
- fuzzy search;
- typo tolerance;
- case/space/punctuation normalization;
- semantic search;
- embeddings/vector DB;
- external AI/provider search;
- hidden upload of financial history;
- new shadow search database;
- full UI redesign;
- Figma dependency;
- Search entry на Главной;
- пятый нижний navigation tab только ради Search.

Search должен оставаться отдельной bounded feature, а не поводом переписать приложение.

## 10. FamilyPilot#89 — Protection: queued second

Issue:
`maloma/FamilyPilot#89`

State:
`OPEN / QUEUED BEHIND SEARCH`

Historical governance issue `#237` также был закрыт только из-за migration.

Canonical idea owner:
`maloma/decisionos-ideas/ideas/IDEA-0010-abuse-protection-traffic-control-core/README.md`

IDEA-0010 status на момент миграции:
`Captured`

Protection НЕ implementation-ready.

После Search acceptance следующий правильный шаг для #89:
- bounded shared Protection Core design;
- затем FamilyPilot-specific rules/integration;
- не создавать частный FamilyPilot-only global limiter;
- не активировать live traffic control автоматически.

Founder понимает Protection как внутреннюю техническую защиту FamilyPilot от ботов, массовых запросов, brute force, повторов, abusive write streams и т. п.; она в основном невидима пользователю.

## 11. Ошибки процесса, которые нельзя повторять

### Error Ledger #665 — CLOSED
Coordinator в одном ходе выполнил GitHub writes до mandatory per-turn governance-main check.
Prevention: governance main exact-commit check должен быть первым substantive действием каждого governed хода.

### Error Ledger #666 — CLOSED
Coordinator ошибочно счёл закрытые historical governance issues #236/#237 доказательством готовности shared cores.
Prevention: всегда читать closure reason и canonical current owner/status.

### #667 — CLOSED AS DUPLICATE
Случайно созданный duplicate #666. Не использовать.

### Error Ledger #668 — CLOSED
Случайное создание placeholder issue из-за неправильного tool action.
Prevention: перед write проверять exact target/action.

### Error Ledger #669 — CLOSED, RECURRENCE_COUNT=2
Сначала Search placement был преждевременно привязан к prototype layout, затем Coordinator переисправил это и сделал full redesign/Figma prerequisite для Search.
Current correction: Search функционально идёт сейчас; redesign/Figma — позже и отдельно.

### Error Ledger #673 — CLOSED
Founder запросил migration, но Coordinator сначала поставил самого себя в `Next Action` вместо немедленной публикации доступного handoff.
Current correction: migration handoff опубликован и прочитан обратно до завершения текущего чата.

### Earlier #85 ledgers
#637, #642, #660, #661, #662 закрыты; не переоткрывать без нового evidence.

## 12. Временные/исторические ветки и CI

Во время final #85 verification использовались disposable helper CI branches. Они были возвращены к candidate; helper work не является product baseline.

Не использовать helper commits как продуктовую основу.

#85 exact accepted evidence уже получен и не требует повторного прогона без конкретной regression-причины.

## 13. Что НЕ делать в новом чате

- не начинать #85 заново;
- не возвращать reset/privacy erase из #91/#92 в активный scope;
- не активировать cloud/Supabase backup или schedule;
- не продолжать P4D3B как текущий baseline;
- не начинать Protection #89 раньше Search acceptance;
- не заставлять Founder вспоминать prototype или повторно выбирать место Search;
- не требовать Figma;
- не начинать full redesign;
- не спрашивать разрешение на обычные Coordinator read/search/prep действия, если они уже разрешены текущим scope;
- не принимать shared idea status `In Design`/`Captured` за accepted architecture;
- не merge/deploy/Ready без отдельной authority;
- не использовать Founder как технический relay, если exact repo path/commit можно передать напрямую executor/reviewer.

## 14. Founder communication style

Founder отдельно указал, что читает «на человеческом».

Поэтому:
- не писать ему внутренний protocol dump;
- не заставлять разбирать commit/tree/path details, если они не нужны для решения;
- технические идентификаторы хранить в durable artifacts и показывать только кратко, когда они нужны;
- если нужен реальный выбор, сначала объяснить человеческий смысл вариантов;
- не создавать искусственные A/B/C gates, когда решение уже принято или можно продолжить самостоятельно.

## 15. Durable references

Current accepted product baseline:
`maloma/sandbox@1dcb19366ae2f23912ff1f4d32d4ec61e3417943`

Current product branch:
`fp85-trash-expiry-fixed45-r3`

Completed Data Lifecycle:
`maloma/FamilyPilot#85`

Active Search:
`maloma/FamilyPilot#88`

Queued Protection:
`maloma/FamilyPilot#89`

Deferred Reset:
`maloma/FamilyPilot#91`

Deferred Privacy Erase:
`maloma/FamilyPilot#92`

Shared Search idea:
`maloma/decisionos-ideas/ideas/IDEA-0009-search-core/README.md`

Shared Protection idea:
`maloma/decisionos-ideas/ideas/IDEA-0010-abuse-protection-traffic-control-core/README.md`

Current ideas repository commit at migration:
`366e1db47fc5788da07ed21212ed0fd862d83a42`

## 16. Immediate continuation state

На момент миграции:
- governance main = `aa96d32...`;
- FamilyPilot accepted baseline = `1dcb1936...`;
- #85 = CLOSED;
- #88 Search = ACTIVE FIRST PRIORITY;
- #89 Protection = QUEUED SECOND PRIORITY;
- Search Core IDEA-0009 = `In Design`, not yet automatically accepted;
- Protection Core IDEA-0010 = `Captured`;
- no Search product code has been accepted yet;
- no Protection product code/design has been accepted yet;
- full redesign/Figma is NOT current work;
- first unfinished action is Search v1 acceptance/implementation progression described in section 8.

Новый Coordination-чат должен после bootstrap сразу продолжить эту работу, не возвращая Founder к уже закрытым решениям.
