# Incidente: CTA "Jogar agora" e retorno do login Google redirecionando para `/undefined`

**Data:** 2026-07-21
**Severidade:** Alta (visitante deslogado não conseguia entrar no app pelo CTA
da landing; usuário completando login com Google ficava travado numa tela de
"Perfil não encontrado" em vez de cair na Home)
**Status:** Corrigido

## Sintoma

Dois fluxos distintos, reportados juntos pelo usuário, levavam à mesma URL
quebrada `https://culturanacional.com.br/undefined`:

1. Visitante deslogado clicando em "Jogar agora" na landing page (`/app`).
2. Usuário completando login com Google (retorno em `/auth/callback`).

Em ambos os casos, a página carregada era a de "Perfil não encontrado" do
`PublicProfileScreen`, e a barra de endereço mostrava literalmente a string
`undefined` como segmento de URL.

## Causa raiz

O commit anterior (`2e2f740`, ver `docs/DECISIONS.md`) promoveu a tela
`PublicProfile` (`path: ':slug'`) para a raiz do `Stack.Navigator` do
`RootNavigator`, sempre montada — correção legítima para o bug de perfil
público inacessível sem sessão. Isso mudou a topologia do Stack raiz: antes,
ele tinha **um único filho condicional** (`Auth` OU `App`, conforme
`session`); depois, passou a ter **dois filhos**: `PublicProfile` (sempre) e
`Auth`/`App` (condicional).

Essa mudança introduziu um efeito colateral não previsto. O `Stack.Navigator`
raiz não tinha (e nunca teve) um `initialRouteName` explícito, então seu
fallback padrão é `routeNames[0]` — o primeiro `Stack.Screen` declarado no
JSX, que é `PublicProfile`.

Sempre que a rota-alvo de uma navegação pertence ao branch (`Auth` ou `App`)
que **não está montado no momento**, o React Navigation não encontra esse
nome de rota entre as screens registradas e reconstrói o estado a partir
desse fallback (`routeNames[0]` = `PublicProfile`), sem nenhum parâmetro
`slug` (porque a rota original não tinha relação nenhuma com `PublicProfile`).
Isso acontecia em dois momentos concretos:

- **`/app` chegando deslogado** — só `Auth` está montado nesse instante;
  `App.AppEntry` (onde `/app` resolve pelo `linking.config`) não existe entre
  as screens registradas → fallback para `PublicProfile` sem slug.
- **`/auth/callback` resolvido no instante em que a sessão já ficou válida**
  — o Supabase client processa o token da URL (`detectSessionInUrl`) antes
  do primeiro render do `NavigationContainer`, então quando a navegação
  inicial é calculada, `session` já é verdadeiro e só `App` está montado;
  `Auth.Login` (onde `/auth/callback` resolve) não existe entre as screens
  registradas → mesmo fallback.

Como a URL de `PublicProfile` é o catch-all `:slug` e `params.slug` é
`undefined` nesse fallback, o React Navigation, ao sincronizar a barra de
endereço (`getPathFromState`), substitui o padrão `:slug` pelo valor literal
`"undefined"`.

Confirmado via logs de auth do Supabase (projeto `fvgvnvzziukvplpyvqki`) que
o handshake OAuth com o Google completava normalmente no backend (sem erro
de `redirect_uri_mismatch` ou afins) — o problema era inteiramente
client-side, na reconciliação de navegação, não na configuração do
Supabase/Google.

## Correção

Adicionado `initialRouteName={session && !isPasswordRecovery ? 'App' :
'Auth'}` ao `Stack.Navigator` raiz em `src/navigation/RootNavigator.tsx`.
Isso garante que, quando o React Navigation precisar reconstruir o estado
por não achar a rota-alvo entre as screens montadas, o fallback caia no
branch correto (`Auth` ou `App`, cada um com seu próprio `initialRouteName`
interno) em vez de esbarrar no `PublicProfile`.

Resultado: visitante deslogado clicando em "Jogar agora" cai na tela de
Login (comportamento já documentado como esperado); usuário completando
login com Google entra direto na Home (ou na tela de cidade natal, se for
conta nova).

Validado com `tsc --noEmit` (0 erros, igual ao baseline antes da mudança) e
`expo export --platform web` (build limpo, sem erros novos).

## Prevenção futura

**Qualquer mudança em quais telas são filhos diretos do `Stack.Navigator`
raiz do `RootNavigator` (adicionar, remover, ou tornar condicional/sempre-
montada uma screen) exige perguntar explicitamente: "para onde vai o
fallback se o React Navigation não achar a rota-alvo entre as screens
atualmente montadas?"** Nunca confiar no `routeNames[0]` implícito —
declarar `initialRouteName` sempre que houver mais de uma screen no Stack
raiz, e mantê-lo sincronizado com a lógica condicional (`session`,
`isPasswordRecovery`, etc).

Ver também `docs/NAVIGATION.md` (seção "Stack raiz — initialRouteName é
obrigatório") para a regra permanente, e `docs/incidents/2026-07-19-linking-config-path-nao-mapeado.md`
para o incidente anterior da mesma família (rotas sem path explícito
colidindo com o catch-all `:slug`).

Antes de mexer de novo no `RootNavigator.tsx` ou no `linking.config`, testar
manualmente pelo menos estes quatro cenários (esse arquivo já causou 3
incidentes distintos, é a área de maior risco do projeto):

1. Cada URL reservada (`/app`, `/auth/callback`, `/perfil`, etc.) carregada
   direto no navegador **deslogado**.
2. As mesmas URLs carregadas direto **logado**.
3. Login (email e Google) ao vivo, observando a URL final.
4. Logout ao vivo, observando a URL final.
