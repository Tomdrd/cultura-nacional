# Incidente: refresh de token do Supabase ao focar a aba desmontava a navegação inteira

**Data:** 2026-07-21
**Severidade:** Alta (botão de voltar parava de funcionar em qualquer tela, sem padrão aparente de reprodução)
**Status:** Corrigido

## Sintoma

Reportado pelo usuário: ao trocar de aba do navegador e voltar para o app,
o botão de voltar deixava de funcionar. Não era uma tela específica —
acontecia em qualquer tela (Quiz foi o exemplo relatado, mas o mecanismo é
global). Nenhuma mensagem de erro visível, nenhum crash — o botão
simplesmente não tinha efeito.

## Causa raiz

O cliente Supabase (`autoRefreshToken: true` em `src/lib/supabase.ts`)
dispara automaticamente um evento `onAuthStateChange` (tipicamente
`TOKEN_REFRESHED`) sempre que a aba/janela recupera o foco na web — esse é
o comportamento padrão do `@supabase/supabase-js`, não é bug do app.

O handler desse evento em `src/store/authStore.ts` (`init()`) rodava
incondicionalmente a cada disparo, mesmo para o mesmo usuário já logado:

```js
if (newUser) {
  set({ profileLoading: true });   // ...refetch do perfil...
  set({ ...profileLoading: false });
}
```

Esse `profileLoading: true` momentâneo era lido em
`src/navigation/RootNavigator.tsx`:

```js
if (loading || (session && profileLoading)) {
  return <ActivityIndicator ... />;
}
```

Essa condição substitui a árvore inteira — **desmonta o `NavigationContainer`
completo**, não só a tela atual. Ao `profileLoading` voltar a `false`, o
`NavigationContainer` remonta e o `linking` reconstrói a tela a partir da
URL atual, mas **sem nenhum histórico de navegação**. Resultado:
`navigation.canGoBack()` retorna `false` em qualquer tela em que isso
acontecer, e o botão de voltar não tem para onde ir.

Isso não é uma regressão recente — o padrão em `authStore.ts` existe desde
o commit inicial (`91ad4d1`, v1.0.0). Só nunca tinha sido relatado antes
porque o sintoma (perda silenciosa de histórico de navegação) não deixa
rastro nos logs.

## Correção

Em `src/store/authStore.ts`, o handler de `onAuthStateChange` agora só
dispara o refetch de perfil (e o `profileLoading: true` correspondente)
quando o usuário **realmente muda** — comparando `newUser.id` contra o
`user.id` anterior armazenado no store — ou quando o perfil ainda não
tinha sido carregado. Eventos como `TOKEN_REFRESHED` para o mesmo usuário
agora só atualizam `session`/`user` (necessário para manter o token válido
nas próximas chamadas à API), sem tocar em `profileLoading`, então o
`RootNavigator` nunca mais desmonta a navegação nesse cenário.

Nenhuma mudança foi feita em `RootNavigator.tsx` — a correção foi isolada
no `authStore.ts` para não mexer em rotas de autenticação além do
estritamente necessário.

## Prevenção futura

**Qualquer flag booleana que controle a montagem/desmontagem de árvores
grandes (`NavigationContainer`, stacks inteiros) deve ser tratada como
sensível** — revisar todo evento que pode setá-la para `true`/`false` e
confirmar que só dispara quando o estado *de fato* mudou, não a cada vez
que um listener externo (auth, realtime, etc.) emite um evento. Eventos de
refresh de token/sessão do Supabase disparam a cada foco de aba na web;
qualquer `set()` dentro de `onAuthStateChange` que gate uma renderização
condicional grande merece essa checagem de "isso realmente mudou?" antes
de disparar.

Se o mesmo sintoma (botão de voltar sem efeito, em qualquer tela, sem
padrão claro) voltar a aparecer, verificar primeiro se algo está
desmontando o `NavigationContainer` — não assumir que é um bug pontual de
`navigation.goBack()` numa tela específica (esse foi o erro de suspeita
inicial neste incidente, descartado ao ler `RootNavigator.tsx`).
