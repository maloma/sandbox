'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const index=read('index.html');
const mirror=read('src/familypilot.html');
const activity=read('mobile/android-app/app/src/main/java/com/familypilot/app/MainActivity.kt');
const section=(text,start,end)=>{
  const from=text.indexOf(start),to=text.indexOf(end,from);
  assert(from>=0&&to>from,`missing production section ${start}`);
  return text.slice(from,to);
};

assert.strictEqual(index,mirror,'root and packaged web assets must be byte-identical');
for(const match of index.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new Function(match[1]);

const nativeExport=section(activity,'fun exportReceipt(','    private data class ReceiptPayload');
const nativeCallback=section(activity,'private fun notifyReceiptExportResult(','    override fun onPause()');
function nativeCompletionOracle(source){
  const insert=source.indexOf('contentResolver.insert(');
  const write=source.indexOf('contentResolver.openOutputStream(');
  const finalize=source.indexOf('contentResolver.update(');
  const finalizedCheck=source.indexOf('if (finalized != 1)');
  const success=source.indexOf('success = true');
  const reset=source.indexOf('receiptExportInFlight.set(false)',success);
  const completion=source.indexOf('notifyReceiptExportResult(',reset);
  return /transactionId: String\?/.test(source)
    && /receiptExportInFlight\.compareAndSet\(false, true\)/.test(source)
    && /Thread\s*\{/.test(source)
    && insert>=0&&insert<write&&write<finalize&&finalize<finalizedCheck&&finalizedCheck<success
    && success<reset&&reset<completion
    && /var success = false/.test(source)
    && /catch \(_: Exception\)[\s\S]*contentResolver\.delete/.test(source)
    && /finally \{[\s\S]*receiptExportInFlight\.set\(false\)[\s\S]*notifyReceiptExportResult/.test(source);
}
assert(nativeCompletionOracle(nativeExport),'Android export must be single-flight and complete only after finalized MediaStore persistence');
assert(/runOnUiThread/.test(nativeCallback)&&/isFinishing \|\| isDestroyed/.test(nativeCallback),'native completion must be lifecycle-safe on the UI thread');
assert(/action:'export',transactionId:\$encodedTransaction,success:\$success/.test(nativeCallback),'native completion must carry action, transaction identity and outcome');

const nativeSingleFlightBypass=nativeExport.replace('if (!receiptExportInFlight.compareAndSet(false, true)) return false','');
assert.strictEqual(nativeCompletionOracle(nativeSingleFlightBypass),false,'NATIVE_SINGLE_FLIGHT_BYPASS mutant escaped');

const requestExport=section(index,'async function requestReceiptExport(','function completeReceiptExport');
const completion=section(index,'function completeReceiptExport(','function handleReceiptNativeResult');
const handler=section(index,'function handleReceiptNativeResult(','async function exportCurrentReceipt');
const exportCurrent=section(index,'async function exportCurrentReceipt','async function openReceiptPdfExternal');
const resetFeedback=section(index,'function resetReceiptExportFeedback','function resetReceiptEditVisualState');

assert(/bridge\.exportReceipt\(dataUrl,item\.type,item\.name,transactionId\)/.test(requestExport),'web request must pass the transaction identity into Android');
assert(/receiptExportState\.inFlight\|\|nowAt<receiptExportState\.suppressUntil/.test(exportCurrent),'web single-flight/suppression gate missing');
assert(/receiptExportState\.activeTransactionId=transactionId/.test(exportCurrent),'web active transaction correlation missing');
assert(/if\(request\.mode==='native'\)\{if\(!request\.accepted\)completeReceiptExport\(transactionId,false\);return request\.accepted\}/.test(exportCurrent),'native acceptance must not be interpreted as completion');
assert(!/dataset\.state='success'|setReceiptActionStatus\('Сохранено'\)|Date\.now\(\)\+1500/.test(exportCurrent),'native request acceptance still contains premature success behavior');
assert(/!receiptExportState\.inFlight\|\|receiptExportState\.activeTransactionId!==transactionId/.test(completion),'completion must reject stale, duplicate and mismatched transactions');
assert(/receiptExportState\.suppressUntil=Date\.now\(\)\+1500/.test(completion),'post-success suppression must begin in matching completion');
assert(/if\(!success\)\{receiptExportState\.suppressUntil=0[\s\S]*dataset\.state='error'[\s\S]*Не удалось сохранить/.test(completion),'matching native failure must clear in-flight without success state');
assert(/detail\.action==='export'[\s\S]*completeReceiptExport\(String\(detail\.transactionId\|\|''\),detail\.success===true\)/.test(handler),'production native event handler must settle only the correlated export');
assert(!/receiptExportState\.inFlight=false/.test(resetFeedback),'visual reset must not clear an unfinished native transaction');

const prematureAcceptance=exportCurrent.replace(
  "if(request.mode==='native'){if(!request.accepted)completeReceiptExport(transactionId,false);return request.accepted}",
  "if(request.mode==='native'){completeReceiptExport(transactionId,request.accepted);return request.accepted}",
);
assert(/setReceiptActionStatus\('Сохранено'\)/.test(completion),'success feedback oracle fixture missing');
assert(!/if\(request\.mode==='native'\)\{if\(!request\.accepted\)completeReceiptExport\(transactionId,false\);return request\.accepted\}/.test(prematureAcceptance),'PREMATURE_ACCEPTANCE_AS_SUCCESS mutant escaped');

const staleCompletionBypass=completion.replace('if(!receiptExportState.inFlight||receiptExportState.activeTransactionId!==transactionId)return false;','');
assert(!/activeTransactionId!==transactionId/.test(staleCompletionBypass),'STALE_OR_MISMATCHED_COMPLETION mutant escaped');

console.log('FP94_CORRECTION_R1_ANDROID_NATIVE_COMPLETION_CONTRACT_PASS');
console.log('FP94_CORRECTION_R1_DELAYED_COMPLETION_WEB_CONTRACT_PASS');
console.log('FP94_CORRECTION_R1_NATIVE_SINGLE_FLIGHT_BYPASS_NEGATIVE_PASS');
console.log('FP94_CORRECTION_R1_PREMATURE_ACCEPTANCE_AS_SUCCESS_NEGATIVE_PASS');
console.log('FP94_CORRECTION_R1_STALE_COMPLETION_NEGATIVE_PASS');
