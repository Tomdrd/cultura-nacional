# Incidente: Desempenho no Quiz exibindo 100% de acertos incorretamente

**Data:** 2026-07-15
**Severidade:** Média (dado de exibição incorreto, sem impacto em XP/nível/pontuação real)
**Status:** Corrigido

## Sintoma

Na tela de Perfil, o card "Desempenho no Quiz" exibia valores incoerentes,
ex: 28 respondidas / 100% de acertos / 0% de erros, mesmo para usuários
que erraram várias perguntas no modo de exploração por estado.

## Causa raiz

Em `src/screens/quiz/QuizScreen.tsx`, a função `saveStateProgress`
recebia apenas o número de acertos da rodada (`scoreRef.current`) e
usava esse mesmo valor tanto para incrementar `questions_answered`
quanto `correct_answers` na tabela `user_state_progress`:

```ts
// antes
async function saveStateProgress(correctsThisRound: number) {
  if (!user || !stateId || correctsThisRound === 0) return;
  ...
  const newAnswered = Math.min(prevAnswered + correctsThisRound, PROGRESS_GOAL);
  const newCorrect  = Math.min(prevCorrect  + correctsThisRound, PROGRESS_GOAL);
  ...
}
...
saveStateProgress(scoreRef.current),
```

Como resultado, `questions_answered` sempre crescia igual a
`correct_answers`, fazendo o percentual de acerto ficar
artificialmente em 100% (e erros em 0%). Além disso, se o usuário
errasse todas as perguntas da rodada (`correctsThisRound === 0`), a
função retornava sem salvar nada — nem o total de respondidas era
registrado.

A função de banco `update_state_progress` (RPC) e a tabela em si
estavam corretas; o bug era exclusivamente na chamada feita pelo
client.

## Correção

`saveStateProgress` passou a receber dois parâmetros — total de
perguntas da rodada e total de acertos — e usa cada um para o campo
correto:

```ts
// depois
async function saveStateProgress(totalThisRound: number, correctsThisRound: number) {
  if (!user || !stateId || totalThisRound === 0) return;
  ...
  const newAnswered = Math.min(prevAnswered + totalThisRound, PROGRESS_GOAL);
  const newCorrect  = Math.min(prevCorrect  + correctsThisRound, PROGRESS_GOAL);
  ...
}
...
saveStateProgress(questions.length, scoreRef.current),
```

## Dados afetados

Apenas contas de teste. Os registros de `public.user_state_progress`
com `questions_answered == correct_answers` foram totalmente apagados
(`DELETE FROM public.user_state_progress`) em vez de corrigidos, pois
a taxa real de acerto por pergunta não era registrada em nenhuma
outra tabela para esse modo (diferente do modo duelo, que grava em
`match_answers`) — não havia como recuperar o valor real
retroativamente.

## Prevenção futura

Considerar migrar o modo de exploração por estado para também gravar
respostas individuais (como já é feito em `match_answers` para
duelos), permitindo auditoria e recomputo caso um bug similar volte
a ocorrer.
