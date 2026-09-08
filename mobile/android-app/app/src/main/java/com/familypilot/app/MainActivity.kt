package com.familypilot.app

import android.content.ActivityNotFoundException
import android.content.ClipData
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.provider.MediaStore
import android.util.Base64
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

class MainActivity : ComponentActivity() {
    companion object {
        private const val APP_ORIGIN = "https://appassets.androidplatform.net"
        private const val APP_URL = "$APP_ORIGIN/assets/index.html"
        private const val MAX_RECEIPT_BYTES = 750_000
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
        setContentView(webView)
        onBackPressedDispatcher.addCallback(this, webBackCallback)

        webView.loadUrl(APP_URL)
    }

    private fun createReceiptCaptureFile(): File {
        val directory = File(cacheDir, "receipt-captures").apply { mkdirs() }
        return File.createTempFile("receipt-", ".jpg", directory)
    }

    private fun cleanupStaleReceiptFiles() {
        for (directoryName in arrayOf("receipt-captures", "receipt-previews")) {
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
            val mime = mimeType?.takeIf { it == "application/pdf" } ?: return false
            val prefix = "data:$mime;base64,"
            if (dataUrl == null || !dataUrl.startsWith(prefix)) return false
            val bytes = try {
                Base64.decode(dataUrl.substring(prefix.length), Base64.DEFAULT)
            } catch (_: IllegalArgumentException) {
                return false
            }
            if (bytes.size < 5 || bytes.size > MAX_RECEIPT_BYTES) return false
            if (bytes[0] != 0x25.toByte() || bytes[1] != 0x50.toByte() ||
                bytes[2] != 0x44.toByte() || bytes[3] != 0x46.toByte() || bytes[4] != 0x2D.toByte()
            ) return false
            val directory = File(cacheDir, "receipt-previews").apply { mkdirs() }
            val file = File.createTempFile("receipt-preview-", ".pdf", directory).apply { writeBytes(bytes) }
            val uri = FileProvider.getUriForFile(this@MainActivity, "$packageName.fileprovider", file)
            val viewIntent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, mime)
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
        webView.post {
            webView.requestLayout()
            webView.invalidate()
            webView.postVisualStateCallback(System.nanoTime()) {
                webView.post {
                    webView.requestLayout()
                    webView.invalidate()
                    webView.evaluateJavascript(eventScript, null)
                }
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
