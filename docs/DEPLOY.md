# Deploy, domínio e landing page

## Domínios

- `culturanacional.com.br` (+ `www`) → este projeto Vercel (`cultura-nacional`)
- `admin.culturanacional.com.br` → projeto Vercel separado (`cultura-nacional-admin`)
- DNS gerenciado no Registro.br (registros `A`/`CNAME` manuais, não
  delegação de nameservers para o Vercel)

## Como a raiz do domínio serve DUAS coisas diferentes

`culturanacional.com.br/` precisa mostrar uma landing page pública (sem
login, explicando o app — exigência do Google para verificação de branding
OAuth), mas o app de verdade também precisa funcionar nesse mesmo domínio.

A solução está no `vercel.json`:

```json
"buildCommand": "npx expo export --platform web && cp dist/index.html dist/app.html && cp public/landing.html dist/index.html",
"rewrites": [{ "source": "/(.*)", "destination": "/app.html" }]
```

O build do Expo gera o app em `index.html`; o script copia esse arquivo pra
`app.html` e coloca `public/landing.html` no lugar de `index.html`. Como
arquivo estático existente tem prioridade sobre rewrite no Vercel:

- `/` → serve `index.html` (a landing page) diretamente, sem passar pelo rewrite
- `/termos.html`, `/privacidade.html` → também são arquivos estáticos reais (copiados de `public/`)
- Qualquer outro path (`/app`, `/auth/callback`, `/perfil`, etc.) → não existe
  como arquivo estático, cai no rewrite `/(.*) → /app.html`, carregando o app
  React de verdade

**Não mexa nesse mecanismo sem entender a ordem de prioridade
estático-antes-de-rewrite do Vercel** — é frágil e fácil de quebrar sem
perceber (ver `docs/NAVIGATION.md` para o histórico de bugs relacionados a
paths não mapeados nesse contexto).

**Link para "abrir o app" a partir da landing page: use sempre `/app`** (rota
reservada, ver `docs/NAVIGATION.md`), nunca `/app.html` direto.

## Painel admin — bloqueio de indexação

O admin panel **nunca** deve aparecer no Google. Tem duas camadas de
proteção: `public/robots.txt` (`Disallow: /`) e `<meta name="robots"
content="noindex, nofollow">` no `index.html`. Se recriar o projeto do zero,
não esqueça as duas.

## SEO da landing page

Score atual (PageSpeed Insights, mobile): 100/100/100/100, 3/3 navegação
agêntica. Elementos que sustentam isso:

- Fontes do Google carregadas de forma assíncrona (`preload` + `onload`,
  não `<link rel="stylesheet">` direto) — evita bloqueio de renderização
- Imagens com `width`/`height` explícitos e otimizadas pro tamanho de
  exibição real (não usar o ícone de app de 1024×1024 direto num `<img>`
  pequeno — ver `public/logo-header.png`, versão 96×96 dedicada)
- `<main>` como landmark de navegação
- `robots.txt`/`sitemap.xml` com domínio correto e **só páginas genuinamente
  públicas** (não listar rotas que exigem login)
- `<link rel="canonical">`, Open Graph completo (`og:url`/`type`/`locale`),
  JSON-LD `SoftwareApplication`

Ao mudar a landing page, revalide rodando o PageSpeed Insights de novo depois
do deploy — não assuma que a nota se mantém.

## Verificação de branding do Google (OAuth)

Console: `console.cloud.google.com/auth/branding?project=cultura-nacional`.
Exige: página inicial acessível sem login, que explique a finalidade do app
em texto, com nome batendo com o configurado no consent screen. A landing
page (`public/landing.html`) foi desenhada especificamente para atender isso.
A revisão é **manual** pelo time do Google — pode levar dias, não é
instantânea, e a tela de "problemas encontrados" só atualiza depois da
revisão nova ser concluída.

**Status (2026-07-21): verificado e publicado em produção.** A marca foi
aprovada e, em seguida, publicada pelo botão "Publicar branding" na mesma
tela — sem isso, a aprovação expira em 7 dias e o app volta a mostrar a tela
de aviso "app não verificado" pros usuários. O status atual em "Status da
verificação" é "Sua marca foi verificada e está aparecendo para os
usuários". Login com Google deve funcionar sem aviso pra qualquer conta, não
só pras contas de teste cadastradas antes. Se precisar reverificar no
futuro (mudança de nome do app, logo, domínio ou escopos), repetir o mesmo
fluxo: landing acessível sem login → aguardar revisão manual → publicar
branding assim que aprovado, dentro da janela de 7 dias.

## Imagens de compartilhamento (Open Graph / Twitter Card)

`public/og-image.png` (1200×630) e `public/twitter-image.png` (1024×512) são
geradas programaticamente (Pillow + fonte Plus Jakarta Sans convertida de
woff2 pra ttf via fonttools, já que o ambiente de build não baixa fontes de
`fonts.gstatic.com`). Se precisar regenerar, replique a identidade visual da
landing page (paleta, tipografia, card de pergunta) em vez de usar só a logo.

Depois de trocar essas imagens, rode "Extrair novamente" no Facebook Sharing
Debugger (`developers.facebook.com/tools/debug/`) — ele cacheia a prévia por
URL e não atualiza sozinho.

## Pendência: trocar e-mail de contato pessoal por `contato@culturanacional.com.br`

O e-mail pessoal `antonyeltonrodrigues@gmail.com` ainda é usado como contato
público em vários lugares. **Quando `contato@culturanacional.com.br`
estiver configurado corretamente** (registro MX/e-mail funcional no
domínio), trocar em:

- `public/landing.html` — link `mailto:` do rodapé e texto "Dúvidas ou
  suporte"
- `public/termos.html` — link `mailto:` da seção de contato e rodapé
- `public/privacidade.html` — link `mailto:` da seção de contato (LGPD) e
  rodapé

Também trocar o e-mail de contato/titular cadastrado no **Registro.br**
(painel do domínio `culturanacional.com.br`) para o novo endereço, já que
hoje aponta para o e-mail pessoal.

Não fazer essa troca antes do e-mail novo estar recebendo de verdade —
usuários usam esse contato para exercer direitos de LGPD e suporte, não
pode virar um buraco negro.
