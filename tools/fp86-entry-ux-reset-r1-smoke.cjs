'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const exists=relative=>fs.existsSync(path.join(root,relative));
const adapter=read('familypilot-entry-ux-reset-r1.js');
const index=read('index.html');
const reset=read('FP86_ENTRY_UX_RESET_R1.md');
const activity=read('mobile/android-app/app/src/main/java/com/familypilot/app/MainActivity.kt');
const manifest=read('mobile/android-app/app/src/main/AndroidManifest.xml');

assert.match(reset,/FamilyPilot-owned operation voice is removed/);
assert.match(adapter,/architecture:RESET_ID/);
assert.match(adapter,/FP86_ENTRY_UX_RESET_R1/);
assert.match(index,/familypilot-entry-ux-reset-r1\.js/,'the non-voice entry owner must load on web and both native shells');
assert.match(index,/label for="amountInput">Сумма<\/label>/);
assert.match(adapter,/field\.insertBefore\(n,a\)/,'computed result must move above controls and expression');
assert.match(adapter,/field\.insertBefore\(r,a\)/);
assert.match(adapter,/field\.insertBefore\(expression,a\)/);
assert.match(adapter,/expressionLabel\.textContent='Расчёт'/);
assert.match(adapter,/\['\+','−','×','÷'\]/);
assert.match(index,/function saveOperation\(\)\{const calculation=updateAmountCalculation\(\),amount=calculation\.value/,'Save must consume the computed result');
assert.match(index,/const rawNote=\$\('noteInput'\)\.value/);
assert.doesNotMatch(index,/\$\('noteInput'\)\.(?:oninput|onchange|addEventListener)/,'Comment must remain ordinary text with no financial routing handler');
assert.doesNotMatch(adapter,/parseTranscript|parseCurrentNote|applyText|recognize|dictat|speech|microphone|voice/i);

assert.match(adapter,/fp-unsaved-inline/);
assert.doesNotMatch(adapter,/fp-unsaved-confirm\{position:fixed/);
assert.doesNotMatch(adapter,/document\.body\.appendChild\(w\)/);
assert.match(adapter,/sheet\.insertBefore\(w,head\.nextSibling\)/);
assert.match(adapter,/Максимум 999 999,99\./);
assert.match(adapter,/placeCloudAccount/);
assert.match(adapter,/more\.insertBefore\(cloud,settingsGroup\.nextSibling\)/);
assert.match(adapter,/\.fp-hints-hidden \.meta-note/);
assert.match(adapter,/\.fp-hints-hidden \.field-help/);
assert.match(adapter,/if\(!\$\('editingId'\)\?\.value\)/,'NEW must start without an inferred category');
assert.match(adapter,/if\(!g\)return\{ok:false,field:'category'\}/,'manual Category remains required');
assert.match(adapter,/if\(a\.empty\|\|a\.error/,'manual Amount remains validated');

for(const removed of [
  'familypilot-voice-v1.js',
  'familypilot-voice-v1-native-entry.js',
  'familypilot-voice-v1-form-adapter.js',
  'familypilot-native-speech-provider-v1.js',
  'familypilot-native-speech-web-host-v1.js',
  'mobile/android/FamilyPilotOnDeviceSpeechV1.kt',
  'mobile/android/FamilyPilotSpeechWebBridgeV1.kt',
  'mobile/ios/FamilyPilotOnDeviceSpeechV1.swift',
  'mobile/ios/FamilyPilotSpeechWebBridgeV1.swift'
])assert.strictEqual(exists(removed),false,`${removed} must be removed`);

assert.match(activity,/WebChromeClient/);
assert.match(activity,/onShowFileChooser/);
assert.match(activity,/Intent\.ACTION_OPEN_DOCUMENT/);
assert.match(activity,/arrayOf\("image\/\*", "application\/pdf"\)/);
assert.match(activity,/pendingFileChooser\?\.onReceiveValue\(null\)/);
assert.match(manifest,/android:configChanges="[^"]*orientation[^"]*screenSize[^"]*"/);
assert.doesNotMatch(manifest,/android:screenOrientation=/);
assert.match(index,/accept="image\/\*,application\/pdf"/);
assert.match(index,/RECEIPT_MAX=750000/);

console.log('FP86_APP_VOICE_REMOVAL_PASS');
console.log('FP86_MANUAL_ENTRY_CONTRACT_PASS');
console.log('FP86_ARITHMETIC_RESULT_FIRST_UI_PASS');
console.log('FP86_COMMENT_ORDINARY_TEXT_PASS');
console.log('FP86_DIRTY_CLOSE_ORIENTATION_PASS');
console.log('FP86_RECEIPT_LAYOUT_REGRESSION_PASS');
