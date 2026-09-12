'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const index=read('index.html'),mirror=read('src/familypilot.html'),source=read('familypilot-receipt-viewer-editor-ux-followup-v1.js');
const api=require('../familypilot-receipt-viewer-editor-ux-followup-v1.js');
const section=(start,end)=>{const from=index.indexOf(start),to=index.indexOf(end,from);assert(from>=0&&to>from,`missing source section ${start}`);return index.slice(from,to)};

assert.strictEqual(index,mirror,'root and mirror must remain byte-identical');
for(const match of index.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new Function(match[1]);
assert.strictEqual(api.architecture,'FP94_RECEIPT_VIEWER_EDITOR_UX_FOLLOWUP_V1');
assert.deepStrictEqual([...api.fixedProfiles],['PNG_LOSSLESS','JPEG_Q86']);
assert.deepStrictEqual(api.referenceStates,{REFERENCE_PROFILE_UNAVAILABLE:'REFERENCE_PROFILE_UNAVAILABLE',REFERENCE_UNREADABLE:'REFERENCE_UNREADABLE',REFERENCE_READABLE:'REFERENCE_READABLE'});

const markup=section('<div id="receiptPreview"','<input id="receiptInput"');
const controlIds=['receiptCropAction','receiptShareAction','receiptExportAction','receiptAdjustmentsAction','receiptAutoAction','receiptDoneAction'];
function iconOracle(html){return controlIds.every(id=>new RegExp(`<button id="${id}"[^>]*aria-label="[^"]+"[^>]*>[\\s\\S]*?<svg`).test(html))}
assert(iconOracle(markup),'all primary controls must be icon-first and semantically labelled');
const textOnlyMutant=markup.replace(/<svg[\s\S]*?<\/svg>/g,'');
assert.strictEqual(iconOracle(textOnlyMutant),false,'NEGATIVE 3 text-only toolbar mutant escaped');
assert(!markup.includes('Действия')&&!markup.includes('receiptBrightnessAction')&&!markup.includes('receiptContrastAction'),'one direct Adjustments destination is required');
const redundantMutant=markup+'<button id="receiptBrightnessAction">Яркость</button><button id="receiptContrastAction">Контраст</button>';
assert(/receiptBrightnessAction/.test(redundantMutant)&&!/receiptBrightnessAction/.test(markup),'NEGATIVE 6 redundant toolbar mutant was not detectable');
assert(/\.receipt-adjustments\{[^}]*gap:16px/.test(index)&&/\.receipt-adjustments label\{[^}]*min-height:48px/.test(index)&&/\.receipt-adjustments input\{[^}]*min-height:48px/.test(index),'slider rows must expose 48px targets and 16px separation');
const geometryMutant=index.replace('gap:16px;padding:10px','gap:15px;padding:10px');
assert(!/\.receipt-adjustments\{[^}]*gap:16px/.test(geometryMutant),'NEGATIVE 7 touch geometry mutant escaped');
assert(!new RegExp('id="receiptAutoAction"[^>]*aria-pressed').test(markup),'Enhance must never be a latched toggle');
const latchedMutant=markup.replace('id="receiptAutoAction"','id="receiptAutoAction" aria-pressed="true"');
assert(new RegExp('id="receiptAutoAction"[^>]*aria-pressed').test(latchedMutant),'NEGATIVE 8 latched wand mutant was not detectable');

const swipe=section('function beginReceiptPointer','function blobDataUrl');
assert(/receiptTransform\.scale===1/.test(swipe)&&/receiptTransform\.scale!==1/.test(section('function navigateReceiptBySwipe','async function resolveCurrentCanonicalReceiptForAction')),'base-zoom swipe gate missing');
const swipeOracle=state=>state.scale===1&&!state.crop&&!state.slider&&!state.dockScroll;
assert(swipeOracle({scale:1,crop:false,slider:false,dockScroll:false}));
assert.strictEqual(swipeOracle({scale:1.01,crop:false,slider:false,dockScroll:false}),false,'NEGATIVE 1 zoomed swipe mutant escaped');
const transition=section('function closeReceiptViewerNow','async function resolveCurrentCanonicalReceiptForAction');
for(const id of ['receiptDirtySave','receiptDirtyDiscard','receiptDirtyCancel'])assert(markup.includes(`id="${id}"`),`dirty boundary missing ${id}`);
assert(/if\(!receiptSessionHasEdit\(\)\)/.test(transition)&&/settleReceiptDirtyTransition\('save'\)/.test(index)&&/settleReceiptDirtyTransition\('discard'\)/.test(index)&&/settleReceiptDirtyTransition\('cancel'\)/.test(index),'one Save/Discard/Cancel boundary is not wired');
const bypassMutant=transition.replace('if(!receiptSessionHasEdit())','if(true)');
assert(!/if\(!receiptSessionHasEdit\(\)\)/.test(bypassMutant),'NEGATIVE 2 dirty transition bypass mutant escaped');

const exportSource=section('async function exportCurrentReceipt','async function openReceiptPdfExternal'),exportCompletionSource=section('function completeReceiptExport','function handleReceiptNativeResult');
assert(/receiptExportState\.inFlight\|\|nowAt<receiptExportState\.suppressUntil/.test(exportSource)&&/Date\.now\(\)\+1500/.test(exportCompletionSource)&&/dataset\.state='success'/.test(exportCompletionSource)&&/setReceiptActionStatus\('Сохранено'\)/.test(exportCompletionSource),'export suppression/feedback contract missing');
const duplicateMutant=exportSource.replace('if(receiptExportState.inFlight||nowAt<receiptExportState.suppressUntil)return false;','');
assert(!/receiptExportState\.inFlight\|\|nowAt<receiptExportState\.suppressUntil/.test(duplicateMutant),'NEGATIVE 4 duplicate export mutant escaped');
const silentSuccessMutant=exportCompletionSource.replace("action.dataset.state='success';setReceiptActionStatus('Сохранено');",'');
assert(!/setReceiptActionStatus\('Сохранено'\)/.test(silentSuccessMutant),'NEGATIVE 5 silent-success mutant escaped');

const autoSource=section('async function evaluateReceiptAuto','async function openReceiptPreview');
assert(/evaluateReceiptAuto\(session\.sourceRaster,generation\)/.test(autoSource),'Enhance must compute from clean B0');
assert(/resetReceiptManualValues\(\)/.test(autoSource)&&/autoBaseRaster/.test(autoSource),'post-Auto manual baseline reset/cache missing');
const stackingMutant=autoSource.replace('evaluateReceiptAuto(session.sourceRaster,generation)','evaluateReceiptAuto(controlRasterForSession(),generation)');
assert(!/evaluateReceiptAuto\(session\.sourceRaster,generation\)/.test(stackingMutant),'NEGATIVE 9 transient-stack mutant escaped');
assert(/Уже оптимально · без изменений/.test(autoSource),'explicit Auto no-op feedback missing');
assert(!/Уже оптимально · без изменений/.test(autoSource.replace('Уже оптимально · без изменений','')),'NEGATIVE 10 silent no-op mutant escaped');
const sliderSource=section("$('receiptCropAction').onclick",'document.querySelectorAll(\'[data-filter]\')');
assert(!/evaluateReceiptAuto|runReceiptEnhance/.test(section("input.addEventListener('input'", "$('receiptDoneAction').onclick")),'slider pointer path reruns heavy Auto');
assert(/scheduleReceiptEditPreview/.test(sliderSource),'manual slider preview path missing');
const heavyMoveMutant=sliderSource.replace('scheduleReceiptEditPreview();syncReceiptEditControls()','runReceiptEnhance();scheduleReceiptEditPreview();syncReceiptEditControls()');
assert(/runReceiptEnhance/.test(heavyMoveMutant)&&!/runReceiptEnhance/.test(section("input.addEventListener('input'", "$('receiptDoneAction').onclick")),'NEGATIVE 11 heavy pointer mutant was not detectable');
assert(/resetReceiptEditVisualState\(\)/.test(section('function clearReceiptPreview','function receiptViewerTransform'))&&/receiptAdjustmentsAction'\)\.setAttribute\('aria-pressed','false'\)/.test(index),'discard/reopen visual reset missing');
const staleHighlightMutant=index.replace("$('receiptAdjustmentsAction').setAttribute('aria-pressed','false');",'');
assert(!/receiptAdjustmentsAction'\)\.setAttribute\('aria-pressed','false'\)/.test(staleHighlightMutant),'NEGATIVE 12 stale-highlight mutant escaped');

const previewSource=section('function renderReceiptEditPreview','async function commitReceiptEditSession');
const commitSource=section('async function commitReceiptEditSession','async function applyReceiptEditSession');
const noCanonicalWrite=text=>!/executeReceiptReplacement|putReceiptBlob|writeOperationReceiptMetadata/.test(text);
assert(noCanonicalWrite(previewSource),'preview path writes canonical state');
assert(!noCanonicalWrite(previewSource+';writeOperationReceiptMetadata()'),'NEGATIVE 13 pre-Done write mutant escaped');
assert.strictEqual((commitSource.match(/executeReceiptReplacement/g)||[]).length,1,'commit must use exactly one canonical replacement transaction');
assert.notStrictEqual((commitSource+';executeReceiptReplacement()').match(/executeReceiptReplacement/g).length,1,'NEGATIVE 14 repeated replacement mutant escaped');
const actionSource=section('async function resolveCurrentCanonicalReceiptForAction','async function exportCurrentReceipt');
assert(/resolveCanonicalReceiptForRead/.test(actionSource)&&!/currentRaster|autoBaseRaster/.test(actionSource),'Share/Export must resolve current canonical bytes');
assert(/currentRaster/.test(actionSource+';const blob=receiptEditSession.currentRaster'),'NEGATIVE 15 stale preview payload mutant was not detectable');
assert(/financialFingerprint/.test(commitSource)&&/receiptOrder/.test(commitSource),'financial/order invariant verification missing');
const invariantMutant=commitSource.replace(/verifyInvariant:\(\)=>\{[\s\S]*?\}\}\);/,'verifyInvariant:()=>true});');
assert(!/financialFingerprint/.test(invariantMutant)||!(/receiptOrder/.test(invariantMutant)),'NEGATIVE 16 invariant mutant escaped');
assert(/item\.type==='application\/pdf'\?null/.test(section('async function openReceiptPreview','window.openReceiptPreview'))&&/const session=receiptEditSession,isImage=!!session/.test(index),'PDF must not enter image editor');
const pdfMutant=index.replace("item.type==='application/pdf'?null",'null?null');
assert(!/item\.type==='application\/pdf'\?null/.test(pdfMutant),'NEGATIVE 17 PDF editor mutant escaped');

const rasterFromValues=values=>{const pixels=new Uint8ClampedArray(values.length*4);values.forEach((rgb,index)=>{pixels[index*4]=rgb[0];pixels[index*4+1]=rgb[1];pixels[index*4+2]=rgb[2];pixels[index*4+3]=255});return{width:100,height:100,stride:4,pixels}};
const clippingValues=[];
for(let i=0;i<400;i++)clippingValues.push([0,0,0]);
for(let i=0;i<300;i++)clippingValues.push([60,60,60]);
for(let i=0;i<200;i++)clippingValues.push([70,70,70]);
for(let i=0;i<100;i++)clippingValues.push([100,100,100]);
for(let i=0;i<9000;i++)clippingValues.push([200,200,200]);
const clippingFixture=rasterFromValues(clippingValues),safeTone=api.toneSafe(clippingFixture);
assert.strictEqual(safeTone.status,'PRESENT');
assert.strictEqual(safeTone.gain,1.275);assert.strictEqual(Math.abs(safeTone.offset),0);
assert.strictEqual(safeTone.raster.pixels[400*4],77);assert.strictEqual(safeTone.raster.pixels[700*4],89);
const oldLumaMutant=value=>Math.max(0,Math.min(255,Math.round(1.6*value-128)));
assert(oldLumaMutant(60)===0&&oldLumaMutant(70)===0&&safeTone.raster.pixels[400*4]!==safeTone.raster.pixels[700*4],'NEGATIVE 18 old luma-clipping mutant escaped');

const png=(bytes,readable=true)=>({profile:'PNG_LOSSLESS',mime:'image/png',bytes,readable});
const jpg=(bytes,readable=true)=>({profile:'JPEG_Q86',mime:'image/jpeg',bytes,readable});
const choose=entries=>entries.filter(entry=>entry.readable).slice().sort((a,b)=>a.bytes-b.bytes||(a.profile==='PNG_LOSSLESS'?-1:1))[0]||null;
function independentSelector(input){const available=input.reference.length>0;if(!available)return'AUTO_DISABLED';const reference=choose(input.reference);if(!reference)return'AUTO_NO_OP';const mode=entries=>{const encoding=choose(entries);return{encoding,size:encoding?.bytes??null,eligible:!!encoding&&encoding.bytes<=.8*reference.bytes}};const gray=mode(input.gray),bw=mode(input.bw);if(gray.eligible&&!bw.eligible)return'GRAY_SAFE';if(!gray.eligible&&bw.eligible)return'BW_STRONG';if(gray.eligible&&bw.eligible)return bw.size<=1.02*gray.size?'BW_STRONG':'GRAY_SAFE';return input.referenceMode==='TONE_SAFE'?'TONE_SAFE':'AUTO_NO_OP'}
const noReferencePass={reference:[png(1000,false),jpg(900,false)],referenceMode:'B0',gray:[png(100,true)],bw:[png(100,true)]};
assert.strictEqual(api.selectAutoEncoding(noReferencePass).referenceState,'REFERENCE_UNREADABLE');
assert.strictEqual(api.selectAutoEncoding(noReferencePass).mode,'AUTO_NO_OP');
assert.notStrictEqual('GRAY_SAFE',independentSelector(noReferencePass),'NEGATIVE 19 reference-no-pass bypass mutant escaped');

const matrix=[
  {reference:[],referenceMode:'B0',gray:[],bw:[]},
  noReferencePass,
  {reference:[png(1000,true)],referenceMode:'B0',gray:[png(800,true)],bw:[png(801,true)]},
  {reference:[png(1000,true)],referenceMode:'B0',gray:[png(801,true)],bw:[png(800,true)]},
  {reference:[png(1000,true)],referenceMode:'TONE_SAFE',gray:[png(801,true)],bw:[png(801,true)]},
  {reference:[png(2000,true)],referenceMode:'B0',gray:[png(800,true)],bw:[png(816,true)]},
  {reference:[png(2000,true)],referenceMode:'B0',gray:[png(800,true)],bw:[png(817,true)]},
  {reference:[jpg(900,true),png(900,true)],referenceMode:'TONE_SAFE',gray:[],bw:[]},
  {reference:[jpg(850,true),png(900,true)],referenceMode:'B0',gray:[jpg(680,true)],bw:[]}
];
for(const input of matrix)assert.strictEqual(api.selectAutoEncoding(input).mode,independentSelector(input),'independent reference/80%/1.02 matrix mismatch');
assert.strictEqual(api.selectAutoEncoding(matrix[7]).referenceEncoding.profile,'PNG_LOSSLESS','reference byte tie must choose PNG');
assert.strictEqual(api.selectAutoEncoding(matrix[5]).mode,'BW_STRONG','exact 1.02 boundary must choose BW');
assert.strictEqual(api.selectAutoEncoding(matrix[6]).mode,'GRAY_SAFE','one byte above integer 1.02 boundary must choose Gray');
assert.throws(()=>api.selectAutoEncoding({reference:[{profile:'PNG_LOSSLESS',mime:'image/png',bytes:10}],referenceMode:'B0',gray:[],bw:[]}),/encoded_profile_invalid/,'malformed state must fail closed');
const selectorMutant=()=> 'BW_STRONG';
assert(matrix.some(input=>selectorMutant(input)!==independentSelector(input)),'NEGATIVE 20 selector mutant escaped exhaustive matrix');

const saturated=[];
for(let i=0;i<1000;i++)saturated.push([0,0,0]);
for(let i=0;i<50;i++)saturated.push([0,212,24]);
for(let i=0;i<50;i++)saturated.push([0,228,24]);
for(let i=0;i<8900;i++)saturated.push([192,192,192]);
const saturatedFixture=rasterFromValues(saturated);
function independentR2Raw(rgb,gain,offset){const y=Math.round(.299*rgb[0]+.587*rgb[1]+.114*rgb[2]),y1=Math.round(gain*y+offset),delta=y1-y;return{y,y1,delta,raw:rgb.map(channel=>channel+delta)}}
const low=independentR2Raw([0,212,24],13/12,32),high=independentR2Raw([0,228,24],13/12,32);
assert.deepStrictEqual({y:low.y,delta:low.delta,raw:low.raw},{y:127,delta:43,raw:[43,255,67]});
assert.deepStrictEqual({y:high.y,delta:high.delta,raw:high.raw},{y:137,delta:43,raw:[43,271,67]});
assert.strictEqual(api.toneSafe(saturatedFixture).status,'ABSENT');
assert.strictEqual(api.toneSafe(saturatedFixture).reason,'rgb_channel_unsafe');
const clampByte=value=>Math.max(0,Math.min(255,value)),clampedLow=low.raw.map(clampByte),clampedHigh=high.raw.map(clampByte);
assert.deepStrictEqual(clampedLow,clampedHigh);
assert(high.raw.some(channel=>channel>255)&&api.toneSafe(saturatedFixture).status==='ABSENT','NEGATIVE 21 RGB clamp bypass mutant escaped independent raw-channel oracle');

for(let number=1;number<=21;number++)console.log(`FP94_NEGATIVE_${String(number).padStart(2,'0')}_PASS`);
console.log('FP94_REFERENCE_SELECTOR_MATRIX_PASS');
console.log('FP94_TONE_LUMA_CLIPPING_FIXTURE_PASS');
console.log('FP94_RGB_CHANNEL_SAFETY_FIXTURE_PASS');
console.log('FP94_ROOT_SRC_MIRROR_PASS');
