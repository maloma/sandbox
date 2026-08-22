import UIKit
import WebKit

final class FamilyPilotViewController: UIViewController, WKNavigationDelegate {
    private let assetHandler = FamilyPilotAssetSchemeHandlerV1()
    private var speechBridge: FamilyPilotSpeechWebBridgeV1?
    private var webView: WKWebView!

    override func loadView() {
        let configuration = WKWebViewConfiguration()
        configuration.setURLSchemeHandler(assetHandler, forURLScheme: "familypilot")

        if let localeIdentifier = Bundle.main.object(forInfoDictionaryKey: "FamilyPilotVoiceLocale") as? String,
           !localeIdentifier.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            let speech = FamilyPilotOnDeviceSpeechV1(localeIdentifier: localeIdentifier)
            let bridge = FamilyPilotSpeechWebBridgeV1(
                speech: speech,
                allowedSchemes: ["familypilot"],
                allowedHosts: ["app"]
            )
            _ = bridge.install(on: configuration)
            speechBridge = bridge
        }

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        speechBridge?.bind(webView: webView)
        self.webView = webView
        view = webView
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        guard let url = URL(string: "familypilot://app/index.html") else { return }
        webView.load(URLRequest(url: url))
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction) async -> WKNavigationActionPolicy {
        guard let url = navigationAction.request.url else { return .cancel }
        return url.scheme == "familypilot" && url.host == "app" ? .allow : .cancel
    }
}
