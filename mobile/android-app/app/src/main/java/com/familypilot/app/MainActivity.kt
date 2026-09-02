package com.familypilot.app

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.webkit.WebViewAssetLoader
import com.familypilot.voice.FamilyPilotOnDeviceSpeechV1
import com.familypilot.voice.FamilyPilotSpeechWebBridgeV1
import java.util.Locale

class MainActivity : ComponentActivity() {
    companion object {
        private const val MIC_PERMISSION_REQUEST = 8601
        private const val APP_ORIGIN = "https://appassets.androidplatform.net"
        private const val APP_URL = "$APP_ORIGIN/assets/index.html"
        private val FILE_MIME_TYPES = arrayOf("image/*", "application/pdf")
    }

    private var pendingMicPermission: ((Boolean) -> Unit)? = null
    private var pendingFileChooser: ValueCallback<Array<Uri>>? = null
    private lateinit var webView: WebView
    private val fileChooserLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        val callback = pendingFileChooser
        pendingFileChooser = null
        if (result.resultCode != RESULT_OK) {
            callback?.onReceiveValue(null)
            return@registerForActivityResult
        }
        val selected = mutableListOf<Uri>()
        result.data?.clipData?.let { clip ->
            for (index in 0 until clip.itemCount) selected.add(clip.getItemAt(index).uri)
        }
        result.data?.data?.let(selected::add)
        val accepted = selected.distinct().filter(::isAcceptedReceiptUri)
        callback?.onReceiveValue(accepted.takeIf { it.isNotEmpty() }?.toTypedArray())
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            webChromeClient = object : WebChromeClient() {
                override fun onShowFileChooser(
                    webView: WebView,
                    filePathCallback: ValueCallback<Array<Uri>>,
                    fileChooserParams: FileChooserParams,
                ): Boolean {
                    pendingFileChooser?.onReceiveValue(null)
                    pendingFileChooser = filePathCallback
                    val chooser = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                        addCategory(Intent.CATEGORY_OPENABLE)
                        type = "*/*"
                        putExtra(Intent.EXTRA_MIME_TYPES, FILE_MIME_TYPES)
                        putExtra(Intent.EXTRA_ALLOW_MULTIPLE, fileChooserParams.mode == FileChooserParams.MODE_OPEN_MULTIPLE)
                    }
                    return try {
                        fileChooserLauncher.launch(chooser)
                        true
                    } catch (_: ActivityNotFoundException) {
                        pendingFileChooser = null
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

        val localeTag = BuildConfig.FAMILY_PILOT_VOICE_LOCALE.trim()
        if (localeTag.isNotEmpty()) {
            val speech = FamilyPilotOnDeviceSpeechV1(this, Locale.forLanguageTag(localeTag))
            val bridge = FamilyPilotSpeechWebBridgeV1(
                webView = webView,
                speech = speech,
                allowedOriginRules = setOf(APP_ORIGIN),
                requestMicrophonePermission = { callback -> requestMicrophone(callback) },
            )
            bridge.install { webView.loadUrl(APP_URL) }
        } else {
            webView.loadUrl(APP_URL)
        }
    }

    private fun requestMicrophone(callback: (Boolean) -> Unit) {
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            callback(true)
            return
        }
        pendingMicPermission = callback
        requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), MIC_PERMISSION_REQUEST)
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != MIC_PERMISSION_REQUEST) return
        val callback = pendingMicPermission
        pendingMicPermission = null
        callback?.invoke(grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED)
    }

    private fun isAcceptedReceiptUri(uri: Uri): Boolean {
        if (uri.scheme != "content") return false
        val mime = contentResolver.getType(uri)
        return mime?.startsWith("image/") == true || mime == "application/pdf"
    }

    override fun onDestroy() {
        pendingMicPermission = null
        pendingFileChooser?.onReceiveValue(null)
        pendingFileChooser = null
        webView.destroy()
        super.onDestroy()
    }
}
