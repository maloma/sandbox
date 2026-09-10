'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const index=read('index.html'),mirror=read('src/familypilot.html');
const source=read('familypilot-receipt-gallery-editor-ux-v1.js');
const api=require('../familypilot-receipt-gallery-editor-ux-v1.js');
const mediaApi=require('../familypilot-receipt-media-transform-v1.js');
const section=(start,end)=>{const from=index.indexOf(start),to=index.indexOf(end,from);assert(from>=0&&to>from,`missing source section ${start}`);return index.slice(from,to)};

assert.strictEqual(index,mirror,'root index.html and src/familypilot.html must remain exact mirrors');
for(const match of index.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new Function(match[1]);
assert.strictEqual(api.architecture,'FP86_RECEIPT_GALLERY_EDITOR_UX_V1');
assert.deepStrictEqual([...api.fixedProfiles],['PNG_LOSSLESS','JPEG_Q86']);
assert.match(source,/mime:'image\/png'|entry\.profile===PROFILE_PNG&&entry\.mime!=='image\/png'/);
assert.match(index,/canvasBlob\(canvas,mime,profile==='JPEG_Q86'\?\.86:undefined\)/,'JPEG_Q86 must use the fixed 0.86 browser encoder profile');
assert.doesNotMatch(source,/webp|avif|\.74|quality search/i,'Auto must expose no third codec or quality search');

const gallery=section('async function syncDetailReceipt()','function hideReceiptActionMenu');
const galleryOracle=text=>/grid-template-columns:repeat\(auto-fill,minmax\(/.test(index)&&/thumb\.onclick=\(\)=>openReceiptPreview\(item\)/.test(text)&&/remove\.onclick=\(\)=>removeReceipt\(item\)/.test(text)&&!/item\.name|receiptIdentity|name\.textContent|meta\.textContent|Просмотреть/.test(text);
assert(galleryOracle(gallery),'normal gallery must be dense, direct and metadata-free');
const columnCount=(width,min=88,gap=9)=>Math.max(1,Math.floor((width+gap)/(min+gap)));
assert.deepStrictEqual([columnCount(88),columnCount(185),columnCount(400)],[1,2,4],'1 / 2 / many pages must use the available dense columns');
assert.match(section('async function removeReceipt(item)','async function decodeReceiptImage'),/confirm\(`/,'thumbnail removal must retain explicit confirmation');
assert.match(index,/id="detailReceiptBtn"[^>]*>Добавить страницу чека/,'explicit Add flow must remain present');
assert.doesNotMatch(section('<div id="receiptPreview"','<input id="receiptInput"'),/receiptActionToggle|receiptActionMenu|Действия|item\.name/,'viewer chrome must have no filename or Actions menu');
for(const id of ['receiptCropAction','receiptShareAction','receiptExportAction','receiptBrightnessAction','receiptContrastAction','receiptAutoAction','receiptDoneAction'])assert.match(index,new RegExp(`id="${id}"`),`${id} must be directly reachable in the dock`);

const usableGeometry=(viewport,safe,rects)=>rects.every(rect=>rect.left>=safe.left&&rect.right<=viewport-safe.right&&rect.right>rect.left);
assert.match(index,/height:100dvh;max-height:100dvh/);
assert.match(index,/env\(safe-area-inset-left\)/);
assert.match(index,/env\(safe-area-inset-right\)/);
assert.match(index,/\.receipt-tool-dock\{[^}]*overflow-x:auto/);
const viewport=320,safe={left:11,right:13},productionGeometry=[{left:11,right:307},{left:220,right:307},{left:11,right:307}];
assert(usableGeometry(viewport,safe,productionGeometry),'320 CSS px + nonzero safe-area geometry must fit');
assert.strictEqual(usableGeometry(viewport,safe,[...productionGeometry.slice(0,2),{left:11,right:308}]),false,'1 px overflow mutant must fail');

const raster=(width,height,pixel)=>{const pixels=new Uint8ClampedArray(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const value=pixel(x,y),offset=(y*width+x)*4;pixels[offset]=value[0];pixels[offset+1]=value[1];pixels[offset+2]=value[2];pixels[offset+3]=255}return{width,height,stride:4,pixels}};
const drawRect=(image,x,y,width,height,color)=>{for(let yy=y;yy<y+height;yy++)for(let xx=x;xx<x+width;xx++){const offset=(yy*image.width+xx)*4;image.pixels[offset]=color[0];image.pixels[offset+1]=color[1];image.pixels[offset+2]=color[2];image.pixels[offset+3]=255}return image};
const cloneRaster=image=>({width:image.width,height:image.height,stride:4,pixels:new Uint8ClampedArray(image.pixels)});
function receiptLines(image,color,width=1){for(let y=8;y<image.height-5;y+=9)drawRect(image,7,y,image.width-14,width,color);for(let x=12;x<image.width-8;x+=17)drawRect(image,x,5,width,image.height-10,color);return image}
const fixtures={
  FINE_1PX:receiptLines(raster(96,96,()=>[247,247,244]),[24,24,24],1),
  FAINT_2PX:receiptLines(raster(96,96,(x,y)=>{const v=218+Math.floor((x+y)/24);return[v,v,v]}),[145,145,145],2),
  COLOR_DETAIL:receiptLines(raster(96,96,(x,y)=>[238,226+(x%11),220+(y%17)]),[28,41,55],1),
  LOW_DETAIL:raster(96,96,()=>[224,224,224])
};
const coordinate=raster(12,10,(x,y)=>[x*10,y*12,(x+y)*7]),coordinateBefore=new Uint8ClampedArray(coordinate.pixels);
const composed=api.renderControlRaster(coordinate,{crop:{x:2,y:3,width:8,height:6},brightness:10,contrast:20});
assert.deepStrictEqual({width:composed.width,height:composed.height},{width:8,height:6},'C0 must apply same-session crop without upscaling');
const factor=(259*(51+255))/(255*(259-51)),expectedFirst=Math.max(0,Math.min(255,Math.round(factor*(20-128)+128+25.5)));
assert.strictEqual(composed.pixels[0],expectedFirst,'C0 manual brightness/contrast formula must be deterministic');
assert.deepStrictEqual([...coordinate.pixels],[...coordinateBefore],'edit rendering must not mutate the authoritative orientation-normalized source');
assert.deepStrictEqual({width:api.bwStrong(composed).width,height:api.bwStrong(composed).height},{width:8,height:6},'BW_STRONG dimensions must equal C0');
assert.deepStrictEqual({width:api.graySafe(composed).width,height:api.graySafe(composed).height},{width:8,height:6},'GRAY_SAFE dimensions must equal C0');

const independentLuma=(r,g,b)=>Math.max(0,Math.min(255,Math.round(.299*r+.587*g+.114*b)));
function independentMap(image){const y=new Uint8Array(image.width*image.height),map=new Uint8Array(y.length);for(let i=0;i<y.length;i++)y[i]=independentLuma(image.pixels[i*4],image.pixels[i*4+1],image.pixels[i*4+2]);let count=0;for(let row=1;row<image.height-1;row++)for(let col=1;col<image.width-1;col++){const p=(dy,dx)=>y[(row+dy)*image.width+col+dx],gx=-p(-1,-1)+p(-1,1)-2*p(0,-1)+2*p(0,1)-p(1,-1)+p(1,1),gy=-p(-1,-1)-2*p(-1,0)-p(-1,1)+p(1,-1)+2*p(1,0)+p(1,1);if(Math.abs(gx)+Math.abs(gy)>=96){map[row*image.width+col]=1;count++}}return{map,count}}
function independentGuard(control,candidate){if(control.width!==candidate.width||control.height!==candidate.height)return{pass:false,globalRecall:0,tiles:[]};const a=independentMap(control),b=independentMap(candidate),tileCols=Math.ceil(control.width/32),sources=new Map(),kept=new Map();let preserved=0;for(let y=0;y<control.height;y++)for(let x=0;x<control.width;x++){const i=y*control.width+x;if(!a.map[i])continue;const tile=`${Math.floor(x/32)},${Math.floor(y/32)}`;sources.set(tile,(sources.get(tile)||0)+1);let found=false;for(let dy=-1;dy<=1&&!found;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<control.width&&yy<control.height&&b.map[yy*control.width+xx]){found=true;break}}if(found){preserved++;kept.set(tile,(kept.get(tile)||0)+1)}}const tiles=[...sources].filter(([,count])=>count>=16).map(([tile,count])=>({tile,count,recall:(kept.get(tile)||0)/count})),globalRecall=a.count?preserved/a.count:0;return{pass:a.count>=64&&globalRecall>=.97&&tiles.every(tile=>tile.recall>=.85),salient:a.count,globalRecall,tiles,tileCols}}

for(const name of ['FINE_1PX','FAINT_2PX','COLOR_DETAIL']){
  const gray=api.graySafe(fixtures[name]),expected=independentGuard(fixtures[name],gray),actual=api.readabilityGuard(fixtures[name],gray);
  assert(expected.pass,`${name} independently derived safe result must pass`);
  assert.strictEqual(actual.pass,expected.pass,`${name} production guard must match independent oracle`);
  assert.deepStrictEqual([...api.graySafe(fixtures[name]).pixels],[...gray.pixels],`${name} GRAY_SAFE must be deterministic`);
  assert.deepStrictEqual([...api.bwStrong(fixtures[name]).pixels],[...api.bwStrong(fixtures[name]).pixels],`${name} BW_STRONG must be deterministic`);
}
assert.strictEqual(independentGuard(fixtures.LOW_DETAIL,api.graySafe(fixtures.LOW_DETAIL)).pass,false,'LOW_DETAIL must fail closed below 64 salient C0 pixels');
assert.strictEqual(api.readabilityGuard(fixtures.LOW_DETAIL,api.bwStrong(fixtures.LOW_DETAIL)).pass,false);

const localizedControl=receiptLines(raster(256,256,()=>[248,248,248]),[18,18,18],1),localizedMutant=cloneRaster(localizedControl);
drawRect(localizedMutant,96,96,32,32,[248,248,248]);
const localized=independentGuard(localizedControl,localizedMutant);
assert(localized.globalRecall>=.97,'localized mutant must preserve global page detail');
assert(localized.tiles.some(tile=>tile.tile==='3,3'&&tile.recall<.85),'localized qualifying tile must fail local recall');
assert.strictEqual(localized.pass,false);
assert.strictEqual(api.readabilityGuard(localizedControl,localizedMutant).pass,false,'production guard must reject localized erasure');

const png=(bytes,readable=true)=>({profile:'PNG_LOSSLESS',mime:'image/png',bytes,readable});
const jpg=(bytes,readable=true)=>({profile:'JPEG_Q86',mime:'image/jpeg',bytes,readable});
const choose=entries=>entries.filter(x=>x.readable).slice().sort((a,b)=>a.bytes-b.bytes||(a.profile==='PNG_LOSSLESS'?-1:1))[0]||null;
function independentSelector(input){const c=choose(input.control);if(!c)return'AUTO_DISABLED';const normalize=entries=>{const e=choose(entries);return{readable:!!e,size:e?.bytes??null,eligible:!!e&&e.bytes<=c.bytes,entry:e}};const bw=normalize(input.bw),gray=normalize(input.gray);if(!bw.eligible&&!gray.eligible)return'AUTO_NO_OP';if(bw.eligible&&!gray.eligible)return'BW_STRONG';if(!bw.eligible&&gray.eligible)return'GRAY_SAFE';return bw.size<=1.02*gray.size?'BW_STRONG':'GRAY_SAFE'}
const control=[png(100),jpg(120)],states=[
  [png(70,false)],
  [png(101,true)],
  [png(90,true)]
];
for(const bw of states)for(const gray of states){const input={control,bw,gray},expected=independentSelector(input);assert.strictEqual(api.selectAutoEncoding(input).mode,expected,'all valid normalized readability/size states must map exhaustively')}
assert.strictEqual(api.selectAutoEncoding({control,bw:[png(100)],gray:[png(101)]}).mode,'BW_STRONG','S_M == S0 eligible / S0+1 ineligible');
assert.strictEqual(api.selectAutoEncoding({control,bw:[png(101)],gray:[png(100)]}).mode,'GRAY_SAFE','mixed size state must select the only eligible mode');
for(const[bwSize,expected]of [[101,'BW_STRONG'],[102,'BW_STRONG'],[103,'GRAY_SAFE']])assert.strictEqual(api.selectAutoEncoding({control:[png(200),jpg(210)],bw:[jpg(bwSize)],gray:[jpg(100)]}).mode,expected,'1.02 below/equal/above boundary');
const tie=api.selectAutoEncoding({control,bw:[jpg(80),png(80)],gray:[png(120)]});
assert.strictEqual(tie.encoding.profile,'PNG_LOSSLESS','exact per-mode PNG/JPEG byte tie must choose PNG');
const decodedOrdering=api.selectAutoEncoding({control,bw:[jpg(60,false),png(70,true)],gray:[png(120)]});
assert.strictEqual(decodedOrdering.encoding.profile,'PNG_LOSSLESS','smaller unreadable encoding must lose to larger passing encoding');
assert.strictEqual(api.selectAutoEncoding({control,bw:[jpg(90)],gray:[]}).mode,'BW_STRONG','one-mode codec failure must remain exhaustive');
assert.strictEqual(api.selectAutoEncoding({control:[],bw:[],gray:[]}).mode,'AUTO_DISABLED','both fixed profiles unavailable must disable Auto fail-closed');
const normalizedStateOracle=state=>{if(state.readable===false&&state.size!==null)throw Error('malformed_normalized_state');return state};
assert.throws(()=>normalizedStateOracle({readable:false,size:55}),/malformed_normalized_state/,'invalid normalized logical state must be rejected');

const previewSource=section('async function renderReceiptEditPreview()','function scheduleReceiptEditPreview')+section('async function confirmReceiptCrop()','async function applyReceiptEditSession');
const autoEvaluationSource=section('async function evaluateReceiptAuto','function receiptSessionHasEdit');
assert(autoEvaluationSource.indexOf('decodeEncodedRaster(encoded.blob)')<autoEvaluationSource.indexOf('readabilityGuard(control,decoded)'),'readability must score decoded encoded candidate pixels');
const noCanonicalWrite=text=>!/executeReceiptReplacement|putReceiptBlob|writeOperationReceiptMetadata/.test(text);
assert(noCanonicalWrite(previewSource),'crop/brightness/contrast/Auto preview must perform zero canonical writes');
assert.strictEqual(noCanonicalWrite(`${previewSource};writeOperationReceiptMetadata()`),false,'PRE_DONE_CANONICAL_WRITE mutant must fail');
const applySource=section('async function applyReceiptEditSession()','async function resolveCurrentCanonicalReceiptForAction');
const oneCommit=text=>(text.match(/executeReceiptReplacement/g)||[]).length===1&&(text.match(/selected\|\|await encodeReceiptProfile/g)||[]).length===1;
assert(oneCommit(applySource),'one Done must make one final encode decision and one accepted replacement transaction');
assert.strictEqual(oneCommit(`${applySource};executeReceiptReplacement()`),false,'REPEATED_CANONICAL_RENDER_OR_COMMIT mutant must fail');
assert.match(applySource,/if\(!receiptSessionHasEdit\(\)\)\{close\('receiptPreview'\);clearReceiptPreview\(\);return\}/,'AUTO_NO_OP-only Done must return before replacement');
const solePersistencePath=text=>noCanonicalWrite(previewSource)&&(text.match(/executeReceiptReplacement/g)||[]).length===1&&!/await putReceiptBlob\(|await writeOperationReceiptMetadata\(/.test(text);
assert(solePersistencePath(applySource),'edit persistence must use only the accepted transaction');
assert.strictEqual(solePersistencePath(`${applySource};await putReceiptBlob('second',blob)`),false,'SECOND_PERSISTENCE_PATH mutant must fail');

assert.strictEqual(galleryOracle(`${gallery};name.textContent=item.name`),false,'METADATA_ROW_REINTRODUCED mutant must fail');
const unreadableAcceptedMutant={...localized,pass:true};
assert.notStrictEqual(unreadableAcceptedMutant.pass,independentGuard(localizedControl,localizedMutant).pass,'UNREADABLE_THRESHOLD_ACCEPTED mutant must fail');
const wrongBoundary=()=>api.selectAutoEncoding({control,bw:[png(101)],gray:[png(100)]}).mode==='BW_STRONG';
assert.strictEqual(wrongBoundary(),false,'CODEC_OR_SIZE_BOUNDARY mutant must fail');
const financial={id:'op-1',amount:47.5,categoryId:'food',note:'same',receipts:[{id:'r1'},{id:'r2'}]},snapshot=JSON.stringify(financial);
const financialOrderOracle=value=>JSON.stringify(value)===snapshot;
assert(financialOrderOracle(financial));
assert.strictEqual(financialOrderOracle({...financial,amount:48,receipts:[...financial.receipts].reverse()}),false,'FINANCIAL_OR_ORDER_MUTATION mutant must fail');

async function staleShareExportControl(){
  const old=Uint8Array.from([0xff,0xd8,0xff,1]),fresh=Uint8Array.from([0xff,0xd8,0xff,2,3]);
  const metadata=[{id:'r1',storageKey:'fresh',name:'receipt.jpg',type:'image/jpeg',size:fresh.length,addedAt:1}],blobs=new Map([['old',old],['fresh',fresh]]);
  const result=await mediaApi.resolveCanonicalReceiptForRead({receiptId:'r1',metadata:{read:async()=>JSON.parse(JSON.stringify(metadata))},storage:{get:async key=>blobs.get(key)},validateBlob:async(blob,item)=>blob?.length===item.size});
  assert(result.ok);
  assert.deepStrictEqual([...result.blob],[...fresh],'post-apply Share/Export must return newly committed canonical bytes');
  assert.notDeepStrictEqual([...old],[...fresh],'STALE_SHARE_EXPORT mutant must fail');
}

staleShareExportControl().then(()=>{
  console.log('FP93_FIXTURE_FINE_1PX_PASS');
  console.log('FP93_FIXTURE_FAINT_2PX_PASS');
  console.log('FP93_FIXTURE_COLOR_DETAIL_PASS');
  console.log('FP93_FIXTURE_LOW_DETAIL_PASS');
  console.log('FP93_NEGATIVE_CLIPPED_CLOSE_OR_DOCK_PASS');
  console.log('FP93_NEGATIVE_METADATA_ROW_REINTRODUCED_PASS');
  console.log('FP93_NEGATIVE_PRE_DONE_CANONICAL_WRITE_PASS');
  console.log('FP93_NEGATIVE_REPEATED_CANONICAL_RENDER_OR_COMMIT_PASS');
  console.log('FP93_NEGATIVE_UNREADABLE_THRESHOLD_ACCEPTED_PASS');
  console.log('FP93_NEGATIVE_CODEC_OR_SIZE_BOUNDARY_PASS');
  console.log('FP93_NEGATIVE_STALE_SHARE_EXPORT_PASS');
  console.log('FP93_NEGATIVE_FINANCIAL_OR_ORDER_MUTATION_PASS');
  console.log('FP93_NEGATIVE_SECOND_PERSISTENCE_PATH_PASS');
  console.log('FP93_LOCAL_TILE_RECALL_SENSITIVITY_PASS');
  console.log('FP93_AUTO_NO_OP_ZERO_REPLACEMENT_PASS');
  console.log('FP93_ROOT_SRC_MIRROR_PASS');
}).catch(error=>{console.error(error);process.exitCode=1});
