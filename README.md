# 🇧🇷 Cultura Nacional

Quiz mobile sobre a cultura, história, turismo e curiosidades do Brasil — organizado por todos os 27 estados, com subcategorias, duelos em tempo real, gamificação e Modo Viral para compartilhar nas redes sociais.

## 📱 Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Mobile | React Native + Expo SDK 56 |
| Linguagem | TypeScript |
| Backend | Supabase (PostgreSQL + Auth + Realtime) |
| Estado | Zustand |
| Queries | TanStack Query |
| Ícones | Lucide React Native |
| Navegação | React Navigation |

## 🗂️ Estrutura do projeto

```
src/
├── screens/          # Telas do app
│   ├── auth/         # Login, Cadastro, Onboarding
│   ├── home/         # HomeScreen
│   ├── quiz/         # QuizScreen
│   ├── duel/         # DuelScreen (1v1 Realtime)
│   ├── viral/        # Modo Viral (câmera + quiz)
│   ├── profile/      # Perfil e conquistas
│   ├── ranking/      # Rankings
│   ├── missions/     # Missões diárias
│   ├── achievements/ # Conquistas
│   ├── settings/     # Configurações
│   └── subscription/ # CN Pro
├── components/       # Componentes reutilizáveis
│   └── ui/           # Button, Input, ReportModal
├── navigation/       # Navegação (Stack + Tab)
├── store/            # Zustand stores (auth, settings)
├── hooks/            # useTheme
├── lib/              # Supabase client
├── types/            # TypeScript types
└── constants/        # Colors, Layout
```

## 🚀 Como rodar localmente

```bash
# 1. Clone o repositório
git clone https://github.com/tomdrd/cultura-nacional.git
cd cultura-nacional

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Preencha com suas credenciais do Supabase

# 4. Rode o app
npx expo start
```

## 🔑 Variáveis de ambiente

Crie um arquivo `.env` na raiz com:

```env
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
```

## 🌿 Branches

| Branch | Propósito |
|--------|-----------|
| `main` | Produção — protegida, apenas via PR |
| `develop` | Integração de features |
| `feature/*` | Novas funcionalidades |
| `hotfix/*` | Correções urgentes em produção |
| `release/*` | Preparação de lançamento |

## 📦 Versionamento

Seguimos [Semantic Versioning](https://semver.org/):

- `MAJOR` — mudança que quebra compatibilidade
- `MINOR` — nova funcionalidade
- `PATCH` — correção de bug

## 📝 Padrão de commits

Seguimos [Conventional Commits](https://conventionalcommits.org/):

```
feat(quiz): adiciona modo relâmpago
fix(streak): corrige atualização de streak
feat(viral): implementa gravação com câmera
docs(readme): atualiza documentação
```

## 📊 Banco de dados

Projeto Supabase: `fvgvnvzziukvplpyvqki` (sa-east-1 — São Paulo)

Tabelas principais:
- `states` — 27 estados brasileiros
- `cities` — municípios com coordenadas
- `questions` — 389+ perguntas ativas
- `profiles` — perfis de usuário com XP e streak
- `matches` — partidas de duelo
- `city_rankings` — ranking por cidade
- `achievements` — 20 conquistas disponíveis
- `daily_missions` — missões geradas diariamente

## 📄 Documentação

- [Política de Privacidade](docs/politica-de-privacidade.md)
- [Termos de Uso](docs/termos-de-uso.md)
- [CHANGELOG](CHANGELOG.md)

## 📱 Funcionalidades

- ✅ Quiz solo com 27 estados e 6 subcategorias
- ✅ Duelo 1v1 em tempo real (Supabase Realtime)
- ✅ Sistema de XP, níveis e streak
- ✅ Missões diárias geradas automaticamente
- ✅ 20 conquistas desbloqueáveis
- ✅ Ranking por cidade, estado e nacional
- ✅ Modo Viral — quiz com câmera para Reels/TikTok
- ✅ Modo escuro/claro automático
- ✅ Reporte de erros nas perguntas
- ✅ Login com e-mail, Google e Apple
- 🔜 Assinatura CN Pro (RevenueCat)
- 🔜 Anúncios AdMob (plano gratuito)
- 🔜 Publicação App Store e Play Store

## 👨‍💻 Autor

Desenvolvido por **Antônio Élton Rodrigues** — [@tomdrd](https://github.com/tomdrd)
