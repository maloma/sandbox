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

/** Origin-scoped WebView bridge for a button-controlled on-device speech session. */
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
            (()=>{const load=()=>{if(document.querySelector('script[data-fp-voice-native-entry]'))return;const s=document.createElement('script');s.src='$ENTRY';s.dataset.fpVoiceNativeEntry='1';document.head.appendChild(s);};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();})();
        """.trimIndent()
    }

    private data class Session(
        val id: String,
        val replyProxy: JavaScriptReplyProxy,
        val chunks: MutableList<String> = mutableListOf(),
        var partial: String = "",
        var stopping: Boolean = false,
    )

    private val mainHandler = Handler(Looper.getMainLooper())
    private var installed = false
    private var session: Session? = null

    fun install(callback: (Boolean) -> Unit) {
        mainHandler.post {
            if (installed) { callback(true); return@post }
            if (allowedOriginRules.isEmpty() || allowedOriginRules.contains("*")) { callback(false); return@post }
            if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER) || !WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) { callback(false); return@post }
            WebViewCompat.addWebMessageListener(webView, JS_OBJECT, allowedOriginRules, WebViewCompat.WebMessageListener { _, message, _, isMainFrame, replyProxy ->
                if (!isMainFrame) { reply(replyProxy, "", mapOf("ok" to false, "error" to "native_speech_bridge_frame_rejected")); return@WebMessageListener }
                handle(message, replyProxy)
            })
            WebViewCompat.addDocumentStartJavaScript(webView, ENTRY_BOOTSTRAP, allowedOriginRules)
            installed = true
            callback(true)
        }
    }

    private fun handle(message: WebMessageCompat, replyProxy: JavaScriptReplyProxy) {
        val raw = message.data ?: return
        val request = try { JSONObject(raw) } catch (_: Exception) { reply(replyProxy, "", mapOf("ok" to false, "error" to "native_speech_bridge_invalid_request")); return }
        val id = request.optString("id")
        when (request.optString("action")) {
            "isAvailable" -> speech.checkAvailability { availability ->
                val available = when (availability) {
                    FamilyPilotOnDeviceSpeechV1.Availability.READY,
                    FamilyPilotOnDeviceSpeechV1.Availability.MICROPHONE_PERMISSION_REQUIRED,
                    FamilyPilotOnDeviceSpeechV1.Availability.LANGUAGE_SUPPORT_UNKNOWN -> true
                    else -> false
                }
                reply(replyProxy, id, mapOf("available" to available, "status" to availability.name.lowercase()))
            }
            "recognize" -> beginSession(id, replyProxy)
            "stop" -> stopSession(id, replyProxy)
            else -> reply(replyProxy, id, mapOf("ok" to false, "error" to "native_speech_bridge_unknown_action"))
        }
    }

    private fun beginSession(id: String, replyProxy: JavaScriptReplyProxy) {
        if (session != null) { reply(replyProxy, id, mapOf("ok" to false, "error" to "recognition_busy")); return }
        val hasPermission = ContextCompat.checkSelfPermission(webView.context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
        if (hasPermission) { startSession(id, replyProxy); return }
        mainHandler.post { requestMicrophonePermission { granted -> if (granted) startSession(id, replyProxy) else reply(replyProxy, id, mapOf("ok" to false, "error" to "microphone_permission_denied")) } }
    }

    private fun startSession(id: String, replyProxy: JavaScriptReplyProxy) {
        if (session != null) { reply(replyProxy, id, mapOf("ok" to false, "error" to "recognition_busy")); return }
        val current = Session(id, replyProxy)
        session = current
        startSegment(current)
    }

    private fun startSegment(current: Session) {
        if (session !== current || current.stopping) return
        current.partial = ""
        speech.recognize(
            callback = { result ->
                mainHandler.post {
                    if (session !== current) return@post
                    when (result) {
                        is FamilyPilotOnDeviceSpeechV1.Result.Success -> {
                            if (result.text.isNotBlank()) current.chunks.add(result.text.trim())
                            current.partial = ""
                            if (current.stopping) complete(current) else startSegment(current)
                        }
                        is FamilyPilotOnDeviceSpeechV1.Result.Failure -> {
                            if (current.stopping) {
                                promotePartial(current)
                                complete(current)
                            } else if (isTransient(result.reason)) {
                                promotePartial(current)
                                mainHandler.postDelayed({ startSegment(current) }, 120)
                            } else fail(current, result.reason)
                        }
                    }
                }
            },
            onPartial = { text ->
                mainHandler.post {
                    if (session !== current || current.stopping) return@post
                    val trimmed = text.trim()
                    if (trimmed.isNotEmpty()) {
                        current.partial = trimmed
                        publishPartial(current)
                    }
                }
            },
        )
    }

    private fun publishPartial(current: Session) {
        if (session !== current || current.stopping) return
        val text = (current.chunks + listOf(current.partial)).filter { it.isNotBlank() }.joinToString(" ").trim()
        if (text.isNotEmpty()) reply(current.replyProxy, current.id, mapOf("event" to "partial", "text" to text))
    }

    private fun promotePartial(current: Session) {
        val text = current.partial.trim()
        if (text.isNotEmpty()) current.chunks.add(text)
        current.partial = ""
    }

    private fun stopSession(id: String, replyProxy: JavaScriptReplyProxy) {
        val current = session
        if (current == null) { reply(replyProxy, id, mapOf("ok" to false, "error" to "recognition_not_active")); return }
        current.stopping = true
        speech.stopListening()
        reply(replyProxy, id, mapOf("ok" to true, "stopping" to true))
        mainHandler.postDelayed({
            if (session === current) {
                speech.cancel()
                promotePartial(current)
                if (current.chunks.isNotEmpty()) complete(current) else fail(current, "empty_transcript")
            }
        }, 5000)
    }

    private fun complete(current: Session) {
        if (session !== current) return
        session = null
        val text = current.chunks.joinToString(" ").trim()
        if (text.isEmpty()) reply(current.replyProxy, current.id, mapOf("ok" to false, "error" to "empty_transcript"))
        else reply(current.replyProxy, current.id, mapOf("ok" to true, "text" to text))
    }

    private fun fail(current: Session, reason: String) {
        if (session !== current) return
        session = null
        speech.cancel()
        reply(current.replyProxy, current.id, mapOf("ok" to false, "error" to reason))
    }

    private fun isTransient(reason: String): Boolean =
        reason == "empty_transcript" || reason == "speech_recognition_failed:6" || reason == "speech_recognition_failed:7"

    private fun reply(replyProxy: JavaScriptReplyProxy, id: String, values: Map<String, Any>) {
        val payload = JSONObject(); payload.put("id", id); values.forEach { (key, value) -> payload.put(key, value) }
        mainHandler.post { replyProxy.postMessage(payload.toString()) }
    }
}
