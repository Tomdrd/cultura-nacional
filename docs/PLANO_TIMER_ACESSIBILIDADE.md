# Plano: Timer Único do Quiz + Modo de Acessibilidade

> Documento de referência gerado em conversa de planejamento. Cobre duas frentes:
> **Fase 1 (prioridade atual)** — timer único regressivo para Quiz, Duelo e Relâmpago.
> **Fase 2 (depois)** — Modo de Acessibilidade completo (narração de alternativas + resposta por voz).

---

## Contexto / bug original

Bug identificado: ao selecionar uma resposta, a barra de progresso visual (`Animated.timing` / `progressAnim`) continuava animando até o fim, mesmo com o `setInterval` do contador numérico (`timeLeft`) corretamente parado via `clearInterval`. Causa: `progressAnim.stopAnimation()` nunca era chamado em `handleAnswer()`.

**Já corrigido** em `QuizScreen.tsx` e `DuelScreen.tsx` (uma linha em cada `handleAnswer`, adicionando `progressAnim.stopAnimation()` logo após o `clearInterval`). `ViralModeScreen.tsx` não tinha o bug (não usa barra de progresso animada, só "progress dots" estáticos).

---

## FASE 1 — Timer único regressivo (prioridade atual)

### Motivação
Timer por pergunta (hoje: 15s Quiz/Duelo, 30s Relâmpago, resetado a cada pergunta) será substituído por **um cronômetro único para o quiz inteiro**, no estilo "prova com tempo".

### Regras definidas
- **Quiz normal:** 5 perguntas × 15s = **75s totais**
- **Relâmpago:** 5 perguntas × 30s = **150s totais**
- **Duelo:** mesma lógica do Quiz normal, **75s totais** (cada jogador roda seu próprio timer local; não sincronizado via servidor — diferença esperada, não é bug)
- **Narração casual** (fora do modo de acessibilidade, só lê a pergunta): **NÃO pausa** o cronômetro. Resolve a assimetria de "ganhar tempo de graça" por ligar a narração sem necessidade.
- **Se o tempo total zerar no meio do quiz:** encerra o quiz imediatamente; a pergunta atual (se não respondida) e todas as restantes contam como erradas. Vai direto pra tela de resultado.
- Não existe mais timeout por pergunta individual — só o relógio geral importa.
- **PAUSA OBRIGATÓRIA quando `answered === true`** (problema descoberto após o design inicial): sem isso, o tempo de ler a explicação da resposta ou de abrir o ReportModal consumiria o orçamento total do quiz, podendo até zerar o tempo enquanto o usuário só está revisando. Cobre dois casos com uma única condição:
  - Tempo de leitura da explicação da resposta
  - Report modal aberto DEPOIS de já ter respondido
  - Report modal aberto ANTES de responder (durante a decisão) NÃO pausa o timer — evita abrir brecha de "congelar o relógio" sem intenção real de reportar
- Retoma ao avançar para a próxima pergunta (`nextQuestion()`).

### Arquitetura
- **Novo hook:** `src/hooks/useGlobalQuizTimer.ts`
  - Estado: `totalTimeLeft`
  - Métodos: `pause()`, `resume()` — necessários JÁ na Fase 1 (não só na Fase 2 como planejado originalmente), para cobrir o caso de `answered === true` (ver regra acima)
  - Callback: `onExpire` — dispara quando `totalTimeLeft` chega a 0
  - Barra de progresso: como não dá mais pra prever duração total antecipadamente (por causa de pausas futuras da Fase 2), a barra passa a animar em ticks de 1s (`Animated.timing` de 1s linear a cada segundo) em vez de uma única animação longa.

### Arquivos afetados na Fase 1
| Arquivo | Mudança |
|---|---|
| `src/hooks/useGlobalQuizTimer.ts` | **novo** — hook compartilhado |
| `src/screens/quiz/QuizScreen.tsx` | remove timer por pergunta, usa o hook, ajusta UI (badge + barra) |
| `src/screens/duel/DuelScreen.tsx` | mesma troca, adaptado ao fluxo de duelo/realtime |
| `src/screens/viral/ViralModeScreen.tsx` | fora de escopo (sem barra de progresso hoje) |

### Testes de borda (Fase 1)
- Tempo zera exatamente no momento do clique numa resposta (condição de corrida)
- Narração desligada do início ao fim → comportamento idêntico ao timer contínuo simples
- Usuário responde a última pergunta faltando poucos segundos → não deve sobrar tempo "vazando" pra uma pergunta que não existe
- Duelo: os dois jogadores com timers locais independentes, sem travar o realtime da partida

---

## FASE 2 — Modo de Acessibilidade (depois da Fase 1)

### Toggle único
Nas Configurações, um único toggle **"Modo de Acessibilidade"** ativa em conjunto todos os itens abaixo (em vez de vários toggles soltos brigando entre si).

| Aspecto | Narração casual (padrão) | Modo de Acessibilidade ativo |
|---|---|---|
| O que é narrado | Só a pergunta | Pergunta + todas as alternativas |
| Cronômetro pausa durante narração? | Não | Sim |
| Tempo total do quiz | Base (75s/150s) | Base × 2 |
| Resposta por voz disponível? | Não | Sim |
| Escuta automática após narração? | — | Sim, por padrão |
| Botão de microfone manual? | — | Sempre visível (retry / timeout) |
| Resposta por toque na tela | Normal | Continua funcionando em paralelo |

### Narração completa (pergunta + alternativas)
Encadeamento sequencial via `onDone`:
```
speak(pergunta) -> onDone -> speak("Alternativa A: " + opt[0]) -> onDone -> ... -> onDone final -> libera timer / listening
```

### Resposta por voz
**Biblioteca:** `expo-speech-recognition` (NÃO usar `@react-native-voice/voice` — desatualizada, com problemas conhecidos na New Architecture do RN 0.85 / Expo SDK 56). Exige development build via EAS (não roda no Expo Go).

**Fluxo:**
1. Narração de pergunta + alternativas termina
2. Pausa de segurança ~0.8s (evita captar o próprio áudio da narração)
3. Bip de ativação (grave → agudo)
4. Estado `listening` — captura fala, roda parser `extrairLetra()`
5. Parser: normaliza texto (minúsculo, sem acento), regex `/\b(a|b|c|d)\b/i` + mapeamento de ordinais por extenso ("primeira"→A, "segunda"→B, "terceira"→C, "quarta"→D)
6. Se reconheceu: `speak("Você disse a alternativa X. Confirme dizendo sim ou correto.")` → volta a ouvir (sim/não)
   - "sim"/"correto" → envia resposta, segue fluxo normal do quiz
   - "não"/"errado" → volta a ouvir a resposta original
7. Se não reconheceu com confiança: bip de erro (agudo → grave) + fala "Não entendi, toque no microfone e diga novamente" → exige toque manual no botão (sem loop automático)
8. **Timeout de silêncio:** ~5-6s sem fala detectada → mesmo bip de erro, encerra escuta, exige toque manual

**Gatilho de ativação:** SEM gesto (dois toques com dois dedos foi descartado - risco de disparo acidental e conflito com gestos do sistema VoiceOver/TalkBack). Existe:
- Botão de microfone dedicado na tela, com `accessibilityLabel` apropriado (sempre disponível, serve pra retry)
- Escuta automática após a narração terminar (ligada por padrão dentro do Modo de Acessibilidade)

**Resposta manual (toque na tela) continua sempre disponível em paralelo** - voz é um caminho adicional, nunca obrigatório.

### Arquivos previstos na Fase 2
| Arquivo | Mudança |
|---|---|
| `src/store/settingsStore.ts` | novo campo `accessibilityMode: boolean` |
| `src/hooks/useQuestionNarration.ts` | novo - narração casual vs. completa |
| `src/hooks/useVoiceAnswer.ts` | novo - máquina de estados de escuta/parser/confirmação |
| `src/utils/extrairLetra.ts` | novo - parser puro, testável isoladamente |
| Assets de áudio (2 bips) | a definir/gerar |
| `src/screens/quiz/QuizScreen.tsx`, `DuelScreen.tsx` | integração dos hooks novos |
| Tela de Configurações | novo toggle "Modo de Acessibilidade" |

### Decisões ainda em aberto para a Fase 2
- Bips reais (precisa de 2 arquivos de áudio) vs. feedback falado via `expo-speech` - inclinação era por bips reais, não fechado
- Duelo com voz: um jogador usando voz consome mais tempo de resposta que toque na tela - avaliar se a Fase 2 entra em Duelo desde o início ou só depois de validada no Quiz solo

---

## Ordem de execução combinada
1. **Fase 1** - timer único (Quiz, Duelo, Relâmpago) - **começar agora**
2. **Fase 2** - Modo de Acessibilidade completo - depois da Fase 1 validada em produção
