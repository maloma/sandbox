(function(root,factory){
'use strict';
const api=factory();
if(typeof module==='object'&&module.exports)module.exports=api;
if(root)root.FamilyPilotReceiptGalleryEditorUxV1=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const ARCHITECTURE_ID='FP86_RECEIPT_GALLERY_EDITOR_UX_V1';
const PROFILE_PNG='PNG_LOSSLESS';
const PROFILE_JPEG='JPEG_Q86';
const FIXED_PROFILES=Object.freeze([PROFILE_PNG,PROFILE_JPEG]);
const clampByte=value=>Math.max(0,Math.min(255,Math.round(value)));
const positiveInteger=value=>Number.isInteger(value)&&value>0;

function requireRaster(raster,label='raster'){
  const width=raster?.width,height=raster?.height,stride=raster?.stride===undefined?4:raster.stride,pixels=raster?.pixels;
  if(!positiveInteger(width)||!positiveInteger(height)||stride!==4||!pixels||pixels.length!==width*height*stride)throw Error(`${label}_invalid`);
  return{width,height,stride,pixels};
}

function luma601(red,green,blue){
  return clampByte(.299*red+.587*green+.114*blue);
}

function renderControlRaster(source,options={}){
  const input=requireRaster(source,'normalized_raster'),crop=options.crop||{x:0,y:0,width:input.width,height:input.height};
  const{x,y,width,height}=crop;
  if(![x,y,width,height].every(Number.isInteger)||x<0||y<0||width<1||height<1||x+width>input.width||y+height>input.height)throw Error('edit_crop_invalid');
  const brightness=Math.max(-100,Math.min(100,Number(options.brightness)||0));
  const contrast=Math.max(-100,Math.min(100,Number(options.contrast)||0));
  const brightnessDelta=brightness*2.55;
  const contrastValue=contrast*2.55;
  const factor=(259*(contrastValue+255))/(255*(259-contrastValue));
  const pixels=new Uint8ClampedArray(width*height*4);
  for(let targetY=0;targetY<height;targetY++)for(let targetX=0;targetX<width;targetX++){
    const sourceIndex=((y+targetY)*input.width+x+targetX)*4,targetIndex=(targetY*width+targetX)*4;
    for(let channel=0;channel<3;channel++)pixels[targetIndex+channel]=clampByte(factor*(input.pixels[sourceIndex+channel]-128)+128+brightnessDelta);
    pixels[targetIndex+3]=255;
  }
  return Object.freeze({width,height,stride:4,pixels});
}

function graySafe(control){
  const input=requireRaster(control,'control_raster'),pixels=new Uint8ClampedArray(input.width*input.height*4);
  for(let index=0;index<input.width*input.height;index++){
    const offset=index*4,luma=luma601(input.pixels[offset],input.pixels[offset+1],input.pixels[offset+2]);
    const gray=clampByte(128+(luma-128)*1.08);
    pixels[offset]=pixels[offset+1]=pixels[offset+2]=gray;
    pixels[offset+3]=255;
  }
  return Object.freeze({width:input.width,height:input.height,stride:4,pixels});
}

function bwStrong(control){
  const input=requireRaster(control,'control_raster'),count=input.width*input.height,luma=new Uint8Array(count);
  for(let index=0;index<count;index++){
    const offset=index*4;
    luma[index]=luma601(input.pixels[offset],input.pixels[offset+1],input.pixels[offset+2]);
  }
  const integralWidth=input.width+1,integral=new Uint32Array((input.width+1)*(input.height+1));
  for(let y=0;y<input.height;y++){
    let rowSum=0;
    for(let x=0;x<input.width;x++){
      rowSum+=luma[y*input.width+x];
      integral[(y+1)*integralWidth+x+1]=integral[y*integralWidth+x+1]+rowSum;
    }
  }
  const pixels=new Uint8ClampedArray(count*4),radius=7;
  for(let y=0;y<input.height;y++)for(let x=0;x<input.width;x++){
    const left=Math.max(0,x-radius),top=Math.max(0,y-radius),right=Math.min(input.width,x+radius+1),bottom=Math.min(input.height,y+radius+1);
    const sum=integral[bottom*integralWidth+right]-integral[top*integralWidth+right]-integral[bottom*integralWidth+left]+integral[top*integralWidth+left];
    const localMean=sum/((right-left)*(bottom-top)),value=luma[y*input.width+x],ink=value<localMean-10||value<72;
    const output=ink?20:246,offset=(y*input.width+x)*4;
    pixels[offset]=pixels[offset+1]=pixels[offset+2]=output;
    pixels[offset+3]=255;
  }
  return Object.freeze({width:input.width,height:input.height,stride:4,pixels});
}

function detailMap(raster){
  const input=requireRaster(raster),luma=new Uint8Array(input.width*input.height),salient=new Uint8Array(input.width*input.height);
  for(let index=0;index<luma.length;index++){
    const offset=index*4;
    luma[index]=luma601(input.pixels[offset],input.pixels[offset+1],input.pixels[offset+2]);
  }
  let count=0;
  for(let y=1;y<input.height-1;y++)for(let x=1;x<input.width-1;x++){
    const a=luma[(y-1)*input.width+x-1],b=luma[(y-1)*input.width+x],c=luma[(y-1)*input.width+x+1];
    const d=luma[y*input.width+x-1],f=luma[y*input.width+x+1];
    const g=luma[(y+1)*input.width+x-1],h=luma[(y+1)*input.width+x],i=luma[(y+1)*input.width+x+1];
    const gx=-a+c-2*d+2*f-g+i,gy=-a-2*b-c+g+2*h+i;
    if(Math.abs(gx)+Math.abs(gy)>=96){salient[y*input.width+x]=1;count++}
  }
  return Object.freeze({width:input.width,height:input.height,salient,count});
}

function readabilityGuard(control,candidate){
  const base=requireRaster(control,'control_raster'),test=requireRaster(candidate,'candidate_raster');
  if(base.width!==test.width||base.height!==test.height)return Object.freeze({pass:false,reason:'dimensions_mismatch',salient:0,globalRecall:0,tiles:[]});
  const source=detailMap(base),target=detailMap(test),tileWidth=Math.ceil(base.width/32),tileHeight=Math.ceil(base.height/32);
  const tileSource=new Uint32Array(tileWidth*tileHeight),tilePreserved=new Uint32Array(tileWidth*tileHeight);
  let preserved=0;
  for(let y=0;y<base.height;y++)for(let x=0;x<base.width;x++){
    const index=y*base.width+x;
    if(!source.salient[index])continue;
    const tile=Math.floor(y/32)*tileWidth+Math.floor(x/32);
    tileSource[tile]++;
    let found=false;
    for(let dy=-1;dy<=1&&!found;dy++)for(let dx=-1;dx<=1;dx++){
      const nearX=x+dx,nearY=y+dy;
      if(nearX>=0&&nearY>=0&&nearX<base.width&&nearY<base.height&&target.salient[nearY*base.width+nearX]){found=true;break}
    }
    if(found){preserved++;tilePreserved[tile]++}
  }
  const globalRecall=source.count?preserved/source.count:0,tiles=[];
  let localPass=true;
  for(let tile=0;tile<tileSource.length;tile++)if(tileSource[tile]>=16){
    const recall=tilePreserved[tile]/tileSource[tile];
    tiles.push(Object.freeze({tileX:tile%tileWidth,tileY:Math.floor(tile/tileWidth),source:tileSource[tile],preserved:tilePreserved[tile],recall}));
    if(recall<.85)localPass=false;
  }
  const pass=source.count>=64&&globalRecall>=.97&&localPass;
  return Object.freeze({pass,reason:source.count<64?'low_detail':globalRecall<.97?'global_recall':!localPass?'local_recall':'pass',salient:source.count,preserved,globalRecall,tiles:Object.freeze(tiles)});
}

function requireEncoded(entry){
  if(!entry||!FIXED_PROFILES.includes(entry.profile)||!Number.isInteger(entry.bytes)||entry.bytes<0)throw Error('encoded_profile_invalid');
  if(entry.profile===PROFILE_PNG&&entry.mime!=='image/png')throw Error('encoded_profile_mime_invalid');
  if(entry.profile===PROFILE_JPEG&&entry.mime!=='image/jpeg')throw Error('encoded_profile_mime_invalid');
  return entry;
}

function smallest(entries){
  return entries.slice().sort((left,right)=>left.bytes-right.bytes||(left.profile===PROFILE_PNG?-1:1))[0]||null;
}

function selectAutoEncoding(input){
  const control=(input?.control||[]).map(requireEncoded),available=new Set(control.map(entry=>entry.profile));
  if(available.size===0)return Object.freeze({mode:'AUTO_DISABLED',reason:'fixed_codecs_unavailable',encoding:null,s0:null});
  const s0Entry=smallest(control),evaluate=entries=>{
    const fixed=(entries||[]).map(requireEncoded).filter(entry=>available.has(entry.profile));
    const passing=fixed.filter(entry=>entry.readable===true),encoding=smallest(passing);
    return Object.freeze({readable:!!encoding,encoding,size:encoding?.bytes??null,eligible:!!encoding&&encoding.bytes<=s0Entry.bytes});
  };
  const bw=evaluate(input?.bw),gray=evaluate(input?.gray);
  let mode='AUTO_NO_OP',encoding=null;
  if(bw.eligible&&!gray.eligible){mode='BW_STRONG';encoding=bw.encoding}
  else if(!bw.eligible&&gray.eligible){mode='GRAY_SAFE';encoding=gray.encoding}
  else if(bw.eligible&&gray.eligible){
    if(bw.size<=1.02*gray.size){mode='BW_STRONG';encoding=bw.encoding}else{mode='GRAY_SAFE';encoding=gray.encoding}
  }
  return Object.freeze({mode,reason:mode==='AUTO_NO_OP'?'no_readable_no_larger_candidate':'selected',encoding,s0:s0Entry.bytes,s0Encoding:s0Entry,bw,gray});
}

return Object.freeze({
  version:1,
  architecture:ARCHITECTURE_ID,
  fixedProfiles:FIXED_PROFILES,
  luma601,
  renderControlRaster,
  graySafe,
  bwStrong,
  detailMap,
  readabilityGuard,
  selectAutoEncoding
});
});
