import Foundation
import WebKit

/// Main-frame-only bridge from trusted FamilyPilot web content to on-device iOS speech.
final class FamilyPilotSpeechWebBridgeV1: NSObject, WKScriptMessageHandler {
    static let handlerName = "FamilyPilotNativeSpeechIOSBridgeV1"
    private static let entryBootstrap = """
    (()=>{
      const load=()=>{
        if(document.querySelector('script[data-fp-voice-native-entry]'))return;
        const s=document.createElement('script');
        s.src='./familypilot-voice-v1-native-entry.js';
        s.dataset.fpVoiceNativeEntry='1';
        document.head.appendChild(s);
      };
      if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
    })();
    """

    private let speech: FamilyPilotOnDeviceSpeechV1
    private let allowedSchemes: Set<String>
    private let allowedHosts: Set<String>
    private weak var webView: WKWebView?

    init(
        speech: FamilyPilotOnDeviceSpeechV1,
        allowedSchemes: Set<String>,
        allowedHosts: Set<String>
    ) {
        self.speech = speech
        self.allowedSchemes = allowedSchemes
        self.allowedHosts = allowedHosts
    }

    func install(on configuration: WKWebViewConfiguration) -> Bool {
        guard !allowedSchemes.isEmpty else { return false }
        configuration.userContentController.add(self, name: Self.handlerName)
        configuration.userContentController.addUserScript(
            WKUserScript(source: Self.entryBootstrap, injectionTime: .atDocumentStart, forMainFrameOnly: true)
        )
        return true
    }

    func bind(webView: WKWebView) {
        self.webView = webView
    }

    func uninstall(from configuration: WKWebViewConfiguration) {
        configuration.userContentController.removeScriptMessageHandler(forName: Self.handlerName)
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, isAllowed(message.frameInfo.securityOrigin) else {
            respond(id: "", values: ["ok": false, "error": "native_speech_bridge_origin_rejected"])
            return
        }
        guard let body = message.body as? [String: Any],
              let id = body["id"] as? String,
              let action = body["action"] as? String else {
            respond(id: "", values: ["ok": false, "error": "native_speech_bridge_invalid_request"])
            return
        }
        switch action {
        case "isAvailable":
            respond(id: id, values: ["available": speech.isAvailable()])
        case "recognize":
            speech.recognize { [weak self] result in
                switch result {
                case .success(let text):
                    self?.respond(id: id, values: ["ok": true, "text": text])
                case .failure(let error):
                    self?.respond(id: id, values: ["ok": false, "error": Self.errorCode(error)])
                }
            }
        default:
            respond(id: id, values: ["ok": false, "error": "native_speech_bridge_unknown_action"])
        }
    }

    private func isAllowed(_ origin: WKSecurityOrigin) -> Bool {
        guard allowedSchemes.contains(origin.protocol) else { return false }
        if origin.protocol == "file" { return true }
        return allowedHosts.contains(origin.host)
    }

    private func respond(id: String, values: [String: Any]) {
        var payload = values
        payload["id"] = id
        guard JSONSerialization.isValidJSONObject(payload),
              let data = try? JSONSerialization.data(withJSONObject: payload),
              let json = String(data: data, encoding: .utf8) else { return }
        DispatchQueue.main.async { [weak webView] in
            webView?.evaluateJavaScript("globalThis.__FP_NATIVE_SPEECH_BRIDGE_V1_DELIVER__(\(json))")
        }
    }

    private static func errorCode(_ error: FamilyPilotOnDeviceSpeechV1.VoiceError) -> String {
        switch error {
        case .speechPermissionDenied: return "speech_permission_denied"
        case .microphonePermissionDenied: return "microphone_permission_denied"
        case .onDeviceRecognitionUnavailable: return "on_device_speech_unavailable"
        case .recognitionBusy: return "recognition_busy"
        case .recognitionFailed: return "speech_recognition_failed"
        case .recognitionTimedOut: return "recognition_timed_out"
        case .emptyTranscript: return "empty_transcript"
        }
    }
}
