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
        ZStack(alignment: .top) {
            WebView(url: appURL, onProgressChange: { webLoadProgress = $0 })
                .background(Color.black)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .ignoresSafeArea()

            if webLoadProgress < 0.98 {
                ProgressView(value: webLoadProgress)
                    .progressViewStyle(.linear)
                    .tint(Color(red: 0.04, green: 0.64, blue: 0.47))
                    .frame(height: 3)
                    .frame(maxWidth: .infinity)
                    .accessibilityLabel("Progresso de carregamento")
            }
        }
        .onOpenURL { url in
            _ = GIDSignIn.sharedInstance.handle(url)
        }
    }
}

#Preview {
    ContentView()
}
