# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

---

# Cultura Nacional — guia para IAs trabalhando neste repositório

Este projeto é mantido por **várias sessões de IA em paralelo, sem
visibilidade umas das outras**. Este arquivo existe para que qualquer sessão
nova (você, agora) tenha o contexto que uma sessão anterior já descobriu, sem
precisar redescobrir do zero — e para que decisões importantes não se percam
quando a conversa que as gerou terminar.

## Antes de fazer qualquer coisa

```bash
git fetch origin && git log --oneline -15   # veja o que mudou desde a última vez
cat docs/DECISIONS.md                        # veja as últimas descobertas/decisões
npx tsc --noEmit                             # confirme o estado atual antes de mexer
```

Se `git log HEAD..origin/main` mostrar commits que você não tem, **leia esses
commits antes de continuar** — outra sessão pode já ter resolvido o que você
ia fazer, ou pode ter mudado algo que afeta seu plano.

## Retomando uma tarefa depois de uma pausa longa

Se o usuário mandar "continua" numa conversa que ficou parada por várias
horas (comum quando esbarra em limite de uso e volta depois de liberar), **não
assuma que o estado do repositório é o mesmo de quando você parou.** Mesmo
sendo a mesma conversa, com todo o histórico ainda disponível, isso não
substitui rodar o checklist do topo deste arquivo de novo:

```bash
git fetch origin && git log --oneline HEAD..origin/main
```

Só continue editando o arquivo onde parou depois de confirmar que nenhuma
outra sessão mexeu nele nesse meio-tempo. Se mexeu, leia o diff antes de
retomar — pode ter mudado exatamente o trecho que você ia editar.

## Mapa do projeto

- **Este repo** (`cultura-nacional`): app mobile React Native/Expo + a landing
  page web (`public/landing.html`), ambos servidos pelo mesmo projeto Vercel
  em `culturanacional.com.br`.
- **Painel admin**: repositório **separado**, `cultura-nacional-admin`
  (normalmente clonado ao lado deste, nunca dentro). Serve
  `admin.culturanacional.com.br`. **Nunca misture arquivos dos dois.**
- **Backend**: Supabase, projeto `fvgvnvzziukvplpyvqki`, compartilhado pelos
  dois repositórios acima.

## Documentação por assunto

Leia o arquivo relevante para a sua tarefa antes de mexer nessa área:

- [`docs/NAVIGATION.md`](docs/NAVIGATION.md) — linking config, rotas, o bug
  recorrente de "path não mapeado" (leia antes de mexer em qualquer tela nova
  ou no `RootNavigator`/`AppNavigator`)
- [`docs/DATABASE.md`](docs/DATABASE.md) — Supabase, funções SQL, risco de
  sessões paralelas no banco
- [`docs/DEPLOY.md`](docs/DEPLOY.md) — domínio, Vercel, build da landing page,
  SEO
- [`docs/DEEP_LINKING.md`](docs/DEEP_LINKING.md) — plano (ainda não
  implementado) de Universal Links/App Links pros apps nativos; ver antes de
  mexer em `app.json` ou tentar deep link nativo
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — log cronológico (append-only) de
  decisões e descobertas recentes que ainda não foram promovidas pros
  arquivos acima
- [`docs/incidents/`](docs/incidents/) — write-ups completos (sintoma, causa
  raiz, correção, prevenção) de bugs significativos o bastante pra merecer
  mais que uma linha no `DECISIONS.md`. Um arquivo por incidente, nomeado
  `YYYY-MM-DD-slug.md`. Nunca edite um incidente já registrado — se descobrir
  mais sobre o mesmo bug depois, crie um arquivo novo referenciando o antigo.

## Área de maior risco do projeto: `RootNavigator.tsx` / linking config

Esse arquivo (`src/navigation/RootNavigator.tsx`, mais o `linking.config`
nele) já causou **3 incidentes distintos** documentados (ver
`docs/DECISIONS.md` e `docs/incidents/`): `/Home` sem path mapeado,
`/app.html` no CTA da landing, perfil público inacessível sem sessão, e o
mais recente, redirect pra `/undefined` no CTA "Jogar agora" e no login
Google. Todos vieram da mesma família de problema: como o React Navigation
resolve/reconstrói o estado de navegação quando uma URL ou uma transição de
sessão não bate exatamente com o que está montado no momento.

**Antes de mexer em `RootNavigator.tsx`, `AppNavigator.tsx`,
`AuthNavigator.tsx` ou no `linking.config`, teste manualmente:**

1. Cada URL reservada (`/app`, `/auth/callback`, `/perfil`, `/ranking`,
   etc.) carregada direto no navegador, **deslogado**.
2. As mesmas URLs carregadas direto, **logado**.
3. Login (e-mail e Google) ao vivo, observando a URL final na barra de
   endereço.
4. Logout ao vivo, observando a URL final.

Se qualquer um desses cenários terminar numa URL ou tela inesperada, não
assuma que é cosmético — foi exatamente assim que os 3 incidentes
anteriores começaram. Ver `docs/NAVIGATION.md` pra regras específicas
(paths obrigatórios, `initialRouteName` do Stack raiz, zona de risco do
`auth/callback`).

## Regra de ouro pra manter isso útil

- Qualquer gotcha/descoberta que valeria a pena outra sessão saber vai pro
  `docs/DECISIONS.md`, **no mesmo commit** da mudança que a motivou — não
  depois, "quando lembrar".
- Os arquivos em `docs/*.md` (fora o DECISIONS.md) descrevem o estado
  **atual** do projeto. Ao editá-los, **edite/substitua o trecho relevante**,
  não acumule informação desatualizada.
- `docs/DECISIONS.md` é **append-only**: só adicione uma linha nova no fim.
  Nunca reescreva entradas antigas ali (isso evita conflito de merge entre
  sessões paralelas). De tempos em tempos, alguém consolida o que ainda é
  relevante de lá para os arquivos estáveis, e limpa o que já foi superado.

## Quando atualizar README.md e CHANGELOG.md

Esses dois são diferentes do `docs/DECISIONS.md` — são "vitrine" do projeto,
não log. Não faz sentido tocar neles a cada commit.

**Atualize o `README.md` quando:**
- Mudar algo que ele descreve explicitamente: stack, estrutura de `src/`,
  variáveis de ambiente, comandos de setup
- Um número que ele expõe mudar de **ordem de grandeza** (ex: "389+" pra
  "1.600+" perguntas vale a pena; "1.600" pra "1.650" não)
- Uma feature sair da lista 🔜 e virar ✅ em produção, ou o contrário
- Um link quebrar (domínio mudou, arquivo foi movido/renomeado) — isso é
  sempre na hora, não espera gatilho nenhum

**Não vale atualizar o README a cada** bugfix pontual, ajuste de UI, ou
mudança interna que não muda o que está descrito nele — isso é
`docs/DECISIONS.md`/`docs/incidents/`.

**`CHANGELOG.md`** segue o mesmo ritmo, mas amarrado a **marco de release**
de verdade (não a cada commit): compile a partir do `docs/DECISIONS.md`
quando for bater uma versão nova, aprovar a verificação do Google, publicar
nas lojas, etc. — não em paralelo ao dia a dia.

## Cor, espaçamento e tipografia

Nunca use hex solto, espaçamento "mágico" (`marginTop: 13`) ou tamanho de
fonte numérico direto em uma tela nova — a fonte única de verdade já existe:

- **`src/constants/colors.ts`** — `HomeTheme.light`/`HomeTheme.dark` é o
  **único** objeto de tema do app (campos: `bg`/`background`, `card`,
  `iconBg`, `border`, `text`, `muted`/`textSecondary`/`textMuted`, `subtle`,
  `green`/`primary`, `yellow`/`accent`, `danger`), acessado via
  `const { isDark } = useTheme(); const C = isDark ? HomeTheme.dark : HomeTheme.light;`
  (o padrão usado em praticamente toda tela — inclusive `Button.tsx`,
  `Input.tsx`, `CustomAlert.tsx`, `ScreenContainer.tsx`) ou via
  `const { colors } = useTheme();` (equivalente, mesmo objeto). `BrandColors`
  tem as 3 cores da marca fora do tema (`green`/`yellow`/`blue`, não mudam
  com light/dark). `CategoryColors`, `RegionColors`, `MedalColors`,
  `QuickActionColors` são paletas à parte, pra contextos específicos.
- **`src/constants/layout.ts`** — `Spacing` (`xs` a `xxxl`), `Radius` (`sm` a
  `full`), `FontSize` (já escalado por tamanho de tela via `scaleFont()`,
  não precisa reescalar de novo), `FontWeight`.

Uma tela nova sempre puxa cor do tema ativo (`useTheme()`), nunca hardcoda
`'#FFFFFF'` ou `'#009C3B'` direto — isso é o que garante que o modo escuro
funcione automaticamente sem trabalho extra na tela.

**Histórico:** até 2026-07-21 existia um segundo objeto de tema (`Colors`,
com nomes parecidos mas valores de cor genuinamente diferentes do
`HomeTheme` — ex: fundo escuro `#0A0A0A` vs `#0e1015`), usado só por 4
arquivos (`ReportModal.tsx`, `WelcomePlanModal.tsx`, `RootNavigator.tsx`,
`SubscriptionScreen.tsx`) através do `colors` retornado por `useTheme()`.
Consolidado num único tema (`HomeTheme`, por ser o já dominante) nessa
data — ver `docs/DECISIONS.md`. Se algum código ainda referenciar `Colors`
ou `ThemeColors` importado direto de `colors.ts`, é resquício desatualizado
e deve ser migrado pro `HomeTheme`.

## Ícones vs. emoji

Elementos de UI usam ícone de verdade do lucide (`lucide-react-native` aqui,
`lucide-react` no painel admin), não emoji como caractere de texto —
inclusive quando o emoji "combina" visualmente (👍/👎, 🔴/🟢, etc.). Import
direto do ícone específico, não do pacote inteiro (ver
`src/types/lucide-icons.d.ts` pro porquê).

```tsx
// ❌ não
<Text>👍 {count}</Text>

// ✅ sim
import ThumbsUp from 'lucide-react-native/dist/esm/icons/thumbs-up';
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
  <ThumbsUp size={14} color={C.green} />
  <Text>{count}</Text>
</View>
```

**Emoji como caractere de texto só onde já é o padrão estabelecido**: título
de notificação push (`src/lib/notifications.ts`) e mensagens
comemorativas/chamativas pontuais (ex: resultado de duelo em
`DuelScreen.tsx`) — lugares onde o emoji é conteúdo (chama atenção numa
notificação do sistema), não um substituto de ícone de interface.

Na dúvida: se o emoji está representando um conceito de UI recorrente (voto,
status, ação) ele é ícone; se é um toque de expressividade num texto
esporádico e chamativo (notificação, título de resultado), pode ser emoji.

## Modelo e nível de esforço — regras para todas as sessões

Disponíveis: **Sonnet 4.6** (padrão) e **Haiku 4.5** (tarefas mecânicas).
Esforços disponíveis: Baixo · Médio · Alto · Máx. Toggle de **Pensamento** separado.

### Quando usar cada combinação

| Situação | Modelo | Esforço | Pensamento |
|---|---|---|---|
| Código, debug, documentação, conteúdo geral | Sonnet 4.6 | Baixo | Off |
| Gerar perguntas de quiz em bulk | Haiku 4.5 | Baixo | Off |
| Planejar feature nova, revisar arquivo inteiro | Sonnet 4.6 | Médio | Off |
| Bug que já voltou, decisão de arquitetura | Sonnet 4.6 | Alto | On |
| Auth, navegação, RLS, `RootNavigator.tsx` | Sonnet 4.6 | Alto | On |
| Revisão crítica de segurança | Sonnet 4.6 | Máx | On |

### Regras fixas

- **Mantenha Baixo como padrão.** Só suba o esforço quando o problema pedir — Alto/Máx consomem o limite muito mais rápido.
- **Pensamento desligado por padrão.** Ligue só para bugs obscuros ou decisões com muitas variáveis. Em tarefas diretas não agrega e gasta limite à toa.
- **Não troque de modelo sem motivo.** Sonnet 4.6 resolve a esmagadora maioria dos casos. Haiku só para tarefas mecânicas de alto volume.
- **7 sessões paralelas multiplicam o consumo.** Se o limite estiver acabando rápido, verifique se alguma sessão está rodando em Alto/Máx desnecessariamente.
- **Quando estiver em dúvida sobre qual esforço usar**, pergunte ao usuário antes de iniciar — um task longo em Máx pode travar outras sessões por consumo de limite.
