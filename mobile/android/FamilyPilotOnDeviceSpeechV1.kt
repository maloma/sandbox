package com.familypilot.voice

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognitionSupport
import android.speech.RecognitionSupportCallback
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import java.util.Locale

/** FamilyPilot v1 system speech recognizer. On-device only. */
class FamilyPilotOnDeviceSpeechV1(
    private val context: Context,
    private val locale: Locale,
) {
    enum class Availability {
        READY, MICROPHONE_PERMISSION_REQUIRED, UNSUPPORTED_ANDROID_VERSION,
        ON_DEVICE_SERVICE_UNAVAILABLE, LANGUAGE_DOWNLOAD_REQUIRED,
        LANGUAGE_SUPPORT_PENDING, LANGUAGE_SUPPORT_UNKNOWN, LANGUAGE_UNAVAILABLE,
    }

    sealed class Result {
        data class Success(val text: String) : Result()
        data class Failure(val reason: String) : Result()
    }

    private val mainHandler = Handler(Looper.getMainLooper())
    private var recognizer: SpeechRecognizer? = null
    private var callback: ((Result) -> Unit)? = null
    private var partialCallback: ((String) -> Unit)? = null
    private var finished = false

    fun checkAvailability(callback: (Availability) -> Unit) {
        mainHandler.post { checkAvailabilityOnMain(callback) }
    }

    private fun checkAvailabilityOnMain(callback: (Availability) -> Unit) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) { callback(Availability.UNSUPPORTED_ANDROID_VERSION); return }
        if (context.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) { callback(Availability.MICROPHONE_PERMISSION_REQUIRED); return }
        if (!SpeechRecognizer.isOnDeviceRecognitionAvailable(context)) { callback(Availability.ON_DEVICE_SERVICE_UNAVAILABLE); return }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) { callback(Availability.LANGUAGE_SUPPORT_UNKNOWN); return }

        val temporary = SpeechRecognizer.createOnDeviceSpeechRecognizer(context)
        temporary.checkRecognitionSupport(intent(), context.mainExecutor, object : RecognitionSupportCallback {
            override fun onSupportResult(support: RecognitionSupport) {
                val tag = locale.toLanguageTag()
                val installed = support.installedOnDeviceLanguages.any { sameLanguageTag(it, tag) }
                val supported = support.supportedOnDeviceLanguages.any { sameLanguageTag(it, tag) }
                val pending = support.pendingOnDeviceLanguages.any { sameLanguageTag(it, tag) }
                temporary.destroy()
                callback(when { installed -> Availability.READY; pending -> Availability.LANGUAGE_SUPPORT_PENDING; supported -> Availability.LANGUAGE_DOWNLOAD_REQUIRED; else -> Availability.LANGUAGE_UNAVAILABLE })
            }
            override fun onError(error: Int) { temporary.destroy(); callback(Availability.LANGUAGE_UNAVAILABLE) }
        })
    }

    fun requestLanguageModelDownload(callback: (Boolean) -> Unit) {
        mainHandler.post {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || !SpeechRecognizer.isOnDeviceRecognitionAvailable(context)) { callback(false); return@post }
            val temporary = try { SpeechRecognizer.createOnDeviceSpeechRecognizer(context) } catch (_: RuntimeException) { callback(false); return@post }
            val requested = try { temporary.triggerModelDownload(intent()); true } catch (_: RuntimeException) { false } finally { temporary.destroy() }
            callback(requested)
        }
    }

    fun recognize(callback: (Result) -> Unit, onPartial: (String) -> Unit = {}) {
        mainHandler.post {
            if (this.callback != null) { callback(Result.Failure("recognition_busy")); return@post }
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) { callback(Result.Failure("on_device_speech_unavailable")); return@post }
            if (context.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) { callback(Result.Failure("microphone_permission_denied")); return@post }
            if (!SpeechRecognizer.isOnDeviceRecognitionAvailable(context)) { callback(Result.Failure("on_device_speech_unavailable")); return@post }

            this.callback = callback
            this.partialCallback = onPartial
            finished = false
            val speechRecognizer = try { SpeechRecognizer.createOnDeviceSpeechRecognizer(context) } catch (_: RuntimeException) {
                this.callback = null
                this.partialCallback = null
                callback(Result.Failure("on_device_speech_unavailable"))
                return@post
            }
            recognizer = speechRecognizer
            speechRecognizer.setRecognitionListener(listener)
            speechRecognizer.startListening(intent())
        }
    }

    /** Ask the current system segment to finalize. The app-level bridge decides when the whole session ends. */
    fun stopListening() { mainHandler.post { recognizer?.stopListening() } }

    fun cancel() { mainHandler.post { finishOnMain(Result.Failure("recognition_cancelled"), cancel = true) } }

    private fun intent(): Intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
        putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
        putExtra(RecognizerIntent.EXTRA_LANGUAGE, locale.toLanguageTag())
        putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
        putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
    }

    private fun firstTranscript(results: Bundle?): String =
        results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()?.trim().orEmpty()

    private val listener = object : RecognitionListener {
        override fun onResults(results: Bundle?) {
            val text = firstTranscript(results)
            if (text.isEmpty()) finish(Result.Failure("empty_transcript")) else finish(Result.Success(text))
        }
        override fun onError(error: Int) { finish(Result.Failure("speech_recognition_failed:$error")) }
        override fun onReadyForSpeech(params: Bundle?) = Unit
        override fun onBeginningOfSpeech() = Unit
        override fun onRmsChanged(rmsdB: Float) = Unit
        override fun onBufferReceived(buffer: ByteArray?) = Unit
        override fun onEndOfSpeech() = Unit
        override fun onPartialResults(partialResults: Bundle?) {
            val text = firstTranscript(partialResults)
            if (text.isNotEmpty()) partialCallback?.invoke(text)
        }
        override fun onEvent(eventType: Int, params: Bundle?) = Unit
    }

    private fun finish(result: Result, cancel: Boolean = false) {
        if (Looper.myLooper() == Looper.getMainLooper()) finishOnMain(result, cancel) else mainHandler.post { finishOnMain(result, cancel) }
    }

    private fun finishOnMain(result: Result, cancel: Boolean = false) {
        if (finished || callback == null) return
        finished = true
        val current = recognizer
        recognizer = null
        if (cancel) current?.cancel()
        current?.destroy()
        val done = callback
        callback = null
        partialCallback = null
        done?.invoke(result)
    }

    private fun sameLanguageTag(candidate: String, expected: String): Boolean =
        Locale.forLanguageTag(candidate).toLanguageTag().equals(Locale.forLanguageTag(expected).toLanguageTag(), ignoreCase = true)
}
