//
//  ContentView.swift
//  ColeiraPet
//
//  Created by Cássio on 03/04/26.
//

import SwiftUI
import GoogleSignIn

struct ContentView: View {
    // Entrada em /login para a tela de auth aparecer antes da home (middleware redireciona se ja houver sessao).
    private let appURL = URL(string: "https://uselyka.netlify.app")!
    // Base usada no fluxo de auth nativo iOS -> Firebase web.

    @State private var webLoadProgress: Double = 0

    var body: some View {
        ZStack {
            WebView(url: appURL, onProgressChange: { webLoadProgress = $0 })
                .background(Color.black)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .ignoresSafeArea()

            if webLoadProgress < 0.98 {
                LykaCenteredLoadBar(progress: webLoadProgress)
                    .allowsHitTesting(false)
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel("Progresso de carregamento")
                    .accessibilityValue("\(Int(min(1, webLoadProgress) * 100)) por cento")
            }
        }
        .onOpenURL { url in
            _ = GIDSignIn.sharedInstance.handle(url)
        }
    }
}

/// Barra verde compacta, centralizada na tela (WKWebView / iOS shell).
private struct LykaCenteredLoadBar: View {
    let progress: Double

    private var clamped: CGFloat {
        CGFloat(min(1, max(0, progress)))
    }

    private static let barGreen = Color(red: 0.04, green: 0.64, blue: 0.47)
    private let trackWidth: CGFloat = 168
    private let barHeight: CGFloat = 2.5

    var body: some View {
        VStack {
            Spacer(minLength: 0)
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(Color.white.opacity(0.14))
                    .frame(width: trackWidth, height: barHeight)
                Capsule()
                    .fill(Self.barGreen)
                    .frame(width: trackWidth * clamped, height: barHeight)
                    .opacity(clamped > 0.001 ? 1 : 0)
                    .shadow(color: Self.barGreen.opacity(0.4), radius: 8, x: 0, y: 0)
            }
            .frame(width: trackWidth, height: barHeight)
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .animation(.interactiveSpring(response: 0.32, dampingFraction: 0.82), value: clamped)
    }
}

#Preview {
    ContentView()
}
