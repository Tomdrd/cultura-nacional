# Deep linking nativo (Universal Links / App Links) — plano

Este documento é um **plano**, não uma implementação. Ninguém deve começar a
mexer nisso sem antes reunir os pré-requisitos da checklist no final —
principalmente porque isso exige credenciais que uma sessão de IA não tem
acesso, e termina num novo build nativo + submissão pras lojas, não só um
commit.

## Situação atual (2026-07-21)

`app.json` só tem `"scheme": "culturanacional"` (esquema customizado, tipo
`culturanacional://algumusername`). Não existe:

- `ios.associatedDomains` no `app.json`
- `android.intentFilters` no `app.json`
- arquivo `apple-app-site-association` hospedado no domínio
- arquivo `assetlinks.json` hospedado no domínio

**Consequência prática:** hoje, quando alguém no celular toca num link
`https://culturanacional.com.br/algumusername` (perfil compartilhado, por
exemplo), o sistema operacional abre isso no **navegador do celular**, não no
app — mesmo com o app instalado. Isso não é um bug a "corrigir com um
commit"; é uma feature que nunca foi configurada. O navegador mobile cai na
versão web do app, que funciona normalmente (ver `docs/NAVIGATION.md` e a
entrada de 2026-07-21 no `docs/DECISIONS.md` sobre o fix do deep link
`/:slug`) — ou seja, **hoje já existe um fallback funcional**, então isso não
é urgente, é melhoria.

## O que Universal Links (iOS) exige

1. **Apple Developer Team ID** (conta developer.apple.com, ou via
   `eas credentials`).
2. Bundle identifier confirmado (`ios.bundleIdentifier` no `app.json`).
3. Hospedar em `https://culturanacional.com.br/.well-known/apple-app-site-association`
   (sem extensão de arquivo, servido com `Content-Type: application/json`):
   ```json
   {
     "applinks": {
       "apps": [],
       "details": [
         { "appID": "TEAMID.com.bundle.id", "paths": ["/*"] }
       ]
     }
   }
   ```
4. `app.json`: adicionar
   `ios.associatedDomains: ["applinks:culturanacional.com.br", "applinks:www.culturanacional.com.br"]`.
5. Exige **novo build nativo** (EAS Build) — não dá pra entregar via
   atualização OTA/JS. Testar via TestFlight ou dispositivo real; o simulador
   tem suporte limitado a Universal Links.

## O que App Links (Android) exige

1. Package name confirmado (`android.package` no `app.json`).
2. **SHA256 do certificado de assinatura do Google Play App Signing** — não é
   a chave de upload local, é a chave que o Google usa pra assinar o app de
   verdade na loja. Fica em Play Console → Configuração → Integridade do app.
3. Hospedar em `https://culturanacional.com.br/.well-known/assetlinks.json`:
   ```json
   [{
     "relation": ["delegate_permission/common.handle_all_urls"],
     "target": {
       "namespace": "android_app",
       "package_name": "com.pacote.aqui",
       "sha256_cert_fingerprints": ["AA:BB:CC:..."]
     }
   }]
   ```
4. `app.json`: adicionar `android.intentFilters` com `autoVerify: true`, ação
   `VIEW`, data scheme `https` + host `culturanacional.com.br` (e `www`),
   categorias `BROWSABLE`/`DEFAULT`.
5. Também exige **novo build nativo** — a verificação automática do App Link
   acontece na instalação/atualização do app.

## Decisões de produto a tomar antes de implementar

- **Quais paths devem abrir o app?** `"paths": ["/*"]` faria qualquer link do
  domínio (inclusive `/ranking`, `/quiz`, etc — ver lista completa em
  `docs/NAVIGATION.md`) tentar abrir o app nativo em vez do navegador. Pode
  ser o que se quer, ou pode ser melhor restringir só aos links de perfil
  público (`/:slug`), deixando o resto abrir no navegador normalmente.
  **Decisão de produto, não técnica — discutir antes de implementar.**
- Falhas de Universal Link/App Link são **silenciosas**: se o arquivo de
  verificação estiver errado ou inacessível, o sistema operacional
  simplesmente volta pro navegador, sem erro visível. Validar com as
  ferramentas oficiais antes de considerar pronto:
  - iOS: `https://search.developer.apple.com/appsearch-validation-tool/`
  - Android: Google Digital Asset Links API
    (`https://developers.google.com/digital-asset-links/tools/generator`)

## Checklist de pré-requisitos (reunir ANTES de qualquer sessão tentar implementar)

- [ ] Apple Developer Team ID
- [ ] iOS Bundle Identifier confirmado
- [ ] Android package name confirmado
- [ ] SHA256 do certificado do Google Play App Signing
- [ ] Decisão de produto: quais paths abrem o app vs continuam no navegador
- [ ] Disponibilidade para gerar um build nativo novo (EAS Build) e submeter
      pras lojas depois da mudança — isso não é só um commit, é um ciclo de
      release completo
