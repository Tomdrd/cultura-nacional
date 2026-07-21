# Incidente: paths não mapeados no linking config quebram navegação (recorrente)

**Data:** 2026-07-19 / 2026-07-20 (ocorreu 3 vezes)
**Severidade:** Alta (usuário autenticado ficava travado em "Perfil não encontrado", com botão de voltar não funcional)
**Status:** Corrigido — mitigação estrutural aplicada

## Sintoma

Depois de login pelo Google (web), o usuário era redirecionado para uma URL
como `/Home` ou, em outro momento, `/app`, e caía na tela de perfil público
com a mensagem "Perfil não encontrado" — travado, porque o botão de voltar
(`navigation.goBack()`) não tinha para onde voltar (sem histórico de
navegação, já que a tela foi aberta direto via URL).

Esse mesmo sintoma se repetiu 3 vezes, em momentos diferentes:
1. `/Home` — ao logar, aterrissando na aba Home
2. `/app.html` e depois `/Home` de novo — CTA "Jogar agora" da landing page
3. Implicitamente, qualquer tela sem path mapeado (ex: `CidadeSetup`,
   telas de onboarding para usuários novos)

## Causa raiz

O app usa `React Navigation` com `linking` configurado em
`src/navigation/RootNavigator.tsx`. **Toda tela sem um `path` explícito
nesse config faz o React Navigation usar o nome bruto da rota (ex: `Home`,
`CidadeSetup`) como segmento de URL** ao sincronizar a barra de endereço
(web) com o estado de navegação atual.

Isso colide diretamente com a rota de perfil público:
```ts
PublicProfile: ':slug', // qualquer segmento de URL vira um "nome de usuário"
```

Como o `:slug` é um catch-all (casa com qualquer segmento não reconhecido
por outra rota explícita), qualquer tela sem path mapeado — quando o React
Navigation tenta refletir o estado atual na URL — produz um path que, ao ser
recarregado ou reprocessado, é interpretado como "procurar perfil público
com esse nome de usuário". Como não existe usuário com esse nome, cai em
"Perfil não encontrado".

Adicionalmente, o `HomeTabs` é um `Tab.Navigator` aninhado (Home, Ranking,
Notifications, Settings) — mapear só `HomeTabs: ''` como string simples não
basta, porque não diz o que fazer com cada aba interna; é preciso mapear
cada uma dentro de `HomeTabs.screens`.

## Correção

1. Mapeadas explicitamente **todas as 13 telas** do `App` stack e a tela
   `Register` do `Auth` stack no `linking.config`, com paths em português
   (ver `docs/NAVIGATION.md` para a lista completa atual).
2. Criada uma **rota reservada `/app`** (`AppEntryScreen`,
   `src/screens/AppEntryScreen.tsx`) especificamente para links externos que
   precisam abrir "o app" (ex: CTA da landing page) — na montagem, reseta a
   navegação para `HomeTabs`. Funciona tanto para visitante deslogado
   (`/app` não bate com nada no `Auth` stack → cai no fallback padrão, tela
   de Login) quanto para quem já tem sessão ativa (`/app` bate exatamente
   com a rota reservada, que tem prioridade sobre o coletor `:slug`).
3. `PublicProfileScreen.tsx`: botão de voltar agora checa
   `navigation.canGoBack()` antes de chamar `goBack()`; se não houver
   histórico, faz `navigation.reset()` para `HomeTabs` em vez de travar. A
   própria tela de "Perfil não encontrado" ganhou um botão "Ir para o
   início" como rede de segurança adicional.

## Prevenção futura

**Toda tela nova adicionada em `AppNavigator.tsx` ou `AuthNavigator.tsx`
precisa de um path explícito no `linking.config` do `RootNavigator.tsx`, no
mesmo commit.** Nenhum username de usuário pode coincidir com um dos paths
reservados (`app`, `ranking`, `quiz`, `perfil`, etc. — ver lista completa em
`docs/NAVIGATION.md`); se o cadastro permitir username livre, considerar
validar contra essa lista de paths reservados.

Depois da correção #1, o bug ainda se repetiu uma vez (item 2 da lista de
sintomas), porque um commit separado linkou para `/Home` (não mapeado) em
vez de usar uma rota já mapeada — daí a criação da rota reservada `/app`
(#2), pensada especificamente para eliminar esse tipo de escorregão em
links externos daqui pra frente.
