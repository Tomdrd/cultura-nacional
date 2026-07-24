import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, Platform } from 'react-native';
import ArrowLeft from 'lucide-react-native/dist/esm/icons/arrow-left';
import Clock from 'lucide-react-native/dist/esm/icons/clock';
import Zap from 'lucide-react-native/dist/esm/icons/zap';
import CheckCircle from 'lucide-react-native/dist/esm/icons/circle-check';
import XCircle from 'lucide-react-native/dist/esm/icons/circle-x';
import Trophy from 'lucide-react-native/dist/esm/icons/trophy';
import Flag from 'lucide-react-native/dist/esm/icons/flag';
import ThumbsUp from 'lucide-react-native/dist/esm/icons/thumbs-up';
import ThumbsDown from 'lucide-react-native/dist/esm/icons/thumbs-down';
import * as Speech from 'expo-speech';
import { BlurView } from 'expo-blur';

import { ReportModal } from '../../components/ui/ReportModal';
import { useSettingsStore } from '../../store/settingsStore';
import { useTheme } from '../../hooks/useTheme';
import { useHeaderTopPadding } from '../../hooks/useHeaderTopPadding';
import { useQuizFeedback } from '../../hooks/useQuizFeedback';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';
import { HomeTheme, MedalColors } from '../../constants/colors';
import { useGlobalQuizTimer } from '../../hooks/useGlobalQuizTimer';

const DANGER = '#E24B4A';

interface Question {
  id: string;
  text: string;
  options: string[];
  subcategory: string;
  difficulty: string;
}

interface AnswerResult {
  is_correct: boolean;
  correct_index: number;
  explanation: string | null;
  xp: number;
}

const TOTAL_QUESTIONS = 5;
const PROGRESS_GOAL   = 20;

const SFX_CORRECT = ['Acertô, mizeravi!', 'Isso aí!', 'Boa demais!', 'Acertou na mosca!'];
const SFX_WRONG   = ['Errou, abestado!', 'Que vacilo!', 'Nem de perto!', 'Vai estudar mais!'];

const TIME_PER_QUESTION = 15;

export function QuizScreen({ route, navigation }: any) {
  const { isDark } = useTheme();
  const C = isDark ? HomeTheme.dark : HomeTheme.light;
  // DANGER_TEXT precisa ser diferente por tema: o rosa claro (#F09595) so
  // tem contraste decente sobre fundo escuro (~7:1). Sobre fundo claro ele
  // cai pra ~2:1 -- ilegivel. #C23B3A (mesmo tom ja usado em
  // QuickActionColors.viral) mantem a familia de vermelho e passa AA (~4.6:1)
  // no claro.
  const DANGER_TEXT = isDark ? '#F09595' : '#C23B3A';
  const headerPaddingTop = useHeaderTopPadding();
  const { audioNarration, quizTimer } = useSettingsStore();
  const { playCorrect, playWrong, playResult, vibrateSelect } = useQuizFeedback();
  const { user, cityNatalId } = useAuthStore();
  const { stateId, stateName, cityId: routeCityId, cityName, subcategory, mode, random, preloadedQuestions } = route.params ?? {};
  // Relâmpago sempre usa timer; nos demais modos segue a preferência do usuário
  const shouldUseTimer = mode === 'relampago' || quizTimer;
  // Se a tela não especificou uma cidade explicitamente, usa a cidade natal
  // do usuário — a função no banco cai automaticamente para as perguntas
  // do estado caso essa cidade não tenha perguntas próprias.
  // Exceção: card "Aleatório" da Home (random=true) não deve puxar a
  // cidade natal do usuário, senão "aleatório" na prática vira "minha cidade".
  const cityId = random ? undefined : (routeCityId ?? cityNatalId ?? undefined);

  const [questions,     setQuestions]     = useState<Question[]>([]);
  const [current,       setCurrent]       = useState(0);
  const [selected,      setSelected]      = useState<number | null>(null);
  const [answered,      setAnswered]      = useState(false);
  const [answerResult,  setAnswerResult]  = useState<AnswerResult | null>(null);
  const [feedbackMsg,   setFeedbackMsg]   = useState('');
  const [score,         setScore]         = useState(0);
  const [xpEarned,      setXpEarned]      = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [finished,      setFinished]      = useState(false);
  const [results,       setResults]       = useState<boolean[]>([]);
  const [reportOpen,    setReportOpen]    = useState(false);
  const [rating,        setRating]        = useState<boolean | null>(null);

  const fadeAnim     = useRef(new Animated.Value(1)).current;
  const feedbackAnim = useRef(new Animated.Value(0)).current;
  const xpRef        = useRef(0);
  const scoreRef     = useRef(0);
  const scrollRef    = useRef<any>(null);

  const totalSeconds = mode === 'relampago' ? 30 * TOTAL_QUESTIONS : TIME_PER_QUESTION * TOTAL_QUESTIONS;

  function handleTimeExpired() {
    setResults(prev => {
      const remaining = questions.length - prev.length;
      if (remaining <= 0) return prev;
      return [...prev, ...Array(remaining).fill(false)];
    });
    finishQuiz();
  }

  const {
    timeLeft, progressAnim,
    start: startTimer, pause: pauseTimer, resume: resumeTimer, stop: stopTimer,
  } = useGlobalQuizTimer({ totalSeconds, onExpire: handleTimeExpired });

  useEffect(() => { loadQuestions(); }, []);

  useEffect(() => {
    if (loading || finished) return;
    Speech.stop();
    if (audioNarration && questions[current]) {
      Speech.speak(questions[current].text, { language: 'pt-BR', rate: 1.3, pitch: 0.85 });
    }
    return () => { Speech.stop(); };
  }, [current, loading, finished]);

  useEffect(() => {
    if (!shouldUseTimer) return;
    if (answered) pauseTimer(); else resumeTimer();
  }, [answered, shouldUseTimer]);

  // Volta pro topo ao trocar de pergunta
  useEffect(() => {
    scrollRef.current?.scrollTo?.({ y: 0, animated: false });
  }, [current]);

  // Acessibilidade por teclado (versão web):
  // - Durante o quiz: A/B/C/D selecionam alternativa; Enter avança para a próxima pergunta.
  // - Na tela de resultado: Enter = jogar novamente; Backspace = voltar.
  // Só ativo na web (Platform.OS === 'web') porque no nativo não há teclado físico padrão.
  useEffect(() => {
    if (Platform.OS !== 'web' || loading || reportOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Não interfere se o usuário estiver digitando em outro campo (ex: modal de report)
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;

      // Tela de resultado
      if (finished) {
        if (e.key === 'Enter') {
          e.preventDefault();
          setFinished(false); setCurrent(0); setScore(0); setXpEarned(0);
          setResults([]); setSelected(null); setAnswered(false); setQuestions([]);
          setAnswerResult(null); setRating(null); xpRef.current = 0; scoreRef.current = 0;
          stopTimer();
          loadQuestions();
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          navigation.goBack();
        }
        return;
      }

      // Durante o quiz
      const key = e.key.toUpperCase();
      const letters = ['A', 'B', 'C', 'D'];
      if (letters.includes(key)) {
        const index = letters.indexOf(key);
        if (!answered && index < (questions[current]?.options.length ?? 0)) {
          e.preventDefault();
          handleAnswer(index);
        }
      } else if (e.key === 'Enter') {
        if (answered) {
          e.preventDefault();
          nextQuestion();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [current, answered, questions, loading, finished, reportOpen]);

  // Painel de feedback desliza de baixo pra cima ao responder (estilo
  // Duolingo); ao avançar de pergunta, some na hora (sem animação de saída)
  useEffect(() => {
    if (answerResult !== null) {
      Animated.spring(feedbackAnim, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 6 }).start();
    } else {
      feedbackAnim.setValue(0);
    }
  }, [answerResult]);

  async function loadQuestions() {
    setLoading(true);

    // Se as perguntas foram pré-carregadas (ex: do card aleatório da Home),
    // usa elas direto — garante que a pergunta preview aparecerá na lista
    if (preloadedQuestions && preloadedQuestions.length > 0) {
      setQuestions(preloadedQuestions);
      if (shouldUseTimer) startTimer();
      setLoading(false);
      return;
    }

    const limit = mode === 'relampago' ? 5 : TOTAL_QUESTIONS;
    const progressive = mode !== 'relampago';
    let { data } = await supabase.rpc('get_random_quiz_questions', {
      p_state_id:    stateId ?? null,
      p_city_id:     cityId ?? null,
      p_subcategory: subcategory ?? null,
      p_limit:       limit,
      p_progressive: progressive,
    });
    if (!data || data.length === 0) {
      const fallback = await supabase.rpc('get_random_quiz_questions', {
        p_state_id: null, p_city_id: null, p_subcategory: null, p_limit: limit, p_progressive: progressive,
      });
      data = fallback.data;
    }
    if (data && data.length > 0) {
      setQuestions(data);
      if (shouldUseTimer) startTimer();
    }
    setLoading(false);
  }

  async function handleAnswer(index: number) {
    if (answered) return;
    vibrateSelect();
    progressAnim.stopAnimation();
    setSelected(index);
    setAnswered(true);

    const q = questions[current];
    const { data } = await supabase.rpc('submit_answer', {
      p_question_id:  q.id,
      p_answer_index: index,
    });

    const result: AnswerResult = data ?? { is_correct: false, correct_index: -1, explanation: null, xp: 0 };
    setAnswerResult(result);
    setResults(prev => [...prev, result.is_correct]);
    setFeedbackMsg(result.is_correct
      ? SFX_CORRECT[Math.floor(Math.random() * SFX_CORRECT.length)]
      : SFX_WRONG[Math.floor(Math.random() * SFX_WRONG.length)]);
    if (result.is_correct) { playCorrect(); } else { playWrong(); }

    if (result.is_correct) {
      setScore(prev => { scoreRef.current = prev + 1; return prev + 1; });
      setXpEarned(prev => { xpRef.current = prev + result.xp; return prev + result.xp; });
    }
  }

  // 👍/👎 explícito do usuário sobre a pergunta — alimenta o ranking de
  // qualidade (question_health). Upsert: pode mudar de ideia, 1 voto por
  // pergunta por usuário (RLS garante que só mexe no próprio voto).
  async function rateQuestion(isPositive: boolean) {
    if (!user || rating === isPositive) return;
    setRating(isPositive);
    await supabase.from('question_ratings').upsert(
      { user_id: user.id, question_id: questions[current].id, is_positive: isPositive },
      { onConflict: 'user_id,question_id' }
    );
  }

  function nextQuestion() {
    // Desliza o painel de feedback pra baixo antes de limpar o state,
    // evitando o flash causado por um frame intermediário onde feedbackAnim
    // ainda está em 1 (painel visível) mas answered/answerResult já foram
    // zerados — o que fazia o painel aparecer sem cor definida por um instante.
    Animated.timing(feedbackAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        if (current + 1 >= questions.length) {
          finishQuiz();
        } else {
          setCurrent(prev => prev + 1);
          setSelected(null);
          setAnswered(false);
          setAnswerResult(null);
          setRating(null);
          Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
        }
      });
    });
  }

  async function saveStateProgress(totalThisRound: number, correctsThisRound: number) {
    if (!user || !stateId || totalThisRound === 0) return;

    // Busca progresso atual
    const { data: existing } = await supabase
      .from('user_state_progress')
      .select('id, questions_answered, correct_answers, completed')
      .eq('user_id', user.id)
      .eq('state_id', stateId)
      .single();

    const prevAnswered = existing?.questions_answered ?? 0;
    const prevCorrect  = existing?.correct_answers    ?? 0;
    const alreadyDone  = existing?.completed          ?? false;

    // Não ultrapassa o limite e não regride se já concluído
    if (alreadyDone) return;

    const newAnswered = Math.min(prevAnswered + totalThisRound, PROGRESS_GOAL);
    const newCorrect  = Math.min(prevCorrect  + correctsThisRound, PROGRESS_GOAL);
    const completed   = newAnswered >= PROGRESS_GOAL;

    await supabase.from('user_state_progress').upsert({
      ...(existing?.id ? { id: existing.id } : {}),
      user_id:            user.id,
      state_id:           stateId,
      questions_answered: newAnswered,
      correct_answers:    newCorrect,
      completed,
      ...(completed ? { stamped_at: new Date().toISOString() } : {}),
    }, { onConflict: 'user_id,state_id' });
  }

  async function finishQuiz() {
    stopTimer();
    setFinished(true);
    const pct = scoreRef.current / questions.length;
    setTimeout(() => { playResult(pct >= 0.6); }, 600);
    if (!user) return;

    await Promise.all([
      xpRef.current > 0
        ? Promise.all([
            supabase.rpc('update_xp_and_level',  { p_user_id: user.id, p_xp_gained: xpRef.current }),
            supabase.rpc('update_city_ranking',   { p_user_id: user.id, p_xp_gained: xpRef.current }),
          ])
        : Promise.resolve(),
      supabase.rpc('update_streak_on_play', { p_user_id: user.id }),
      supabase.rpc('update_daily_mission_progress', {
        p_user_id:  user.id,
        p_state_id: stateId ?? null,
        p_correct:  scoreRef.current,
        p_total:    questions.length,
      }),
      saveStateProgress(questions.length, scoreRef.current),
    ]);
    await supabase.rpc('check_and_grant_achievements', { p_user_id: user.id });
  }

  const timerColor = timeLeft <= 5 ? DANGER : timeLeft <= 10 ? C.yellow : C.green;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: C.bg }]}>
        <ActivityIndicator color={C.green} size="large" />
        <Text style={[styles.loadingText, { color: C.muted }]}>Carregando perguntas...</Text>
      </View>
    );
  }

  if (!loading && questions.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: C.bg }]}>
        <Zap size={48} color={C.muted} />
        <Text style={[styles.emptyTitle, { color: C.text }]}>Sem perguntas</Text>
        <Text style={[styles.emptyText, { color: C.muted }]}>Ainda não há perguntas para este filtro.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: C.green }]}>
          <Text style={styles.backBtnText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    const msg = pct >= 80 ? 'Excelente!' : pct >= 60 ? 'Muito bem!' : 'Continue estudando!';
    return (
      <View style={[styles.container, { backgroundColor: C.bg }]}>
        <View style={[styles.resultCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <Trophy size={56} color={pct >= 80 ? MedalColors.gold : pct >= 60 ? C.green : C.muted} />
          <Text style={[styles.resultMsg,   { color: C.text }]}>{msg}</Text>
          <Text style={[styles.resultScore, { color: C.green }]}>{score}/{questions.length} corretas</Text>
          <View style={[styles.xpEarned, { backgroundColor: `${C.green}18`, borderColor: `${C.green}44` }]}>
            <Zap size={16} color={C.green} />
            <Text style={[styles.xpEarnedText, { color: C.green }]}>+{xpEarned} XP ganhos</Text>
          </View>
          <View style={styles.resultDots}>
            {results.map((r, i) => (
              <View key={i} style={[styles.dot, { backgroundColor: r ? C.green : DANGER }]} />
            ))}
          </View>
          <View style={[styles.statsRow, { borderTopColor: C.border }]}>
            <View style={styles.stat}><Text style={[styles.statVal,{color:C.text}]}>{score}</Text><Text style={[styles.statLbl,{color:C.muted}]}>Acertos</Text></View>
            <View style={[styles.statDivider,{backgroundColor:C.border}]}/>
            <View style={styles.stat}><Text style={[styles.statVal,{color:C.text}]}>{questions.length-score}</Text><Text style={[styles.statLbl,{color:C.muted}]}>Erros</Text></View>
            <View style={[styles.statDivider,{backgroundColor:C.border}]}/>
            <View style={styles.stat}><Text style={[styles.statVal,{color:C.text}]}>{pct}%</Text><Text style={[styles.statLbl,{color:C.muted}]}>Taxa</Text></View>
          </View>
        </View>
        <View style={styles.resultActions}>
          <TouchableOpacity
            style={[styles.resultBtn, { backgroundColor: C.green }]}
            onPress={() => {
              setFinished(false); setCurrent(0); setScore(0); setXpEarned(0);
              setResults([]); setSelected(null); setAnswered(false); setQuestions([]);
              setAnswerResult(null); setRating(null); xpRef.current = 0; scoreRef.current = 0;
              stopTimer();
              loadQuestions();
            }}
          >
            <Text style={styles.resultBtnText}>Jogar novamente</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.resultBtn, { backgroundColor: C.card, borderColor: C.border, borderWidth: 1 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.resultBtnText, { color: C.text }]}>Voltar</Text>
          </TouchableOpacity>
          {Platform.OS === 'web' && (
            <Text style={[styles.keyboardHint, { color: C.muted }]}>
              Enter para jogar novamente · Backspace para voltar
            </Text>
          )}
        </View>
      </View>
    );
  }

  const q = questions[current];
  const isCorrectAnswer = answerResult?.is_correct ?? false;
  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <View style={[styles.topBar, { paddingTop: headerPaddingTop }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: C.text }]}>{stateName ?? subcategory ?? 'Quiz'}</Text>
        {shouldUseTimer ? (
          <View style={[styles.timerBadge, { backgroundColor: `${timerColor}20` }]}>
            <Clock size={13} color={timerColor} />
            <Text style={[styles.timerText, { color: timerColor }]}>{timeLeft}s</Text>
          </View>
        ) : (
          <View style={styles.timerBadge} /> // placeholder para manter o layout centralizado
        )}
      </View>

      <ReportModal visible={reportOpen} questionId={q.id} questionText={q.text} onClose={() => setReportOpen(false)} />

      {shouldUseTimer && (
        <View style={[styles.progressBg, { backgroundColor: C.border }]}>
          <Animated.View style={[styles.progressFill, {
            backgroundColor: C.green,
            width: progressAnim.interpolate({ inputRange:[0,1], outputRange:['0%','100%'] }),
          }]} />
        </View>
      )}

      <View style={styles.counterRow}>
        {questions.map((_, i) => (
          <View key={i} style={[styles.counterDot, {
            backgroundColor: i < current ? C.green : i === current ? `${C.green}60` : C.border
          }]} />
        ))}
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        style={[styles.questionWrap, { opacity: fadeAnim }]}
        contentContainerStyle={styles.questionContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.metaRow}>
          <View style={[styles.metaBadge, { backgroundColor: C.iconBg, borderColor: C.border }]}>
            <Text style={[styles.metaText, { color: C.muted }]}>{q.subcategory}</Text>
          </View>
          <View style={[styles.metaBadge, {
            backgroundColor: q.difficulty==='easy' ? `${C.green}18` : q.difficulty==='medium' ? `${C.yellow}18` : `${DANGER}18`,
            borderColor:     q.difficulty==='easy' ? `${C.green}44` : q.difficulty==='medium' ? `${C.yellow}44` : `${DANGER}44`,
          }]}>
            <Text style={[styles.metaText, {
              color: q.difficulty==='easy' ? C.green : q.difficulty==='medium' ? C.yellow : DANGER_TEXT,
            }]}>{q.difficulty==='easy'?'Fácil':q.difficulty==='medium'?'Médio':'Difícil'}</Text>
          </View>
        </View>

        <Text style={[styles.questionText, { color: C.text }]}>{q.text}</Text>

        <View style={styles.options}>
          {q.options.map((opt: string, i: number) => {
            const revealed   = answerResult !== null;
            const isCorrect  = revealed && i === answerResult?.correct_index;
            const isSelected = i === selected;
            let bg: string = C.card, border: string = C.border, textColor: string = C.text;
            if (revealed) {
              if (isCorrect)               { bg=`${C.green}18`; border=C.green; textColor=C.green; }
              else if (isSelected)         { bg=`${DANGER}18`; border=DANGER; textColor=DANGER_TEXT; }
            } else if (isSelected)         { bg=`${C.green}14`; border=C.green; textColor=C.green; }
            return (
              <TouchableOpacity key={i} onPress={() => handleAnswer(i)} disabled={answered}
                style={[styles.option, { backgroundColor: bg, borderColor: border }]}
              >
                <View style={[styles.optionLetter, { backgroundColor: C.iconBg }]}>
                  <Text style={[styles.optionLetterText, { color: textColor }]}>{['A','B','C','D'][i]}</Text>
                </View>
                <Text style={[styles.optionText, { color: textColor }]}>{opt}</Text>
                {revealed && isCorrect               && <CheckCircle size={18} color={C.green} />}
                {revealed && isSelected && !isCorrect && <XCircle size={18} color={DANGER_TEXT} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {Platform.OS === 'web' && (
          <Text style={[styles.keyboardHint, { color: C.muted }]}>
            {answered ? 'Pressione Enter para avançar' : 'Use A, B, C ou D para responder'}
          </Text>
        )}
      </Animated.ScrollView>

      {/* Painel de feedback - desliza de baixo pra cima ao responder.
          Camadas (de baixo pra cima):
          1. BlurView - borra o que estiver atras (evita o "vazamento" de
             texto das opcoes por baixo do painel translucido)
          2. Base quase opaca (92% da cor do card) - fixa o tom de fundo
             num valor prevcircavel, independente do que foi blurado atras,
             pra garantir contraste de texto sempre calculavel
          3. Tint sutil verde/vermelho (10%) - da o "clima" de acerto/erro
             sem comprometer o contraste da camada 2 */}
      <Animated.View
        pointerEvents={answered ? 'auto' : 'none'}
        style={[
          styles.feedbackPanel,
          {
            borderTopColor: isCorrectAnswer ? `${C.green}55` : `${DANGER}55`,
            transform: [{ translateY: feedbackAnim.interpolate({ inputRange: [0, 1], outputRange: [420, 0] }) }],
          },
        ]}
      >
        <BlurView
          intensity={50}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: `${C.card}EB` }]} />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: isCorrectAnswer ? `${C.green}1A` : `${DANGER}1A` },
          ]}
        />

        <View style={styles.feedbackContent}>
          <View style={styles.feedbackHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              {isCorrectAnswer ? <CheckCircle size={20} color={C.green} /> : <XCircle size={20} color={DANGER_TEXT} />}
              <Text style={[styles.feedbackMsg, { color: isCorrectAnswer ? C.green : DANGER_TEXT }]} numberOfLines={1}>
                {feedbackMsg}
              </Text>
            </View>
            <View style={styles.feedbackActions}>
              <TouchableOpacity
                onPress={() => rateQuestion(true)}
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                style={[styles.rateBtn, rating === true && { backgroundColor: `${C.green}22` }]}
              >
                <ThumbsUp size={16} color={rating === true ? C.green : C.subtle} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => rateQuestion(false)}
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                style={[styles.rateBtn, rating === false && { backgroundColor: `${DANGER}22` }]}
              >
                <ThumbsDown size={16} color={rating === false ? DANGER_TEXT : C.subtle} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setReportOpen(true)} hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }} style={styles.rateBtn}>
                <Flag size={16} color={C.subtle} />
              </TouchableOpacity>
            </View>
          </View>

          {answerResult?.explanation && (
            <Text style={[styles.feedbackExplanation, { color: C.subtle }]}>{answerResult.explanation}</Text>
          )}

          <TouchableOpacity onPress={nextQuestion} style={[styles.nextBtn, { backgroundColor: isCorrectAnswer ? C.green : DANGER }]}>
            <Text style={styles.nextBtnText}>
              {current + 1 >= questions.length ? 'Ver resultado' : 'Próxima pergunta'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1 },
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: Spacing.xl },
  loadingText:     { fontSize: FontSize.sm, marginTop: 8 },
  emptyTitle:      { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  emptyText:       { fontSize: FontSize.sm, textAlign: 'center' },
  backBtn:         { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: Radius.md },
  backBtnText:     { color: '#FFF', fontWeight: FontWeight.medium },
  topBar:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.xl },
  topTitle:        { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  timerBadge:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  timerText:       { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  progressBg:      { height: 3 },
  progressFill:    { height: 3 },
  counterRow:      { flexDirection: 'row', gap: 6, paddingHorizontal: Spacing.xl, marginVertical: Spacing.md },
  counterDot:      { flex: 1, height: 4, borderRadius: 2 },
  questionWrap:    { flex: 1 },
  questionContent: { padding: Spacing.xl, paddingBottom: Spacing.xl * 3, flexGrow: 1 },
  metaRow:         { flexDirection: 'row', gap: 8, marginBottom: Spacing.lg },
  metaBadge:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1 },
  metaText:        { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  questionText:    { fontSize: FontSize.lg, fontWeight: FontWeight.bold, lineHeight: 28, marginBottom: Spacing.xl },
  options:         { gap: 10 },
  keyboardHint:    { fontSize: FontSize.xs, textAlign: 'center', marginTop: Spacing.md },
  option:          { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: 12 },
  optionLetter:    { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  optionLetterText:{ fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  optionText:      { flex: 1, fontSize: FontSize.sm, lineHeight: 20 },
  feedbackPanel:   { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  feedbackContent: { padding: Spacing.xl, paddingBottom: Spacing.xl * 1.5 },
  feedbackHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  feedbackActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rateBtn:         { padding: 6, borderRadius: Radius.full },
  feedbackMsg:     { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  feedbackExplanation: { fontSize: FontSize.sm, lineHeight: 20, marginBottom: Spacing.lg },
  resultCard:      { margin: Spacing.xl, marginTop: 80, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.xl, alignItems: 'center', gap: 8 },
  resultMsg:       { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  resultScore:     { fontSize: FontSize.lg, fontWeight: FontWeight.medium },
  xpEarned:        { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1 },
  xpEarnedText:    { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  resultDots:      { flexDirection: 'row', gap: 8 },
  dot:             { width: 10, height: 10, borderRadius: 5 },
  statsRow:        { flexDirection: 'row', width: '100%', paddingTop: Spacing.lg, borderTopWidth: 1, marginTop: Spacing.sm },
  stat:            { flex: 1, alignItems: 'center' },
  statVal:         { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  statLbl:         { fontSize: FontSize.xs, marginTop: 2 },
  statDivider:     { width: 1, height: 40 },
  resultActions:   { paddingHorizontal: Spacing.xl, gap: 10 },
  nextBtn:         { height: 50, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  nextBtnText:     { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  resultBtn:       { height: 50, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  resultBtnText:   { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.medium },
});
