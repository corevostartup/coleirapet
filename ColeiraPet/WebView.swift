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
        let webView = WKWebView()
        let request = URLRequest(url: url)
        webView.load(request)
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {
        // Update logic if needed
    }
}

#Preview {
    WebView(url: URL(string: "https://example.com")!)
}
