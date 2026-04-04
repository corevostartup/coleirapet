//
//  ContentView.swift
//  ColeiraPet
//
//  Created by Cássio on 03/04/26.
//

import SwiftUI

struct ContentView: View {
    // Troque para o endereco final de producao quando necessario.
    private let appURL = URL(string: "http://localhost:3000")!

    var body: some View {
        WebView(url: appURL)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .ignoresSafeArea()
    }
}

#Preview {
    ContentView()
}
