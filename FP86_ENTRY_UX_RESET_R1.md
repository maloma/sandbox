# FP86_ENTRY_UX_RESET_R1

Status: `PHYSICAL_ANDROID_CORRECTION_R2 / PRODUCER_VALIDATION_PENDING`

## Current product boundary

FamilyPilot-owned operation voice is removed. Amount and Category are manual, Comment is an ordinary editable text field, and Save remains explicit. OS/keyboard dictation may enter Comment only as ordinary IME text; FamilyPilot does not recognize, parse, normalize, or route that text into financial fields.

The earlier V1/V2/V3 voice correction chain is historical provenance only. It is not extended by this candidate.

## Retained entry UX

- NEW starts with a blank Category; EDIT preserves the existing Category.
- Amount is entered manually through a dedicated in-app calculator keypad; the Amount field does not open the Android/iOS system keyboard.
- The Amount hierarchy is the large result first, a compact read-only live expression, then the integrated 4×4 keypad: `7 8 9 +`, `4 5 6 −`, `1 2 3 ×`, `. 0 ⌫ ÷`. There is no separate visible/editable `Расчёт` row and no `=` key.
- Digits and one decimal point per operand build the internal expression. Operators retain normal arithmetic precedence, a repeated trailing operator replaces the previous one, and backspace removes the last character.
- The result strip updates live. A trailing operator keeps the last valid computed result visible while the incomplete expression remains invalid for Save.
- NEW starts with an empty expression and a zero result. EDIT initially shows its stored amount: a first digit/decimal replaces it, an operator continues from it, and backspace edits it.
- Save uses the computed valid result, not the expression string.
- Dirty-close `Сохранить?`, orientation/config-change preservation, receipt/file chooser, account placement, maximum hint, and hints on/off remain owned by the non-voice `familypilot-entry-ux-reset-r1.js` adapter.
- Every explicit NEW/EDIT transition resets only the entry sheet to the top after layout; an already-open orientation/config preservation cycle does not reset it.
- Operator keys keep the accepted 4×4 order and at least 48 px tap targets, with a larger, stronger operator-specific treatment so `+`, `−`, `×`, and `÷` remain distinct on a phone.

## Physical Android correction R2

- The Android Activity forwards pause/resume to the existing `WebView`, pauses/resumes its timers, and performs a bounded layout/invalidation plus `postVisualStateCallback` refresh on resume and regained window focus. The Activity and WebView use the same dark shell background, preventing the native window from exposing a white transition. It never reloads the page, so the live DOM, modal, and unsaved draft remain intact.
- Android system Back uses `OnBackPressedDispatcher` and asks the web contract to unwind the top FamilyPilot modal/overlay or active in-app screen. Entry close still travels through the existing dirty-close `Сохранить?` guard; an unhandled Back falls through to Android normally.
- The existing JPEG/PNG/WebP/PDF document chooser and cache-only `FileProvider` camera capture remain available. A non-empty app-owned `EXTRA_OUTPUT` file is authoritative even when a camera also returns result data; cancellation and stale cleanup remain bounded and no broad storage or camera permission is declared.
- Each operation has an ordered `receipts` collection of up to eight stable attachment references. Binary blobs live in a dedicated IndexedDB object store, not the main localStorage state. Existing singular base64 `receipt` data remains readable and migrates lazily only after its blob is safely stored; migration failure retains the legacy data.
- JPEG, PNG, and WebP inputs require matching MIME and magic bytes, are decoded with orientation, scaled to a maximum 2200 px long edge, and encoded as a bounded readable JPEG. PDF requires matching `%PDF-` content and retains the 750 KB limit. Display names are Unicode-normalized, stripped of controls, bidi/zero-width controls and path separators, length-bounded, and rendered only with `textContent`.
- Operation detail renders every page with its own open and confirmed remove action. The image viewer provides fit-to-screen, zoom in/out/reset and scrolling/panning while zoomed. Android PDF open remains restricted to a validated local `application/pdf` payload with the in-app fallback preserved.

## Removed integration

- operation voice controls, live/recovery controls, settings, and text parsing;
- voice-to-fields parser and bootstrap;
- Android/iOS recognizer, bridge, permissions, speech declarations, and speech frameworks;
- obsolete voice-only tests and workflows.

## Acceptance boundary

Producer validation covers deterministic entry tests, a real Android debug build, and the current workflow's Android/iOS builds. Fresh independent review follows producer PASS. No merge, deploy, release, issue closure, or Error Ledger closure is authorized.
