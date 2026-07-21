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
- 2026-07-21: `EstadosScreen` ainda usava um objeto `COLORS` fixo (hardcoded,
  só dark), sem aplicar `useTheme`/`HomeTheme` — modo claro não tinha efeito
  nessa tela. Corrigido seguindo o padrão de `CategoriasScreen`: `const {
  isDark } = useTheme()`, `HomeTheme.dark`/`HomeTheme.light`, cores aplicadas
  inline (StyleSheet só com layout), `StatusBar barStyle` condicional. Se
  encontrar outra tela com objeto `COLORS` local fixo em vez de `HomeTheme`,
  provavelmente tem o mesmo bug.
- 2026-07-21: Varredura feita em todas as 21 telas de `src/screens` atrás do
  mesmo bug do item acima: nenhuma outra tela define `COLORS` fixo local,
  todas já usam `useTheme`, e nenhum `container` tem `backgroundColor` fixo
  em hex. Os poucos hex fixos restantes (`ViralModeScreen`, dark;
  `CidadeSetupScreen`, `SubscriptionScreen`) são cores semânticas
  intencionais (branco sobre overlay de gravação, vermelho de erro, azul de
  marca do CTA de assinatura) — não é o mesmo problema, não mexer.
- 2026-07-21: Criado o sistema de ranking de qualidade de perguntas
  (mudanças só no banco, nenhum arquivo de código alterado ainda — app e
  admin panel ficam pra próxima etapa). Ver `docs/DATABASE.md` seção
  "Ranking de qualidade de perguntas" para a documentação estável. Resumo
  das decisões de design:
  - Taxa de erro crua não conta sozinha — só denúncia (`question_reports`,
    excluindo `dismissed`) e desvio de acerto **relativo à média do próprio
    nível de dificuldade** (não um número fixo), porque pergunta `hard`
    naturalmente erra mais. `submit_answer()` agora persiste
    `questions.times_answered`/`times_correct` (antes calculava
    `v_is_correct` e descartava, sem guardar nada).
  - Pisos mínimos escolhidos pro volume atual do app (ainda pequeno: ~1300
    perguntas já vistas, mas poucas visualizações cada): 10 respostas pra
    taxa de acerto contar, 2 denúncias ativas, 5 votos 👍/👎. São parâmetros
    da função `question_health()`, não constantes fixas — ajustar conforme
    o volume crescer, sem precisar reescrever a função.
  - Nova tabela `question_ratings` (👍/👎 explícito, 1 voto por usuário por
    pergunta, upsert se mudar de ideia) com RLS seguindo o mesmo padrão de
    `question_reports`: usuário lê/escreve o próprio voto, admin
    (`is_admin()`) lê tudo.
  - Advisor do Supabase rodado depois da migration: sem erro novo. O
    warning de "multiple permissive policies" em `question_ratings`
    (admin_select + select_own) é o mesmo padrão já presente em `questions`,
    `profiles`, `matches` etc. — não é regressão, é como o projeto já fazia.
  - **Pendente (próxima etapa)**: botão 👍/👎 no `QuizScreen` do app mobile;
    telas de "piores"/"melhores" perguntas no app e no painel admin
    (`cultura-nacional-admin`, repo separado — ainda não clonado, vai
    precisar de token novo quando chegar essa hora).
- 2026-07-21: Corrigido bug `isPro`/`isProProfile` em `ProfileScreen` e
  `PublicProfileScreen`: ambos checavam só `profile.plan === 'pro'` sem
  verificar `plan_expires_at` — usuário com plano expirado continuava com
  acesso a features Pro. Corrigido com IIFE que checa plano + expiração.
  Inclui `family` e `education` além de `pro`. `plan_expires_at` foi
  adicionado à interface e query do `PublicProfileScreen` (faltava).
- 2026-07-21: Adicionada edição de URL amigável (`profile_slug`) no
  `ProfileScreen` para usuários CN Pro ativos. Botão lápis ao lado da URL
  abre modal com preview em tempo real, validação de formato (3-30 chars,
  lowercase/números/hífens) e check de unicidade no banco. A coluna
  `profile_slug` já existia no banco (migration aplicada em sessão anterior).
  URL exibe `profile_slug` se definido, fallback para `username`.
  Domínio correto: `culturanacional.com.br` (não `cultura-nacional.vercel.app`).
- 2026-07-21: Lucide imports neste projeto usam o estilo individual
  (`import X from 'lucide-react-native/dist/esm/icons/x'`), não o named
  import (`import { X } from 'lucide-react-native'`). Sempre usar o estilo
  individual ao adicionar novos ícones — o outro quebra o bundle web.
- 2026-07-21: Deep link `/:slug` → `PublicProfileScreen` (ex: `culturanacional.com.br/tom`
  abrindo o perfil de um usuário Pro) foi deixado de fora intencionalmente nesta sessão —
  a área de routing/navigation estava sendo alterada em paralelo e o risco de conflito
  era alto. Retomar quando essa área estabilizar. Pré-requisitos já prontos: coluna
  `profile_slug` no banco (migration `add_profile_slug`), modal de edição no `ProfileScreen`,
  fix de expiração de plano em ambos os screens de perfil. O que falta: resolver o slug
  via query (`profile_slug OR username`) no `PublicProfileScreen` e mapear a rota no
  linking config do `RootNavigator` sem conflitar com rotas existentes.
- 2026-07-21: Redesign do card de pergunta aleatória na Home ficou pendente — mockups
  foram avaliados (opções A/B/C, largura total, sem label "Aleatório", ícone da
  subcategoria em destaque) mas nenhum aprovado. Retomar com nova proposta visual.
- 2026-07-20: Write-up completo do bug recorrente de "path não mapeado no linking
  config" (3 ocorrências: `/Home`, `/app.html`→`/Home` de novo, tela `CidadeSetup`)
  registrado em `docs/incidents/2026-07-19-linking-config-path-nao-mapeado.md`,
  seguindo o mesmo template de `docs/incidents/2026-07-15-quiz-desempenho-incorreto.md`
  (Sintoma/Causa raiz/Correção/Prevenção). Use esse arquivo pra entender o histórico
  completo; a lista de paths mapeados atualmente vive em `docs/NAVIGATION.md`.
- 2026-07-20: Lição de processo: uma sessão criou a estrutura `docs/*.md` +
  `docs/DECISIONS.md` (este arquivo) sem antes checar se `docs/` já tinha conteúdo —
  `mkdir -p` não avisa se o diretório já existe. `docs/incidents/` e
  `docs/PLANO_TIMER_ACESSIBILIDADE.md` já existiam desde 11–15/07 e quase foram
  ignorados na reestruturação. Nenhum arquivo foi sobrescrito (sorte, não mérito).
  **Antes de criar qualquer doc nova, rode `find docs -type f | sort` primeiro.**
- 2026-07-21: `public/termos.html` e `public/privacidade.html` redesenhadas
  para usar o mesmo design system da `public/landing.html` (tokens de cor em
  `:root` + `@media (prefers-color-scheme: light)`, fontes Plus Jakarta
  Sans/Inter/JetBrains Mono, header/footer idênticos). Antes, essas duas
  páginas tinham CSS mínimo hardcoded (sem dark mode). Texto legal
  preservado 100% — só a camada visual mudou.
