import Foundation
import WebKit

/// Main-frame-only bridge from trusted FamilyPilot web content to a button-controlled on-device speech session.
/// Async transcript replies remain pinned to the frame/security origin that started the session.
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

    private final class Session {
        let id: String
        let frame: WKFrameInfo
        var chunks: [String] = []
        var stopping = false

        init(id: String, frame: WKFrameInfo) {
            self.id = id
            self.frame = frame
        }
    }

    private let speech: FamilyPilotOnDeviceSpeechV1
    private let allowedSchemes: Set<String>
    private let allowedHosts: Set<String>
    private weak var webView: WKWebView?
    private var session: Session?

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
        let frame = message.frameInfo
        guard frame.isMainFrame, isAllowed(frame.securityOrigin) else { return }
        guard let body = message.body as? [String: Any],
              let id = body["id"] as? String,
              let action = body["action"] as? String else {
            respond(id: "", values: ["ok": false, "error": "native_speech_bridge_invalid_request"], frame: frame)
            return
        }

        switch action {
        case "isAvailable":
            respond(id: id, values: ["available": speech.isAvailable()], frame: frame)
        case "recognize":
            beginSession(id: id, frame: frame)
        case "stop":
            stopSession(stopRequestID: id, frame: frame)
        default:
            respond(id: id, values: ["ok": false, "error": "native_speech_bridge_unknown_action"], frame: frame)
        }
    }

    private func beginSession(id: String, frame: WKFrameInfo) {
        guard session == nil else {
            respond(id: id, values: ["ok": false, "error": "recognition_busy"], frame: frame)
            return
        }
        let current = Session(id: id, frame: frame)
        session = current
        startSegment(current)
    }

    private func startSegment(_ current: Session) {
        guard session === current, !current.stopping else { return }
        speech.recognize { [weak self, weak current] result in
            guard let self, let current else { return }
            DispatchQueue.main.async {
                guard self.session === current else { return }
                switch result {
                case .success(let text):
                    let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
                    if !trimmed.isEmpty { current.chunks.append(trimmed) }
                    if current.stopping { self.complete(current) }
                    else { self.startSegment(current) }
                case .failure(let error):
                    if current.stopping { self.complete(current) }
                    else if error == .emptyTranscript || error == .recognitionFailed {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.12) { [weak self, weak current] in
                            guard let self, let current else { return }
                            self.startSegment(current)
                        }
                    } else {
                        self.fail(current, error: Self.errorCode(error))
                    }
                }
            }
        }
    }

    private func stopSession(stopRequestID: String, frame: WKFrameInfo) {
        guard let current = session else {
            respond(id: stopRequestID, values: ["ok": false, "error": "recognition_not_active"], frame: frame)
            return
        }
        current.stopping = true
        speech.stopListening()
        respond(id: stopRequestID, values: ["ok": true, "stopping": true], frame: frame)

        DispatchQueue.main.asyncAfter(deadline: .now() + 5) { [weak self, weak current] in
            guard let self, let current, self.session === current else { return }
            self.speech.cancel()
            if current.chunks.isEmpty { self.fail(current, error: "empty_transcript") }
            else { self.complete(current) }
        }
    }

    private func complete(_ current: Session) {
        guard session === current else { return }
        session = nil
        let text = current.chunks.joined(separator: " ").trimmingCharacters(in: .whitespacesAndNewlines)
        if text.isEmpty {
            respond(id: current.id, values: ["ok": false, "error": "empty_transcript"], frame: current.frame)
        } else {
            respond(id: current.id, values: ["ok": true, "text": text], frame: current.frame)
        }
    }

    private func fail(_ current: Session, error: String) {
        guard session === current else { return }
        session = nil
        speech.cancel()
        respond(id: current.id, values: ["ok": false, "error": error], frame: current.frame)
    }

    private func isAllowed(_ origin: WKSecurityOrigin) -> Bool {
        guard allowedSchemes.contains(origin.protocol) else { return false }
        if origin.protocol == "file" { return true }
        return allowedHosts.contains(origin.host)
    }

    private func respond(id: String, values: [String: Any], frame: WKFrameInfo) {
        guard frame.isMainFrame, isAllowed(frame.securityOrigin) else { return }
        var payload = values
        payload["id"] = id
        guard JSONSerialization.isValidJSONObject(payload),
              let data = try? JSONSerialization.data(withJSONObject: payload),
              let json = String(data: data, encoding: .utf8) else { return }

        DispatchQueue.main.async { [weak self, weak webView] in
            guard let self, let webView else { return }
            guard frame.isMainFrame, self.isAllowed(frame.securityOrigin) else { return }
            webView.evaluateJavaScript(
                "globalThis.__FP_NATIVE_SPEECH_BRIDGE_V1_DELIVER__(\(json))",
                in: frame,
                in: .page
            ) { _ in
                // Deliberately no fallback to the current frame.
                // Navigation invalidates the captured frame and drops the reply.
            }
        }
    }

    private static func errorCode(_ error: FamilyPilotOnDeviceSpeechV1.VoiceError) -> String {
        switch error {
        case .speechPermissionDenied: return "speech_permission_denied"
        case .microphonePermissionDenied: return "microphone_permission_denied"
        case .onDeviceRecognitionUnavailable: return "on_device_speech_unavailable"
        case .recognitionBusy: return "recognition_busy"
        case .recognitionFailed: return "speech_recognition_failed"
        case .emptyTranscript: return "empty_transcript"
        }
    }
}
