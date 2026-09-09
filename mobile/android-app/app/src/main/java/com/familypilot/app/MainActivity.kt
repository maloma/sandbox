package com.familypilot.app

import android.content.ActivityNotFoundException
import android.content.ClipData
import android.content.ContentValues
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import android.view.View
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.FileProvider
import androidx.webkit.WebViewAssetLoader
import java.io.File
import org.json.JSONObject
import android.widget.FrameLayout

class MainActivity : ComponentActivity() {
    companion object {
        private const val APP_ORIGIN = "https://appassets.androidplatform.net"
        private const val APP_URL = "$APP_ORIGIN/assets/index.html"
        private const val MAX_RECEIPT_BYTES = 750_000
        private const val MAX_IMAGE_RECEIPT_BYTES = 3_500_000
        private const val CAPTURE_CLEANUP_DELAY_MS = 5 * 60 * 1000L
        private const val WEB_BACK_SCRIPT =
            "(function(){try{var c=window.FamilyPilotNativeContract;return !!(c&&c.handleBack&&c.handleBack());}catch(e){return false;}})()"
        private const val WEB_RESUME_SCRIPT =
            "window.dispatchEvent(new Event('familypilot:native-resume'));"
        private const val WEB_VISUAL_REFRESH_SCRIPT =
            "window.dispatchEvent(new Event('familypilot:native-visual-refresh'));"
        private const val WEB_RECEIPT_FALLBACK_SCRIPT =
            "window.FamilyPilotAndroid=undefined;window.openReceiptPreview?.();"
        private val FILE_MIME_TYPES = arrayOf("image/jpeg", "image/png", "image/webp", "application/pdf")
    }

    private var pendingFileChooser: ValueCallback<Array<Uri>>? = null
    private var pendingCameraUri: Uri? = null
    private var pendingCameraFile: File? = null
    private var backDispatchPending = false
    private var surfaceRecoveryScheduled = false
    private val pendingVisualEventScripts = linkedSetOf<String>()
    private lateinit var webViewContainer: FrameLayout
    private lateinit var webView: WebView
    private val fileChooserLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        val callback = pendingFileChooser
        val cameraUri = pendingCameraUri
        val cameraFile = pendingCameraFile
        pendingFileChooser = null
        pendingCameraUri = null
        pendingCameraFile = null
        if (result.resultCode != RESULT_OK) {
            cameraFile?.delete()
            callback?.onReceiveValue(null)
            return@registerForActivityResult
        }
        val selected = mutableListOf<Uri>()
        result.data?.clipData?.let { clip ->
            for (index in 0 until clip.itemCount) selected.add(clip.getItemAt(index).uri)
        }
        result.data?.data?.let(selected::add)
        val captured = cameraUri != null && cameraFile?.length()?.let { it > 0L } == true
        if (captured) {
            // EXTRA_OUTPUT is app-owned and authoritative. Some camera apps also return a
            // thumbnail/data Uri; accepting that instead used to discard the real capture.
            selected.clear()
            selected.add(cameraUri)
        }
        else cameraFile?.delete()
        val accepted = selected.distinct().filter(::isAcceptedReceiptUri)
        callback?.onReceiveValue(accepted.takeIf { it.isNotEmpty() }?.toTypedArray())
        if (captured) {
            val capturedFile = requireNotNull(cameraFile)
            webView.postDelayed({ capturedFile.delete() }, CAPTURE_CLEANUP_DELAY_MS)
        }
    }

    private val webBackCallback = object : OnBackPressedCallback(true) {
        override fun handleOnBackPressed() {
            if (!::webView.isInitialized || backDispatchPending) return
            backDispatchPending = true
            webView.evaluateJavascript(WEB_BACK_SCRIPT) { handled ->
                backDispatchPending = false
                if (handled == "true") return@evaluateJavascript
                isEnabled = false
                onBackPressedDispatcher.onBackPressed()
                isEnabled = true
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        cleanupStaleReceiptFiles()

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webViewContainer = FrameLayout(this).apply {
            setBackgroundColor(Color.rgb(7, 24, 36))
        }
        webView = WebView(this).apply {
            setBackgroundColor(Color.rgb(7, 24, 36))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            addJavascriptInterface(ReceiptOpenBridge(), "FamilyPilotAndroid")
            webChromeClient = object : WebChromeClient() {
                override fun onShowFileChooser(
                    webView: WebView,
                    filePathCallback: ValueCallback<Array<Uri>>,
                    fileChooserParams: FileChooserParams,
                ): Boolean {
                    pendingFileChooser?.onReceiveValue(null)
                    pendingCameraFile?.delete()
                    pendingFileChooser = filePathCallback
                    val documentIntent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                        addCategory(Intent.CATEGORY_OPENABLE)
                        type = "*/*"
                        putExtra(Intent.EXTRA_MIME_TYPES, FILE_MIME_TYPES)
                        putExtra(Intent.EXTRA_ALLOW_MULTIPLE, fileChooserParams.mode == FileChooserParams.MODE_OPEN_MULTIPLE)
                    }
                    val cameraFile = createReceiptCaptureFile()
                    val cameraUri = FileProvider.getUriForFile(
                        this@MainActivity,
                        "$packageName.fileprovider",
                        cameraFile,
                    )
                    pendingCameraFile = cameraFile
                    pendingCameraUri = cameraUri
                    val cameraIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
                        putExtra(MediaStore.EXTRA_OUTPUT, cameraUri)
                        clipData = ClipData.newRawUri("receipt", cameraUri)
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
                    }
                    val chooser = Intent.createChooser(documentIntent, "Выберите чек").apply {
                        putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf(cameraIntent))
                    }
                    return try {
                        fileChooserLauncher.launch(chooser)
                        true
                    } catch (_: ActivityNotFoundException) {
                        pendingFileChooser = null
                        pendingCameraUri = null
                        pendingCameraFile = null
                        cameraFile.delete()
                        filePathCallback.onReceiveValue(null)
                        false
                    }
                }
            }
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                    assetLoader.shouldInterceptRequest(request.url)

                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean =
                    request.url.scheme != "https" || request.url.host != "appassets.androidplatform.net"
            }
        }
        webViewContainer.addView(
            webView,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            ),
        )
        setContentView(webViewContainer)
        onBackPressedDispatcher.addCallback(this, webBackCallback)

        webView.loadUrl(APP_URL)
    }

    private fun createReceiptCaptureFile(): File {
        val directory = File(cacheDir, "receipt-captures").apply { mkdirs() }
        return File.createTempFile("receipt-", ".jpg", directory)
    }

    private fun cleanupStaleReceiptFiles() {
        for (directoryName in arrayOf("receipt-captures", "receipt-previews", "receipt-exports")) {
            File(cacheDir, directoryName).listFiles()?.forEach(File::delete)
        }
    }

    private fun isAcceptedReceiptUri(uri: Uri): Boolean {
        if (uri.scheme != "content") return false
        val mime = contentResolver.getType(uri)
        return mime != null && FILE_MIME_TYPES.contains(mime)
    }

    private inner class ReceiptOpenBridge {
        @JavascriptInterface
        fun openReceipt(dataUrl: String?, mimeType: String?): Boolean {
            val payload = decodeReceiptPayload(dataUrl, mimeType)?.takeIf { it.mimeType == "application/pdf" }
                ?: return false
            val directory = File(cacheDir, "receipt-previews").apply { mkdirs() }
            val file = File.createTempFile("receipt-preview-", ".pdf", directory).apply { writeBytes(payload.bytes) }
            val uri = FileProvider.getUriForFile(this@MainActivity, "$packageName.fileprovider", file)
            val viewIntent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, payload.mimeType)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            runOnUiThread {
                try {
                    startActivity(Intent.createChooser(viewIntent, "Открыть чек"))
                    webView.postDelayed({ file.delete() }, CAPTURE_CLEANUP_DELAY_MS)
                } catch (_: ActivityNotFoundException) {
                    file.delete()
                    webView.evaluateJavascript(WEB_RECEIPT_FALLBACK_SCRIPT, null)
                }
            }
            return true
        }

        @JavascriptInterface
        fun shareReceipt(dataUrl: String?, mimeType: String?, displayName: String?): Boolean {
            val payload = decodeReceiptPayload(dataUrl, mimeType) ?: return false
            val directory = File(cacheDir, "receipt-exports").apply { mkdirs() }
            val file = File.createTempFile("receipt-share-", ".${payload.extension}", directory).apply {
                writeBytes(payload.bytes)
            }
            val uri = FileProvider.getUriForFile(this@MainActivity, "$packageName.fileprovider", file)
            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = payload.mimeType
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_TITLE, safeReceiptLabel(displayName))
                clipData = ClipData.newRawUri("receipt", uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            runOnUiThread {
                try {
                    startActivity(Intent.createChooser(shareIntent, "Поделиться чеком"))
                    webView.postDelayed({ file.delete() }, CAPTURE_CLEANUP_DELAY_MS)
                } catch (_: ActivityNotFoundException) {
                    file.delete()
                    notifyReceiptResult("Не удалось открыть системное меню отправки.")
                }
            }
            return true
        }

        @JavascriptInterface
        fun exportReceipt(dataUrl: String?, mimeType: String?, displayName: String?): Boolean {
            val payload = decodeReceiptPayload(dataUrl, mimeType) ?: return false
            Thread {
                val isPdf = payload.mimeType == "application/pdf"
                val collection = if (isPdf) MediaStore.Downloads.EXTERNAL_CONTENT_URI
                    else MediaStore.Images.Media.EXTERNAL_CONTENT_URI
                val relativePath = if (isPdf) "${Environment.DIRECTORY_DOWNLOADS}/FamilyPilot"
                    else "${Environment.DIRECTORY_PICTURES}/FamilyPilot"
                val values = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, "FamilyPilot-${System.currentTimeMillis()}.${payload.extension}")
                    put(MediaStore.MediaColumns.MIME_TYPE, payload.mimeType)
                    put(MediaStore.MediaColumns.RELATIVE_PATH, relativePath)
                    put(MediaStore.MediaColumns.IS_PENDING, 1)
                }
                var uri: Uri? = null
                try {
                    uri = contentResolver.insert(collection, values) ?: throw IllegalStateException("media_insert_failed")
                    contentResolver.openOutputStream(uri, "w")?.use { it.write(payload.bytes) }
                        ?: throw IllegalStateException("media_write_failed")
                    contentResolver.update(uri, ContentValues().apply {
                        put(MediaStore.MediaColumns.IS_PENDING, 0)
                    }, null, null)
                    notifyReceiptResult(if (isPdf) "Копия PDF сохранена в загрузки." else "Копия фото сохранена в галерею.")
                } catch (_: Exception) {
                    uri?.let { contentResolver.delete(it, null, null) }
                    notifyReceiptResult("Не удалось сохранить копию чека.")
                }
            }.start()
            return true
        }
    }

    private data class ReceiptPayload(val bytes: ByteArray, val mimeType: String, val extension: String)

    private fun decodeReceiptPayload(dataUrl: String?, mimeType: String?): ReceiptPayload? {
        val mime = mimeType?.takeIf(FILE_MIME_TYPES::contains) ?: return null
        val prefix = "data:$mime;base64,"
        if (dataUrl == null || !dataUrl.startsWith(prefix)) return null
        val bytes = try {
            Base64.decode(dataUrl.substring(prefix.length), Base64.DEFAULT)
        } catch (_: IllegalArgumentException) {
            return null
        }
        val maxBytes = if (mime == "application/pdf") MAX_RECEIPT_BYTES else MAX_IMAGE_RECEIPT_BYTES
        if (bytes.isEmpty() || bytes.size > maxBytes || !hasReceiptSignature(bytes, mime)) return null
        val extension = when (mime) {
            "image/jpeg" -> "jpg"
            "image/png" -> "png"
            "image/webp" -> "webp"
            else -> "pdf"
        }
        return ReceiptPayload(bytes, mime, extension)
    }

    private fun hasReceiptSignature(bytes: ByteArray, mimeType: String): Boolean = when (mimeType) {
        "image/jpeg" -> bytes.size >= 3 && bytes[0] == 0xFF.toByte() && bytes[1] == 0xD8.toByte() && bytes[2] == 0xFF.toByte()
        "image/png" -> bytes.size >= 8 && bytes.sliceArray(0..7).contentEquals(byteArrayOf(0x89.toByte(), 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A))
        "image/webp" -> bytes.size >= 12 && String(bytes, 0, 4, Charsets.US_ASCII) == "RIFF" && String(bytes, 8, 4, Charsets.US_ASCII) == "WEBP"
        "application/pdf" -> bytes.size >= 5 && String(bytes, 0, 5, Charsets.US_ASCII) == "%PDF-"
        else -> false
    }

    private fun safeReceiptLabel(value: String?): String = value.orEmpty()
        .replace(Regex("[\\u0000-\\u001F\\u007F/\\\\]"), "_")
        .take(120)
        .ifBlank { "Чек FamilyPilot" }

    private fun notifyReceiptResult(message: String) {
        runOnUiThread {
            val encoded = JSONObject.quote(message)
            webView.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('familypilot:receipt-native-result',{detail:{message:$encoded}}));",
                null,
            )
        }
    }

    override fun onPause() {
        if (::webView.isInitialized) {
            webView.onPause()
            webView.pauseTimers()
        }
        super.onPause()
    }

    override fun onResume() {
        super.onResume()
        if (!::webView.isInitialized) return
        webView.onResume()
        webView.resumeTimers()
        requestVisualRefresh(WEB_RESUME_SCRIPT)
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus && ::webView.isInitialized) requestVisualRefresh(WEB_VISUAL_REFRESH_SCRIPT)
    }

    private fun requestVisualRefresh(eventScript: String) {
        pendingVisualEventScripts.add(eventScript)
        if (surfaceRecoveryScheduled) return
        surfaceRecoveryScheduled = true
        webView.post {
            // Screen-off can leave the Chromium compositor surface attached but not presented.
            // Reattaching this exact WebView rebuilds the Android surface without reloading or
            // replacing the live DOM, modal stack, or unsaved entry state.
            if (webView.parent === webViewContainer) {
                val layoutParams = webView.layoutParams
                webViewContainer.removeView(webView)
                webViewContainer.addView(webView, layoutParams)
            }
            webView.setLayerType(View.LAYER_TYPE_SOFTWARE, null)
            webView.requestLayout()
            webView.invalidate()
            webView.postOnAnimation {
                webView.setLayerType(View.LAYER_TYPE_NONE, null)
                webView.requestLayout()
                webView.invalidate()
                webView.postVisualStateCallback(System.nanoTime(), object : WebView.VisualStateCallback() {
                    override fun onComplete(requestId: Long) {
                        webView.postOnAnimation {
                            val scripts = pendingVisualEventScripts.joinToString(separator = "")
                            pendingVisualEventScripts.clear()
                            surfaceRecoveryScheduled = false
                            webView.requestLayout()
                            webView.invalidate()
                            webView.evaluateJavascript(scripts, null)
                        }
                    }
                })
            }
        }
    }

    override fun onDestroy() {
        pendingFileChooser?.onReceiveValue(null)
        pendingFileChooser = null
        pendingCameraUri = null
        pendingCameraFile?.delete()
        pendingCameraFile = null
        if (::webView.isInitialized) webView.destroy()
        super.onDestroy()
    }
}
