'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');
const api=require('../familypilot-receipt-media-transform-v1.js');
const entryApi=require('../familypilot-entry-ux-reset-r1.js');

const root=path.resolve(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const index=read('index.html');
const sourceMirror=read('src/familypilot.html');
const moduleSource=read('familypilot-receipt-media-transform-v1.js');
const oldEntryAuthority=read('familypilot-entry-ux-reset-r1.js');

assert.strictEqual(api.architecture,'FP86_RECEIPT_MEDIA_TRANSFORM_V1');
assert.strictEqual(api.minimumCropEdge,8);
assert.strictEqual(index,sourceMirror,'root/src runtime mirrors must remain coherent');
assert.match(index,/familypilot-receipt-media-transform-v1\.js/);
assert.doesNotMatch(index,/normalizeReceiptCrop/,'the predecessor clamp must not remain effective in the runtime');
assert.doesNotMatch(oldEntryAuthority,/normalizeReceiptCrop/,'the predecessor clamp must not remain exported as alternate authority');
assert.doesNotMatch(moduleSource,/devicePixelRatio|\bDPR\b/i,'device density must not enter source-coordinate geometry');
assert.match(index,/\.receipt-preview-media canvas\{position:absolute;left:0;top:0;[^}]*transform-origin:0 0/,'the canvas must have an explicit top-left layout and transform origin');
assert.doesNotMatch(index,/\.receipt-preview-media\{place-items:center\}/,'canvas placement must not depend on grid alignment');
const presentationRuntime=index.slice(index.indexOf('function receiptCanvasPresentation()'),index.indexOf('function resetReceiptTransform()'));
assert.match(presentationRuntime,/createViewerCanvasPresentation\(transform\)/,'the DOM presentation must be derived from the authoritative T');
assert.match(presentationRuntime,/presentation\.translateX/);
assert.match(presentationRuntime,/presentation\.translateY/);
assert.match(presentationRuntime,/presentation\.transformOrigin/);

const coordinateRaster=(width,height)=>{
  const pixels=new Uint32Array(width*height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)pixels[y*width+x]=y*10000+x;
  return{width,height,stride:1,pixels};
};
const expectedPixels=(raster,rect)=>{
  const values=[];
  for(let y=rect.y;y<rect.y+rect.height;y++)for(let x=rect.x;x<rect.x+rect.width;x++)values.push(raster.pixels[y*raster.width+x]);
  return values;
};
const close=(left,right)=>Math.abs(left-right)<1e-9;
const assertRawRect=(actual,expected)=>{
  for(const key of ['x','y','width','height'])assert(close(actual[key],expected[key]),`${key}: expected ${expected[key]}, received ${actual[key]}`);
};
const domLayoutOracle=input=>{
  const fit=Math.min(input.viewerWidth/input.sourceWidth,input.viewerHeight/input.sourceHeight);
  const cssWidth=input.sourceWidth*fit,cssHeight=input.sourceHeight*fit;
  const translateX=(input.viewerWidth-cssWidth)/2+input.panX;
  const translateY=(input.viewerHeight-cssHeight)/2+input.panY;
  return{
    cssWidth,cssHeight,translateX,translateY,zoom:input.zoom,transformOrigin:'0 0',
    point:point=>({x:translateX+input.zoom*fit*point.x,y:translateY+input.zoom*fit*point.y}),
    rect:rect=>({x:translateX+input.zoom*fit*rect.x,y:translateY+input.zoom*fit*rect.y,width:input.zoom*fit*rect.width,height:input.zoom*fit*rect.height})
  };
};
const assertDomMatchesT=input=>{
  const oracle=domLayoutOracle(input);
  const transform=api.createViewerTransform(input);
  const presentation=api.createViewerCanvasPresentation(transform);
  for(const key of ['cssWidth','cssHeight','translateX','translateY','zoom'])assert(close(presentation[key],oracle[key]),`${key} must match independent DOM layout semantics`);
  assert.strictEqual(presentation.transformOrigin,'0 0');
  for(const point of[{x:0,y:0},{x:input.sourceWidth,y:input.sourceHeight},{x:input.sourceWidth*.37,y:input.sourceHeight*.61}]){
    const actual=api.sourcePointToViewer(transform,point),expected=oracle.point(point);
    assert(close(actual.x,expected.x)&&close(actual.y,expected.y),'actual canvas placement must implement T');
  }
  return{oracle,transform,presentation};
};
const mappingCase=(name,raster,sourceRect,gesture,viewer={width:240,height:200})=>{
  const transform=api.createViewerTransform({
    sourceWidth:raster.width,
    sourceHeight:raster.height,
    viewerWidth:viewer.width,
    viewerHeight:viewer.height,
    zoom:gesture.zoom,
    panX:gesture.panX,
    panY:gesture.panY,
    dpr:gesture.dpr
  });
  const visible=api.sourceRectToViewer(transform,sourceRect);
  const raw=api.viewerRectToRawSource(transform,visible);
  assertRawRect(raw,sourceRect);
  const validation=api.validateCropSelection({width:raster.width,height:raster.height},raw);
  assert.strictEqual(validation.ok,true,`${name} must validate`);
  assert.deepStrictEqual(
    {x:validation.rect.x,y:validation.rect.y,width:validation.rect.width,height:validation.rect.height},
    sourceRect,
    `${name} must retain the exact integer source rectangle`
  );
  const rendered=api.renderValidatedRaster(raster,validation);
  assert.deepStrictEqual([...rendered.pixels],expectedPixels(raster,sourceRect),`${name} renderer pixels must equal the visible Bnorm region`);
  return{transform,visible,raw,validation,rendered};
};

const base=coordinateRaster(24,16);
mappingCase('fit',base,{x:4,y:3,width:12,height:9},{zoom:1,panX:0,panY:0});
mappingCase('nontrivial zoom',base,{x:3,y:2,width:10,height:8},{zoom:1.75,panX:0,panY:0});
const positivePan=mappingCase('positive pan',base,{x:2,y:4,width:8,height:8},{zoom:2,panX:17,panY:9});
mappingCase('negative pan',base,{x:8,y:5,width:9,height:8},{zoom:2.5,panX:-31,panY:-19});

const wideDom=assertDomMatchesT({sourceWidth:1200,sourceHeight:800,viewerWidth:400,viewerHeight:500,zoom:1,panX:0,panY:0});
assert(close(wideDom.presentation.translateX,0));
assert(close(wideDom.presentation.translateY,116.66666666666667),'1200x800 in 400x500 must retain the vertical fit offset');
const wideRaster=coordinateRaster(1200,800),wideSourceRect={x:180,y:64,width:300,height:160};
const wideVisible=wideDom.oracle.rect(wideSourceRect);
assert(close(wideVisible.y,138),'the prior vertical-offset counterexample must be represented by actual DOM semantics');
const wideRaw=api.viewerRectToRawSource(wideDom.transform,wideVisible);
assertRawRect(wideRaw,wideSourceRect);
const wideValidation=api.validateCropSelection({width:wideRaster.width,height:wideRaster.height},wideRaw);
assert.strictEqual(wideValidation.ok,true);
assert.deepStrictEqual([...api.renderValidatedRaster(wideRaster,wideValidation).pixels],expectedPixels(wideRaster,wideValidation.rect),'visible DOM selection must render the exact source pixels selected after validation');
const topAlignedSourceY=wideVisible.y/wideDom.transform.fitScale;
assert(close(topAlignedSourceY,414)&&!close(topAlignedSourceY,wideSourceRect.y),'a vertically top-aligned canvas must fail the independent oracle');

const portraitDom=assertDomMatchesT({sourceWidth:800,sourceHeight:1200,viewerWidth:500,viewerHeight:400,zoom:1,panX:0,panY:0});
assert(close(portraitDom.presentation.translateX,116.66666666666667),'portrait fit must retain the horizontal fit offset');
assertDomMatchesT({sourceWidth:1200,sourceHeight:800,viewerWidth:400,viewerHeight:500,zoom:1.8,panX:23,panY:-47});
const negativeDom=assertDomMatchesT({sourceWidth:800,sourceHeight:1200,viewerWidth:500,viewerHeight:400,zoom:2.25,panX:-61,panY:19});
const centerOriginX=negativeDom.presentation.translateX+(1-negativeDom.presentation.zoom)*negativeDom.presentation.cssWidth/2;
assert(!close(centerOriginX,negativeDom.presentation.translateX),'a center transform origin must fail the independent oracle under zoom');

const pointerFunctionStart=index.indexOf('function receiptPointerPoint');
const pointerFunctionEnd=index.indexOf('function receiptGesturePoints',pointerFunctionStart);
const pointerFunctionSource=index.slice(pointerFunctionStart,pointerFunctionEnd);
assert(pointerFunctionStart>=0&&pointerFunctionEnd>pointerFunctionStart);
assert.match(pointerFunctionSource,/clientX-rect\.left-media\.clientLeft/,'pointer X must be normalized from the outer border-box to the inner client origin');
assert.match(pointerFunctionSource,/clientY-rect\.top-media\.clientTop/,'pointer Y must be normalized from the outer border-box to the inner client origin');
const pointerRuntime=index.slice(pointerFunctionStart,index.indexOf('async function confirmReceiptCrop',pointerFunctionStart));
assert.strictEqual((pointerRuntime.match(/receiptPointerPoint\(event\)/g)||[]).length,5,'all gesture and crop pointer consumers must use the single normalized helper');
assert.strictEqual((pointerRuntime.match(/clientX/g)||[]).length,1,'no second live X-coordinate path may bypass pointer normalization');
assert.strictEqual((pointerRuntime.match(/clientY/g)||[]).length,1,'no second live Y-coordinate path may bypass pointer normalization');
assert.match(index,/point\.x-transform\.fitOffsetX,y:point\.y-transform\.fitOffsetY/,'normalized pinch points must then be expressed relative to T fitOffset');

const runBorderFocalScenario=input=>{
  const outerRect={left:37.25,top:52.5};
  const media={
    clientLeft:input.borderX,
    clientTop:input.borderY,
    getBoundingClientRect:()=>outerRect
  };
  const runtimePointer=new Function('$',`"use strict";${pointerFunctionSource};return receiptPointerPoint;`)(id=>{
    assert.strictEqual(id,'receiptPreviewMedia');
    return media;
  });
  const transform=api.createViewerTransform(input);
  assert(input.expectCenteredOffset(transform),'scenario must retain a nonzero centered fit offset');
  const focalSource=api.viewerPointToSource(transform,input.focal);
  const clientEvent=inner=>({
    clientX:outerRect.left+input.borderX+inner.x,
    clientY:outerRect.top+input.borderY+inner.y
  });
  const pair=distance=>[
    clientEvent({x:input.focal.x-distance/2,y:input.focal.y}),
    clientEvent({x:input.focal.x+distance/2,y:input.focal.y})
  ];
  const normalize=events=>events.map(runtimePointer);
  const omitBorderNormalization=events=>events.map(event=>({x:event.clientX-outerRect.left,y:event.clientY-outerRect.top}));
  const gesture=points=>points.map(point=>({x:point.x-transform.fitOffsetX,y:point.y-transform.fitOffsetY}));
  const startEvents=pair(input.distance),endEvents=pair(input.distance*input.ratio);
  const start=normalize(startEvents),end=normalize(endEvents);
  assert.deepStrictEqual(start[0],{x:input.focal.x-input.distance/2,y:input.focal.y},'actual DOM pointer helper must return inner CSS coordinates');
  const session=entryApi.beginReceiptPinch({scale:input.zoom,x:input.panX,y:input.panY},...gesture(start));
  const state=entryApi.updateReceiptPinch(session,...gesture(end));
  assert(close(state.scale,input.zoom*input.ratio),'pinch must apply the requested nontrivial ratio');
  const zoomed=api.createViewerTransform({...input,zoom:state.scale,panX:state.x,panY:state.y});
  const remapped=api.sourcePointToViewer(zoomed,focalSource);
  assert(close(remapped.x,input.focal.x)&&close(remapped.y,input.focal.y),'border-normalized pinch must preserve the exact focal source point');

  const faultyStart=gesture(omitBorderNormalization(startEvents)),faultyEnd=gesture(omitBorderNormalization(endEvents));
  const faultySession=entryApi.beginReceiptPinch({scale:input.zoom,x:input.panX,y:input.panY},...faultyStart);
  const faultyState=entryApi.updateReceiptPinch(faultySession,...faultyEnd);
  const faultyTransform=api.createViewerTransform({...input,zoom:faultyState.scale,panX:faultyState.x,panY:faultyState.y});
  const faultyRemapped=api.sourcePointToViewer(faultyTransform,focalSource);
  assert(close(faultyRemapped.x,input.focal.x+(1-input.ratio)*input.borderX),'omitting the border origin must produce the exact expected X focal error');
  assert(close(faultyRemapped.y,input.focal.y+(1-input.ratio)*input.borderY),'omitting the border origin must produce the exact expected Y focal error');
  assert(!close(faultyRemapped.x,input.focal.x)&&!close(faultyRemapped.y,input.focal.y),'the unnormalized outer-border coordinate path must fail focal preservation');
};

runBorderFocalScenario({
  sourceWidth:1200,sourceHeight:800,viewerWidth:400,viewerHeight:500,
  zoom:1,panX:0,panY:0,borderX:1,borderY:1,ratio:2,distance:100,
  focal:{x:200,y:250},expectCenteredOffset:transform=>transform.fitOffsetY>0
});
runBorderFocalScenario({
  sourceWidth:800,sourceHeight:1200,viewerWidth:500,viewerHeight:400,
  zoom:1.5,panX:19,panY:-23,borderX:3,borderY:5,ratio:1.6,distance:80,
  focal:{x:250,y:190},expectCenteredOffset:transform=>transform.fitOffsetX>0
});

const dpr1=mappingCase('DPR 1',base,{x:5,y:3,width:11,height:9},{zoom:1.5,panX:-12,panY:7,dpr:1});
const dpr2=mappingCase('DPR 2',base,{x:5,y:3,width:11,height:9},{zoom:1.5,panX:-12,panY:7,dpr:2});
assert.deepStrictEqual(dpr1.raw,dpr2.raw,'identical CSS geometry must yield identical raw source rectangles at DPR 1 and 2');
assert.deepStrictEqual(dpr1.validation.rect,dpr2.validation.rect,'DPR must not change the validated source rectangle');
const domDpr1=domLayoutOracle({sourceWidth:1200,sourceHeight:800,viewerWidth:400,viewerHeight:500,zoom:1.5,panX:-12,panY:7,dpr:1});
const domDpr2=domLayoutOracle({sourceWidth:1200,sourceHeight:800,viewerWidth:400,viewerHeight:500,zoom:1.5,panX:-12,panY:7,dpr:2});
assert.deepStrictEqual(domDpr1.rect({x:60,y:80,width:240,height:160}),domDpr2.rect({x:60,y:80,width:240,height:160}),'DPR/backing-store scale must not alter CSS canvas placement');

const encoded90=coordinateRaster(14,22);
const normalized90=api.normalizeRasterOrientation(encoded90,6);
assert.deepStrictEqual({width:normalized90.width,height:normalized90.height},{width:22,height:14},'90-degree normalization must swap encoded dimensions exactly once');
const oriented=mappingCase('encoded orientation 6',normalized90,{x:6,y:3,width:9,height:8},{zoom:1.25,panX:11,panY:-7},{width:220,height:180});
assert.deepStrictEqual([...oriented.rendered.pixels],expectedPixels(normalized90,{x:6,y:3,width:9,height:8}));
const secondRotation=api.normalizeRasterOrientation(normalized90,6);
assert.throws(()=>api.renderValidatedRaster(secondRotation,oriented.validation),/normalized_bitmap_dimensions_mismatch/,'a second orientation transform must fail');

const widthSensitive=coordinateRaster(31,19);
const widthCase=mappingCase('width-height-sensitive non-square',widthSensitive,{x:17,y:7,width:9,height:8},{zoom:1.4,panX:-13,panY:5},{width:310,height:250});
assert.throws(()=>api.renderValidatedRaster(coordinateRaster(19,31),widthCase.validation),/normalized_bitmap_dimensions_mismatch/,'renderer may not substitute swapped or independent dimensions');
assert.throws(()=>api.renderValidatedRaster(base,{kind:'VALIDATED_CROP_RECT',rect:{x:0,y:0,width:8,height:8,sourceWidth:24,sourceHeight:16}}),/validated_crop_rect_required/,'renderer must accept only the validator-branded result');
let canvasDrawArguments=null;
const canvas={getContext:()=>({fillStyle:'',fillRect:()=>{},drawImage:(...args)=>{canvasDrawArguments=args}})};
api.renderValidatedCropCanvas({image:'same-bnorm',width:24,height:16},dpr1.validation,()=>canvas);
assert.deepStrictEqual(canvasDrawArguments,['same-bnorm',5,3,11,9,0,0,11,9],'canvas renderer must use the same Bnorm and exact validated rectangle without recomputation');

const independentTransform=api.createViewerTransform({sourceWidth:24,sourceHeight:16,viewerWidth:240,viewerHeight:200,zoom:2,panX:0,panY:0});
const independentlyMapped=api.viewerRectToRawSource(independentTransform,positivePan.visible);
assert.notDeepStrictEqual(independentlyMapped,positivePan.raw,'an independent mapping path that omits pan must fail sensitivity');
const doubleDprRaw={...dpr2.raw,x:dpr2.raw.x*2,y:dpr2.raw.y*2,width:dpr2.raw.width*2,height:dpr2.raw.height*2};
const doubleDprValidation=api.validateCropSelection({width:base.width,height:base.height},doubleDprRaw);
assert(!doubleDprValidation.ok||!close(doubleDprValidation.rect.x,dpr2.validation.rect.x)||!close(doubleDprValidation.rect.width,dpr2.validation.rect.width),'double-applied DPR must fail sensitivity');

const invalid=[
  [{x:0,y:0,width:0,height:0},'zero'],
  [{x:0,y:0,width:-8,height:8},'negative width'],
  [{x:0,y:0,width:8,height:-8},'negative height'],
  [{x:NaN,y:0,width:8,height:8},'NaN'],
  [{x:0,y:0,width:Infinity,height:8},'Infinity'],
  [{x:0,y:0,width:7.999,height:8},'width below 8'],
  [{x:0,y:0,width:8,height:7.999},'height below 8'],
  [{x:17,y:0,width:8,height:8},'partial right OOB'],
  [{x:0,y:9,width:8,height:8},'partial bottom OOB'],
  [{x:25,y:17,width:8,height:8},'full OOB'],
  [{x:-1,y:0,width:8,height:8},'negative origin']
];
for(const[rect,label]of invalid)assert.strictEqual(api.validateCropSelection({width:24,height:16},rect).ok,false,label);
assert.strictEqual(api.validateCropSelection({width:0,height:16},{x:0,y:0,width:8,height:8}).ok,false);
assert.strictEqual(api.validateCropSelection({width:24.5,height:16},{x:0,y:0,width:8,height:8}).ok,false);

for(const rect of [
  {x:0,y:0,width:8,height:8},
  {x:16,y:8,width:8,height:8},
  {x:4.2,y:2.4,width:8.1,height:8.2},
  {x:3,y:1,width:17,height:12}
]){
  const result=api.validateCropSelection({width:24,height:16},rect);
  assert.strictEqual(result.ok,true,'valid boundary/ordinary rectangle must pass');
  const value=result.rect;
  assert(Number.isFinite(value.x)&&Number.isFinite(value.y)&&Number.isFinite(value.width)&&Number.isFinite(value.height));
  assert(value.x>=0&&value.y>=0&&value.width>=8&&value.height>=8);
  assert(value.x+value.width<=24&&value.y+value.height<=16);
}

for(let x=0;x<=16;x+=4)for(let y=0;y<=8;y+=2){
  const result=api.validateCropSelection({width:24,height:16},{x,y,width:8,height:8});
  assert.strictEqual(result.ok,true);
  assert(result.rect.x+result.rect.width<=24&&result.rect.y+result.rect.height<=16);
}

const predecessorClamp=(rect,width,height)=>{
  const maxWidth=Math.max(1,Number(width)||1),maxHeight=Math.max(1,Number(height)||1);
  const left=Math.max(0,Math.min(maxWidth-1,Number(rect?.x)||0));
  const top=Math.max(0,Math.min(maxHeight-1,Number(rect?.y)||0));
  const right=Math.max(left+1,Math.min(maxWidth,left+Math.max(1,Number(rect?.width)||1)));
  const bottom=Math.max(top+1,Math.min(maxHeight,top+Math.max(1,Number(rect?.height)||1)));
  return{x:left,y:top,width:right-left,height:bottom-top};
};
assert.deepStrictEqual(predecessorClamp({x:-5,y:20,width:0,height:0},24,16),{x:0,y:15,width:1,height:1});
assert.strictEqual(api.validateCropSelection({width:24,height:16},{x:-5,y:20,width:0,height:0}).ok,false,'predecessor clamp/minimum-1 input must be rejected');

let canonicalMutations=0;
const confirmCandidate=raw=>{
  const validation=api.validateCropSelection({width:24,height:16},raw);
  if(!validation.ok)return validation;
  canonicalMutations+=1;
  return validation;
};
for(const[rect]of invalid)confirmCandidate(rect);
assert.strictEqual(canonicalMutations,0,'validator rejection must happen before canonical blob/metadata mutation');

const confirmStart=index.indexOf('async function confirmReceiptCrop()');
const confirmEnd=index.indexOf('async function applyReceiptEditSession',confirmStart);
const confirmSource=index.slice(confirmStart,confirmEnd);
assert(confirmStart>=0&&confirmEnd>confirmStart);
assert.match(confirmSource,/viewerRectToRawSource\(transform,receiptCropRect\)/,'crop confirm must use only inverse(T)');
assert.match(confirmSource,/validateCropSelection\(\{width:image\.width,height:image\.height\},rawSource\)/,'crop confirm must retain strict validation against the current same-session raster');
assert.doesNotMatch(confirmSource,/executeReceiptReplacement|putReceiptBlob|writeOperationReceiptMetadata/,'crop confirm must not mutate the canonical receipt before Done');
const applyStart=index.indexOf('async function applyReceiptEditSession');
const applyEnd=index.indexOf('async function resolveCurrentCanonicalReceiptForAction',applyStart);
const applySource=index.slice(applyStart,applyEnd);
assert.strictEqual((applySource.match(/executeReceiptReplacement/g)||[]).length,1,'explicit Done must enter exactly one accepted replacement transaction');
const actionStart=index.indexOf('async function invokeNativeReceiptAction');
const actionEnd=index.indexOf('async function openReceiptPdfExternal',actionStart);
const actionSource=index.slice(actionStart,actionEnd);
const actionResolverSource=index.slice(index.indexOf('async function resolveCurrentCanonicalReceiptForAction'),actionStart);
assert(actionStart>=0&&actionEnd>actionStart);
assert.match(actionSource,/resolveCurrentCanonicalReceiptForAction\(\)/,'share/export must resolve canonical authority at action time');
assert.doesNotMatch(actionSource,/receiptPreviewBlob|receiptPreviewItem/,'share/export must not export cached preview authority');
assert.match(actionResolverSource,/resolveCanonicalReceiptForRead/,'runtime must use the fail-closed current-canonical resolver');
assert.doesNotMatch(actionResolverSource,/putReceiptBlob|deleteReceiptBlob|writeOperationReceiptMetadata/,'share/export resolution must not mutate canonical storage or metadata');

const clone=value=>JSON.parse(JSON.stringify(value));
const oldMetadata=[
  {id:'receipt-a',storageKey:'old-key',name:'page-a.jpg',type:'image/jpeg',size:6,width:24,height:16,addedAt:91},
  {id:'receipt-b',storageKey:'other-key',name:'page-b.jpg',type:'image/jpeg',size:4,width:8,height:8,addedAt:92}
];
const replacement={...oldMetadata[0],storageKey:'new-key',size:7,width:12,height:9};
const oldBytes=Uint8Array.from([0xff,0xd8,0xff,1,2,3]);
const newBytes=Uint8Array.from([0xff,0xd8,0xff,7,8,9,10]);
const otherBytes=Uint8Array.from([0xff,0xd8,0xff,4]);

function transactionHarness(injection={}){
  let metadataState=clone(oldMetadata),metadataReads=0,metadataWrites=0;
  const blobs=new Map([['old-key',oldBytes],['other-key',otherBytes]]),events=[];
  const financial={amount:47.5,categoryId:'food',walletId:'wallet',note:'unchanged'};
  const fingerprint=JSON.stringify(financial);
  return{
    blobs,events,financial,fingerprint,
    metadataState:()=>clone(metadataState),
    options:{
      receiptId:'receipt-a',newMetadata:replacement,newBlob:newBytes,
      storage:{
        get:async key=>{events.push(`get:${key}`);const value=blobs.get(key);return value&&Uint8Array.from(value)},
        put:async(key,value)=>{events.push(`put:${key}`);blobs.set(key,Uint8Array.from(value))},
        delete:async key=>{events.push(`delete:${key}`);if(key==='old-key'&&injection.oldDeleteFailure)return false;blobs.delete(key);return true}
      },
      metadata:{
        read:async()=>{
          metadataReads+=1;events.push(`metadata:read:${metadataReads}`);
          if(metadataReads===2&&injection.metadataReadFailure)throw Error('injected_metadata_read_failure');
          if(metadataReads===2&&injection.metadataReadbackMismatch)return[];
          return clone(metadataState);
        },
        write:async value=>{
          metadataWrites+=1;events.push(`metadata:write:${metadataWrites}`);
          if(metadataWrites===2&&injection.rollbackWriteFailure)throw Error('injected_rollback_write_failure');
          metadataState=clone(value);
        }
      },
      validateBlob:async(blob,metadata)=>blob instanceof Uint8Array&&blob.length===metadata.size&&blob[0]===0xff&&blob[1]===0xd8&&blob[2]===0xff,
      verifyInvariant:async()=>JSON.stringify(financial)===fingerprint
    }
  };
}

function canonicalReadHarness(metadataState,blobEntries,injection={}){
  let reads=0,current=clone(metadataState);
  const blobs=new Map(blobEntries),events=[];
  return{
    events,
    setMetadata:value=>{current=clone(value)},
    options:{
      receiptId:'receipt-a',
      metadata:{read:async()=>{reads+=1;events.push(`metadata:read:${reads}`);if(injection.readFailure)throw Error('injected_integrity_blocked_read');if(reads===2&&injection.secondMetadataState)return clone(injection.secondMetadataState);return clone(current)}},
      storage:{get:async key=>{events.push(`get:${key}`);const value=blobs.get(key);return value&&Uint8Array.from(value)}},
      validateBlob:async(blob,metadata)=>blob instanceof Uint8Array&&blob.length===metadata.size&&blob[0]===0xff&&blob[1]===0xd8&&blob[2]===0xff
    }
  };
}

const assertRestored=harness=>{
  assert.deepStrictEqual(harness.metadataState(),oldMetadata,'exact M_old and receipt order must be restored');
  assert.deepStrictEqual([...harness.blobs.get('old-key')],[...oldBytes],'K_old/B_old must remain authoritative');
  assert.strictEqual(harness.blobs.has('new-key'),false,'staged bytes must be cleaned only after verified rollback');
  assert.strictEqual(JSON.stringify(harness.financial),harness.fingerprint,'financial fingerprint must remain unchanged');
  const rollbackRead=harness.events.lastIndexOf('metadata:read:3');
  const newDelete=harness.events.lastIndexOf('delete:new-key');
  assert(rollbackRead>=0&&newDelete>rollbackRead,'new bytes cleanup must happen only after rollback readback');
};

async function transactionTests(){
  let decodeCalls=0,decodeOptions=null,closed=false;
  const normalized=await api.decodeOrientationNormalizedBitmap('encoded-source',{createImageBitmap:async(source,options)=>{decodeCalls+=1;decodeOptions=options;assert.strictEqual(source,'encoded-source');return{width:22,height:14,close:()=>{closed=true}}}});
  assert.strictEqual(decodeCalls,1,'orientation normalization decoder must run exactly once per opened image');
  assert.deepStrictEqual(decodeOptions,{imageOrientation:'from-image'});
  assert.deepStrictEqual({kind:normalized.kind,width:normalized.width,height:normalized.height},{kind:'ORIENTATION_NORMALIZED_BITMAP',width:22,height:14});
  normalized.close();
  assert.strictEqual(closed,true);
  assert.strictEqual((moduleSource.match(/imageOrientation:'from-image'/g)||[]).length,1,'the module must have one encoded-orientation normalization point');

  const currentCanonical=canonicalReadHarness(oldMetadata,[['old-key',oldBytes],['other-key',otherBytes]]);
  const currentResult=await api.resolveCanonicalReceiptForRead(currentCanonical.options);
  assert.strictEqual(currentResult.ok,true,'successful share/export resolution must prove current canonical bytes');
  assert.strictEqual(currentResult.metadata.storageKey,'old-key');
  assert.deepStrictEqual([...currentResult.blob],[...oldBytes]);
  assert.deepStrictEqual(currentCanonical.events,['metadata:read:1','get:old-key','metadata:read:2','get:old-key']);

  const postCropMetadata=[replacement,oldMetadata[1]],staleCachedPreview=oldBytes;
  const postCrop=canonicalReadHarness(postCropMetadata,[['old-key',oldBytes],['new-key',newBytes],['other-key',otherBytes]]);
  const postCropResult=await api.resolveCanonicalReceiptForRead(postCrop.options);
  assert.strictEqual(postCropResult.ok,true);
  assert.strictEqual(postCropResult.metadata.storageKey,'new-key','changed canonical reference must be resolved at action time');
  assert.deepStrictEqual([...postCropResult.blob],[...newBytes],'share/export must use new canonical bytes after crop');
  assert.notDeepStrictEqual([...postCropResult.blob],[...staleCachedPreview],'stale preview cache must never be exported');

  const integrityBlocked=canonicalReadHarness(oldMetadata,[['old-key',oldBytes]],{readFailure:true});
  const integrityBlockedResult=await api.resolveCanonicalReceiptForRead(integrityBlocked.options);
  assert.strictEqual(integrityBlockedResult.ok,false,'INTEGRITY_BLOCKED authority must fail closed');
  assert.strictEqual(integrityBlockedResult.status,'CANONICAL_AUTHORITY_UNVERIFIED');
  assert.deepStrictEqual(integrityBlocked.events,['metadata:read:1'],'failed authority resolution must remain read-only');

  const changedDuringRead=canonicalReadHarness(oldMetadata,[['old-key',oldBytes],['new-key',newBytes]],{secondMetadataState:postCropMetadata});
  const changedDuringReadResult=await api.resolveCanonicalReceiptForRead(changedDuringRead.options);
  assert.strictEqual(changedDuringReadResult.ok,false,'canonical key changes during resolution must fail closed');
  assert.strictEqual(changedDuringRead.events.some(event=>event.startsWith('put:')||event.startsWith('delete:')||event.startsWith('metadata:write')),false,'share/export resolution must be read-only');

  const success=transactionHarness();
  const committed=await api.executeReceiptReplacement(success.options);
  assert.deepStrictEqual({ok:committed.ok,status:committed.status,state:committed.state},{ok:true,status:'COMMITTED',state:'COMMITTED'});
  assert.deepStrictEqual(success.metadataState().map(item=>item.id),['receipt-a','receipt-b'],'success must preserve receipt order');
  assert.strictEqual(success.metadataState()[0].id,oldMetadata[0].id,'success must preserve stable visible identity');
  assert.strictEqual(success.metadataState()[0].name,oldMetadata[0].name);
  assert.strictEqual(success.metadataState()[0].addedAt,oldMetadata[0].addedAt);
  assert.strictEqual(success.blobs.has('old-key'),false,'success requires completed old deletion');
  assert.deepStrictEqual([...success.blobs.get('new-key')],[...newBytes]);
  assert.strictEqual(JSON.stringify(success.financial),success.fingerprint);

  const afterWrite=transactionHarness({metadataReadFailure:true});
  const afterWriteResult=await api.executeReceiptReplacement(afterWrite.options);
  assert.strictEqual(afterWriteResult.ok,false);
  assert.strictEqual(afterWriteResult.status,'FAILED');
  assert.strictEqual(afterWriteResult.rolledBack,true);
  assertRestored(afterWrite);

  const badReadback=transactionHarness({metadataReadbackMismatch:true});
  const badReadbackResult=await api.executeReceiptReplacement(badReadback.options);
  assert.strictEqual(badReadbackResult.ok,false);
  assert.strictEqual(badReadbackResult.status,'FAILED');
  assertRestored(badReadback);

  const oldDelete=transactionHarness({oldDeleteFailure:true});
  const oldDeleteResult=await api.executeReceiptReplacement(oldDelete.options);
  assert.strictEqual(oldDeleteResult.ok,false,'old delete failure must never report success');
  assert.strictEqual(oldDeleteResult.status,'FAILED');
  assertRestored(oldDelete);

  const rollbackBlocked=transactionHarness({metadataReadFailure:true,rollbackWriteFailure:true});
  const blockedResult=await api.executeReceiptReplacement(rollbackBlocked.options);
  assert.strictEqual(blockedResult.status,'INTEGRITY_BLOCKED');
  assert.strictEqual(blockedResult.ok,false);
  assert.strictEqual(rollbackBlocked.blobs.has('old-key'),true);
  assert.strictEqual(rollbackBlocked.blobs.has('new-key'),true,'fail-closed rollback must not delete either blob');
  assert.strictEqual(rollbackBlocked.events.includes('delete:new-key'),false,'rollback failure prohibits staged cleanup mutation');

  const changedIdentity=transactionHarness();
  changedIdentity.options.newMetadata={...replacement,name:'renamed.jpg'};
  const identityResult=await api.executeReceiptReplacement(changedIdentity.options);
  assert.strictEqual(identityResult.ok,false);
  assert.strictEqual(identityResult.state,'OLD_CANONICAL');
  assert.deepStrictEqual(changedIdentity.metadataState(),oldMetadata);

  assert.match(applySource,/executeReceiptReplacement/,'production Done must enter the accepted replacement transaction after session validation/rendering');
  assert.match(index,/readOperationReceiptMetadata/,'production metadata switch must have durable readback');
  assert.match(index,/validateCanonicalReceiptBlob/,'production blob staging must revalidate MIME, magic and size');
  assert.match(index,/open\('receiptPreview'\);if\(item\.type===/,'viewer must become measurable before fit geometry is calculated');
  assert.match(index,/pointercancel','lostpointercapture'\]\)receiptMedia\.addEventListener\(eventName,cancelReceiptPointerState\)/,'viewer pointer cancellation must clear ephemeral gesture state');
  assert.match(index,/pointercancel','lostpointercapture'\]\)receiptCropLayer\.addEventListener\(eventName,cancelReceiptCropPointer\)/,'crop pointer cancellation must clear ephemeral crop state');
}

transactionTests().then(()=>{
  console.log('FP86_RMTV1_COORDINATE_AUTHORITY_PASS');
  console.log('FP86_RMTV1_VALIDATOR_NO_SALVAGE_PASS');
  console.log('FP86_RMTV1_ORIENTATION_DPR_SENSITIVITY_PASS');
  console.log('FP86_RMTV1_EXACT_RENDERER_PIXELS_PASS');
  console.log('FP86_RMTV1_DOM_T_AUTHORITY_ALIGNMENT_PASS');
  console.log('FP86_RMTV1_POINTER_INNER_COORDINATE_AUTHORITY_PASS');
  console.log('FP86_RMTV1_PINCH_FOCAL_PRESERVATION_WITH_BORDER_PASS');
  console.log('FP86_RMTV1_SHARE_EXPORT_CURRENT_CANONICAL_FAIL_CLOSED_PASS');
  console.log('FP86_RMTV1_REPLACEMENT_TRANSACTION_PASS');
  console.log('FP86_RMTV1_ROLLBACK_FAIL_CLOSED_PASS');
  console.log('FP86_RMTV1_ROOT_SRC_MIRROR_PASS');
}).catch(error=>{console.error(error);process.exitCode=1});
