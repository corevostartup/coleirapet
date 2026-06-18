# Lyka — Roadmap e contexto para IAs

Última atualização: 2026-06-17

## Estado atual (concluído)

### App usuário
- [x] Mapa de clínicas com Photon API (+ fallback Overpass)
- [x] Carteira de vacinação com compartilhar imagem e troca de pet
- [x] Card Premium (free) na Home e carteira
- [x] Tutores secundários (código de tutor, busca, convite por notificação)
- [x] Teclado visual Lyka no campo de adicionar tutor secundário
- [x] TopBar com sino + miniatura do pet + menu trocar/ver todos
- [x] Correção loop login: `LoginScreen` default export + page reexport (sem loader)

### Admin
- [x] Usuários reais, troca Pro/Free persistente, logs, pets, detalhes, exclusão

### Infra
- [x] Regras Firestore para membros de pet e notificações
- [x] `getPetAccessById` para permissões centralizadas

## Em andamento / validar

- [ ] Confirmar TopBar estável em produção (Netlify) após fix de arquitetura
- [ ] Notificação ao tutor principal quando secundário aceita/cancela convite
- [ ] Testes E2E do fluxo login → home → troca de pet

## Próximas prioridades sugeridas

1. **Estabilidade** — evitar regressões no padrão TopBar/login (ver `.cursor/rules/lyka-web-architecture.mdc`)
2. **Troca de pet** — garantir lista inclui pets primários e secundários em todas as telas
3. **Perfil** — foto do pet no editor de perfil sincronizada com pet atual
4. **Premium** — fluxo de upgrade Pro funcional (pagamento)
5. **NFC** — fluxo obrigatório de primeiro pet antes do pareamento

## Arquivos-chave

| Área | Arquivo |
|---|---|
| TopBar | `web/src/components/top-bar.tsx` |
| Shell layout | `web/src/components/shell.tsx`, `user-app-shell-layout.tsx` |
| Troca de pet | `web/src/components/profile-pet-switcher.tsx` |
| Login | `web/src/app/login/page.tsx` (client) |
| Pets API | `web/src/app/api/pets/list/route.ts` |
| Acesso pet | `web/src/lib/pets/access.ts` |
| Firestore rules | `web/firestore.rules` |

## Como debugar loop de erro no login/home

1. Verificar terminal: `Element type is invalid` → problema de import client/server
2. Limpar cache: `rm -rf web/.next && npm run dev`
3. Confirmar imports: `import TopBar from "@/components/top-bar"` (default)
4. Login deve ser `"use client"` direto, sem loader intermediário
