(function(root,factory){
'use strict';
const base=typeof module==='object'&&module.exports?require('./familypilot-receipt-gallery-editor-ux-v1.js'):root?.FamilyPilotReceiptGalleryEditorUxV1;
const api=factory(base);
if(typeof module==='object'&&module.exports)module.exports=api;
if(root)root.FamilyPilotReceiptViewerEditorUxFollowupV1=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(base){
'use strict';

if(!base)throw Error('receipt_gallery_editor_foundation_missing');
const ARCHITECTURE_ID='FP94_RECEIPT_VIEWER_EDITOR_UX_FOLLOWUP_V1';
const PROFILE_PNG='PNG_LOSSLESS';
const PROFILE_JPEG='JPEG_Q86';
const FIXED_PROFILES=Object.freeze([PROFILE_PNG,PROFILE_JPEG]);
const REFERENCE_PROFILE_UNAVAILABLE='REFERENCE_PROFILE_UNAVAILABLE';
const REFERENCE_UNREADABLE='REFERENCE_UNREADABLE';
const REFERENCE_READABLE='REFERENCE_READABLE';
const positiveInteger=value=>Number.isInteger(value)&&value>0;
const clamp=(value,minimum,maximum)=>Math.max(minimum,Math.min(maximum,value));

function requireRaster(raster,label='raster'){
  const width=raster?.width,height=raster?.height,stride=raster?.stride===undefined?4:raster.stride,pixels=raster?.pixels;
  if(!positiveInteger(width)||!positiveInteger(height)||stride!==4||!pixels||pixels.length!==width*height*stride)throw Error(`${label}_invalid`);
  return{width,height,stride,pixels};
}

function luma601(red,green,blue){
  return clamp(Math.round(.299*red+.587*green+.114*blue),0,255);
}

function percentile(histogram,total,ratio){
  const boundary=total*ratio;
  let cumulative=0;
  for(let value=0;value<histogram.length;value++){
    cumulative+=histogram[value];
    if(cumulative>=boundary)return value;
  }
  return 255;
}

function toneSafe(cleanBaseline){
  const input=requireRaster(cleanBaseline,'clean_baseline'),count=input.width*input.height,histogram=new Uint32Array(256),lumas=new Uint8Array(count);
  let yMin=255,yMax=0;
  for(let index=0;index<count;index++){
    const offset=index*4,y=luma601(input.pixels[offset],input.pixels[offset+1],input.pixels[offset+2]);
    lumas[index]=y;histogram[y]++;yMin=Math.min(yMin,y);yMax=Math.max(yMax,y);
  }
  const p10=percentile(histogram,count,.10),p90=percentile(histogram,count,.90);
  if(yMax===yMin)return Object.freeze({status:'ABSENT',reason:'constant_luma',raster:null,p10,p90,yMin,yMax,gain:null,offset:null});
  const span=Math.max(1,p90-p10),g0=clamp((240-32)/span,.85,1.60),o0=32-g0*p10;
  const gain=Math.min(g0,255/(yMax-yMin)),oLow=-gain*yMin,oHigh=255-gain*yMax,offset=clamp(o0,oLow,oHigh);
  const materiallyDifferent=Math.abs(gain-1)>=.08||Math.abs(offset)>=8;
  if(!materiallyDifferent)return Object.freeze({status:'ABSENT',reason:'not_materially_different',raster:null,p10,p90,yMin,yMax,gain,offset});
  const pixels=new Uint8ClampedArray(count*4);
  for(let index=0;index<count;index++){
    const sourceOffset=index*4,y=lumas[index],yRaw=gain*y+offset;
    if(yRaw<0||yRaw>255)return Object.freeze({status:'ABSENT',reason:'luma_range_unsafe',raster:null,p10,p90,yMin,yMax,gain,offset});
    const y1=Math.round(yRaw),delta=y1-y;
    const red=input.pixels[sourceOffset]+delta,green=input.pixels[sourceOffset+1]+delta,blue=input.pixels[sourceOffset+2]+delta;
    if(red<0||red>255||green<0||green>255||blue<0||blue>255)return Object.freeze({status:'ABSENT',reason:'rgb_channel_unsafe',raster:null,p10,p90,yMin,yMax,gain,offset});
    pixels[sourceOffset]=red;pixels[sourceOffset+1]=green;pixels[sourceOffset+2]=blue;pixels[sourceOffset+3]=255;
  }
  return Object.freeze({status:'PRESENT',reason:'safe',raster:Object.freeze({width:input.width,height:input.height,stride:4,pixels}),p10,p90,yMin,yMax,gain,offset});
}

function requireEncoded(entry){
  if(!entry||!FIXED_PROFILES.includes(entry.profile)||!Number.isInteger(entry.bytes)||entry.bytes<0||typeof entry.readable!=='boolean')throw Error('encoded_profile_invalid');
  if(entry.profile===PROFILE_PNG&&entry.mime!=='image/png')throw Error('encoded_profile_mime_invalid');
  if(entry.profile===PROFILE_JPEG&&entry.mime!=='image/jpeg')throw Error('encoded_profile_mime_invalid');
  return entry;
}

function smallestPassing(entries){
  return entries.filter(entry=>entry.readable).slice().sort((left,right)=>left.bytes-right.bytes||(left.profile===PROFILE_PNG?-1:1))[0]||null;
}

function normalizeMode(entries,availableProfiles,referenceBytes){
  const fixed=(entries||[]).map(requireEncoded).filter(entry=>availableProfiles.has(entry.profile)),encoding=smallestPassing(fixed);
  return Object.freeze({present:fixed.length>0,readable:!!encoding,encoding,size:encoding?.bytes??null,eligible:!!encoding&&encoding.bytes<=.80*referenceBytes});
}

function selectAutoEncoding(input){
  const reference=(input?.reference||[]).map(requireEncoded),availableProfiles=new Set(reference.map(entry=>entry.profile)),referenceMode=input?.referenceMode==='TONE_SAFE'?'TONE_SAFE':'B0';
  if(availableProfiles.size===0)return Object.freeze({mode:'AUTO_DISABLED',reason:'fixed_reference_profiles_unavailable',encoding:null,referenceState:REFERENCE_PROFILE_UNAVAILABLE,referenceMode,sr:null});
  const referenceEncoding=smallestPassing(reference);
  if(!referenceEncoding)return Object.freeze({mode:'AUTO_NO_OP',reason:'reference_unreadable',encoding:null,referenceState:REFERENCE_UNREADABLE,referenceMode,sr:null});
  const sr=referenceEncoding.bytes,gray=normalizeMode(input?.gray,availableProfiles,sr),bw=normalizeMode(input?.bw,availableProfiles,sr);
  let mode=referenceMode==='TONE_SAFE'?'TONE_SAFE':'AUTO_NO_OP',encoding=referenceMode==='TONE_SAFE'?referenceEncoding:null;
  if(gray.eligible&&!bw.eligible){mode='GRAY_SAFE';encoding=gray.encoding}
  else if(!gray.eligible&&bw.eligible){mode='BW_STRONG';encoding=bw.encoding}
  else if(gray.eligible&&bw.eligible){if(bw.size<=1.02*gray.size){mode='BW_STRONG';encoding=bw.encoding}else{mode='GRAY_SAFE';encoding=gray.encoding}}
  return Object.freeze({mode,reason:mode==='AUTO_NO_OP'?'no_material_safe_improvement':'selected',encoding,referenceState:REFERENCE_READABLE,referenceMode,sr,referenceEncoding,gray,bw});
}

return Object.freeze({
  version:1,
  architecture:ARCHITECTURE_ID,
  fixedProfiles:FIXED_PROFILES,
  referenceStates:Object.freeze({REFERENCE_PROFILE_UNAVAILABLE,REFERENCE_UNREADABLE,REFERENCE_READABLE}),
  luma601,
  toneSafe,
  selectAutoEncoding,
  renderControlRaster:base.renderControlRaster,
  graySafe:base.graySafe,
  bwStrong:base.bwStrong,
  detailMap:base.detailMap,
  readabilityGuard:base.readabilityGuard
});
});
