//
//  WebView.swift
//  ColeiraPet
//
//  Created by Cássio on 03/04/26.
//

import CoreNFC
import GoogleSignIn
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

            window.__LYKA_IOS_APP__ = true;
            window.LykaNativeAuth = {
                startGoogleSignIn: () => {
                    window.webkit.messageHandlers.lykaNativeAuth.postMessage({ action: 'googleSignIn' });
                }
            };
            window.LykaNativeNFC = {
                startPairing: () => {
                    window.webkit.messageHandlers.lykaNativeNFC.postMessage({ action: 'startPairing' });
                },
                writePairingPassword: (password, publicUrl) => {
                    window.webkit.messageHandlers.lykaNativeNFC.postMessage({ action: 'writePairingPassword', password, publicUrl });
                }
            };
        })();
        """

        let userScript = WKUserScript(source: script, injectionTime: .atDocumentEnd, forMainFrameOnly: false)
        contentController.addUserScript(userScript)
        contentController.add(context.coordinator, name: "lykaNativeAuth")
        contentController.add(context.coordinator, name: "lykaNativeNFC")

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

    final class Coordinator: NSObject, WKScriptMessageHandler {
        private let parent: WebView
        weak var webView: WKWebView?
        private var nfcSession: NFCNDEFReaderSession?
        private var nfcPairingMode: NFCPairingMode?
        private var didHandleNfcSessionResult = false

        private enum NFCPairingMode {
            case scanToPair
            case writePassword(password: String, publicUrl: URL)
        }

        init(parent: WebView) {
            self.parent = parent
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            switch message.name {
            case "lykaNativeAuth":
                handleAuthMessage(message)
            case "lykaNativeNFC":
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

            guard let clientId = googleClientIdFromFirebasePlist() else {
                sendNativeGoogleSignInError("CLIENT_ID ausente em GoogleService-Info.plist.")
                return
            }
            Task { @MainActor in
                await startNativeGoogleSignIn(clientId: clientId)
            }
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
                guard let rawPublicUrl = body["publicUrl"] as? String,
                      let publicUrl = normalizePublicURL(rawPublicUrl) else {
                    showJSAlert("Endereco publico do pet invalido.")
                    return
                }
                startNFCPairingSession(mode: .writePassword(password: password, publicUrl: publicUrl))
            default:
                break
            }
        }

        private func normalizePublicURL(_ rawValue: String) -> URL? {
            let trimmed = rawValue.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty else { return nil }
            if let absolute = URL(string: trimmed), let scheme = absolute.scheme, scheme == "https" || scheme == "http" {
                return absolute
            }
            guard let origin = parent.url.originURL else { return nil }
            return URL(string: trimmed, relativeTo: origin)?.absoluteURL
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
            case .writePassword(_, _):
                session.alertMessage = "Aproxime novamente a Tag NFC para gravar a senha de pareamento."
            }
            nfcSession = session
            session.begin()
        }

        @MainActor
        private func startNativeGoogleSignIn(clientId: String) async {
            guard let webView else { return }
            guard
                let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                let rootVC = windowScene.windows.first(where: { $0.isKeyWindow })?.rootViewController ?? windowScene.windows.first?.rootViewController
            else {
                sendNativeGoogleSignInError("Janela indisponivel para login Google.")
                return
            }

            do {
                GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientId)
                let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: rootVC)
                guard let idToken = result.user.idToken?.tokenString, !idToken.isEmpty else {
                    sendNativeGoogleSignInError("Token do Google nao recebido.")
                    return
                }
                sendNativeGoogleSignInToken(idToken, to: webView)
            } catch {
                sendNativeGoogleSignInError(error.localizedDescription)
            }
        }

        private func sendNativeGoogleSignInToken(_ idToken: String, to webView: WKWebView) {
            let escaped = escapeForJavaScriptLiteral(idToken)
            let script = "if(typeof window.__lykaGoogleSignInToken==='function'){window.__lykaGoogleSignInToken('\(escaped)');}"
            webView.evaluateJavaScript(script)
        }

        private func sendNativeGoogleSignInError(_ message: String) {
            guard let webView else { return }
            let escaped = escapeForJavaScriptLiteral(message)
            let script = "if(typeof window.__lykaGoogleSignInError==='function'){window.__lykaGoogleSignInError('\(escaped)');}"
            webView.evaluateJavaScript(script)
        }

        private func escapeForJavaScriptLiteral(_ value: String) -> String {
            value
                .replacingOccurrences(of: "\\", with: "\\\\")
                .replacingOccurrences(of: "'", with: "\\'")
                .replacingOccurrences(of: "\n", with: " ")
                .replacingOccurrences(of: "\r", with: " ")
        }

        private func googleClientIdFromFirebasePlist() -> String? {
            guard
                let url = Bundle.main.url(forResource: "GoogleService-Info", withExtension: "plist"),
                let data = try? Data(contentsOf: url),
                let raw = try? PropertyListSerialization.propertyList(from: data, format: nil) as? [String: Any],
                let clientId = (raw["CLIENT_ID"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines),
                !clientId.isEmpty
            else {
                return nil
            }
            return clientId
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

        case let .writePassword(password, publicUrl):
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

                    let publicUrlRecord = NFCNDEFPayload.wellKnownTypeURIPayload(string: publicUrl.absoluteString)
                    let records: [NFCNDEFPayload]
                    if let publicUrlRecord {
                        records = [publicUrlRecord, payload]
                    } else if let publicUrlTextPayload = NFCNDEFPayload.wellKnownTypeTextPayload(
                        string: "cp_public_url:\(publicUrl.absoluteString)",
                        locale: Locale(identifier: "pt_BR")
                    ) {
                        records = [publicUrlTextPayload, payload]
                    } else {
                        session.invalidate(errorMessage: "Falha ao preparar o endereco publico da Tag NFC.")
                        return
                    }

                    let message = NFCNDEFMessage(records: records)
                    tag.writeNDEF(message) { error in
                        if let error {
                            session.invalidate(errorMessage: "Falha ao gravar senha na Tag NFC: \(error.localizedDescription)")
                            return
                        }

                        session.alertMessage = "Pareamento concluido. Endereco publico e senha gravados na Tag NFC."
                        session.invalidate()
                        self.showJSAlert("Pareamento concluido. Endereco publico e senha gravados na Tag NFC.")
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
