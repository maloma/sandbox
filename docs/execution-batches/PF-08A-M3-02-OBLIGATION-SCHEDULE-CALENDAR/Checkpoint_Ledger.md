# Checkpoint Ledger — PF-08A-M3-02-OBLIGATION-SCHEDULE-CALENDAR

**Document Type:** Append-Only Runtime Checkpoint Ledger  
**Status:** Active  
**Repository:** `maloma/sandbox`  
**Branch:** `agent/pf08a-m3-02-obligation-schedule-calendar`  
**Created:** 2026-07-22

Append-only rule: preserve all records and append later transitions using monotonic ordering markers.

---

## Record 001 — Resume Point and Runtime Inspection

- **Ordering Marker:** 001
- **Checkpoint ID:** PREP / CP-01
- **Status:** COMPLETED
- **Founder Resume Instruction:** continue from the durable cost-protection pause.
- **Canonical FamilyPilot Head:** `5b96881312f8cb9702117a2867d754547611d991`.
- **Sandbox Starting Head:** `4891ea40ff8e73dfb6c0fc3a9ab1a237a31131b8`.
- **Branch Search:** no pre-existing `pf08a-m3-02` branch.
- **Repository Reconciliation:** `sandbox@4891ea40...` is 46 commits ahead of M3-01 terminal evidence, but those later changes are confined to unrelated `crmos-questionnaire` paths; FamilyPilot runtime blobs remain the accepted M3-01 blobs.
- **Current M3 Conflict:** visible `Сегодня / Просрочено / Впереди` summary cards remain and must be removed.
- **Current Domain Limits:** one-time/monthly only; next occurrence generated on payment/skip; no arbitrary interval, finite ending, amount version, quick-pay list action, actual correction or archive.
- **Current Mounting Strategy:** retain canonical HTML/root equality and load an additive UI completion module from the obligations domain bootstrap.
- **Usage Constraint:** reuse existing trusted M3 workflow/test paths; do not create a new workflow family.
- **Verification Result:** PASS. Runtime completion can proceed without touching unrelated repository content.
- **Next Authorized Transition:** CP-02 domain and UI implementation.
- **Founder Intervention Required:** No.
- **Record Integrity State:** VALID.

---

## Record 002 — Local Domain Construction

- **Ordering Marker:** 002
- **Checkpoint ID:** CP-02
- **Status:** PARTIAL / ACTIVE
- **Environment Finding:** direct `git clone` from the execution container is unavailable because outbound DNS to GitHub is blocked.
- **Recovery:** inspect exact source through the GitHub connector and construct/test replacement files locally without a repository checkout.
- **Domain Artifact:** schema-v4 obligations module constructed locally.
- **Local Syntax:** `node --check` PASS.
- **Local Domain Tests:** PASS for:
  - every 3 months with exact count 11;
  - idempotent regeneration;
  - month-end clamping from the 31st;
  - `starting with next` and `only this` amount changes;
  - one linked Expense and duplicate rejection;
  - actual-payment correction with stable operation id;
  - moving one occurrence without changing adjacent occurrences;
  - archive stopping further generation;
  - M3-01 monthly-state normalization to schema v4.
- **UI Artifact:** additive post-bootstrap completion module constructed locally; syntax PASS.
- **Exact Stop Point:** persist verified domain/UI files and upgrade the existing M3 trusted tests.
- **Next Authorized Transition:** create repository artifacts on the current branch, then open one bounded PR.
- **Founder Intervention Required:** No.
- **Record Integrity State:** VALID.

# END OF CURRENT LEDGER PREFIX