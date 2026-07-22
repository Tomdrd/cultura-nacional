# Incident: Resposta correta sempre na opção A — 75% das perguntas

**Data:** 2026-07-22  
**Severidade:** Crítica (afeta integridade do jogo)  
**Descoberto por:** Teste manual (usuário percebeu que selecionar sempre a letra A acertava na maioria dos casos)  
**Status:** Resolvido

---

## O problema

Das 1.652 perguntas ativas no banco:

| answer_index | Total | % |
|---|---|---|
| 0 (opção A) | 1.244 | **75,3%** |
| 1 (opção B) | 252 | 15,3% |
| 2 (opção C) | 136 | 8,2% |
| 3 (opção D) | 20 | 1,2% |

Selecionar sempre a letra A acertava 3 de cada 4 perguntas — tornando o quiz trivial para qualquer usuário que percebesse o padrão.

## Causa raiz

As perguntas foram geradas por IA (Gemini/GPT) e inseridas no banco sem embaralhamento de opções. A IA naturalmente colocava a resposta correta na primeira posição (`answer_index = 0`), e o pipeline de inserção não randomizava a ordem.

O `get_random_quiz_questions` retornava as opções na ordem original do banco. O `submit_answer` comparava o índice recebido do cliente diretamente com o `answer_index` armazenado — sem qualquer embaralhamento.

## Solução implementada

Embaralhamento **no servidor**, no RPC `get_random_quiz_questions`, sem alterar a interface do cliente.

**Fluxo novo:**
1. `get_random_quiz_questions` sorteia as perguntas normalmente
2. Para cada pergunta, aplica Fisher-Yates nas opções
3. Persiste o mapeamento `shuffled_order` em `question_shuffle_map` (user_id + question_id)
4. Retorna as opções já embaralhadas — sem expor o gabarito
5. Cliente exibe as opções na ordem recebida e envia o índice clicado
6. `submit_answer` consulta o `question_shuffle_map`, converte o índice embaralhado → original, compara com `answer_index` do banco
7. Retorna `correct_index` já na posição embaralhada (para o cliente destacar a opção certa)

**Decisões de design:**
- Gabarito **nunca** é enviado ao cliente antes da resposta
- Interface de retorno do RPC e do `submit_answer` permanece idêntica — zero mudança em `QuizScreen.tsx`
- Usuários anônimos (sem `user_id`) não têm embaralhamento persistido; usam o índice diretamente (comportamento anterior — aceitável pois anônimos não têm ranking)
- `question_shuffle_map` tem RLS: cada usuário só acessa o próprio mapeamento

**Objetos criados/alterados:**
- `public.question_shuffle_map` — tabela nova
- `public.questions_for_quiz` — tipo novo (substitui `questions_safe` como retorno do RPC)
- `public.get_random_quiz_questions` — recriado (DROP + CREATE, tipo de retorno mudou)
- `public.submit_answer` — alterado (de-map antes da comparação)
- Migration: `fix_quiz_answer_shuffle`

## Prevenção futura

Todo pipeline de geração de perguntas por IA deve:
1. Embaralhar as opções antes de inserir no banco
2. Nunca colocar a resposta correta em posição fixa (especialmente índice 0)
3. Verificar distribuição de `answer_index` após inserção em lote:
   ```sql
   SELECT answer_index, COUNT(*), ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as pct
   FROM questions WHERE active = true
   GROUP BY answer_index ORDER BY answer_index;
   ```
   Distribuição saudável esperada: ~25% por posição (±10%).
