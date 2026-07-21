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
