import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { ArrowLeft, Clock, Zap, CheckCircle, XCircle, Trophy, Flag } from 'lucide-react-native';
import * as Speech from 'expo-speech';

import { ReportModal } from '../../components/ui/ReportModal';
import { useSettingsStore } from '../../store/settingsStore';
import { useTheme } from '../../hooks/useTheme';
import { useQuizFeedback } from '../../hooks/useQuizFeedback';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';
import { CategoryColors, MedalColors, withOpacity } from '../../constants/colors';
import { useGlobalQuizTimer } from '../../hooks/useGlobalQuizTimer';

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
const SFX_WIN     = 'Cê é o bichão, mesmo hein!';
const SFX_LOSE    = 'Na próxima você faz melhor!';

function speak(text: string, rate = 1.3) {
  Speech.speak(text, { language: 'pt-BR', rate, pitch: 0.85 });
}
const TIME_PER_QUESTION = 15;

export function QuizScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const { audioNarration } = useSettingsStore();
  const { playCorrect, playWrong, playResult, vibrateSelect } = useQuizFeedback();
  const { user, cityNatalId } = useAuthStore();
  const { stateId, stateName, cityId: routeCityId, cityName, subcategory, mode } = route.params ?? {};
  const cityId = routeCityId ?? cityNatalId ?? undefined;

  const [questions,     setQuestions]     = useState<Question[]>([]);
  const [current,       setCurrent]       = useState(0);
  const [selected,      setSelected]      = useState<number | null>(null);
  const [answered,      setAnswered]      = useState(false);
  const [answerResult,  setAnswerResult]  = useState<AnswerResult | null>(null);
  const [score,         setScore]         = useState(0);
  const [xpEarned,      setXpEarned]      = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [finished,      setFinished]      = useState(false);
  const [results,       setResults]       = useState<boolean[]>([]);
  const [reportOpen,    setReportOpen]    = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const xpRef    = useRef(0);
  const scoreRef = useRef(0);

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
    if (answered) pauseTimer(); else resumeTimer();
  }, [answered]);

  async function loadQuestions() {
    setLoading(true);
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
      startTimer();
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
    if (result.is_correct) { playCorrect(); } else { playWrong(); }

    if (result.is_correct) {
      setScore(prev => { scoreRef.current = prev + 1; return prev + 1; });
      setXpEarned(prev => { xpRef.current = prev + result.xp; return prev + result.xp; });
    }
  }

  function nextQuestion() {
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      if (current + 1 >= questions.length) {
        finishQuiz();
      } else {
        setCurrent(prev => prev + 1);
        setSelected(null);
        setAnswered(false);
        setAnswerResult(null);
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      }
    });
  }

  async function saveStateProgress(correctsThisRound: number) {
    if (!user || !stateId || correctsThisRound === 0) return;

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

    const newAnswered = Math.min(prevAnswered + correctsThisRound, PROGRESS_GOAL);
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
      saveStateProgress(scoreRef.current),
    ]);
  }

  const timerColor = timeLeft <= 5 ? colors.danger : timeLeft <= 10 ? CategoryColors.gastronomia : colors.primary;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando perguntas...</Text>
      </View>
    );
  }

  if (!loading && questions.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Zap size={48} color={colors.textMuted} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Sem perguntas</Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Ainda não há perguntas para este filtro.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.backBtnText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    const msg = pct >= 80 ? 'Excelente!' : pct >= 60 ? 'Muito bem!' : 'Continue estudando!';
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Trophy size={56} color={pct >= 80 ? MedalColors.gold : pct >= 60 ? colors.primary : colors.textMuted} />
          <Text style={[styles.resultMsg,   { color: colors.text }]}>{msg}</Text>
          <Text style={[styles.resultScore, { color: colors.primary }]}>{score}/{questions.length} corretas</Text>
          <View style={[styles.xpEarned, { backgroundColor: withOpacity(colors.primary, 8.2), borderColor: withOpacity(colors.primary, 18.8) }]}>
            <Zap size={16} color={colors.primary} />
            <Text style={[styles.xpEarnedText, { color: colors.primary }]}>+{xpEarned} XP ganhos</Text>
          </View>
          <View style={styles.resultDots}>
            {results.map((r, i) => (
              <View key={i} style={[styles.dot, { backgroundColor: r ? colors.primary : colors.danger }]} />
            ))}
          </View>
          <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
            <View style={styles.stat}><Text style={[styles.statVal,{color:colors.text}]}>{score}</Text><Text style={[styles.statLbl,{color:colors.textMuted}]}>Acertos</Text></View>
            <View style={[styles.statDivider,{backgroundColor:colors.border}]}/>
            <View style={styles.stat}><Text style={[styles.statVal,{color:colors.text}]}>{questions.length-score}</Text><Text style={[styles.statLbl,{color:colors.textMuted}]}>Erros</Text></View>
            <View style={[styles.statDivider,{backgroundColor:colors.border}]}/>
            <View style={styles.stat}><Text style={[styles.statVal,{color:colors.text}]}>{pct}%</Text><Text style={[styles.statLbl,{color:colors.textMuted}]}>Taxa</Text></View>
          </View>
        </View>
        <View style={styles.resultActions}>
          <TouchableOpacity
            style={[styles.resultBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              setFinished(false); setCurrent(0); setScore(0); setXpEarned(0);
              setResults([]); setSelected(null); setAnswered(false); setQuestions([]);
              setAnswerResult(null); xpRef.current = 0; scoreRef.current = 0;
              stopTimer();
              loadQuestions();
            }}
          >
            <Text style={styles.resultBtnText}>Jogar novamente</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.resultBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 0.5 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.resultBtnText, { color: colors.text }]}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const q = questions[current];
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: colors.text }]}>{stateName ?? subcategory ?? 'Quiz'}</Text>
        <View style={styles.topRight}>
          <View style={[styles.timerBadge, { backgroundColor: withOpacity(timerColor, 12.5) }]}>
            <Clock size={13} color={timerColor} />
            <Text style={[styles.timerText, { color: timerColor }]}>{timeLeft}s</Text>
          </View>
          <TouchableOpacity onPress={() => setReportOpen(true)} style={styles.flagBtn}>
            <Flag size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      <ReportModal visible={reportOpen} questionId={q.id} questionText={q.text} onClose={() => setReportOpen(false)} />

      <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
        <Animated.View style={[styles.progressFill, {
          backgroundColor: colors.primary,
          width: progressAnim.interpolate({ inputRange:[0,1], outputRange:['0%','100%'] }),
        }]} />
      </View>

      <View style={styles.counterRow}>
        {questions.map((_, i) => (
          <View key={i} style={[styles.counterDot, {
            backgroundColor: i < current ? colors.primary : i === current ? withOpacity(colors.primary, 37.6) : colors.border
          }]} />
        ))}
      </View>

      <Animated.View style={[styles.questionWrap, { opacity: fadeAnim }]}>
        <View style={styles.metaRow}>
          <View style={[styles.metaBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{q.subcategory}</Text>
          </View>
          <View style={[styles.metaBadge, {
            backgroundColor: q.difficulty==='easy' ? withOpacity(CategoryColors.natureza, 12.5) : q.difficulty==='medium' ? withOpacity(CategoryColors.gastronomia, 12.5) : withOpacity(CategoryColors.historia, 12.5),
            borderColor:     q.difficulty==='easy' ? withOpacity(CategoryColors.natureza, 25.1) : q.difficulty==='medium' ? withOpacity(CategoryColors.gastronomia, 25.1) : withOpacity(CategoryColors.historia, 25.1),
          }]}>
            <Text style={[styles.metaText, {
              color: q.difficulty==='easy' ? CategoryColors.natureza : q.difficulty==='medium' ? CategoryColors.gastronomia : CategoryColors.historia,
            }]}>{q.difficulty==='easy'?'Fácil':q.difficulty==='medium'?'Médio':'Difícil'}</Text>
          </View>
        </View>

        <Text style={[styles.questionText, { color: colors.text }]}>{q.text}</Text>

        <View style={styles.options}>
          {q.options.map((opt: string, i: number) => {
            const revealed   = answerResult !== null;
            const isCorrect  = revealed && i === answerResult?.correct_index;
            const isSelected = i === selected;
            let bg = colors.card, border = colors.border, textColor = colors.text;
            if (revealed) {
              if (isCorrect)               { bg=withOpacity(colors.success, 12.5); border=colors.success; textColor=colors.success; }
              else if (isSelected)         { bg=withOpacity(colors.danger, 12.5); border=colors.danger; textColor=colors.danger; }
            } else if (isSelected)         { bg=withOpacity(colors.primary, 8.2); border=colors.primary; textColor=colors.primary; }
            return (
              <TouchableOpacity key={i} onPress={() => handleAnswer(i)} disabled={answered}
                style={[styles.option, { backgroundColor: bg, borderColor: border }]}
              >
                <View style={[styles.optionLetter, { backgroundColor: withOpacity(border, 18.8) }]}>
                  <Text style={[styles.optionLetterText, { color: textColor }]}>{['A','B','C','D'][i]}</Text>
                </View>
                <Text style={[styles.optionText, { color: textColor }]}>{opt}</Text>
                {revealed && isCorrect               && <CheckCircle size={18} color={colors.success} />}
                {revealed && isSelected && !isCorrect && <XCircle size={18} color={colors.danger} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {answered && answerResult?.explanation && (
          <View style={[styles.explanation, { backgroundColor: withOpacity(colors.primary, 6.3), borderColor: withOpacity(colors.primary, 18.8) }]}>
            <Text style={[styles.explanationText, { color: colors.textSecondary }]}>{answerResult.explanation}</Text>
          </View>
        )}

        {answered && (
          <TouchableOpacity onPress={nextQuestion} style={[styles.nextBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.nextBtnText}>
              {current + 1 >= questions.length ? 'Ver resultado' : 'Próxima pergunta'}
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1 },
  center:           { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: Spacing.xl },
  loadingText:      { fontSize: FontSize.sm, marginTop: 8 },
  emptyTitle:       { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  emptyText:        { fontSize: FontSize.sm, textAlign: 'center' },
  backBtn:          { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: Radius.md },
  backBtnText:      { color: '#FFF', fontWeight: FontWeight.medium },
  topBar:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.xl, paddingTop: 56, borderBottomWidth: 0.5 },
  topTitle:         { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  topRight:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flagBtn:          { padding: 4 },
  timerBadge:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  timerText:        { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  progressBg:       { height: 3 },
  progressFill:     { height: 3 },
  counterRow:       { flexDirection: 'row', gap: 6, paddingHorizontal: Spacing.xl, marginVertical: Spacing.md },
  counterDot:       { flex: 1, height: 4, borderRadius: 2 },
  questionWrap:     { flex: 1, padding: Spacing.xl },
  metaRow:          { flexDirection: 'row', gap: 8, marginBottom: Spacing.lg },
  metaBadge:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 0.5 },
  metaText:         { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  questionText:     { fontSize: FontSize.lg, fontWeight: FontWeight.bold, lineHeight: 28, marginBottom: Spacing.xl },
  options:          { gap: 10 },
  option:           { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.md, borderWidth: 0.5, padding: Spacing.md, gap: 12 },
  optionLetter:     { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  optionLetterText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  optionText:       { flex: 1, fontSize: FontSize.sm, lineHeight: 20 },
  explanation:      { marginTop: Spacing.lg, borderRadius: Radius.md, borderWidth: 0.5, padding: Spacing.md },
  explanationText:  { fontSize: FontSize.sm, lineHeight: 20 },
  resultCard:       { margin: Spacing.xl, marginTop: 80, borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.xl, alignItems: 'center', gap: 8 },
  resultMsg:        { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  resultScore:      { fontSize: FontSize.lg, fontWeight: FontWeight.medium },
  xpEarned:        { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 0.5 },
  xpEarnedText:    { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  resultDots:       { flexDirection: 'row', gap: 8 },
  dot:              { width: 10, height: 10, borderRadius: 5 },
  statsRow:         { flexDirection: 'row', width: '100%', paddingTop: Spacing.lg, borderTopWidth: 0.5, marginTop: Spacing.sm },
  stat:             { flex: 1, alignItems: 'center' },
  statVal:          { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  statLbl:          { fontSize: FontSize.xs, marginTop: 2 },
  statDivider:      { width: 0.5, height: 40 },
  resultActions:    { paddingHorizontal: Spacing.xl, gap: 10 },
  nextBtn:          { marginTop: Spacing.lg, height: 50, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  nextBtnText:      { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  resultBtn:        { height: 50, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  resultBtnText:    { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.medium },
});
