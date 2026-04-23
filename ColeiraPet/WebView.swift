//
//  WebView.swift
//  ColeiraPet
//
//  Created by Cássio on 03/04/26.
//

import AuthenticationServices
import CoreNFC
import SwiftUI
import WebKit

struct WebView: UIViewRepresentable {
    let url: URL

    func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }

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

            window.__COLEIRAPET_IOS_APP__ = true;
            window.ColeiraPetNativeAuth = {
                startGoogleSignIn: () => {
                    window.webkit.messageHandlers.coleiraNativeAuth.postMessage({ action: 'googleSignIn' });
                }
            };
            window.ColeiraPetNativeNFC = {
                startPairing: () => {
                    window.webkit.messageHandlers.coleiraNativeNFC.postMessage({ action: 'startPairing' });
                },
                writePairingPassword: (password) => {
                    window.webkit.messageHandlers.coleiraNativeNFC.postMessage({ action: 'writePairingPassword', password });
                }
            };
        })();
        """

        let userScript = WKUserScript(source: script, injectionTime: .atDocumentEnd, forMainFrameOnly: false)
        contentController.addUserScript(userScript)
        contentController.add(context.coordinator, name: "coleiraNativeAuth")
        contentController.add(context.coordinator, name: "coleiraNativeNFC")

        let configuration = WKWebViewConfiguration()
        configuration.userContentController = contentController

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.showsVerticalScrollIndicator = false
        webView.scrollView.showsHorizontalScrollIndicator = false
        webView.scrollView.pinchGestureRecognizer?.isEnabled = false

        context.coordinator.webView = webView

        let request = URLRequest(url: url)
        webView.load(request)
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        if uiView.url != url {
            uiView.load(URLRequest(url: url))
        }
    }

    final class Coordinator: NSObject, WKScriptMessageHandler, ASWebAuthenticationPresentationContextProviding {
        private let parent: WebView
        weak var webView: WKWebView?
        private var authSession: ASWebAuthenticationSession?
        private var nfcSession: NFCNDEFReaderSession?
        private var nfcPairingMode: NFCPairingMode?
        private var didHandleNfcSessionResult = false

        private enum NFCPairingMode {
            case scanToPair
            case writePassword(String)
        }

        init(parent: WebView) {
            self.parent = parent
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            switch message.name {
            case "coleiraNativeAuth":
                handleAuthMessage(message)
            case "coleiraNativeNFC":
                handleNFCMessage(message)
            default:
                break
            }
        }

        private func handleAuthMessage(_ message: WKScriptMessage) {
            guard
                let body = message.body as? [String: Any],
                let action = body["action"] as? String,
                action == "googleSignIn"
            else {
                return
            }

            startNativeGoogleSignIn()
        }

        private func handleNFCMessage(_ message: WKScriptMessage) {
            guard
                let body = message.body as? [String: Any],
                let action = body["action"] as? String
            else {
                return
            }

            switch action {
            case "startPairing":
                startNFCPairingSession(mode: .scanToPair)
            case "writePairingPassword":
                guard let password = body["password"] as? String, !password.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                    showJSAlert("Senha da Tag NFC invalida.")
                    return
                }
                startNFCPairingSession(mode: .writePassword(password))
            default:
                break
            }
        }

        func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
            webView?.window ?? ASPresentationAnchor()
        }

        private func startNFCPairingSession(mode: NFCPairingMode) {
            guard NFCNDEFReaderSession.readingAvailable else {
                showJSAlert("NFC não está disponível neste iPhone.")
                return
            }

            nfcPairingMode = mode
            didHandleNfcSessionResult = false
            let session = NFCNDEFReaderSession(delegate: self, queue: nil, invalidateAfterFirstRead: false)
            switch mode {
            case .scanToPair:
                session.alertMessage = "Aproxime a tag NFC da parte superior traseira do iPhone."
            case .writePassword:
                session.alertMessage = "Aproxime novamente a Tag NFC para gravar a senha de pareamento."
            }
            nfcSession = session
            session.begin()
        }

        private func startNativeGoogleSignIn() {
            guard let baseURL = parent.url.originURL else { return }
            let callbackScheme = "coleirapet"
            var components = URLComponents()
            components.path = "/auth/ios/google"
            components.queryItems = [
                URLQueryItem(name: "callbackScheme", value: callbackScheme),
                URLQueryItem(name: "native", value: "1"),
            ]
            guard let authURL = components.url(relativeTo: baseURL)?.absoluteURL else { return }

            authSession = ASWebAuthenticationSession(url: authURL, callbackURLScheme: callbackScheme) { [weak self] callbackURL, error in
                guard let self else { return }

                if let error {
                    self.returnToLoginWithNativeGoogleResult(errorMessage: error.localizedDescription, baseURL: baseURL)
                    return
                }

                guard let callbackURL else {
                    self.returnToLoginWithNativeGoogleResult(errorMessage: "Callback do Google nao recebido.", baseURL: baseURL)
                    return
                }

                let components = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false)
                let token = components?.queryItems?.first(where: { $0.name == "firebaseIdToken" })?.value
                let authError = components?.queryItems?.first(where: { $0.name == "error" })?.value

                if let authError {
                    self.returnToLoginWithNativeGoogleResult(errorMessage: authError, baseURL: baseURL)
                    return
                }

                guard let token else {
                    self.returnToLoginWithNativeGoogleResult(errorMessage: "Token do Google nao recebido.", baseURL: baseURL)
                    return
                }

                self.returnToLoginWithNativeGoogleResult(idToken: token, baseURL: baseURL)
            }

            authSession?.presentationContextProvider = self
            authSession?.prefersEphemeralWebBrowserSession = false
            _ = authSession?.start()
        }

        private func finishFirebaseSession(idToken: String, baseURL: URL) async {
            guard let endpoint = URL(string: "/api/auth/firebase/session", relativeTo: baseURL)?.absoluteURL else { return }

            var request = URLRequest(url: endpoint)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try? JSONSerialization.data(withJSONObject: [
                "idToken": idToken,
                "provider": "google"
            ])

            do {
                let (data, response) = try await URLSession.shared.data(for: request)
                guard let http = response as? HTTPURLResponse, 200 ..< 300 ~= http.statusCode else {
                    if
                        let payload = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                        let errorMessage = payload["error"] as? String
                    {
                        let detail = payload["detail"] as? String
                        let composed = (detail?.isEmpty == false) ? "\(errorMessage): \(detail!)" : errorMessage
                        reportLoginError(composed)
                    } else {
                        reportLoginError("Falha ao validar sessao Firebase.")
                    }
                    return
                }

                guard let webView else { return }
                guard let host = baseURL.host else { return }

                let cookieProps: [HTTPCookiePropertyKey: Any] = [
                    .domain: host,
                    .path: "/",
                    .name: "cp_session",
                    .value: "google",
                    .expires: Date().addingTimeInterval(60 * 60 * 24 * 30),
                    .secure: baseURL.scheme == "https",
                ]

                guard let cookie = HTTPCookie(properties: cookieProps) else {
                    reportLoginError("Falha ao criar cookie de sessao.")
                    return
                }

                await webView.configuration.websiteDataStore.httpCookieStore.setCookie(cookie)
                if let homeURL = URL(string: "/home", relativeTo: baseURL)?.absoluteURL {
                    DispatchQueue.main.async {
                        webView.load(URLRequest(url: homeURL))
                    }
                }
            } catch {
                reportLoginError(error.localizedDescription)
            }
        }

        private func reportLoginError(_ message: String) {
            showJSAlert(message)
        }

        private func returnToLoginWithNativeGoogleResult(idToken: String? = nil, errorMessage: String? = nil, baseURL: URL) {
            guard var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false) else { return }
            components.path = "/login"
            var queryItems: [URLQueryItem] = []
            if let idToken, !idToken.isEmpty {
                queryItems.append(URLQueryItem(name: "nativeGoogleIdToken", value: idToken))
            }
            if let errorMessage, !errorMessage.isEmpty {
                queryItems.append(URLQueryItem(name: "nativeGoogleError", value: errorMessage))
            }
            components.queryItems = queryItems.isEmpty ? nil : queryItems
            guard let loginURL = components.url else { return }

            DispatchQueue.main.async { [weak self] in
                self?.webView?.load(URLRequest(url: loginURL))
            }
        }

        private func showJSAlert(_ message: String) {
            DispatchQueue.main.async { [weak self] in
                self?.webView?.evaluateJavaScript("window.alert('" + message.replacingOccurrences(of: "'", with: "\\'") + "')")
            }
        }

        private func goToPairingPasswordStep() {
            DispatchQueue.main.async { [weak self] in
                self?.webView?.evaluateJavaScript("window.location.replace('/tag-nfc/parear?step=password')")
            }
        }

        private func finalizePairingAndGoHome() {
            let maxAgeSeconds = 60 * 60 * 24 * 365
            let script = "document.cookie='cp_nfc_paired=1; Path=/; Max-Age=\(maxAgeSeconds); SameSite=Lax'; window.location.replace('/home');"
            DispatchQueue.main.async { [weak self] in
                self?.webView?.evaluateJavaScript(script)
            }
        }
    }
}

extension WebView.Coordinator: NFCNDEFReaderSessionDelegate {
    func readerSession(_ session: NFCNDEFReaderSession, didDetectNDEFs messages: [NFCNDEFMessage]) {
        guard !didHandleNfcSessionResult else { return }
        guard case .scanToPair = nfcPairingMode else { return }
        didHandleNfcSessionResult = true
        session.invalidate()
        showJSAlert("Tag lida com sucesso. Agora cadastre a senha para finalizar o pareamento.")
        goToPairingPasswordStep()
    }

    func readerSession(_ session: NFCNDEFReaderSession, didDetect tags: [NFCNDEFTag]) {
        guard !didHandleNfcSessionResult else { return }
        guard let mode = nfcPairingMode else { return }
        guard let tag = tags.first else {
            session.invalidate(errorMessage: "Tag NFC nao detectada.")
            return
        }

        switch mode {
        case .scanToPair:
            didHandleNfcSessionResult = true
            session.invalidate()
            showJSAlert("Tag lida com sucesso. Agora cadastre a senha para finalizar o pareamento.")
            goToPairingPasswordStep()

        case let .writePassword(password):
            didHandleNfcSessionResult = true
            session.connect(to: tag) { [weak self] error in
                guard let self else { return }
                if let error {
                    session.invalidate(errorMessage: "Falha ao conectar na Tag NFC: \(error.localizedDescription)")
                    return
                }

                tag.queryNDEFStatus { status, _, error in
                    if let error {
                        session.invalidate(errorMessage: "Falha ao verificar status da Tag NFC: \(error.localizedDescription)")
                        return
                    }

                    guard status == .readWrite else {
                        session.invalidate(errorMessage: "A Tag NFC nao permite gravacao no momento.")
                        return
                    }

                    guard
                        let payload = NFCNDEFPayload.wellKnownTypeTextPayload(
                            string: "cp_protected_password:\(password)",
                            locale: Locale(identifier: "pt_BR")
                        )
                    else {
                        session.invalidate(errorMessage: "Falha ao preparar os dados da senha.")
                        return
                    }

                    let message = NFCNDEFMessage(records: [payload])
                    tag.writeNDEF(message) { error in
                        if let error {
                            session.invalidate(errorMessage: "Falha ao gravar senha na Tag NFC: \(error.localizedDescription)")
                            return
                        }

                        session.alertMessage = "Senha gravada com sucesso na area protegida da Tag NFC."
                        session.invalidate()
                        self.showJSAlert("Pareamento concluido. Senha gravada na Tag NFC.")
                        self.finalizePairingAndGoHome()
                    }
                }
            }
        }
    }

    func readerSession(_ session: NFCNDEFReaderSession, didInvalidateWithError error: Error) {
        nfcSession = nil
        nfcPairingMode = nil
        didHandleNfcSessionResult = false

        guard let readerError = error as? NFCReaderError else {
            showJSAlert(error.localizedDescription)
            return
        }

        switch readerError.code {
        case .readerSessionInvalidationErrorUserCanceled,
             .readerSessionInvalidationErrorFirstNDEFTagRead:
            break
        default:
            showJSAlert(readerError.localizedDescription)
        }
    }
}

private extension URL {
    var originURL: URL? {
        guard let scheme, let host else { return nil }
        if let port {
            return URL(string: "\(scheme)://\(host):\(port)")
        }
        return URL(string: "\(scheme)://\(host)")
    }
}

#Preview {
    WebView(url: URL(string: "https://example.com")!)
}
