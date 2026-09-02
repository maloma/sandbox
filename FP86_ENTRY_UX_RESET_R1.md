# FP86_ENTRY_UX_RESET_R1

Status: `RESET_IMPLEMENTATION_CANDIDATE / PRODUCER_VALIDATION_PENDING`

## Why this is a reset

The prior V1/V2/V3 correction chain is frozen after two failed physical correction attempts before V3. This candidate is not V4 and does not extend that patch chain.

V3 commit `1b2d71778360c8961a6e746ece10777e25247e20` is used only as the byte source for unaffected lower-level implementation that remains supported by evidence. The reset changes the failed entry-UX ownership/presentation route under a new identifier.

## Reimplementation scope

`REIMPLEMENTATION_REQUIRED`:
- unsaved-close confirmation presentation/lifecycle;
- amount maximum helper layout;
- cloud/account block placement relative to primary operation screen and fixed docks;
- explicit hints-on / hints-off layout contract.

`PRESERVED_PENDING_VERIFICATION`:
- on-device/native-only speech provider boundary;
- live partial transcript remains display-only before Stop;
- final amount → exact-category → note parsing;
- numeric-only `200` → Amount;
- explicit Stop/finalization;
- arithmetic calculation/operator semantics;
- blank category for new operation and amount+category save guard;
- visible editable draft and no auto-save.

## Reset architecture

- unsaved-change confirmation is embedded inside the active entry sheet immediately below its header; no body-level fixed confirmation overlay is used;
- amount result remains prominent and the maximum hint is compact: `Максимум 999 999,99.`;
- hints-disabled mode removes hint/help rows without leaving an empty reserved row;
- account/cloud readiness is moved into the intentional `Ещё` screen/settings flow instead of remaining free-standing below the app content;
- fixed operation and bottom navigation docks no longer own/cover the cloud-account block.

## Acceptance boundary

Producer validation must cover exact source identity, reset regression smoke, Android build and iOS build. Fresh independent review follows producer PASS. Physical Android validation is required after independent PASS, including both hints enabled and disabled.

No merge, deploy, release/store publication or closure of FamilyPilot #86 / Error Ledger #751, #906, #907, #913 is authorized by this candidate alone.
