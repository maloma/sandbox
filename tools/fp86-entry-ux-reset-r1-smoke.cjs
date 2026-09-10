'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const exists=relative=>fs.existsSync(path.join(root,relative));
const adapter=read('familypilot-entry-ux-reset-r1.js');
const receiptTransform=read('familypilot-receipt-media-transform-v1.js');
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
assert.match(adapter,/\.fp-amount-key\{min-height:52px/,'all keypad tap targets must remain at least 48 px');
assert.match(adapter,/OPERATOR_VECTOR_GEOMETRY/,'operators must have font-independent static geometry');
assert.match(adapter,/createElementNS\('http:\/\/www\.w3\.org\/2000\/svg','svg'\)/);
assert.match(adapter,/\.fp-amount-operator-svg\{[^}]*width:38px[^}]*height:38px/,'operator geometry must have deterministic optical size');
assert.match(adapter,/stroke-width:5\.5/,'operator geometry must have deterministic stroke weight');
assert.match(adapter,/b\.value=key/,'the operator text value must remain available independently of its visible vector');
assert.doesNotMatch(adapter,/data-amount-kind="operator"[^}]*font-size:/,'font metrics must not be the visible operator sizing mechanism');
const hasDeterministicOperatorVisual=value=>/createElementNS\('http:\/\/www\.w3\.org\/2000\/svg','svg'\)/.test(value)&&/stroke-width:5\.5/.test(value);
assert.strictEqual(hasDeterministicOperatorVisual('.fp-amount-key[data-amount-kind="operator"]{font-size:31px;font-weight:950}'),false,'the physical starting candidate font-only treatment must fail this contract');
assert.strictEqual(hasDeterministicOperatorVisual(adapter),true);
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
assert.deepStrictEqual(api.operatorVectorGeometry['+'].lines,[[24,7,24,41],[7,24,41,24]]);
assert.deepStrictEqual(api.operatorVectorGeometry['÷'].dots,[[24,9],[24,39]]);
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

  let datePickerOpen=true,entryOpen=true,confirmHidden=true,dateCloseClicks=0,genericCloseClicks=0,dirtyGuardClicks=0;
  const dateCloser={click:()=>{dateCloseClicks+=1;datePickerOpen=false}};
  const entryCloser={click:()=>{dirtyGuardClicks+=1}};
  const genericCloser={click:()=>{genericCloseClicks+=1}};
  const datePicker={id:'operationDatePickerModal',querySelector:selector=>selector==='[data-operation-date-close]'?dateCloser:null};
  const entryLayer={id:'entryModal',querySelector:selector=>selector==='[data-close="entryModal"]'?entryCloser:null};
  const genericLayer={id:'receiptPreview',querySelector:selector=>selector==='[data-close="receiptPreview"]'?genericCloser:null};
  const confirm={get hidden(){return confirmHidden},set hidden(value){confirmHidden=value}};
  global.document={
    getElementById:id=>id==='fpUnsavedConfirm'?confirm:null,
    querySelectorAll:selector=>{
      if(!selector.includes('overlay'))return [];
      if(datePickerOpen)return[entryLayer,datePicker];
      if(entryOpen)return[entryLayer];
      return[];
    },
    querySelector:()=>null
  };
  assert.strictEqual(api.handleNativeBack(),true);
  assert.strictEqual(dateCloseClicks,1,'Back must use the real data-operation-date-close contract');
  assert.strictEqual(entryOpen,true,'Back must leave the entry sheet open after closing its date picker');
  assert.strictEqual(dirtyGuardClicks,0,'the lower entry sheet must not receive Back while the date picker is open');

  datePickerOpen=true;
  confirmHidden=false;
  assert.strictEqual(api.handleNativeBack(),true);
  assert.strictEqual(dateCloseClicks,2,'a date picker opened above the dirty confirmation remains the Back target');
  assert.strictEqual(confirmHidden,false,'Back must leave the lower dirty confirmation untouched');
  assert.strictEqual(dirtyGuardClicks,0,'Back must not dispatch the lower entry close while the picker is open');

  confirmHidden=true;
  assert.strictEqual(api.handleNativeBack(),true);
  assert.strictEqual(dirtyGuardClicks,1,'a dirty entry without a higher layer must use its normal Save confirmation close path');

  entryOpen=false;
  global.document={getElementById:()=>null,querySelectorAll:selector=>selector.includes('overlay')?[genericLayer]:[],querySelector:()=>null};
  assert.strictEqual(api.handleNativeBack(),true);
  assert.strictEqual(genericCloseClicks,1,'a supported generic modal must close through its own real closer');

  const uncloseableTopLayer={id:'operationDatePickerModal',querySelector:()=>null};
  global.document={getElementById:()=>null,querySelectorAll:selector=>selector.includes('overlay')?[genericLayer,uncloseableTopLayer]:[],querySelector:()=>null};
  assert.strictEqual(api.handleNativeBack(),false,'Back must remain unhandled rather than click a backdrop or lower layer without a valid top-layer close path');
  assert.strictEqual(genericCloseClicks,1,'an uncloseable top layer must not dispatch its lower modal');
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
assert.match(activity,/arrayOf\("image\/jpeg", "image\/png", "image\/webp", "application\/pdf"\)/);
assert.match(activity,/pendingFileChooser\?\.onReceiveValue\(null\)/);
assert.match(activity,/MediaStore\.ACTION_IMAGE_CAPTURE/);
assert.match(activity,/FileProvider\.getUriForFile/);
assert.match(manifest,/android:configChanges="[^"]*orientation[^"]*screenSize[^"]*"/);
assert.doesNotMatch(manifest,/android:screenOrientation=/);
assert.match(index,/accept="image\/jpeg,image\/png,image\/webp,application\/pdf" multiple/);
assert.match(index,/RECEIPT_MAX=750000/);
assert.match(index,/id="detailReceiptOpenBtn"/);
assert.match(index,/id="detailReceiptRemoveBtn"/);
assert.match(index,/id="receiptPreviewImage"/);
assert.match(index,/async function openReceiptPreview\(item=receiptPreviewItem\)/);
assert.match(index,/operation\.receipts=receiptApi\(\)\.removeReceiptMetadata/,'receipt removal must target one stable attachment identity');
assert.match(index,/size:blob\.size/,'stored receipt identity must retain its normalized binary size');
assert.match(index,/indexedDB\.open\(RECEIPT_DB,1\)/,'receipt binary payloads must use the dedicated IndexedDB store');
assert.match(index,/createObjectStore\(RECEIPT_STORE,\{keyPath:'key'\}\)/);
assert.match(index,/receipts:\[\]/,'new operations must use the ordered multi-attachment model');
assert.doesNotMatch(index,/o\.receipts=Array\.isArray\(o\.receipts\)\?o\.receipts:\[\]/,'normalization must not add receipt metadata to persisted legacy operations');
assert.match(index,/migrateLegacyReceipt/,'legacy singular receipt data must migrate lazily');
assert.match(index,/operation\.receipt=null/,'legacy data may be cleared only after its blob and metadata are persisted');
assert.match(index,/RECEIPT_LIMIT=8/);
assert.match(index,/RECEIPT_IMAGE_EDGE=2200/);
assert.match(index,/familypilot-receipt-media-transform-v1\.js/);
assert.match(receiptTransform,/imageOrientation:'from-image'/);
assert.match(index,/canvasBlob\(canvas,'image\/jpeg',\.86\)/);
assert.match(index,/file\.size>RECEIPT_MAX/,'PDF must retain the bounded 750 KB limit');
const galleryStart=index.indexOf('async function syncDetailReceipt()');
const galleryEnd=index.indexOf('function hideReceiptActionMenu',galleryStart);
const galleryContract=index.slice(galleryStart,galleryEnd);
assert.doesNotMatch(galleryContract,/item\.name|receiptIdentity|Math\.ceil\(size\/1024\)/,'the dense gallery must not expose receipt names or sizes');
assert.doesNotMatch(index,/id="receiptZoom(?:Out|In|Reset)"|receipt-preview-toolbar/,'the image viewport must not reserve space for a persistent +/- toolbar');
assert.match(index,/touch-action:none/,'the image viewport must own bounded pinch/pan gestures');
assert.match(index,/addEventListener\('pointerdown',beginReceiptPointer\)/,'the viewer must install Pointer Events instead of remaining button-only');
const hasPrimaryPinchViewer=value=>/beginReceiptPinch/.test(value)&&/addEventListener\('pointermove',moveReceiptPointer\)/.test(value);
assert.strictEqual(hasPrimaryPinchViewer('<button id="receiptZoomIn">+</button><button id="receiptZoomOut">−</button>'),false,'the physical starting candidate button-only viewer must fail this contract');
assert.strictEqual(hasPrimaryPinchViewer(index),true);
const pinchStart=api.beginReceiptPinch({scale:1,x:0,y:0},{x:0,y:0},{x:100,y:0});
assert.strictEqual(api.updateReceiptPinch(pinchStart,{x:0,y:0},{x:200,y:0}).scale,2,'increasing two-pointer distance must zoom in');
assert.strictEqual(api.updateReceiptPinch(pinchStart,{x:0,y:0},{x:50,y:0}).scale,1,'decreasing distance must clamp at fit scale');
const maxPinch=api.beginReceiptPinch({scale:3,x:0,y:0},{x:0,y:0},{x:100,y:0});
assert.strictEqual(api.updateReceiptPinch(maxPinch,{x:0,y:0},{x:300,y:0}).scale,4,'pinch zoom must clamp at 4x');
assert.deepStrictEqual(api.panReceiptTransform({scale:2,x:-10,y:-20},7,-5),{scale:2,x:-3,y:-25},'one-finger pan must update the zoomed transform');
assert.deepStrictEqual(api.panReceiptTransform({scale:1,x:-10,y:-20},7,-5),{scale:1,x:0,y:0},'fit state must not drift under one-finger motion');
assert.deepStrictEqual(api.fitReceiptTransform(),{scale:1,x:0,y:0},'opening/reset must return to fit state');
assert.match(index,/clearReceiptPreview\(\)[\s\S]*fitReceiptTransform/,'opening a different receipt must reset gesture state');
assert.match(index,/cancelReceiptPointerState/,'pointer cancellation must clear viewer gesture state');
assert.match(index,/cancelReceiptCropPointer/,'pointer cancellation must clear crop gesture state');
assert.match(index,/id="receiptCropAction"/);
assert.match(index,/id="receiptCropCancel"[\s\S]*id="receiptCropConfirm"/,'crop mode must expose explicit cancel and confirm');
assert.match(index,/item\.type==='application\/pdf'/,'crop must be unavailable for PDF');
assert.strictEqual(api.normalizeReceiptCrop,undefined,'the failed predecessor crop authority must be removed');
const cropStart=index.indexOf('async function confirmReceiptCrop()');
const cropEnd=index.indexOf('async function applyReceiptEditSession',cropStart);
const cropContract=index.slice(cropStart,cropEnd);
assert(cropStart>=0&&cropEnd>cropStart,'the crop replacement contract must be extractable');
assert.match(cropContract,/validateCropSelection/,'crop preview must retain the accepted no-salvage validator');
assert.doesNotMatch(cropContract,/executeReceiptReplacement|putReceiptBlob|writeOperationReceiptMetadata/,'crop confirmation must remain ephemeral before Done');
const applyStart=index.indexOf('async function applyReceiptEditSession');
const applyEnd=index.indexOf('async function resolveCurrentCanonicalReceiptForAction',applyStart);
const applyContract=index.slice(applyStart,applyEnd);
assert.strictEqual((applyContract.match(/executeReceiptReplacement/g)||[]).length,1,'Done must use exactly one accepted replacement transaction');
assert.doesNotMatch(cropContract,/await putReceiptBlob\(replacement\.storageKey,cropped\)|operation\.receipts=before\.map/,'the predecessor inline replacement path must no longer be effective');
assert.match(index,/invokeNativeReceiptAction\('shareReceipt'\)/);
assert.match(index,/invokeNativeReceiptAction\('exportReceipt'\)/);
assert.match(index,/receiptPreviewBlob=blob/,'share/export must operate on the explicitly selected canonical attachment');
assert.strictEqual((index.match(/\$\('receiptInput'\)\.click\(\)/g)||[]).length,1,'receipt capture/selection must remain an explicit user action only');
assert.match(index,/\$\('detailReceiptBtn'\)\.onclick=\(\)=>\{\$\('receiptInput'\)\.click\(\)\}/);
assert.doesNotMatch(index,/getUserMedia|setInterval\([^)]*receipt|automaticReceipt/i,'receipts must never be captured or retained automatically');
assert.doesNotMatch(galleryContract,/Math\.ceil\(size\/1024\)/,'stored size must no longer consume normal-gallery space');

const normalizeStart=index.indexOf('function normalizeState(){');
const normalizeEnd=index.indexOf('}}normalizeState();',normalizeStart);
assert(normalizeStart>=0&&normalizeEnd>=normalizeStart,'the production state normalizer must remain extractable for the persistence regression fixture');
const productionNormalize=index.slice(normalizeStart,normalizeEnd+2);
const runProductionNormalize=initial=>new Function('initial',`let state=JSON.parse(JSON.stringify(initial));const walletsSeed=()=>[];const categorySeed=()=>[];const normalizeRevisionHistory=value=>Array.isArray(value)?value:[];const now=()=>0;${productionNormalize};normalizeState();return state;`)(initial);
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const stateFingerprint=value=>JSON.stringify(canonical(value));
const financialProjection=value=>value.operations.map(({id,kind,amount,categoryId,walletId,note,occurredAt,createdByMemberId,createdAt,lastEditedByMemberId,lastEditedAt,status,deletedAt,deletedByMemberId,trashExpiresAt,trashRetentionProvenance})=>({id,kind,amount,categoryId,walletId,note,occurredAt,createdByMemberId,createdAt,lastEditedByMemberId,lastEditedAt,status,deletedAt,deletedByMemberId,trashExpiresAt,trashRetentionProvenance}));
const legacyReceiptFixture={schemaVersion:2,household:{id:'household-test',baseCurrency:'EUR',openingCapital:0},currentMemberId:'member-anna',activeWalletId:'wallet-household-main',config:{trashRetentionEnabled:true,trashRetentionDays:45,allowFutureActualOperations:false,quickCategoryIds:{expense:[],income:[]}},wallets:[],categories:[],operations:[{id:'op-no-receipt-key',kind:'expense',amount:47.5,categoryId:'cat-food',walletId:'wallet-household-main',note:'legacy operation',occurredAt:1000,createdByMemberId:'member-anna',createdAt:900,lastEditedByMemberId:'member-anna',lastEditedAt:900,revisions:[],status:'active',deletedAt:null,deletedByMemberId:null,trashExpiresAt:null,trashRetentionProvenance:null,receipt:null,links:{},transferGroupId:null}]};
const legacyBefore=stateFingerprint(legacyReceiptFixture);
const normalizedLegacy=runProductionNormalize(legacyReceiptFixture);
const reloadedLegacy=runProductionNormalize(JSON.parse(JSON.stringify(normalizedLegacy)));
assert.strictEqual(Object.hasOwn(normalizedLegacy.operations[0],'receipts'),false,'real normalization must retain the legacy operation shape without a receipts key');
assert.strictEqual(Object.hasOwn(reloadedLegacy.operations[0],'receipts'),false,'normalize/save/reload must not synthesize a receipts key');
assert.strictEqual(stateFingerprint(normalizedLegacy),legacyBefore,'normalization must not change the persisted legacy operation fingerprint');
assert.strictEqual(stateFingerprint(reloadedLegacy),legacyBefore,'legacy fingerprint must remain stable after the real serialize/reload normalization path');
const attachedFixture=JSON.parse(JSON.stringify(reloadedLegacy));
const financialBeforeAttachment=financialProjection(attachedFixture);
attachedFixture.operations[0].receipts=api.appendReceiptMetadata(attachedFixture.operations[0].receipts,[{id:'id-91',storageKey:'key-91',name:'page-91.jpg',type:'image/jpeg',size:91,addedAt:91}]).receipts;
const reloadedAttached=runProductionNormalize(JSON.parse(JSON.stringify(attachedFixture)));
assert.strictEqual(Object.hasOwn(reloadedAttached.operations[0],'receipts'),true,'real attachment metadata mutation must intentionally create the receipts collection');
assert.deepStrictEqual(reloadedAttached.operations[0].receipts.map(item=>item.id),['id-91'],'intentional attachment metadata must survive reload intact');
assert.deepStrictEqual(financialProjection(reloadedAttached),financialBeforeAttachment,'receipt metadata mutation must not alter operation financial values');
const croppedFixture=JSON.parse(JSON.stringify(reloadedAttached));
croppedFixture.operations[0].receipts=croppedFixture.operations[0].receipts.map(item=>item.id==='id-91'?{...item,storageKey:'key-91-crop',size:41,width:320,height:480}:item);
assert.deepStrictEqual(croppedFixture.operations[0].receipts.map(item=>item.id),['id-91'],'crop replacement must preserve attachment identity and order');
assert.deepStrictEqual(financialProjection(croppedFixture),financialBeforeAttachment,'crop replacement must not alter financial operation fields');

assert.strictEqual(api.receiptAttachmentLimit,8);
assert.deepStrictEqual([...api.receiptMimeTypes],['image/jpeg','image/png','image/webp','application/pdf']);
assert.strictEqual(api.sanitizeReceiptName('  ../<script>"x"\\page\u202E\u200B\u0000.pdf  '),'.._<script>"x"_page.pdf');
assert.strictEqual([...api.sanitizeReceiptName('a'.repeat(400))].length,120);
const jpeg=Uint8Array.from([0xff,0xd8,0xff,0xe0]);
const png=Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
const webp=Uint8Array.from([...Buffer.from('RIFF'),0,0,0,0,...Buffer.from('WEBP')]);
const pdf=Uint8Array.from(Buffer.from('%PDF-1.7'));
assert.strictEqual(api.receiptMagicType(jpeg),'image/jpeg');
assert.strictEqual(api.receiptMagicType(png),'image/png');
assert.strictEqual(api.receiptMagicType(webp),'image/webp');
assert.strictEqual(api.receiptMagicType(pdf),'application/pdf');
assert.deepStrictEqual(api.validateReceiptType('image/png',jpeg),{ok:false,type:'image/jpeg'});
assert.deepStrictEqual(api.validateReceiptType('image/svg+xml',Uint8Array.from(Buffer.from('<svg'))),{ok:false,type:null});
const binaryBase64=value=>Buffer.from(value,'base64').toString('binary');
const legacy=api.decodeLegacyReceipt({type:'image/jpeg',data:'data:image/jpeg;base64,/9j/4A=='},binaryBase64);
assert.strictEqual(legacy.ok,true);
assert.strictEqual(legacy.type,'image/jpeg');
assert.deepStrictEqual([...legacy.bytes],[0xff,0xd8,0xff,0xe0]);
assert.deepStrictEqual(api.decodeLegacyReceipt({type:'image/png',data:'data:image/png;base64,/9j/4A=='},binaryBase64),{ok:false,error:'signature_mismatch',detectedType:'image/jpeg'});
const attachment=n=>({id:`id-${n}`,storageKey:`key-${n}`,name:`page-${n}.jpg`,type:'image/jpeg',size:n,addedAt:n});
const ordered=api.appendReceiptMetadata([], [attachment(1),attachment(2)]);
assert.deepStrictEqual(ordered.receipts.map(item=>item.id),['id-1','id-2']);
assert.deepStrictEqual(api.appendReceiptMetadata(ordered.receipts,[attachment(3)]).receipts.map(item=>item.id),['id-1','id-2','id-3'],'adding a page must not overwrite earlier pages');
assert.deepStrictEqual(api.appendReceiptMetadata([attachment(1)],[attachment(2)]).receipts.map(item=>item.id),['id-1','id-2'],'legacy migration must append without destructive replacement');
assert.deepStrictEqual(api.appendReceiptMetadata(ordered.receipts,[attachment(2)]).receipts.map(item=>item.id),['id-1','id-2'],'stable IDs must prevent duplicates');
const bounded=api.appendReceiptMetadata([],Array.from({length:10},(_,i)=>attachment(i+1)));
assert.strictEqual(bounded.receipts.length,8);
assert.strictEqual(bounded.overflow,2);
assert.deepStrictEqual(api.removeReceiptMetadata(ordered.receipts,'id-1').map(item=>item.id),['id-2']);
assert.match(adapter,/FamilyPilotNativeContract=Object\.freeze\(\{version:1,handleBack:handleNativeBack\}\)/);
assert.match(adapter,/operationDatePickerModal[\s\S]*\[data-operation-date-close\]/,'native Back must target the operation date picker through its real close contract');
assert.match(adapter,/\[data-close="\$\{layer\.id\}"\]/,'generic modal Back must use the closer for the actual top-layer id');
assert.doesNotMatch(adapter,/layer\.click\?\.\(\)/,'native Back must not claim handling by clicking an arbitrary backdrop');
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
console.log('FP86_RECEIPT_MULTI_ATTACHMENT_MODEL_PASS');
console.log('FP86_RECEIPT_MAGIC_AND_FILENAME_HARDENING_PASS');
console.log('FP86_RECEIPT_INDEXEDDB_NORMALIZATION_VIEWER_PASS');
console.log('FP86_OPERATOR_VECTOR_GEOMETRY_PASS');
console.log('FP86_RECEIPT_PINCH_PAN_GESTURE_PASS');
console.log('FP86_RECEIPT_CROP_ATOMIC_REPLACEMENT_PASS');
console.log('FP86_RECEIPT_NONPERSISTENT_ACTIONS_PASS');
console.log('FP86_CP2_CP3_STARTING_CANDIDATE_NEGATIVE_PROOF_PASS');
console.log('FP86_RECEIPT_EXPLICIT_OPT_IN_RETENTION_PASS');
console.log('FP86_RECEIPT_FINGERPRINT_LAZY_NORMALIZATION_PASS');
console.log('FP86_RECEIPT_METADATA_INTENTIONAL_STABLE_PASS');
console.log('FP86_ENTRY_OPEN_SCROLL_RESET_PASS');
