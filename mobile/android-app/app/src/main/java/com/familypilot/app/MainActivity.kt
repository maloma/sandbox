package com.familypilot.app

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.os.Bundle
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader
import com.familypilot.voice.FamilyPilotOnDeviceSpeechV1
import com.familypilot.voice.FamilyPilotSpeechWebBridgeV1
import java.util.Locale

class MainActivity : Activity() {
    companion object {
        private const val MIC_PERMISSION_REQUEST = 8601
        private const val APP_ORIGIN = "https://appassets.androidplatform.net"
        private const val APP_URL = "$APP_ORIGIN/assets/index.html"
    }

    private var pendingMicPermission: ((Boolean) -> Unit)? = null
    private lateinit var webView: WebView

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

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != MIC_PERMISSION_REQUEST) return
        val callback = pendingMicPermission
        pendingMicPermission = null
        callback?.invoke(grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED)
    }

    override fun onDestroy() {
        pendingMicPermission = null
        webView.destroy()
        super.onDestroy()
    }
}
