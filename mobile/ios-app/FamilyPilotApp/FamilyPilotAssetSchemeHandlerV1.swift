import Foundation
import UniformTypeIdentifiers
import WebKit

final class FamilyPilotAssetSchemeHandlerV1: NSObject, WKURLSchemeHandler {
    private let bundle: Bundle

    init(bundle: Bundle = .main) {
        self.bundle = bundle
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url,
              url.scheme == "familypilot",
              url.host == "app" else {
            fail(urlSchemeTask)
            return
        }
        let relative = String(url.path.drop(while: { $0 == "/" }))
        guard !relative.isEmpty,
              !relative.contains(".."),
              !relative.contains("\\"),
              let resourceURL = bundle.url(forResource: relative, withExtension: nil, subdirectory: "Web"),
              let data = try? Data(contentsOf: resourceURL) else {
            fail(urlSchemeTask)
            return
        }
        let mimeType = UTType(filenameExtension: resourceURL.pathExtension)?.preferredMIMEType ?? "application/octet-stream"
        let response = URLResponse(
            url: url,
            mimeType: mimeType,
            expectedContentLength: data.count,
            textEncodingName: mimeType.hasPrefix("text/") || mimeType.contains("javascript") ? "utf-8" : nil
        )
        urlSchemeTask.didReceive(response)
        urlSchemeTask.didReceive(data)
        urlSchemeTask.didFinish()
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}

    private func fail(_ task: WKURLSchemeTask) {
        task.didFailWithError(NSError(domain: "FamilyPilotAssetScheme", code: 404))
    }
}
