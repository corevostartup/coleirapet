//
//  WebView.swift
//  ColeiraPet
//
//  Created by Cássio on 03/04/26.
//

import SwiftUI
import WebKit

struct WebView: UIViewRepresentable {
    let url: URL
    
    func makeUIView(context: Context) -> WKWebView {
        let contentController = WKUserContentController()
        let script = """
        (() => {
            const existingViewport = document.querySelector('meta[name="viewport"]');
            const viewport = existingViewport || document.createElement('meta');
            viewport.name = 'viewport';
            viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';

            if (!existingViewport) {
                document.head.appendChild(viewport);
            }

            const style = document.createElement('style');
            style.innerHTML = `
                html, body {
                    -webkit-text-size-adjust: 100%;
                }

                ::-webkit-scrollbar {
                    display: none;
                    width: 0;
                    height: 0;
                }
            `;
            document.head.appendChild(style);
        })();
        """
        let userScript = WKUserScript(source: script, injectionTime: .atDocumentEnd, forMainFrameOnly: false)
        contentController.addUserScript(userScript)

        let configuration = WKWebViewConfiguration()
        configuration.userContentController = contentController

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.showsVerticalScrollIndicator = false
        webView.scrollView.showsHorizontalScrollIndicator = false
        webView.scrollView.pinchGestureRecognizer?.isEnabled = false

        let request = URLRequest(url: url)
        webView.load(request)
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {
        if uiView.url != url {
            uiView.load(URLRequest(url: url))
        }
    }
}

#Preview {
    WebView(url: URL(string: "https://example.com")!)
}
