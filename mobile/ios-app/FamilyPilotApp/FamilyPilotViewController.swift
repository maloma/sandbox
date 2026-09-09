import UIKit
import WebKit

final class FamilyPilotViewController: UIViewController, WKNavigationDelegate {
    private let assetHandler = FamilyPilotAssetSchemeHandlerV1()
    private var webView: WKWebView!

    override func loadView() {
        let configuration = WKWebViewConfiguration()
        configuration.setURLSchemeHandler(assetHandler, forURLScheme: "familypilot")

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
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
