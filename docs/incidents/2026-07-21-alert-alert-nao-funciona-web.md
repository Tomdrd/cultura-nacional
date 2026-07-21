# Incidente: Alert.alert com múltiplos botões não funciona no build web

**Data:** 2026-07-21
**Severidade:** Média (funcionalidade "Limpar notificações" parecia funcionar mas não apagava nada de verdade no banco)
**Status:** Corrigido em `NotificationsScreen.tsx`; outras telas auditadas, nenhuma outra afetada

## Sintoma

Usuário reportou: "a função para apagar as mensagens não estão funcionando"
na tela de Notificações. O botão de lixeira no cabeçalho abria uma
confirmação, mas clicar em "Limpar" não tinha efeito real — as notificações
voltavam a aparecer (porque nunca foram de fato apagadas do banco).

## Causa raiz

`NotificationsScreen.tsx` usava o `Alert.alert()` nativo do React Native com
múltiplos botões (`Cancelar` / `Limpar`, cada um com seu próprio `onPress`).

`react-native-web` (usado no build web deste projeto, incluindo
`culturanacional.com.br`) **não processa de forma confiável múltiplos
botões com `onPress` distintos** em `Alert.alert()`. Dependendo da versão/
implementação, o diálogo pode não aparecer, aparecer só com um botão OK
genérico, ou simplesmente não disparar o `onPress` do botão que não é o
primeiro/padrão. Na prática, o `onPress` do botão "Limpar" (que continha a
chamada real de `.delete()`) **nunca era executado no build web**.

O código também não checava o retorno de erro da própria chamada
`.delete()` — mesmo se a chamada fosse executada e falhasse por qualquer
outro motivo, a tela limpava a lista local silenciosamente (dando a
impressão de sucesso mesmo sem persistir no banco).

## Por que não foi percebido antes

O projeto **já tinha uma solução pronta pra isso**: `src/components/ui/
CustomAlert.tsx`, um modal controlado por state que substitui o
`Alert.alert()` nativo especificamente por essa limitação do
react-native-web. Ele já era usado em `RegisterScreen.tsx` e
`ReportModal.tsx`. `NotificationsScreen.tsx` simplesmente não tinha sido
atualizada pra usar o componente já existente — foi escrita usando o
`Alert.alert()` padrão, que funciona bem no mobile nativo (por isso o bug só
aparecia no web).

## Correção

- `NotificationsScreen.tsx`: `Alert.alert` trocado por `CustomAlert`
  (mesmo padrão de `RegisterScreen.tsx`), com state (`confirmClear`)
  controlando a visibilidade do modal de confirmação.
- Checagem de erro adicionada em toda chamada `.delete()`: se falhar de
  verdade, mostra um `CustomAlert` de erro e **não** limpa a lista local
  (ou reverte, no caso do delete individual otimista).
- Aproveitado o pedido do usuário para adicionar exclusão de notificação
  individual (antes só existia "limpar todas").

## Prevenção futura

**Qualquer tela nova que precisar de confirmação com múltiplos botões
(`Cancelar`/`Confirmar`, `Cancelar`/`Excluir`, etc.) deve usar
`CustomAlert` (`src/components/ui/CustomAlert.tsx`), nunca `Alert.alert`
nativo.** `Alert.alert` só é seguro no build web para alertas informativos
de um único botão (dismiss simples) — que é o uso atual em
`ReportModal.tsx`, `ViralModeScreen.tsx`, `ResetPasswordScreen.tsx`,
`SettingsScreen.tsx` e `DuelScreen.tsx` (auditados nesta investigação,
nenhum deles usa múltiplos botões, então nenhum estava afetado por este
bug — não precisaram de mudança).

Toda chamada `.delete()`/`.update()` do Supabase que altera estado local da
UI deve checar o `error` retornado antes de assumir sucesso.
