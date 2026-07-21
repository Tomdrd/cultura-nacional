# Banco de dados (Supabase)

Projeto: `fvgvnvzziukvplpyvqki` — compartilhado entre este repo e o
`cultura-nacional-admin`.

## Risco de sessões paralelas — leia isso antes de mexer em função/trigger

**Várias sessões de IA editam este banco ao mesmo tempo, sem visibilidade
umas das outras.** Antes de qualquer `CREATE OR REPLACE FUNCTION` ou mudança
em trigger já existente, **sempre rode `pg_get_functiondef` primeiro** para
ver a definição *ao vivo* — nunca assuma que o último estado que você
lembra (ou que está documentado aqui) ainda é o atual. Outra sessão pode ter
mudado a função depois da última vez que você (ou este documento) olhou.

```sql
select pg_get_functiondef('nome_da_funcao'::regproc);
```

## `execute_sql` só retorna o último resultado

Se rodar múltiplos statements SQL numa única chamada, só o resultado do
último volta. Para múltiplos result sets, faça chamadas separadas.

## `questions_safe` (view)

Omite intencionalmente `answer_index` e `explanation`. Qualquer função que
retornar `SETOF questions_safe` só pode selecionar colunas presentes nessa
view — não adicione `answer_index`/`explanation` nela.

## Funções `STABLE` e aleatoriedade

O planner do Postgres faz cache de resultado de função `STABLE` dentro de uma
mesma execução de query. **Nunca marque uma função com lógica randômica como
`STABLE`** — o resultado vai ficar preso/repetido dentro da mesma query. Para
testar uma função randômica, use chamadas de query separadas.

## Perguntas por cidade vs. por estado

- Pergunta específica de cidade: usa `state_id` **e** `city_id`.
- Pergunta geral do estado: usa só `state_id`, com `city_id` nulo.

## `get_random_quiz_questions`

Faz fallback cidade → estado com reservoir sampling ponderado e ordenação de
dificuldade progressiva. O modo Relâmpago usa aleatoriedade pura via o
parâmetro `p_progressive`.

## RLS: sempre `(select auth.uid())`, nunca `auth.uid()` cru

Em qualquer policy nova, escreva `(select auth.uid())` (ou `auth.role()`)
em vez de chamar a função direto. O Postgres cacheia o resultado de uma
subquery uma vez por statement; a chamada direta é reavaliada linha a linha,
o que fica caro em tabelas grandes. Mesma lógica de acesso, plano de
execução melhor. Ver `docs/DECISIONS.md` (2026-07-20) para o histórico da
correção retroativa.

## Auditoria de migrations aplicadas

```sql
select version, name
from supabase_migrations.schema_migrations
order by version desc
limit 40;
```

## Estado do conteúdo (perguntas)

Preenchimento em lotes de 30, com fact-checking via busca web e checagem de
duplicidade antes de inserir. Meta: 80 perguntas por capital, nas 27 capitais
estaduais. Ver `docs/DECISIONS.md` para o progresso mais recente (cidade
atual da fila).

## Ranking de qualidade de perguntas (`question_health`)

Sistema pra identificar perguntas problemáticas (gabarito errado, ambíguas,
desatualizadas) e perguntas bem avaliadas, usado tanto no app quanto no
painel admin (`cultura-nacional-admin`).

**Sinais e onde vivem:**
- `questions.times_answered` / `questions.times_correct` — contadores
  incrementados dentro de `submit_answer()` a cada resposta do quiz normal
  (fora de duelo). Não existe tabela de histórico por resposta aqui, só o
  agregado — se precisar de granularidade por usuário/tentativa no futuro,
  isso precisa de uma tabela nova.
- `question_reports` — denúncias manuais já existentes. Só conta como sinal
  negativo se `status <> 'dismissed'`.
- `question_ratings` — tabela nova, 1 linha por `(user_id, question_id)`
  com `is_positive boolean` (👍/👎 explícito do usuário no app).

**Função `question_health(p_min_answers, p_min_reports, p_min_votes)`**
Retorna, por pergunta ativa, os números crus (acerto observado, média de
acerto das perguntas da mesma `difficulty`, denúncias ativas/total, votos
positivos/negativos) e uma `flag`: `problematica` / `atencao` / `boa` /
`sem_dados`. Os pisos são parâmetros com default (10 respostas, 2 denúncias,
5 votos) — ajuste esses números conforme o volume de uso crescer, sem
precisar reescrever a função, ex: `select * from question_health(30, 3, 10)`.
**Ambas `question_health()` e `top_rated_questions()` são `SECURITY
DEFINER`** — obrigatório, já que agregam entre usuários dados protegidos por
RLS (`question_ratings`, `question_reports`); sem isso, cada usuário só
enxergaria o próprio voto/denúncia na agregação.

`top_rated_questions(p_limit)` — versão fina de `question_health()`, já
filtrada (`flag = 'boa'`) e ordenada por votos, usada pela tela `TopQuestions`
do app (`/destaques`). Evita trazer as 1.600+ perguntas pro cliente à toa.

**No app mobile**: `QuizScreen` tem os botões 👍/👎 (upsert em
`question_ratings`, ao lado do 🚩 de denúncia já existente); `TopQuestions`
mostra só as `boa` — decisão de escopo: o app foca no lado
positivo/engajamento, a fila de revisão (`problematica`/`atencao`) é para o
painel admin, não faz sentido expor pergunta marcada como problemática pro
usuário comum.

**Importante:** taxa de erro crua não indica pergunta ruim — perguntas
`hard` erram mais por natureza. Por isso a função compara o acerto de cada
pergunta com a **média do próprio nível de dificuldade** (só entre perguntas
com volume mínimo), não com um número fixo. Ver `docs/DECISIONS.md`
(2026-07-21) para o histórico da decisão e o racional completo.
