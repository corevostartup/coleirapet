//
//  ContentView.swift
//  ColeiraPet
//
//  Created by Cássio on 03/04/26.
//

import SwiftUI

struct ContentView: View {
    // Entrada em /login para a tela de auth aparecer antes da home (middleware redireciona se ja houver sessao).
    private let appURL = URL(string: "https://coleirapet.netlify.app")!
    // Base usada no fluxo de auth nativo iOS -> Firebase web.

    var body: some View {
        WebView(url: appURL)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .ignoresSafeArea()
    }
}

#Preview {
    ContentView()
}
