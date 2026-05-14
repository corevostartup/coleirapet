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
                .background(Color.white)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .ignoresSafeArea()

            if webLoadProgress < 0.98 {
                LykaWebLoadingOverlay(progress: webLoadProgress)
                    .allowsHitTesting(false)
                    .background(Color.clear)
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

/// Durante cargas do WKWebView: apenas mascote flutuante + barra logo abaixo; sem fundo, sem outros elementos.
private struct LykaWebLoadingOverlay: View {
    let progress: Double

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private static let floatPeriod: Double = 3.4

    var body: some View {
        TimelineView(.animation(minimumInterval: 1 / 60, paused: false)) { context in
            let t = context.date.timeIntervalSinceReferenceDate
                .truncatingRemainder(dividingBy: Self.floatPeriod) / Self.floatPeriod
            let angle = t * 2 * Double.pi
            let offsetY = reduceMotion ? CGFloat(0) : CGFloat(-11 * (1 - cos(angle)) / 2)
            let rotationDeg = reduceMotion ? CGFloat(0) : CGFloat(sin(angle) * 1.1)

            ZStack {
                Color.clear
                    .frame(maxWidth: .infinity, maxHeight: .infinity)

                VStack(spacing: 16) {
                    Image("ColeiraSplashLogo")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 200, height: 200)
                        .accessibilityHidden(true)
                        .offset(y: offsetY)
                        .rotationEffect(.degrees(rotationDeg))

                    LykaInlineLoadBar(progress: progress)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color.clear)
        }
    }
}

/// Barra de progresso compacta, logo abaixo do mascote.
private struct LykaInlineLoadBar: View {
    let progress: Double

    private var clamped: CGFloat {
        CGFloat(min(1, max(0, progress)))
    }

    private static let barGreen = Color(red: 0.04, green: 0.64, blue: 0.47)
    private let trackWidth: CGFloat = 168
    private let barHeight: CGFloat = 2.5

    var body: some View {
        ZStack(alignment: .leading) {
            Capsule()
                .fill(Color.black.opacity(0.06))
                .frame(width: trackWidth, height: barHeight)
            Capsule()
                .fill(Self.barGreen)
                .frame(width: trackWidth * clamped, height: barHeight)
                .opacity(clamped > 0.001 ? 1 : 0)
        }
        .frame(width: trackWidth, height: barHeight)
        .animation(.interactiveSpring(response: 0.32, dampingFraction: 0.82), value: clamped)
    }
}

#Preview {
    ContentView()
}
