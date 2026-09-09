'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');
const api=require('../familypilot-receipt-media-transform-v1.js');

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

const dpr1=mappingCase('DPR 1',base,{x:5,y:3,width:11,height:9},{zoom:1.5,panX:-12,panY:7,dpr:1});
const dpr2=mappingCase('DPR 2',base,{x:5,y:3,width:11,height:9},{zoom:1.5,panX:-12,panY:7,dpr:2});
assert.deepStrictEqual(dpr1.raw,dpr2.raw,'identical CSS geometry must yield identical raw source rectangles at DPR 1 and 2');
assert.deepStrictEqual(dpr1.validation.rect,dpr2.validation.rect,'DPR must not change the validated source rectangle');

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
const confirmEnd=index.indexOf('async function invokeNativeReceiptAction',confirmStart);
const confirmSource=index.slice(confirmStart,confirmEnd);
assert(confirmStart>=0&&confirmEnd>confirmStart);
assert(confirmSource.indexOf('validateCropSelection')<confirmSource.indexOf("document.createElement('canvas')"));
assert(confirmSource.indexOf('validateCropSelection')<confirmSource.indexOf('putReceiptBlob'));
assert.match(confirmSource,/viewerRectToRawSource\(transform,receiptCropRect\)/,'crop confirm must use only inverse(T)');
assert.match(confirmSource,/renderValidatedCropCanvas\(receiptNormalizedBitmap,validation/,'renderer must consume the same Bnorm and exact validator result');

console.log('FP86_RMTV1_COORDINATE_AUTHORITY_PASS');
console.log('FP86_RMTV1_VALIDATOR_NO_SALVAGE_PASS');
console.log('FP86_RMTV1_ORIENTATION_DPR_SENSITIVITY_PASS');
console.log('FP86_RMTV1_EXACT_RENDERER_PIXELS_PASS');
console.log('FP86_RMTV1_ROOT_SRC_MIRROR_PASS');
