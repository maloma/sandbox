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
const api=require('../familypilot-entry-ux-reset-r1.js');

assert.match(reset,/FamilyPilot-owned operation voice is removed/);
assert.match(adapter,/architecture:RESET_ID/);
assert.match(adapter,/FP86_ENTRY_UX_RESET_R1/);
assert.match(index,/familypilot-entry-ux-reset-r1\.js/,'the non-voice entry owner must load on web and both native shells');
assert.match(index,/label for="amountInput">Сумма<\/label>/);
assert.match(adapter,/field\.insertBefore\(n,a\)/,'computed result must remain above the keypad');
assert.match(adapter,/expression\.id='fpAmountExpression'/,'the current expression must be visibly rendered as a separate read-only output');
assert.match(adapter,/field\.insertBefore\(expression,a\)/);
assert.match(adapter,/e\.textContent=displayExpression\(a\.value\)\|\|'0'/);
assert.match(adapter,/field\.insertBefore\(keypad,a\)/);
assert.doesNotMatch(adapter,/amountExpressionRow|amountExpressionLabel|textContent='Расчёт'/);
assert.deepStrictEqual(api.keypadLayout.map(row=>[...row]),[
  ['7','8','9','+'],
  ['4','5','6','−'],
  ['1','2','3','×'],
  ['.','0','⌫','÷']
]);
assert.match(adapter,/b\.type='button'/);
assert.match(adapter,/b\.setAttribute\('aria-label',KEY_LABELS\[key\]\)/);
assert.match(adapter,/a\.readOnly=true/);
assert.match(adapter,/a\.setAttribute\('inputmode','none'\)/);
assert.match(adapter,/a\.tabIndex=-1/);
assert.match(adapter,/a\.hidden=true/);
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

const press=(keys,state={expression:'',preloaded:false})=>[...keys].reduce((current,key)=>api.reduceKeypadState(current,key),state);
let state=press('12.5+7.5');
assert.strictEqual(state.expression,'12.5+7.5');
assert.deepStrictEqual(api.calculateExpression(state.expression),{value:20});
assert.deepStrictEqual(api.calculateExpression(press('4×2.5').expression),{value:10});
assert.deepStrictEqual(api.calculateExpression(press('12÷5').expression),{value:2.4});
assert.deepStrictEqual(api.calculateExpression(press('2+3×4').expression),{value:14});
assert.strictEqual(press('12+×').expression,'12*','a repeated operator must replace the trailing operator');
assert.strictEqual(press('1.2.3').expression,'1.23','a second decimal in the same operand must be ignored');
assert.strictEqual(press('.5').expression,'0.5','decimal at an empty operand must insert 0.');
assert.strictEqual(press('12⌫').expression,'1','backspace must remove the last character');
assert.strictEqual(press('⌫').expression,'','backspace on empty input must be a no-op');
assert.deepStrictEqual(api.reduceKeypadState({expression:'42',preloaded:true},'7'),{expression:'7',preloaded:false});
assert.deepStrictEqual(api.reduceKeypadState({expression:'42',preloaded:true},'.'),{expression:'0.',preloaded:false});
assert.deepStrictEqual(api.reduceKeypadState({expression:'42',preloaded:true},'+'),{expression:'42+',preloaded:false});
assert.deepStrictEqual(api.reduceKeypadState({expression:'42',preloaded:true},'⌫'),{expression:'4',preloaded:false});
assert.deepStrictEqual(api.keypadExpressionResult('12+'),{incomplete:true,displayValue:12,validForSave:false});
assert.deepStrictEqual(api.keypadExpressionResult('12+8'),{value:20,displayValue:20,validForSave:true});
assert.deepStrictEqual(api.keypadExpressionResult(''),{empty:true,displayValue:0,validForSave:false});
assert.strictEqual(api.displayAmountExpression('12.5-3*2/4'),'12,5−3×2÷4');
assert.deepStrictEqual(api.entryOpenTransition(false,true),{opened:true,closed:false});
assert.deepStrictEqual(api.entryOpenTransition(true,true),{opened:false,closed:false},'an already-open modal/config preservation cycle must not reset itself');
assert.deepStrictEqual(api.entryOpenTransition(true,false),{opened:false,closed:true});
assert.deepStrictEqual(api.entryOpenTransition(false,true),{opened:true,closed:false},'a repeated explicit open must be recognized again');

const originalDocument=global.document;
const originalAnimationFrame=global.requestAnimationFrame;
try{
  const sheet={scrollTop:284};
  const entryModal={classList:{contains:value=>value==='open'},querySelector:()=>sheet};
  global.requestAnimationFrame=callback=>{callback();return 1};
  global.document={
    getElementById:id=>id==='entryModal'?entryModal:null,
    querySelectorAll:()=>[],
    querySelector:()=>null
  };
  assert.strictEqual(api.resetEntryScrollForOpen(),true);
  assert.strictEqual(sheet.scrollTop,0);
  sheet.scrollTop=173;
  assert.strictEqual(api.resetEntryScrollForOpen(),true);
  assert.strictEqual(sheet.scrollTop,0,'every repeated NEW/EDIT open must start at the top');

  let closeClicks=0;
  const layer={querySelector:()=>({click:()=>{closeClicks+=1}})};
  global.document={getElementById:()=>null,querySelectorAll:selector=>selector.includes('overlay')?[layer]:[]};
  assert.strictEqual(api.handleNativeBack(),true);
  assert.strictEqual(closeClicks,1,'a handled modal Back must close its top web layer');
  global.document={getElementById:()=>null,querySelectorAll:()=>[],querySelector:()=>null};
  assert.strictEqual(api.handleNativeBack(),false,'Back must fall through only when no FamilyPilot layer/history is handled');
}finally{
  if(originalDocument===undefined)delete global.document;else global.document=originalDocument;
  if(originalAnimationFrame===undefined)delete global.requestAnimationFrame;else global.requestAnimationFrame=originalAnimationFrame;
}

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
assert.match(activity,/MediaStore\.ACTION_IMAGE_CAPTURE/);
assert.match(activity,/FileProvider\.getUriForFile/);
assert.match(manifest,/android:configChanges="[^"]*orientation[^"]*screenSize[^"]*"/);
assert.doesNotMatch(manifest,/android:screenOrientation=/);
assert.match(index,/accept="image\/\*,application\/pdf"/);
assert.match(index,/RECEIPT_MAX=750000/);
assert.match(index,/id="detailReceiptOpenBtn"/);
assert.match(index,/id="detailReceiptRemoveBtn"/);
assert.match(index,/id="receiptPreviewImage"/);
assert.match(index,/function openReceiptPreview\(\)/);
assert.match(index,/operation\.receipt=null/,'receipt removal must be an explicit user action');
assert.match(index,/size:file\.size/,'stored receipt identity must retain its size');
assert.match(adapter,/FamilyPilotNativeContract=Object\.freeze\(\{version:1,handleBack:handleNativeBack\}\)/);
assert.match(adapter,/if\(dirty\(\)\)[\s\S]*askSave\(\)/,'native Back must reuse the dirty-close Save confirmation path through the close click');
assert.match(adapter,/scheduleEntryScrollReset\(\)/);

console.log('FP86_APP_VOICE_REMOVAL_PASS');
console.log('FP86_MANUAL_ENTRY_CONTRACT_PASS');
console.log('FP86_CALCULATOR_KEYPAD_LAYOUT_PASS');
console.log('FP86_CALCULATOR_KEYPAD_BEHAVIOR_PASS');
console.log('FP86_ARITHMETIC_RESULT_FIRST_UI_PASS');
console.log('FP86_AMOUNT_SYSTEM_KEYBOARD_BLOCKED_PASS');
console.log('FP86_SAVE_COMPUTED_RESULT_CONTRACT_PASS');
console.log('FP86_COMMENT_ORDINARY_TEXT_PASS');
console.log('FP86_DIRTY_CLOSE_ORIENTATION_PASS');
console.log('FP86_RECEIPT_LAYOUT_REGRESSION_PASS');
console.log('FP86_VISIBLE_READ_ONLY_EXPRESSION_PASS');
console.log('FP86_ANDROID_WEB_BACK_HANDLED_UNHANDLED_PASS');
console.log('FP86_RECEIPT_CAPTURE_PREVIEW_REMOVE_PASS');
console.log('FP86_ENTRY_OPEN_SCROLL_RESET_PASS');
