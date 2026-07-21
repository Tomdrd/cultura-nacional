# Log de decisões (append-only)

Só adicione linhas novas no fim. Nunca reescreva entradas antigas — se algo
mudou, adicione uma entrada nova explicando a mudança. De tempos em tempos,
alguém consolida o que ainda é relevante daqui pros arquivos estáveis em
`docs/*.md` e limpa o resto.

Formato: `- YYYY-MM-DD: descrição curta. Detalhe/motivo se necessário.`

---

- 2026-07-19: Domínio `culturanacional.com.br` configurado (DNS no
  Registro.br, domínios adicionados no Vercel para os dois projetos). Ver
  `docs/DEPLOY.md`.
- 2026-07-19: Rotas do admin panel traduzidas para português
  (`/questoes`, `/relatorios`, `/usuarios`, `/estados`, `/finalizar-compra`).
  `auth/callback` e `auth/reset-password` do mobile **não** foram mexidas —
  dependem de config externa no Supabase Auth, risco maior.
- 2026-07-19: Landing page (`public/landing.html`) redesenhada do zero para
  atender exigência de verificação de branding OAuth do Google (página
  inicial não podia ficar atrás de login). Ver `docs/DEPLOY.md` para o
  mecanismo de build que serve landing page e app no mesmo domínio.
- 2026-07-19: SEO da landing page levado a 100/100/100/100 no PageSpeed
  Insights (fontes assíncronas, imagens otimizadas, `<main>` landmark,
  robots.txt/sitemap corrigidos). Admin panel protegido contra indexação.
- 2026-07-19: Descoberto e corrigido o bug de "path não mapeado no linking
  config gera URL quebrada" pela primeira vez (`/Home`). Ver
  `docs/NAVIGATION.md` — esse mesmo bug se repetiu mais 2 vezes depois (CTA
  da landing e tela CidadeSetup) antes de mapear todas as telas de uma vez.
- 2026-07-19: Corrigidos os 3 erros de `tsc --noEmit` sobre imports de
  `.svg` (faltava `src/types/svg.d.ts`). `tsc --noEmit` deve rodar limpo a
  partir de agora — se não estiver, investigar antes de assumir que é
  "sempre foi assim".
- 2026-07-19: Revertido teste de visual "vidro fosco" (glassmorphism) na
  HomeScreen, voltando ao padrão anterior — decisão do produto, não bug. O
  redesign visual da Home fica pendente para quando os detalhes técnicos
  estiverem resolvidos.
- 2026-07-20: Corrigido redirect do login Google para o domínio novo
  (`LoginScreen.tsx`, feito em sessão paralela — commit `f06004e`).
- 2026-07-20: `HomeScreen` parava de mostrar spinner de tela cheia toda vez
  que ganhava foco; corrigido com staleness de 30s antes de refazer fetch
  (feito em sessão paralela — commit `f222939`).
- 2026-07-20: Criada rota reservada `/app` (`AppEntryScreen`) para links
  externos abrirem o app com segurança, tanto logado quanto deslogado — ver
  `docs/NAVIGATION.md`. Um commit paralelo (`c3097e1`) tinha mudado o CTA da
  landing para `/Home`, o que reintroduziu o bug de path não mapeado; por
  isso a rota reservada existe agora, para essa classe de bug não se repetir
  de novo.
- 2026-07-20: Documentação reestruturada neste formato (estável em
  `docs/*.md` + log append-only aqui), porque múltiplas sessões de IA sem
  visibilidade entre si precisam de uma fonte de verdade compartilhada que
  não fique obsoleta.
- 2026-07-20: Auditoria de performance/segurança no banco (via advisor do
  Supabase MCP, sem passar por este repo — mudanças só no banco, nenhum
  arquivo de código alterado):
  - Adicionados 14 índices em foreign keys sem cobertura (`matches`,
    `match_answers`, `profiles`, `question_reports`, `user_achievements`,
    `user_badges`, `user_seen_questions`, `user_state_progress`, `badges`,
    `city_rankings`). Puramente aditivo.
  - 34 policies de RLS reescritas trocando `auth.uid()`/`auth.role()` por
    `(select auth.uid())`/`(select auth.role())` — mesma lógica de acesso,
    mas avaliada uma vez por statement em vez de por linha. Ver
    `docs/DATABASE.md` se for mexer em RLS: reaproveitar esse padrão em
    policies novas.
  - **Falha de segurança corrigida**: `question_reports` tinha a policy
    `reports_admin_update` com `qual = true` — **qualquer pessoa, mesmo sem
    login, podia atualizar qualquer report de qualquer usuário**. Removida.
    Junto com ela, removidas `reports_select_all` (liberava leitura de
    todos os reports pra qualquer autenticado) e `reports_select_own`/
    `reports_admin_select` (lógica antiga, checava `profiles.plan = 'edu'`,
    incoerente com o `is_admin()` usado no resto do banco). Hoje
    `question_reports` só permite: usuário cria o próprio report (`INSERT`,
    `auth.uid() = user_id`); só admin (`is_admin()`) lê e atualiza.
  - `admin_emails` também liberava leitura pra qualquer usuário autenticado
    via a policy `"authenticated users can view admin_emails"` (`qual =
    true`). Removida — agora só `is_admin()` lê essa tabela. Isso não quebra
    `is_admin()` (usada em várias outras policies) porque a função é
    `SECURITY DEFINER` e não depende de RLS pra se autoconsultar.
  - **Pendente, não mexido**: `user_achievements` tem duas constraints
    UNIQUE idênticas (`user_achievements_unique_user_achievement` e
    `user_achievements_user_id_achievement_id_key`, ambas
    `UNIQUE (user_id, achievement_id)`). Antes de dropar uma, procurar no
    código por `ON CONFLICT ON CONSTRAINT user_achievements_unique_user_achievement`
    ou pelo nome `_key` — se algum INSERT/upsert referenciar o nome
    específico, dropar a errada quebra esse código.
