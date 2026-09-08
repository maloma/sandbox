# FP86_ENTRY_UX_RESET_R1

Status: `APP_VOICE_REMOVAL_CANDIDATE / PRODUCER_VALIDATION_PENDING`

## Current product boundary

FamilyPilot-owned operation voice is removed. Amount and Category are manual, Comment is an ordinary editable text field, and Save remains explicit. OS/keyboard dictation may enter Comment only as ordinary IME text; FamilyPilot does not recognize, parse, normalize, or route that text into financial fields.

The earlier V1/V2/V3 voice correction chain is historical provenance only. It is not extended by this candidate.

## Retained entry UX

- NEW starts with a blank Category; EDIT preserves the existing Category.
- Amount is entered manually through a dedicated in-app calculator keypad; the Amount field does not open the Android/iOS system keyboard.
- The Amount hierarchy is result first, followed by the integrated 4×4 keypad: `7 8 9 +`, `4 5 6 −`, `1 2 3 ×`, `. 0 ⌫ ÷`. There is no separate visible/editable `Расчёт` row and no `=` key.
- Digits and one decimal point per operand build the internal expression. Operators retain normal arithmetic precedence, a repeated trailing operator replaces the previous one, and backspace removes the last character.
- The result strip updates live. A trailing operator keeps the last valid computed result visible while the incomplete expression remains invalid for Save.
- NEW starts with an empty expression and a zero result. EDIT initially shows its stored amount: a first digit/decimal replaces it, an operator continues from it, and backspace edits it.
- Save uses the computed valid result, not the expression string.
- Dirty-close `Сохранить?`, orientation/config-change preservation, receipt/file chooser, account placement, maximum hint, and hints on/off remain owned by the non-voice `familypilot-entry-ux-reset-r1.js` adapter.

## Removed integration

- operation voice controls, live/recovery controls, settings, and text parsing;
- voice-to-fields parser and bootstrap;
- Android/iOS recognizer, bridge, permissions, speech declarations, and speech frameworks;
- obsolete voice-only tests and workflows.

## Acceptance boundary

Producer validation covers deterministic entry tests, a real Android debug build, and the current workflow's Android/iOS builds. Fresh independent review follows producer PASS. No merge, deploy, release, issue closure, or Error Ledger closure is authorized.
