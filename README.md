# Lyka

Aplicativo de monitoramento e cuidado de pets (marca **Lyka**; repositório e pastas do Xcode ainda usam o nome de projeto `Lyka`).

## Estrutura do Projeto

- **Lyka/** - Aplicativo iOS (SwiftUI)
- **web/** - Frontend/Backend (Next.js + React)

## Configução para Desenvolvimento

### iOS + WebKit Integration

O aplicativo iOS usa WebKit para carregar o Next.js. A URL de carga está em `Lyka/ContentView.swift` (produção: site publicado no Netlify; para desenvolvimento local, use `http://localhost:3000`).

#### Passos para executar:

1. **Inicie o servidor Next.js**:
   ```bash
   cd web
   npm run dev
   ```
   O servidor rodará em `http://localhost:3000`

2. **Configure o Xcode para aceitar localhost**:
   - Abra `Lyka.xcodeproj` no Xcode
   - Selecione o target "Lyka"
   - Vá para "Build Settings" e procure por "App Transport Security"
   - Você pode precisar adicionar as seguintes configurações ao Info.plist (se não existir, crie um):
     ```xml
     <key>NSLocalNetworkUsageDescription</key>
     <string>Para conectar ao servidor de desenvolvimento</string>
     <key>NSBonjourServices</key>
     <array>
       <string>_http._tcp</string>
     </array>
     ```

3. **Execute o aplicativo iOS**:
   - No Xcode, selecione um simulador ou dispositivo
   - Aperte Cmd+R para executar

> **Nota**: Em produção, o app iOS usa `https://uselyka.netlify.app` em `ContentView.swift`. No Netlify, defina também `NEXT_PUBLIC_SITE_URL=https://uselyka.netlify.app` para links absolutos e meta tags.

## Tech Stack

### Backend/Frontend
- **Node.js** (Next.js API routes)
- **React** (TypeScript)
- **Tailwind CSS**
- **API REST/WebSocket**

### iOS
- **SwiftUI**
- **WebKit** (WKWebView)
- **Swift**

### Deploy
- **Frontend**: Netlify
- **iOS**: App Store / TestFlight

## Próximos Passos

1. Implemente as APIs REST em `web/src/app/api/`
2. Desenvolva componentes React na pasta `web/src/app/`
3. Configure variáveis de ambiente (`.env.local`)
4. Prepare a build para produção

---

Desenvolvido com ❤️
