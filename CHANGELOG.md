# Changelog

Todas as mudanças notáveis do projeto serão documentadas aqui.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/)
e [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [Unreleased]

### Em desenvolvimento
- Integração RevenueCat para assinaturas reais (iOS e Android)
- Integração Google AdMob para anúncios no plano gratuito
- Geração de vídeo no Modo Viral com FFmpeg
- Notificações push para streak e ranking
- Correções de segurança nas políticas RLS

---

## [1.0.0] — 2026-06-28

### Adicionado
- **Autenticação** — Login com e-mail/senha, Google OAuth e Sign in with Apple
- **Onboarding** — Seleção de estado e cidade natal com busca e autocomplete
- **HomeScreen** — Card de XP, ações rápidas, categorias por ícone e lista dos 27 estados com filtro por região
- **QuizScreen** — Cronômetro, animações de transição, feedback visual, explicações, XP salvo no Supabase
- **DuelScreen** — Duelo 1v1 em tempo real via Supabase Realtime com código de convite compartilhável
- **Modo Viral** — Câmera ao vivo + quiz sincronizado com narração automática (expo-speech) e efeitos de meme
- **RankingScreen** — Pódio com ouro/prata/bronze e lista nacional com posição do usuário destacada
- **ProfileScreen** — XP, nível, streak, ranking da cidade natal e acesso a conquistas e missões
- **MissionsScreen** — 3 missões diárias geradas automaticamente, renovadas à meia-noite
- **AchievementsScreen** — 20 conquistas desbloqueáveis em grade visual
- **SettingsScreen** — Toggle de tema claro/escuro/automático persistido
- **SubscriptionScreen** — Planos CN Pro (R$9,90/mês) e Família (R$19,90/mês) com comparativo
- **Reporte de erros** — Botão de bandeira em cada pergunta com 6 categorias de motivo
- **Painel Admin** — Dashboard, CRUD de perguntas, moderação de reportes, gerenciamento de usuários

### Banco de dados
- 27 estados brasileiros cadastrados
- 389+ perguntas ativas em todas as subcategorias
- 20 cidades piloto com coordenadas geográficas
- RLS ativo em todas as 16 tabelas
- Funções RPC: streak, ranking de cidade, XP, missões, conquistas

### Infraestrutura
- Supabase em São Paulo (sa-east-1) para conformidade com LGPD
- Projeto React Native + Expo SDK 56 com TypeScript
- Painel admin em React + Vite + Tailwind CSS

---

## Como contribuir

1. Crie uma branch: `git checkout -b feature/nome-da-feature`
2. Faça seus commits: `git commit -m "feat(scope): descrição"`
3. Push: `git push origin feature/nome-da-feature`
4. Abra um Pull Request para `develop`
