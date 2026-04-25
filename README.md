# Lyka

Aplicativo de monitoramento e cuidado de pets (marca **Lyka**; repositório e pastas do Xcode ainda usam o nome de projeto `Lyka`).

## Estrutura do Projeto

- **Lyka/** - Aplicativo iOS (SwiftUI)
- **web/** - Frontend/Backend (Next.js + React)

## Configução para Desenvolvimento

### iOS + WebKit Integration

O aplicativo iOS agora usa WebKit para carregar a interface web do Next.js. Por padrão, está configurado para carregar de `http://localhost:3000`.

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

> **Nota**: Para produção, atualize a URL em `ContentView.swift` para apontar para o servidor web publicado (ex: sua URL do Netlify).

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
