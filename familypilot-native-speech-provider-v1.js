(function installFamilyPilotNativeSpeechProviderV1(root){
  'use strict';
  if(!root||root.FamilyPilotOnDeviceSpeechV1)return;
  const host=root.FamilyPilotNativeSpeechHostV1;
  if(!host)return;
  const failure=error=>Object.freeze({ok:false,error});
  const provider=Object.freeze({
    mode:'on_device',
    async isAvailable(){if(typeof host.isAvailable!=='function')return false;try{return(await host.isAvailable())===true}catch{return false}},
    async recognize(){
      if(typeof host.recognize!=='function')return failure('on_device_speech_unavailable');
      let result;try{result=await host.recognize()}catch{return failure('speech_recognition_failed')}
      if(!result||result.ok!==true||typeof result.text!=='string'||!result.text.trim())return failure(result?.error||'speech_recognition_failed');
      return Object.freeze({ok:true,text:result.text});
    },
    async stop(){if(typeof host.stop!=='function')return false;try{return(await host.stop())===true}catch{return false}}
  });
  root.FamilyPilotOnDeviceSpeechV1=provider;
  root.__FP_NATIVE_SPEECH_PROVIDER_V1_READY__=true;
})(typeof globalThis!=='undefined'?globalThis:this);
