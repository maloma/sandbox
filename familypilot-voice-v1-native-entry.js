(function installFamilyPilotVoiceNativeEntryV1(root){
  'use strict';
  if(!root?.document||root.__FP_VOICE_NATIVE_ENTRY_V1_LOADING__)return;
  root.__FP_VOICE_NATIVE_ENTRY_V1_LOADING__=true;

  const modules=[
    ['./familypilot-native-speech-web-host-v1.js',()=>Boolean(root.FamilyPilotNativeSpeechHostV1)],
    ['./familypilot-native-speech-provider-v1.js',()=>Boolean(root.FamilyPilotOnDeviceSpeechV1)],
    ['./familypilot-voice-v1.js',()=>Boolean(root.FamilyPilotVoiceV1)],
    ['./familypilot-voice-v1-form-adapter.js',()=>Boolean(root.FamilyPilotVoiceV1FormAdapter)]
  ];

  function load(src,ready){
    if(ready())return Promise.resolve(true);
    return new Promise(resolve=>{
      const existing=[...root.document.scripts].find(node=>node.dataset?.fpNativeVoiceModule===src);
      if(existing){
        existing.addEventListener('load',()=>resolve(ready()),{once:true});
        existing.addEventListener('error',()=>resolve(false),{once:true});
        return;
      }
      const script=root.document.createElement('script');
      script.src=src;
      script.dataset.fpNativeVoiceModule=src;
      script.onload=()=>resolve(ready());
      script.onerror=()=>resolve(false);
      root.document.head.appendChild(script);
    });
  }

  async function start(){
    for(const [src,ready] of modules){
      if(!(await load(src,ready))){
        root.__FP_VOICE_NATIVE_ENTRY_V1_FAILED__=src;
        return false;
      }
    }
    const adapter=root.FamilyPilotVoiceV1FormAdapter;
    if(!adapter?.install)return false;
    const installed=await adapter.install();
    root.__FP_VOICE_NATIVE_ENTRY_V1_READY__=installed===true;
    return installed===true;
  }

  root.FamilyPilotVoiceNativeEntryV1=Object.freeze({start});
  start();
})(typeof globalThis!=='undefined'?globalThis:this);
