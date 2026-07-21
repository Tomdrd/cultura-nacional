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
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — log cronológico (append-only) de
  decisões e descobertas recentes que ainda não foram promovidas pros
  arquivos acima
- [`docs/incidents/`](docs/incidents/) — write-ups completos (sintoma, causa
  raiz, correção, prevenção) de bugs significativos o bastante pra merecer
  mais que uma linha no `DECISIONS.md`. Um arquivo por incidente, nomeado
  `YYYY-MM-DD-slug.md`. Nunca edite um incidente já registrado — se descobrir
  mais sobre o mesmo bug depois, crie um arquivo novo referenciando o antigo.

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
