'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const ios=fs.readFileSync(path.join(root,'mobile/ios/FamilyPilotOnDeviceSpeechV1.swift'),'utf8');
const android=fs.readFileSync(path.join(root,'mobile/android/FamilyPilotOnDeviceSpeechV1.kt'),'utf8');
const provider=fs.readFileSync(path.join(root,'familypilot-native-speech-provider-v1.js'),'utf8');
const iosPlist=fs.readFileSync(path.join(root,'mobile/ios/Info.plist.voice-v1.fragment.xml'),'utf8');
const androidManifest=fs.readFileSync(path.join(root,'mobile/android/AndroidManifest.voice-v1.fragment.xml'),'utf8');

assert.match(ios,/supportsOnDeviceRecognition/);
assert.match(ios,/requiresOnDeviceRecognition\s*=\s*true/);
assert.match(ios,/SFSpeechRecognizer\.requestAuthorization/);
assert.match(ios,/requestRecordPermission/);
assert.doesNotMatch(ios,/URLSession|http:\/\/|https:\/\//);
assert.match(iosPlist,/NSMicrophoneUsageDescription/);
assert.match(iosPlist,/NSSpeechRecognitionUsageDescription/);

assert.match(android,/Build\.VERSION_CODES\.S/);
assert.match(android,/SpeechRecognizer\.isOnDeviceRecognitionAvailable/);
assert.match(android,/SpeechRecognizer\.createOnDeviceSpeechRecognizer/);
assert.doesNotMatch(android,/SpeechRecognizer\.createSpeechRecognizer\s*\(/);
assert.match(android,/Manifest\.permission\.RECORD_AUDIO/);
assert.match(androidManifest,/android\.permission\.RECORD_AUDIO/);
assert.match(androidManifest,/android\.speech\.RecognitionService/);
assert.match(android,/installedOnDeviceLanguages/);
assert.match(android,/supportedOnDeviceLanguages/);
assert.match(android,/triggerModelDownload/);
assert.doesNotMatch(android,/http:\/\/|https:\/\//);

const context={
  FamilyPilotNativeSpeechHostV1:{
    isAvailable:async()=>true,
    recognize:async()=>({ok:true,text:'47 Продукты Lidl'})
  }
};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(provider,context);
assert.equal(context.FamilyPilotOnDeviceSpeechV1.mode,'on_device');
assert.equal(context.__FP_NATIVE_SPEECH_PROVIDER_V1_READY__,true);

(async()=>{
  assert.equal(await context.FamilyPilotOnDeviceSpeechV1.isAvailable(),true);
  const result=await context.FamilyPilotOnDeviceSpeechV1.recognize();
  assert.deepStrictEqual(JSON.parse(JSON.stringify(result)),{ok:true,text:'47 Продукты Lidl'});

  const cloudless={FamilyPilotNativeSpeechHostV1:{isAvailable:async()=>false}};
  cloudless.globalThis=cloudless;
  vm.createContext(cloudless);
  vm.runInContext(provider,cloudless);
  assert.equal(await cloudless.FamilyPilotOnDeviceSpeechV1.isAvailable(),false);
  const unavailable=await cloudless.FamilyPilotOnDeviceSpeechV1.recognize();
  assert.equal(unavailable.ok,false);
  assert.equal(unavailable.error,'on_device_speech_unavailable');

  console.log('FP86_NATIVE_STT_CONTRACT_PASS');
  console.log('FP86_IOS_ON_DEVICE_ONLY_PASS');
  console.log('FP86_ANDROID_ON_DEVICE_ONLY_PASS');
  console.log('FP86_NO_CLOUD_FALLBACK_PASS');
})();
