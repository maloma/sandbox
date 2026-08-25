(function installFamilyPilotNativeSpeechWebHostV1(root){
  'use strict';
  if(!root||root.FamilyPilotNativeSpeechHostV1)return;

  const pending=new Map();
  let seq=0;
  const android=root.FamilyPilotNativeSpeechAndroidBridgeV1;
  const ios=root.webkit?.messageHandlers?.FamilyPilotNativeSpeechIOSBridgeV1;

  function finish(id,payload){
    const key=String(id||''),entry=pending.get(key);
    if(!entry)return false;
    pending.delete(key);
    if(entry.timer)root.clearTimeout?.(entry.timer);
    let value=payload;
    if(typeof value==='string'){try{value=JSON.parse(value)}catch{value={ok:false,error:'native_speech_bridge_invalid_response'}}}
    entry.resolve(value&&typeof value==='object'?value:{ok:false,error:'native_speech_bridge_invalid_response'});
    return true;
  }

  root.__FP_NATIVE_SPEECH_BRIDGE_V1_DELIVER__=function(payload){
    if(!payload||typeof payload!=='object')return false;
    return finish(payload.id,payload);
  };

  let send=null;
  if(android&&typeof android.postMessage==='function'){
    android.onmessage=event=>{let payload=event?.data;if(typeof payload==='string'){try{payload=JSON.parse(payload)}catch{return}}root.__FP_NATIVE_SPEECH_BRIDGE_V1_DELIVER__(payload)};
    send=message=>android.postMessage(JSON.stringify(message));
  }else if(ios&&typeof ios.postMessage==='function')send=message=>ios.postMessage(message);
  if(!send)return;

  function request(action,timeoutMs=25000){
    return new Promise(resolve=>{
      const id=`fpv1-${Date.now().toString(36)}-${(++seq).toString(36)}`;
      let timer=null;
      if(Number.isFinite(timeoutMs)&&timeoutMs>0){timer=root.setTimeout?.(()=>{if(!pending.has(id))return;pending.delete(id);resolve({ok:false,error:'native_speech_bridge_timeout'})},timeoutMs)}
      pending.set(id,{resolve,timer,action});
      try{send({id,action})}catch{pending.delete(id);if(timer)root.clearTimeout?.(timer);resolve({ok:false,error:'native_speech_bridge_unavailable'})}
    });
  }

  root.FamilyPilotNativeSpeechHostV1=Object.freeze({
    async isAvailable(){const result=await request('isAvailable');return result?.available===true},
    async recognize(){
      const result=await request('recognize',null);
      if(result?.ok===true&&typeof result.text==='string'&&result.text.trim())return Object.freeze({ok:true,text:result.text});
      return Object.freeze({ok:false,error:typeof result?.error==='string'?result.error:'speech_recognition_failed'});
    },
    async stop(){const result=await request('stop',10000);return result?.ok===true}
  });
  root.__FP_NATIVE_SPEECH_WEB_HOST_V1_READY__=true;
})(typeof globalThis!=='undefined'?globalThis:this);
