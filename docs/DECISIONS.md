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
- 2026-07-21: Etapa de app mobile do sistema de ranking de qualidade de
  perguntas (continuação do item acima). Antes de começar, sincronizei com
  14 commits novos no remoto (deep link de perfil público, redirect
  `/undefined`, docs novas) — nenhum conflito com o que segue.
  - `QuizScreen`: botões 👍/👎 no painel de feedback (ao lado do 🚩 de
    denúncia já existente), upsert em `question_ratings`. Resetados a cada
    pergunta nova e ao "jogar novamente".
  - Nova tela `TopQuestionsScreen` (`src/screens/questions/`), rota
    `TopQuestions` / path `/destaques`, card de entrada na Home ("Destaques").
    Mostra só perguntas com `flag = 'boa'` — decisão de escopo: o app foca só
    no lado positivo/engajamento ("melhores"); o lado "piores" (fila de
    revisão de conteúdo) é o `painel admin`, não faz sentido expor pergunta
    marcada como problemática pro usuário comum.
  - Nova função `top_rated_questions(p_limit)`: versão fina de
    `question_health()` já filtrada (`flag='boa'`) e ordenada, pra não trazer
    as 1.600+ perguntas pro cliente à toa.
  - **Achado de segurança corrigido antes de virar bug em produção**:
    `question_health()`/`top_rated_questions()` foram criadas sem
    `SECURITY DEFINER`. Como `question_ratings` só deixa o usuário ler o
    próprio voto (RLS) e `question_reports` só admin lê, um usuário comum
    chamando essas funções via RPC veria contagens erradas (só o próprio
    voto, zero denúncias) — o agregado precisa rodar com privilégio do dono
    da função, igual `submit_answer`. Corrigido com `ALTER FUNCTION ...
    SECURITY DEFINER` nas duas. **Se criar função nova que agrega dados
    entre usuários de tabela com RLS restritivo, sempre `SECURITY DEFINER`
    — não é opcional.**
  - **Observação, não corrigida (fora de escopo desta tarefa)**:
    `src/types/navigation.ts` ainda tipa `PublicProfile: { userId: string }`,
    mas o `PublicProfileScreen` já foi corrigido (commit de outra sessão,
    2026-07-21) pra receber `slug`, não `userId`. O tipo ficou desatualizado
    em relação ao código real — não mexi por não ser relacionado a esta
    tarefa, mas vale corrigir na próxima sessão que mexer em perfil público.
- 2026-07-21: Etapa do **painel admin** (`cultura-nacional-admin`, repo
  separado) do sistema de ranking de qualidade de perguntas — registrado
  aqui por ser conhecimento de banco/decisão compartilhada entre os dois
  repos, por instrução do `AGENTS.md` de lá.
  - Nova página `QualityPage.tsx` (`/qualidade`, item "Qualidade" no
    Sidebar), consumindo `question_health()` diretamente (com paginação via
    `.range()` + `count: 'exact'` encadeado no `.rpc()`, mesmo padrão de
    paginação já usado em `QuestionsPage.tsx`). Abas por `flag`
    (problemática/atenção/boa/sem dados), modal de detalhe que busca as
    denúncias da pergunta (`question_reports`) e permite marcar
    corrigido/descartado direto ali (reaproveitando a mesma ação já usada em
    `ReportsPage.tsx`).
  - **Observação, não corrigida (fora de escopo)**: `ReportsPage.tsx` usa a
    classe `btn-danger`, que **não existe** em `index.css` (só `btn-primary`
    e `btn-secondary` estão definidas) — o botão "Descartar" ali renderiza
    sem estilo de botão nenhum. Não mexi por não ser relacionado a esta
    tarefa (evitei usar essa classe na `QualityPage.tsx` nova). Vale
    corrigir (ou adicionar a classe faltante, ou trocar pelas duas
    existentes) na próxima sessão que mexer em `ReportsPage.tsx`.
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
- 2026-07-21: Pendência registrada em `docs/DEPLOY.md` — trocar o e-mail
  pessoal `antonyeltonrodrigues@gmail.com` por
  `contato@culturanacional.com.br` em landing/termos/privacidade e no
  cadastro do Registro.br, **assim que o e-mail novo estiver configurado e
  recebendo de verdade**. Não fazer a troca antes disso (o contato é usado
  pra exercício de direitos de LGPD).
- 2026-07-21: Resolvida a pendência do deep link `/:slug` deixada em aberto
  antes (ver entrada anterior "Deep link `/:slug` ... foi deixado de fora
  intencionalmente"). `PublicProfileScreen` só lia `route.params.userId`,
  nunca `route.params.slug` — resultado: todo link de perfil compartilhado
  clicado direto (fora do app) caía em "Perfil não encontrado", com dezenas
  de erros `invalid input syntax for type uuid: "undefined"` nos logs do
  Postgres (as 3 queries da tela rodando com userId indefinido, em rajada,
  a cada acesso). Corrigido: a tela agora resolve `slug` contra
  `profile_slug OR username` (ambos com índice único no banco) antes de
  disparar qualquer query de perfil. `handleCopyUrl` e a URL exibida também
  passaram a priorizar `profile_slug` sobre `username`, igual já era feito
  no `ProfileScreen`. Rota `PublicProfile: ':slug'` no linking config já
  estava correta, não precisou mexer nela.
- 2026-07-21: Descoberto (ainda não corrigido, aguardando confirmação):
  `PublicProfile` só existe dentro do `AppNavigator`, que só é montado se
  `session` existir no `RootNavigator`. Sem sessão, só o `AuthNavigator`
  monta — e como ele não tem nenhuma tela compatível com `/:slug`, o React
  Navigation cai na rota inicial do stack (`Login`, path `auth/callback`).
  **Resultado: perfil público não é de fato público** — visitante deslogado
  que clica num link de perfil compartilhado é redirecionado pra
  `/auth/callback` em vez de ver o perfil. Correção planejada: mover
  `PublicProfile` pra fora do `AppNavigator`, como tela sempre montada no
  nível raiz do `RootNavigator` (ao lado do `App`/`Auth` condicional), e
  ajustar o `linking.config` correspondente. Ainda não implementado nesta
  sessão — mexe na divisão raiz Auth/App, aguardando confirmação explícita
  antes de tocar em rota de autenticação.
- 2026-07-21: Criado `docs/DEEP_LINKING.md` — plano (não implementado) de
  Universal Links (iOS) / App Links (Android). Motivo: hoje um link
  `https://culturanacional.com.br/algumusername` tocado no celular abre no
  navegador, não no app instalado — `app.json` só tem o scheme customizado
  `culturanacional://`, sem `associatedDomains`/`intentFilters` nem os
  arquivos de verificação (`apple-app-site-association`/`assetlinks.json`)
  hospedados no domínio. Não é urgente (o fallback web funciona), mas exige
  credenciais que uma sessão de IA não tem (Apple Team ID, SHA256 do
  certificado do Google Play App Signing) e termina em build nativo novo +
  submissão pras lojas — não é só um commit. Checklist de pré-requisitos no
  próprio arquivo.
- 2026-07-21: Corrigido (com confirmação explícita antes de mexer, por ser
  rota de autenticação) o bug descoberto na entrada anterior: `PublicProfile`
  saiu de dentro do `AppNavigator` e virou tela sempre montada na raiz do
  `RootNavigator`, ao lado do `App`/`Auth` condicional — agora existe
  independente de sessão ativa. `linking.config` ajustado (movido
  `PublicProfile: ':slug'` pra fora de `App.screens`, pra raiz). Chamadas
  internas (`navigation.navigate('PublicProfile', ...)` no Ranking,
  FollowList, Notifications) continuam funcionando via propagação padrão do
  React Navigation pro navegador pai. **Efeito colateral pego e corrigido no
  mesmo commit**: `handleBack` em `PublicProfileScreen` fazia
  `navigation.reset({ routes: [{ name: 'HomeTabs' }] })` quando não havia
  histórico — `HomeTabs` só existe dentro do `AppNavigator`, não na raiz;
  agora reseta pra `'App'` (que abre `HomeTabs` por conta própria) ou
  `'Auth'`, dependendo de ter usuário logado. **Testar bem o botão de
  voltar** (logado e deslogado, com e sem histórico) antes de considerar
  isso 100% fechado.
- 2026-07-21: Verificação de branding do Google (OAuth) aprovada e
  publicada em produção (`console.cloud.google.com/auth/branding?project=cultura-nacional`).
  Status mudou de "verificada, mas ainda não aparecendo" (aviso de expirar
  em 7 dias) para "verificada e aparecendo para os usuários" depois de
  clicar em "Publicar branding". Login com Google deixa de mostrar a tela
  de aviso "app não verificado" pra qualquer usuário, não só contas de
  teste. Ver `docs/DEPLOY.md` (seção "Verificação de branding do Google").
- 2026-07-21: Corrigido bug reportado pelo usuário — CTA "Jogar agora" e
  retorno do login Google redirecionavam para `/undefined`. Regressão da
  promoção do `PublicProfile` pra raiz (entrada acima). Post-mortem
  completo em `docs/incidents/2026-07-21-root-navigator-undefined-redirect.md`;
  regra permanente em `docs/NAVIGATION.md` ("Stack raiz — initialRouteName
  é obrigatório").
- 2026-07-21: Corrigido bug reportado pelo usuário: botão de voltar parava
  de funcionar em qualquer tela após trocar de aba do navegador e voltar.
  Causa raiz: `TOKEN_REFRESHED` do Supabase (disparado automaticamente ao
  focar a aba) fazia `authStore.ts` setar `profileLoading: true` mesmo pro
  mesmo usuário já logado; `RootNavigator.tsx` usa esse flag pra decidir
  entre mostrar o app ou um `ActivityIndicator` full-screen, então cada
  ciclo desmontava e remontava o `NavigationContainer` inteiro — perdendo
  todo o histórico de navegação. Corrigido só disparando o refetch de
  perfil quando o usuário realmente muda (comparação de `id`), não a cada
  evento de auth. Write-up completo em
  `docs/incidents/2026-07-21-profileLoading-desmonta-navegacao.md`.
- 2026-07-21: Corrigido bug reportado pelo usuário: "Limpar notificações" em
  `NotificationsScreen.tsx` parecia funcionar mas não apagava nada de
  verdade. Causa raiz: `Alert.alert()` nativo com múltiplos botões não
  dispara `onPress` de forma confiável no build web (react-native-web); o
  projeto já tinha `CustomAlert.tsx` como substituto pronto pra isso, só
  essa tela não tinha sido migrada. Aproveitado o pedido do usuário pra
  adicionar exclusão de notificação individual também. Write-up completo em
  `docs/incidents/2026-07-21-alert-alert-nao-funciona-web.md` — inclui
  auditoria confirmando que nenhuma outra tela usa `Alert.alert` com
  múltiplos botões (só alertas de um botão, que continuam seguros).
- 2026-07-21: Resolvido o bloqueio no formulário de contato (Edge Function
  `send-email` rejeitada pela Brevo com "sender not valid"). Causa raiz:
  domínio duplicado na Brevo (`mail.culturanacional.com.br` cadastrado como
  domínio próprio, além do `culturanacional.com.br` real) gerando registros
  DNS conflitantes. Tentativa de autenticar via delegação NS do subdomínio
  `mail` não propagou de forma confiável em 24h+; trocado para "Registros
  DNS individuais" (TXT/CNAME direto na raiz do domínio), que autenticou em
  minutos. Remetente `contato@culturanacional.com.br` cadastrado e
  verificado automaticamente. Teste ponta a ponta confirmado (Edge Function
  → Brevo → Cloudflare Email Routing → Gmail). Post-mortem completo em
  `docs/incidents/2026-07-21-brevo-dominio-email-nao-autenticado.md`.
- 2026-07-21: Consolidados os dois objetos de tema paralelos (`HomeTheme` e
  `Colors`) que coexistiam em `src/constants/colors.ts` em um só
  (`HomeTheme`). Levantamento mostrou que `HomeTheme` já era o padrão
  dominante (26 telas/componentes, incluindo os primitivos compartilhados
  Button/Input/CustomAlert/ScreenContainer) contra apenas 4 arquivos usando
  `Colors` via `useTheme()` (ReportModal, WelcomePlanModal, RootNavigator,
  SubscriptionScreen) -- nenhum deles importava `Colors` diretamente, só
  através do hook, então bastou trocar a fonte dentro de `useTheme.ts`.
  `HomeTheme` ganhou os campos que faltavam (`background`, `textSecondary`,
  `textMuted`, `primary`, `accent`), derivados dos mesmos valores base
  (`bg`, `muted`, `green`, `yellow`) para não haver dois lugares pra editar
  a mesma cor. `Colors.brand` virou `BrandColors` (nada mais o referenciava
  fora do próprio arquivo). `npx tsc --noEmit`: 0 erros antes e depois.
  **Efeito colateral esperado, não um bug**: os 4 arquivos migrados têm
  agora um tom de fundo/borda/cinza ligeiramente diferente no dark mode
  (ex: fundo `#0A0A0A` → `#0e1015`), porque os dois temas nunca foram
  idênticos de verdade, só pareciam por terem nomes de campo parecidos.
  **Pendente**: `RootNavigator.tsx` está entre os 4 migrados e é a "área de
  maior risco do projeto" (ver seção própria no AGENTS.md) -- este ambiente
  não tem simulador/dispositivo pra rodar o checklist de navegação
  (URLs logado/deslogado, login, logout) que o próprio AGENTS.md exige
  antes de mexer nesse arquivo. **Precisa de teste manual do usuário antes
  de considerar 100% seguro.**
- 2026-07-22: Auditado o impacto do refactor de tema acima em
  `RootNavigator.tsx` (sem rodar código, só leitura): `colors` só é usado
  ali em dois pontos cosméticos da tela de loading
  (`backgroundColor: colors.background`, `color: colors.primary`) --
  `linking.config`, `initialRouteName` e o resto da lógica de roteamento
  não foram tocados pelo commit `6572a2a`. **Risco de regressão de
  navegação: nulo.** Só falta validação visual (não funcional) do tom do
  spinner/fundo no dark mode, que qualquer sessão futura pode marcar como
  resolvida assim que o usuário confirmar visualmente.
- 2026-07-22: E-mail pessoal `antonyeltonrodrigues@gmail.com` substituído por
  `contato@culturanacional.com.br` em `public/landing.html`,
  `public/termos.html` e `public/privacidade.html` (rodapé, seção de
  contato/LGPD). Condição da pendência anterior satisfeita — domínio
  autenticado e recebendo de verdade (ver incidente
  2026-07-21-brevo-dominio-email-nao-autenticado.md). Ainda falta trocar o
  e-mail de contato/titular no painel do Registro.br (fora deste repo).
- 2026-07-22 [Bia]: Usuário reportou favicon aparecendo como globo cinza
  padrão no resultado de busca do Google. Investigado e **não é bug de
  código**: tag `<link rel="icon" href="/favicon.png">` presente em
  `public/landing.html`, arquivo `public/favicon.png` existe (48×48 PNG,
  dentro do mínimo recomendado), acessível ao vivo em produção, e
  `robots.txt` não bloqueia a raiz para o Googlebot. Era atraso normal de
  indexação (site com verificação de branding recém publicada em 21/07).
  Resolvido pedindo reindexação manual via Google Search Console →
  Inspeção de URL → "Solicitar indexação". Se o globo cinza persistir por
  semanas depois disso, aí sim vale investigar mais a fundo (ex: cache de
  CDN servindo versão antiga, ou Googlebot recebendo resposta diferente da
  do navegador comum).
- 2026-07-22 [Nara]: Revisão de organização, sem mudança de código. Usuário
  pediu um resumo histórico do projeto pra ajudar a organizar o que cada
  integrante da equipe já fez. Conferido `git log` (todos os commits
  aparecem como `Tomdrd`, já que a identidade git segue o histórico do
  repo, não o nome da sessão de IA) e `docs/DECISIONS.md` (só a entrada da
  Bia sobre o favicon estava assinada até este ponto — a convenção de
  `docs/EQUIPE.md` é recente, então não há como atribuir retroativamente
  o restante do log a integrantes específicos). Criado
  `docs/PROMPT_ONBOARDING_IA.md`: prompt genérico reutilizável pra iniciar
  a sessão de qualquer integrante da equipe (só troca o nome), cobrindo
  leitura obrigatória de `AGENTS.md`/`CLAUDE.md`/`docs/DECISIONS.md` antes
  de editar e a convenção de assinatura ao registrar decisões.
- 2026-07-22 [Elis]: fix(viral): corrigido edge case de múltiplos taps em "Começar gravação" sem efeito visível. Causa: `handleStart` era async e o botão só ficava `disabled` durante `loadQuestions()`, não durante `requestAllPermissions()` (que abre diálogo do sistema e bloqueia por tempo indeterminado). Taps adicionais nesse intervalo disparavam `handleStart` em paralelo, causando race condition entre estados de fase/perguntas. Correção: `startingRef` (ref, não state — sem re-render extra) travado antes do primeiro `await` e liberado no `finally`. Ver `src/screens/viral/ViralModeScreen.tsx`.
- 2026-07-22 [Elis]: Entrada na equipe, sem mudança de código. Lido
  `AGENTS.md`, `CLAUDE.md`, `docs/EQUIPE.md` e este log inteiro pra me situar.
  Dois pontos que ficam mais no radar pra próximas tarefas: (1)
  `RootNavigator.tsx`/`linking.config` é a área de maior risco do projeto (já
  3 incidentes de path/redirect quebrado) — antes de mexer ali, rodar o
  checklist de URLs logado/deslogado + login/logout do `AGENTS.md`; e (2) o
  refactor de tema (`HomeTheme` consolidado, `Colors` removido) ainda tem uma
  validação visual pendente do dark mode em `RootNavigator.tsx` aguardando
  confirmação do usuário.
- 2026-07-22 [Vitória]: Entrada na equipe, sem mudança de código. Lido
  `AGENTS.md`, `CLAUDE.md`, `docs/EQUIPE.md` e este log inteiro pra me situar.
  Dois pontos relevantes pra próximas tarefas: (1) `RootNavigator.tsx`/
  `linking.config` é a área de maior risco do projeto — 3+ incidentes de
  path não mapeado/redirect quebrado já documentados, sempre rodar o
  checklist de URLs logado/deslogado + login/logout do `AGENTS.md` antes de
  mexer ali; e (2) a consolidação de tema (`HomeTheme` único, `Colors`
  removido) está feita, mas ainda falta validação visual manual do dark
  mode em `RootNavigator.tsx` — sem simulador/dispositivo neste ambiente
  pra confirmar, depende do usuário testar ao vivo.
- 2026-07-22 [Marina]: Entrada na equipe, sem mudança de código. Lido
  `AGENTS.md`, `CLAUDE.md`, `docs/EQUIPE.md` e este log inteiro pra me situar.
  Principais aprendizados: (1) `RootNavigator.tsx`/`linking.config` é a área
  crítica do projeto com 3+ incidentes de routing/redirect quebrado —
  checklist obrigatório antes de mexer ali (URLs logado/deslogado +
  login/logout do `AGENTS.md`); (2) consolidação de tema para `HomeTheme`
  único já está fechada, mas validação visual do dark mode em
  `RootNavigator.tsx` ainda pendente (sem simulador neste ambiente).
- 2026-07-22 [Aurora]: Entrada na equipe, sem mudança de código. Lido
  `AGENTS.md`, `CLAUDE.md`, `docs/EQUIPE.md` e este log completo pra me situar.
  Aprendizados-chave: (1) `RootNavigator.tsx`/`linking.config` área crítica com
  histórico de 3+ bugs de routing — checklist mandatório de URLs
  logado/deslogado + login/logout antes de mexer ali; (2) tema consolidado em
  `HomeTheme` único, validação visual dark mode em `RootNavigator.tsx` ainda
  pendente.
- 2026-07-22 [Vitória]: Aumentada a quantidade de perguntas de Fortaleza (CE)
  de 13 para 30, igualando o padrão das demais capitais (mudança só no banco,
  nenhum arquivo de código alterado). Distribuição final por subcategoria:
  Cultura 6, Curiosidades 5, Gastronomia 6, História 5, Turismo 6, Natureza 2
  (Natureza estava zerada). Todas as 17 perguntas novas foram checadas contra
  fontes externas antes de escrever (Theatro José de Alencar/estrutura de
  ferro da Escócia, Parque Estadual do Cocó, Ponte dos Ingleses, cajuína/
  Rodolfo Teófilo, Quinta do Caranguejo na Praia do Futuro, lei de janeiro/
  2025 que reconheceu as barracas da Praia do Futuro como Patrimônio Cultural
  Brasileiro, seca de 1915/campo de concentração do Alagadiço, estátua
  Iracema Guardiã). Mesmo padrão de estrutura das perguntas existentes
  (4 alternativas, `explanation` com justificativa factual, `city_id`/
  `state_id` de Fortaleza/Ceará). **Observação para quem for repetir esse
  processo em outra cidade**: nenhuma cidade não-capital tem perguntas hoje
  (nem Sobral, verificado nesta sessão) — o padrão de 30 perguntas por
  cidade existe só para as 27 capitais; Boa Vista (RR), Porto Velho (RO) e
  Palmas (TO) ainda estão zeradas, candidatas óbvias para a próxima rodada.

- 2026-07-22 [Nara]: BUG CRÍTICO de segurança no quiz — resposta correta
  sempre na opção A em 75,3% das perguntas (1.244 de 1.652). As perguntas
  foram geradas por IA sem embaralhamento de opções; o banco armazenava o
  answer_index original (0 na maioria dos casos). Selecionar sempre a letra A
  acertava 3 de cada 4 perguntas.
  SOLUÇÃO: embaralhamento Fisher-Yates no RPC get_random_quiz_questions,
  com mapeamento persistido em question_shuffle_map (user_id, question_id,
  shuffled_order). O submit_answer faz o de-map antes de comparar com o
  gabarito — gabarito nunca exposto ao cliente. correct_index retornado ao
  cliente agora reflete a posição embaralhada. Migration aplicada:
  fix_quiz_answer_shuffle. Nenhuma mudança necessária no QuizScreen.tsx
  (interface de retorno do RPC e do submit_answer permanece idêntica).
  ATENÇÃO FUTURA: todo pipeline de geração de perguntas por IA deve
  embaralhar as opções antes de inserir no banco, e nunca colocar a resposta
  correta sempre na mesma posição.
