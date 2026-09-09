(function(root,factory){
'use strict';
const api=factory(root);
if(typeof module==='object'&&module.exports)module.exports=api;
if(root)root.FamilyPilotReceiptMediaTransformV1=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';

const ARCHITECTURE_ID='FP86_RECEIPT_MEDIA_TRANSFORM_V1';
const MINIMUM_CROP_EDGE=8;
const VALIDATED_RECT=Symbol('VALIDATED_CROP_RECT');

const finite=value=>typeof value==='number'&&Number.isFinite(value);
const positiveInteger=value=>Number.isInteger(value)&&value>0;
const reject=reason=>Object.freeze({ok:false,kind:'REJECTED_CROP_RECT',reason});

function validateCropSelection(source,rawRect){
  const sourceWidth=source?.width,sourceHeight=source?.height;
  if(!positiveInteger(sourceWidth))return reject('source_width_invalid');
  if(!positiveInteger(sourceHeight))return reject('source_height_invalid');
  if(!rawRect||!finite(rawRect.x)||!finite(rawRect.y)||!finite(rawRect.width)||!finite(rawRect.height))return reject('rect_non_finite');
  const{x,y,width,height}=rawRect;
  if(x<0||y<0)return reject('rect_origin_negative');
  if(width<MINIMUM_CROP_EDGE||height<MINIMUM_CROP_EDGE)return reject('rect_below_minimum_edge');
  const rawRight=x+width,rawBottom=y+height;
  if(!finite(rawRight)||!finite(rawBottom)||rawRight>sourceWidth||rawBottom>sourceHeight)return reject('rect_out_of_bounds');

  const left=Math.floor(x),top=Math.floor(y),right=Math.ceil(rawRight),bottom=Math.ceil(rawBottom);
  const rect={x:left,y:top,width:right-left,height:bottom-top,sourceWidth,sourceHeight};
  if(!finite(rect.x)||!finite(rect.y)||!finite(rect.width)||!finite(rect.height))return reject('validated_rect_non_finite');
  if(rect.x<0||rect.y<0)return reject('validated_rect_origin_negative');
  if(rect.width<MINIMUM_CROP_EDGE||rect.height<MINIMUM_CROP_EDGE)return reject('validated_rect_below_minimum_edge');
  if(rect.x+rect.width>sourceWidth||rect.y+rect.height>sourceHeight)return reject('validated_rect_out_of_bounds');
  Object.defineProperty(rect,VALIDATED_RECT,{value:true});
  Object.freeze(rect);
  return Object.freeze({ok:true,kind:'VALIDATED_CROP_RECT',rect});
}

function createViewerTransform(input){
  const sourceWidth=input?.sourceWidth,sourceHeight=input?.sourceHeight;
  const viewerWidth=input?.viewerWidth,viewerHeight=input?.viewerHeight;
  const zoom=input?.zoom===undefined?1:input.zoom;
  const panX=input?.panX===undefined?0:input.panX,panY=input?.panY===undefined?0:input.panY;
  if(!positiveInteger(sourceWidth)||!positiveInteger(sourceHeight))throw Error('viewer_source_dimensions_invalid');
  if(!finite(viewerWidth)||!finite(viewerHeight)||viewerWidth<=0||viewerHeight<=0)throw Error('viewer_dimensions_invalid');
  if(!finite(zoom)||zoom<=0||!finite(panX)||!finite(panY))throw Error('viewer_gesture_state_invalid');
  const fitScale=Math.min(viewerWidth/sourceWidth,viewerHeight/sourceHeight);
  const fitOffsetX=(viewerWidth-sourceWidth*fitScale)/2;
  const fitOffsetY=(viewerHeight-sourceHeight*fitScale)/2;
  const scale=fitScale*zoom;
  return Object.freeze({sourceWidth,sourceHeight,viewerWidth,viewerHeight,fitScale,fitOffsetX,fitOffsetY,zoom,panX,panY,scale});
}

function sourcePointToViewer(transform,point){
  return Object.freeze({
    x:transform.fitOffsetX+transform.panX+transform.scale*point.x,
    y:transform.fitOffsetY+transform.panY+transform.scale*point.y
  });
}

function viewerPointToSource(transform,point){
  return Object.freeze({
    x:(point.x-transform.fitOffsetX-transform.panX)/transform.scale,
    y:(point.y-transform.fitOffsetY-transform.panY)/transform.scale
  });
}

function sourceRectToViewer(transform,rect){
  const start=sourcePointToViewer(transform,rect);
  const end=sourcePointToViewer(transform,{x:rect.x+rect.width,y:rect.y+rect.height});
  return Object.freeze({x:start.x,y:start.y,width:end.x-start.x,height:end.y-start.y});
}

function viewerRectToRawSource(transform,rect){
  if(!rect||![rect.x,rect.y,rect.width,rect.height].every(finite))return Object.freeze({x:NaN,y:NaN,width:NaN,height:NaN});
  const start=viewerPointToSource(transform,rect);
  const end=viewerPointToSource(transform,{x:rect.x+rect.width,y:rect.y+rect.height});
  return Object.freeze({x:start.x,y:start.y,width:end.x-start.x,height:end.y-start.y});
}

function requireValidatedRect(validation,source){
  const rect=validation?.kind==='VALIDATED_CROP_RECT'?validation.rect:validation;
  if(!rect||rect[VALIDATED_RECT]!==true)throw Error('validated_crop_rect_required');
  if(source?.width!==rect.sourceWidth||source?.height!==rect.sourceHeight)throw Error('normalized_bitmap_dimensions_mismatch');
  return rect;
}

function renderValidatedRaster(normalizedRaster,validation){
  const rect=requireValidatedRect(validation,normalizedRaster);
  const stride=positiveInteger(normalizedRaster?.stride)?normalizedRaster.stride:4;
  const pixels=normalizedRaster?.pixels;
  if(!pixels||pixels.length!==normalizedRaster.width*normalizedRaster.height*stride)throw Error('normalized_raster_pixels_invalid');
  const output=new pixels.constructor(rect.width*rect.height*stride);
  for(let row=0;row<rect.height;row++){
    const sourceStart=((rect.y+row)*normalizedRaster.width+rect.x)*stride;
    output.set(pixels.subarray(sourceStart,sourceStart+rect.width*stride),row*rect.width*stride);
  }
  return Object.freeze({width:rect.width,height:rect.height,stride,pixels:output});
}

function renderValidatedCropCanvas(normalizedBitmap,validation,createCanvas){
  const rect=requireValidatedRect(validation,normalizedBitmap);
  const canvas=createCanvas();
  canvas.width=rect.width;
  canvas.height=rect.height;
  const context=canvas.getContext('2d',{alpha:false});
  if(!context)throw Error('crop_canvas_unavailable');
  context.fillStyle='#fff';
  context.fillRect(0,0,rect.width,rect.height);
  context.drawImage(normalizedBitmap.image,rect.x,rect.y,rect.width,rect.height,0,0,rect.width,rect.height);
  return canvas;
}

function renderNormalizedBitmapToCanvas(normalizedBitmap,canvas){
  if(!positiveInteger(normalizedBitmap?.width)||!positiveInteger(normalizedBitmap?.height)||!normalizedBitmap.image)throw Error('normalized_bitmap_invalid');
  canvas.width=normalizedBitmap.width;
  canvas.height=normalizedBitmap.height;
  const context=canvas.getContext('2d',{alpha:false});
  if(!context)throw Error('viewer_canvas_unavailable');
  context.fillStyle='#fff';
  context.fillRect(0,0,canvas.width,canvas.height);
  context.drawImage(normalizedBitmap.image,0,0,canvas.width,canvas.height);
  return canvas;
}

async function decodeOrientationNormalizedBitmap(blob,environment={}){
  const bitmapDecoder=environment.createImageBitmap||root?.createImageBitmap?.bind(root);
  if(typeof bitmapDecoder==='function'){
    const bitmap=await bitmapDecoder(blob,{imageOrientation:'from-image'});
    if(!positiveInteger(bitmap?.width)||!positiveInteger(bitmap?.height)){
      bitmap?.close?.();
      throw Error('normalized_bitmap_dimensions_invalid');
    }
    return Object.freeze({kind:'ORIENTATION_NORMALIZED_BITMAP',image:bitmap,width:bitmap.width,height:bitmap.height,close:()=>bitmap.close?.()});
  }
  const ImageConstructor=environment.Image||root?.Image;
  const createObjectURL=environment.createObjectURL||root?.URL?.createObjectURL?.bind(root.URL);
  const revokeObjectURL=environment.revokeObjectURL||root?.URL?.revokeObjectURL?.bind(root.URL);
  if(typeof ImageConstructor!=='function'||typeof createObjectURL!=='function'||typeof revokeObjectURL!=='function')throw Error('orientation_normalized_decoder_unavailable');
  const url=createObjectURL(blob),image=new ImageConstructor();
  try{
    image.src=url;
    await image.decode();
    const width=image.naturalWidth,height=image.naturalHeight;
    if(!positiveInteger(width)||!positiveInteger(height))throw Error('normalized_bitmap_dimensions_invalid');
    return Object.freeze({kind:'ORIENTATION_NORMALIZED_BITMAP',image,width,height,close:()=>revokeObjectURL(url)});
  }catch(error){
    revokeObjectURL(url);
    throw error;
  }
}

function normalizeRasterOrientation(encoded,orientation=1){
  const width=encoded?.width,height=encoded?.height,stride=positiveInteger(encoded?.stride)?encoded.stride:4,pixels=encoded?.pixels;
  if(!positiveInteger(width)||!positiveInteger(height)||!pixels||pixels.length!==width*height*stride)throw Error('encoded_raster_invalid');
  if(![1,3,6,8].includes(orientation))throw Error('unsupported_test_orientation');
  const rotated=orientation===6||orientation===8,outputWidth=rotated?height:width,outputHeight=rotated?width:height;
  const output=new pixels.constructor(outputWidth*outputHeight*stride);
  for(let sourceY=0;sourceY<height;sourceY++)for(let sourceX=0;sourceX<width;sourceX++){
    let targetX=sourceX,targetY=sourceY;
    if(orientation===3){targetX=width-1-sourceX;targetY=height-1-sourceY}
    if(orientation===6){targetX=height-1-sourceY;targetY=sourceX}
    if(orientation===8){targetX=sourceY;targetY=width-1-sourceX}
    const sourceIndex=(sourceY*width+sourceX)*stride,targetIndex=(targetY*outputWidth+targetX)*stride;
    output.set(pixels.subarray(sourceIndex,sourceIndex+stride),targetIndex);
  }
  return Object.freeze({width:outputWidth,height:outputHeight,stride,pixels:output});
}

return Object.freeze({
  version:1,
  architecture:ARCHITECTURE_ID,
  minimumCropEdge:MINIMUM_CROP_EDGE,
  validateCropSelection,
  createViewerTransform,
  sourcePointToViewer,
  viewerPointToSource,
  sourceRectToViewer,
  viewerRectToRawSource,
  renderValidatedRaster,
  renderValidatedCropCanvas,
  renderNormalizedBitmapToCanvas,
  decodeOrientationNormalizedBitmap,
  normalizeRasterOrientation
});
});
