//
//  ContentView.swift
//  ColeiraPet
//
//  Created by Cássio on 03/04/26.
//

import SwiftUI

struct ContentView: View {
    var body: some View {
        ZStack {
            // Load from localhost for development
            if let url = URL(string: "http://localhost:3000") {
                WebView(url: url)
                    .ignoresSafeArea()
            }
        }
    }
}

#Preview {
    ContentView()
}
