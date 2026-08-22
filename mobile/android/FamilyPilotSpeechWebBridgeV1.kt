package com.familypilot.voice

import android.Manifest
import android.content.pm.PackageManager
import android.os.Handler
import android.os.Looper
import android.webkit.WebView
import androidx.core.content.ContextCompat
import androidx.webkit.JavaScriptReplyProxy
import androidx.webkit.WebMessageCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import org.json.JSONObject

/**
 * Origin-scoped WebView bridge for FamilyPilot Voice v1.
 * Requires a trusted FamilyPilot origin; wildcard origins are rejected.
 * No addJavascriptInterface() and no cloud speech fallback are used.
 */
class FamilyPilotSpeechWebBridgeV1(
    private val webView: WebView,
    private val speech: FamilyPilotOnDeviceSpeechV1,
    private val allowedOriginRules: Set<String>,
    private val requestMicrophonePermission: (((Boolean) -> Unit) -> Unit),
) {
    companion object {
        private const val JS_OBJECT = "FamilyPilotNativeSpeechAndroidBridgeV1"
        private const val ENTRY = "./familypilot-voice-v1-native-entry.js"
        private val ENTRY_BOOTSTRAP = """
            (()=>{
              const load=()=>{
                if(document.querySelector('script[data-fp-voice-native-entry]'))return;
                const s=document.createElement('script');
                s.src='$ENTRY';
                s.dataset.fpVoiceNativeEntry='1';
                document.head.appendChild(s);
              };
              if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
            })();
        """.trimIndent()
    }

    private val mainHandler=Handler(Looper.getMainLooper())
    private var installed=false

    fun install(callback:(Boolean)->Unit){
        mainHandler.post {
            if(installed){callback(true);return@post}
            if(allowedOriginRules.isEmpty()||allowedOriginRules.contains("*")){
                callback(false);return@post
            }
            if(!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)||
                !WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)
            ){
                callback(false);return@post
            }
            WebViewCompat.addWebMessageListener(
                webView,
                JS_OBJECT,
                allowedOriginRules,
                WebViewCompat.WebMessageListener { _,message,_,isMainFrame,replyProxy ->
                    if(!isMainFrame){
                        reply(replyProxy,"",mapOf("ok" to false,"error" to "native_speech_bridge_frame_rejected"))
                        return@WebMessageListener
                    }
                    handle(message,replyProxy)
                }
            )
            WebViewCompat.addDocumentStartJavaScript(webView,ENTRY_BOOTSTRAP,allowedOriginRules)
            installed=true
            callback(true)
        }
    }

    private fun handle(message:WebMessageCompat,replyProxy:JavaScriptReplyProxy){
        val raw=message.data ?: return
        val request=try{JSONObject(raw)}catch(_:Exception){
            reply(replyProxy,"",mapOf("ok" to false,"error" to "native_speech_bridge_invalid_request"));return
        }
        val id=request.optString("id")
        when(request.optString("action")){
            "isAvailable" -> speech.checkAvailability { availability ->
                val available=when(availability){
                    FamilyPilotOnDeviceSpeechV1.Availability.READY,
                    FamilyPilotOnDeviceSpeechV1.Availability.MICROPHONE_PERMISSION_REQUIRED,
                    FamilyPilotOnDeviceSpeechV1.Availability.LANGUAGE_SUPPORT_UNKNOWN -> true
                    else -> false
                }
                reply(replyProxy,id,mapOf("available" to available,"status" to availability.name.lowercase()))
            }
            "recognize" -> recognize(id,replyProxy)
            else -> reply(replyProxy,id,mapOf("ok" to false,"error" to "native_speech_bridge_unknown_action"))
        }
    }

    private fun recognize(id:String,replyProxy:JavaScriptReplyProxy){
        val hasPermission=ContextCompat.checkSelfPermission(webView.context,Manifest.permission.RECORD_AUDIO)==PackageManager.PERMISSION_GRANTED
        if(hasPermission){startRecognition(id,replyProxy);return}
        mainHandler.post {
            requestMicrophonePermission { granted ->
                if(granted)startRecognition(id,replyProxy)
                else reply(replyProxy,id,mapOf("ok" to false,"error" to "microphone_permission_denied"))
            }
        }
    }

    private fun startRecognition(id:String,replyProxy:JavaScriptReplyProxy){
        speech.recognize { result ->
            when(result){
                is FamilyPilotOnDeviceSpeechV1.Result.Success -> reply(replyProxy,id,mapOf("ok" to true,"text" to result.text))
                is FamilyPilotOnDeviceSpeechV1.Result.Failure -> reply(replyProxy,id,mapOf("ok" to false,"error" to result.reason))
            }
        }
    }

    private fun reply(replyProxy:JavaScriptReplyProxy,id:String,values:Map<String,Any>){
        val payload=JSONObject()
        payload.put("id",id)
        values.forEach{(key,value)->payload.put(key,value)}
        mainHandler.post{replyProxy.postMessage(payload.toString())}
    }
}
