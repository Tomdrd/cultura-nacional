# Navegação e linking config

## O bug recorrente: "path não mapeado"

O app usa `React Navigation` com `linking` configurado em
`src/navigation/RootNavigator.tsx`, rodando também na versão web (Vercel).

**Regra de ouro: toda tela nova precisa de um `path` explícito no `linking
config`.** Se uma tela não tiver path mapeado, o React Navigation usa o nome
bruto da rota (ex: `Home`, `CidadeSetup`) como segmento de URL — e isso
**colide com a rota de perfil público** (`PublicProfile: ':slug'`), que trata
qualquer segmento não reconhecido como um nome de usuário. O resultado é a
tela "Perfil não encontrado" travada (e o botão de voltar quebrado, se não
houver histórico de navegação — ver `PublicProfileScreen.tsx`).

Isso já causou bugs reais em produção 3 vezes:
- `/Home` (aba Home sem path mapeado)
- `/app.html` e depois `/Home` de novo (CTA "Jogar agora" da landing page)
- Tela `CidadeSetup` (onboarding de cidade natal) sem path mapeado

**Sempre que adicionar uma tela nova em `AppNavigator.tsx` ou
`AuthNavigator.tsx`, adicione o path correspondente no `linking.config` do
`RootNavigator.tsx` no mesmo commit.**

## Mapa de rotas atual (web)

| Path | Tela |
|---|---|
| `/` | Home (aba, dentro de HomeTabs) — **na prática, `/` é a landing page estática, não o app; ver docs/DEPLOY.md** |
| `/app` | `AppEntryScreen` — rota reservada para links externos, redireciona pra HomeTabs |
| `/ranking` | Ranking (aba) |
| `/notificacoes` | Notifications (aba) |
| `/configuracoes` | Settings (aba) |
| `/estados` | Estados |
| `/categorias` | Categorias |
| `/musica` | Musica |
| `/quiz-cidade` | CityQuiz |
| `/quiz` | Quiz |
| `/duelo` | Duel |
| `/assinatura` | Subscription |
| `/missoes` | Missions |
| `/conquistas` | Achievements |
| `/configurar-cidade` | CidadeSetup |
| `/perfil` | Profile (perfil do próprio usuário logado) |
| `/modo-viral` | ViralMode |
| `/seguidores` | FollowList |
| `/cadastro` | Register |
| `/auth/callback` | Login (também usada como redirect do OAuth do Google — ver abaixo) |
| `/auth/reset-password` | ResetPassword |
| `/:slug` (qualquer coisa não mapeada acima) | `PublicProfile` — trata o segmento como username |

**Atenção, ângulo diferente do bug acima:** até 2026-07-21, isso valia até
pra links de perfil *legítimos*. `PublicProfileScreen` só sabia ler
`route.params.userId` (um UUID) — nunca `route.params.slug` (o que o linking
config realmente entrega nessa rota). Resultado: todo link compartilhado
(`culturanacional.com.br/algumslug`) clicado direto (fora do app) caía em
"Perfil não encontrado". Corrigido resolvendo `slug` → `userId` via
`profile_slug OR username` (ambos com índice único) antes de carregar o
resto — `profile_slug` é a URL personalizada de usuários Pro (ver
`ProfileScreen.tsx`), com fallback pro `username`. Ver `docs/DECISIONS.md`
(2026-07-21).

**Consequência prática:** nenhum username de usuário pode coincidir com
nenhum dos paths reservados acima (`app`, `ranking`, `quiz`, `perfil`, etc.).
Se o cadastro de usuário permitir escolher username livremente, considere
validar contra essa lista.

## Link de "entrada no app" (CTA externo)

Se precisar linkar para o app a partir de fora dele (landing page, e-mail,
etc.), **use sempre `/app`** (a rota reservada `AppEntryScreen`), nunca
`/app.html` nem qualquer outro path direto. `/app` funciona corretamente
tanto para visitante deslogado (cai na tela de Login normalmente) quanto para
quem já tem sessão ativa (redireciona pra Home).

## `auth/callback` — zona de risco

A rota `auth/callback` (tela `Login`) é usada pelo Supabase Auth como
redirect do OAuth (Google). O valor de `redirectTo` está hardcoded em
`src/screens/auth/LoginScreen.tsx` e **precisa bater exatamente** com uma das
Redirect URLs cadastradas no Supabase Auth Dashboard
(supabase.com/dashboard/project/fvgvnvzziukvplpyvqki/auth/url-configuration).

**Se for mudar essa rota ou o domínio, mude os dois lados ao mesmo tempo** —
código E painel do Supabase — ou o login quebra em produção até sincronizar.

## Stack raiz — `initialRouteName` é obrigatório

O `Stack.Navigator` raiz do `RootNavigator.tsx` tem hoje dois tipos de
filho: `PublicProfile` (sempre montado) e `Auth`/`App` (condicional,
conforme `session`). Ele **precisa** de `initialRouteName` explícito:

```tsx
<Stack.Navigator
  initialRouteName={session && !isPasswordRecovery ? 'App' : 'Auth'}
  ...
>
```

**Por quê:** sempre que o React Navigation não encontra, entre as screens
atualmente montadas, o nome de rota que uma navegação (ou o `linking`) está
pedindo, ele reconstrói o estado a partir de `initialRouteName ??
routeNames[0]`. Sem o `initialRouteName` explícito, esse fallback caía no
primeiro `Stack.Screen` declarado — `PublicProfile` — sem nenhum `slug`,
e a URL virava literalmente `/undefined` (ver
`docs/incidents/2026-07-21-root-navigator-undefined-redirect.md`). Isso
acontece em pelo menos dois casos reais: uma URL de `App` chegando
deslogado (ex: `/app`), e uma URL de `Auth` sendo resolvida no instante em
que a sessão já ficou válida (ex: `/auth/callback` logo após o login).

**Regra:** qualquer mudança em quais telas são filhos diretos do Stack raiz
— adicionar uma nova, tornar uma sempre-montada, etc. — precisa reavaliar
se `initialRouteName` ainda cobre corretamente todos os branches
condicionais. Nunca deixar o Stack raiz com mais de uma screen e sem
`initialRouteName` explícito.

## HomeTabs é um Tab.Navigator aninhado

`HomeTabs` (dentro de `AppNavigator.tsx`) não é uma tela única, é um
`Tab.Navigator` com 4 abas (Home, Ranking, Notifications, Settings). O
`linking config` precisa mapear cada aba individualmente dentro de
`HomeTabs.screens`, não só `HomeTabs` como string única — do contrário só a
aba "sem path" gera o bug acima.
