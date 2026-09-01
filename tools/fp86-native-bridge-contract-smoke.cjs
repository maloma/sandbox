'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const host=fs.readFileSync(path.join(root,'familypilot-native-speech-web-host-v1.js'),'utf8');
const entry=fs.readFileSync(path.join(root,'familypilot-voice-v1-native-entry.js'),'utf8');
const android=fs.readFileSync(path.join(root,'mobile/android/FamilyPilotSpeechWebBridgeV1.kt'),'utf8');
const androidSpeech=fs.readFileSync(path.join(root,'mobile/android/FamilyPilotOnDeviceSpeechV1.kt'),'utf8');
const ios=fs.readFileSync(path.join(root,'mobile/ios/FamilyPilotSpeechWebBridgeV1.swift'),'utf8');
const iosSpeech=fs.readFileSync(path.join(root,'mobile/ios/FamilyPilotOnDeviceSpeechV1.swift'),'utf8');

assert.match(android,/WebViewCompat\.addWebMessageListener/);
assert.match(android,/allowedOriginRules/);
assert.match(android,/allowedOriginRules\.isEmpty\(\)\s*\|\|\s*allowedOriginRules\.contains\("\*"\)/);
assert.match(android,/!isMainFrame/);
assert.doesNotMatch(android,/\.addJavascriptInterface\s*\(/);
assert.match(android,/requestMicrophonePermission/);
assert.doesNotMatch(android,/createSpeechRecognizer\s*\(/);
assert.doesNotMatch(android,/http:\/\/|https:\/\//);
assert.match(android,/DOCUMENT_START_SCRIPT/);
assert.match(android,/WEB_MESSAGE_LISTENER/);
assert.match(android,/"stop"\s*->\s*stopSession/);
assert.match(android,/speech\.stopListening\(\)/);
assert.match(android,/chunks\.joinToString\(" "\)/);
assert.match(android,/"event"\s+to\s+"partial"/);
assert.match(android,/publishPartial\(current\)/);
assert.match(android,/promotePartial\(current\)/);
assert.match(androidSpeech,/EXTRA_PARTIAL_RESULTS,\s*true/);
assert.match(androidSpeech,/override fun onPartialResults\(partialResults: Bundle\?\)/);
assert.match(androidSpeech,/partialCallback\?\.invoke\(text\)/);

assert.match(ios,/WKScriptMessageHandler/);
assert.match(ios,/let frame = message\.frameInfo/);
assert.match(ios,/frame\.isMainFrame/);
assert.match(ios,/frame\.securityOrigin/);
assert.match(ios,/allowedSchemes/);
assert.match(ios,/allowedHosts/);
assert.match(ios,/FamilyPilotOnDeviceSpeechV1/);
assert.doesNotMatch(ios,/URLSession|http:\/\/|https:\/\//);
assert.match(ios,/forMainFrameOnly:\s*true/);
assert.match(ios,/case "stop":/);
assert.match(ios,/speech\.stopListening\(\)/);
assert.match(ios,/chunks\.joined\(separator: " "\)/);
assert.match(ios,/"event": "partial"/);
assert.match(ios,/publishPartial\(current\)/);
assert.match(ios,/promotePartial\(current\)/);
assert.match(iosSpeech,/shouldReportPartialResults\s*=\s*true/);
assert.match(iosSpeech,/partialHandler\?\(text\)/);
assert.match(ios,/let frame: WKFrameInfo/,'session must retain the originating frame');
assert.match(ios,/respond\(id: current\.id,[\s\S]*frame: current\.frame\)/,'transcript events must return to originating frame');
assert.match(ios,/private func respond\(id: String, values: \[String: Any\], frame: WKFrameInfo\)/);
assert.match(ios,/guard frame\.isMainFrame, isAllowed\(frame\.securityOrigin\) else \{ return \}/);
assert.match(ios,/guard frame\.isMainFrame, self\.isAllowed\(frame\.securityOrigin\) else \{ return \}/);
assert.match(ios,/evaluateJavaScript\([\s\S]*in: frame,[\s\S]*in: \.page/,'reply must target captured frame and page world');
assert.match(ios,/Deliberately no fallback to the current frame/);

assert.match(host,/request\('recognize',null/,'active recording request must not use the old short timeout');
assert.match(host,/value\.event==='partial'/);
assert.match(host,/entry\.onEvent/);
assert.match(host,/async recognize\(onPartial\)/);
assert.match(host,/async stop\(\)/);
assert.match(host,/request\('stop',10000\)/);
assert.doesNotMatch(host,/webkitSpeechRecognition|SpeechRecognition/);

assert.match(entry,/familypilot-native-speech-web-host-v1\.js/);
assert.match(entry,/familypilot-native-speech-provider-v1\.js/);
assert.match(entry,/familypilot-voice-v1\.js/);
assert.match(entry,/familypilot-voice-v1-form-adapter\.js/);
assert.match(entry,/adapter\.install\(\)/);
assert.doesNotMatch(entry,/SpeechRecognition|webkitSpeechRecognition/);

(async()=>{
  const posted=[];
  const androidBridge={postMessage(message){posted.push(JSON.parse(message))}};
  const context={FamilyPilotNativeSpeechAndroidBridgeV1:androidBridge,setTimeout,clearTimeout,Date,Promise,JSON,Object};
  context.globalThis=context;
  vm.createContext(context);
  vm.runInContext(host,context);
  assert.equal(context.__FP_NATIVE_SPEECH_WEB_HOST_V1_READY__,true);

  const availablePromise=context.FamilyPilotNativeSpeechHostV1.isAvailable();
  const availabilityRequest=posted.at(-1);
  assert.equal(availabilityRequest.action,'isAvailable');
  context.FamilyPilotNativeSpeechAndroidBridgeV1.onmessage({data:JSON.stringify({id:availabilityRequest.id,available:true})});
  assert.equal(await availablePromise,true);

  const partial=[];
  let recognizeResolved=false;
  const recognizePromise=context.FamilyPilotNativeSpeechHostV1.recognize(text=>partial.push(text)).then(v=>{recognizeResolved=true;return v});
  const recognizeRequest=posted.at(-1);
  assert.equal(recognizeRequest.action,'recognize');

  context.FamilyPilotNativeSpeechAndroidBridgeV1.onmessage({data:JSON.stringify({id:recognizeRequest.id,event:'partial',text:'20 Топ'})});
  await Promise.resolve();
  assert.deepStrictEqual(partial,['20 Топ']);
  assert.equal(recognizeResolved,false,'partial transcript must not finalize the recognition promise');

  const stopPromise=context.FamilyPilotNativeSpeechHostV1.stop();
  const stopRequest=posted.at(-1);
  assert.equal(stopRequest.action,'stop');
  assert.notEqual(stopRequest.id,recognizeRequest.id);
  context.FamilyPilotNativeSpeechAndroidBridgeV1.onmessage({data:JSON.stringify({id:stopRequest.id,ok:true,stopping:true})});
  assert.equal(await stopPromise,true);

  context.FamilyPilotNativeSpeechAndroidBridgeV1.onmessage({data:JSON.stringify({id:recognizeRequest.id,ok:true,text:'20 Топливо Shell'})});
  const recognized=await recognizePromise;
  assert.deepStrictEqual(JSON.parse(JSON.stringify(recognized)),{ok:true,text:'20 Топливо Shell'});

  const noNative={setTimeout,clearTimeout,Date,Promise,JSON,Object};
  noNative.globalThis=noNative;
  vm.createContext(noNative);
  vm.runInContext(host,noNative);
  assert.equal(noNative.FamilyPilotNativeSpeechHostV1,undefined,'ordinary browser must not gain a speech host');

  console.log('FP86_NATIVE_BRIDGE_CONTRACT_PASS');
  console.log('FP86_LIVE_PARTIAL_EVENT_PASS');
  console.log('FP86_PARTIAL_DOES_NOT_FINALIZE_PASS');
  console.log('FP86_BUTTON_CONTROLLED_VOICE_SESSION_PASS');
  console.log('FP86_ANDROID_CONTINUOUS_SEGMENT_SESSION_PASS');
  console.log('FP86_IOS_CONTINUOUS_SEGMENT_SESSION_PASS');
  console.log('FP86_ANDROID_ORIGIN_SCOPED_BRIDGE_PASS');
  console.log('FP86_IOS_ASYNC_REPLY_FRAME_PIN_PASS');
  console.log('FP86_NATIVE_ENTRY_NO_BROWSER_FALLBACK_PASS');
})();
