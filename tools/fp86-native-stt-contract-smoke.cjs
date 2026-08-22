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

const availabilityBlock=android.match(/fun checkAvailability\(callback:[\s\S]*?private fun checkAvailabilityOnMain/);
assert.ok(availabilityBlock,'checkAvailability public entrypoint must exist');
assert.match(availabilityBlock[0],/mainHandler\.post\s*\{/,'checkAvailability must marshal to mainHandler');

const downloadBlock=android.match(/fun requestLanguageModelDownload\(callback:[\s\S]*?fun recognize/);
assert.ok(downloadBlock,'requestLanguageModelDownload callback entrypoint must exist');
assert.match(downloadBlock[0],/mainHandler\.post\s*\{/,'model download must marshal to mainHandler');
assert.match(downloadBlock[0],/createOnDeviceSpeechRecognizer/);
assert.match(downloadBlock[0],/triggerModelDownload/);
assert.match(downloadBlock[0],/temporary\.destroy\(\)/);

const recognizeBlock=android.match(/fun recognize\(callback:[\s\S]*?fun cancel/);
assert.ok(recognizeBlock);
assert.match(recognizeBlock[0],/mainHandler\.post\s*\{/,'recognize must marshal to mainHandler');
const cancelBlock=android.match(/fun cancel\(\)[\s\S]*?private fun intent/);
assert.ok(cancelBlock);
assert.match(cancelBlock[0],/mainHandler\.post\s*\{/,'cancel must marshal to mainHandler');
assert.match(android,/Looper\.myLooper\(\)\s*==\s*Looper\.getMainLooper\(\)/,'finish path must enforce main-thread cleanup');
assert.match(android,/private fun finishOnMain/);

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
  console.log('FP86_ANDROID_MAIN_THREAD_BOUNDARY_PASS');
  console.log('FP86_NO_CLOUD_FALLBACK_PASS');
})();
