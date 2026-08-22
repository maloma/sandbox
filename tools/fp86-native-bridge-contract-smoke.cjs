'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const host=fs.readFileSync(path.join(root,'familypilot-native-speech-web-host-v1.js'),'utf8');
const entry=fs.readFileSync(path.join(root,'familypilot-voice-v1-native-entry.js'),'utf8');
const android=fs.readFileSync(path.join(root,'mobile/android/FamilyPilotSpeechWebBridgeV1.kt'),'utf8');
const ios=fs.readFileSync(path.join(root,'mobile/ios/FamilyPilotSpeechWebBridgeV1.swift'),'utf8');

assert.match(android,/WebViewCompat\.addWebMessageListener/);
assert.match(android,/allowedOriginRules/);
const wildcardGuard=android.match(/if\(allowedOriginRules\.isEmpty\(\)\|\|allowedOriginRules\.contains\("\*"\)\)\{[\s\S]*?\}/);
assert.ok(wildcardGuard,'wildcard-origin guard must exist');
assert.match(wildcardGuard[0],/callback\(false\)/);
assert.match(wildcardGuard[0],/return@post/);
assert.match(android,/!isMainFrame/);
assert.doesNotMatch(android,/\.addJavascriptInterface\s*\(/);
assert.match(android,/requestMicrophonePermission/);
assert.doesNotMatch(android,/createSpeechRecognizer\s*\(/);
assert.doesNotMatch(android,/http:\/\/|https:\/\//);
assert.match(android,/DOCUMENT_START_SCRIPT/);
assert.match(android,/WEB_MESSAGE_LISTENER/);

assert.match(ios,/WKScriptMessageHandler/);
assert.match(ios,/message\.frameInfo\.isMainFrame/);
assert.match(ios,/securityOrigin/);
assert.match(ios,/allowedSchemes/);
assert.match(ios,/allowedHosts/);
assert.match(ios,/FamilyPilotOnDeviceSpeechV1/);
assert.doesNotMatch(ios,/URLSession|http:\/\/|https:\/\//);
assert.match(ios,/forMainFrameOnly:\s*true/);

assert.match(entry,/familypilot-native-speech-web-host-v1\.js/);
assert.match(entry,/familypilot-native-speech-provider-v1\.js/);
assert.match(entry,/familypilot-voice-v1\.js/);
assert.match(entry,/familypilot-voice-v1-form-adapter\.js/);
assert.match(entry,/adapter\.install\(\)/);
assert.doesNotMatch(entry,/SpeechRecognition|webkitSpeechRecognition/);

(async()=>{
  let posted=null;
  const androidBridge={postMessage(message){posted=JSON.parse(message)}};
  const context={FamilyPilotNativeSpeechAndroidBridgeV1:androidBridge,setTimeout,clearTimeout,Date,Promise,JSON,Object};
  context.globalThis=context;
  vm.createContext(context);
  vm.runInContext(host,context);
  assert.equal(context.__FP_NATIVE_SPEECH_WEB_HOST_V1_READY__,true);
  const availablePromise=context.FamilyPilotNativeSpeechHostV1.isAvailable();
  assert.equal(posted.action,'isAvailable');
  context.FamilyPilotNativeSpeechAndroidBridgeV1.onmessage({data:JSON.stringify({id:posted.id,available:true})});
  assert.equal(await availablePromise,true);
  const recognizePromise=context.FamilyPilotNativeSpeechHostV1.recognize();
  assert.equal(posted.action,'recognize');
  context.FamilyPilotNativeSpeechAndroidBridgeV1.onmessage({data:JSON.stringify({id:posted.id,ok:true,text:'47 Продукты Lidl'})});
  const recognized=await recognizePromise;
  assert.deepStrictEqual(JSON.parse(JSON.stringify(recognized)),{ok:true,text:'47 Продукты Lidl'});

  const noNative={setTimeout,clearTimeout,Date,Promise,JSON,Object};
  noNative.globalThis=noNative;
  vm.createContext(noNative);
  vm.runInContext(host,noNative);
  assert.equal(noNative.FamilyPilotNativeSpeechHostV1,undefined,'ordinary browser must not gain a speech host');

  console.log('FP86_NATIVE_BRIDGE_CONTRACT_PASS');
  console.log('FP86_ANDROID_ORIGIN_SCOPED_BRIDGE_PASS');
  console.log('FP86_IOS_MAIN_FRAME_ORIGIN_BRIDGE_PASS');
  console.log('FP86_NATIVE_ENTRY_NO_BROWSER_FALLBACK_PASS');
})();
