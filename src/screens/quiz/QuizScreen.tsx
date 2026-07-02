import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { ArrowLeft, Clock, Zap, CheckCircle, XCircle, Trophy, Flag } from 'lucide-react-native';
import { ReportModal } from '../../components/ui/ReportModal';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';

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
const TIME_PER_QUESTION = 15;

export function QuizScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { stateId, stateName, cityId, cityName, subcategory, mode } = route.params ?? {};

  const [questions,     setQuestions]     = useState<Question[]>([]);
  const [current,       setCurrent]       = useState(0);
  const [selected,      setSelected]      = useState<number | null>(null);
  const [answered,      setAnswered]      = useState(false);
  const [answerResult,  setAnswerResult]  = useState<AnswerResult | null>(null);
  const [score,         setScore]         = useState(0);
  const [xpEarned,      setXpEarned]      = useState(0);
  const [timeLeft,      setTimeLeft]      = useState(mode === 'relampago' ? 30 : TIME_PER_QUESTION);
  const [loading,       setLoading]       = useState(true);
  const [finished,      setFinished]      = useState(false);
  const [results,       setResults]       = useState<boolean[]>([]);
  const [reportOpen,    setReportOpen]    = useState(false);

  const timerRef     = useRef<any>(null);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim     = useRef(new Animated.Value(1)).current;
  const xpRef        = useRef(0);
  const scoreRef     = useRef(0);

  useEffect(() => { loadQuestions(); }, []);
  useEffect(() => {
    if (!loading && !finished) startTimer();
    return () => clearInterval(timerRef.current);
  }, [current, loading, finished]);

  async function loadQuestions() {
    setLoading(true);
    let query = supabase.from('questions_safe').select('*').eq('active', true);
    if (stateId)     query = query.eq('state_id', stateId);
    if (cityId)      query = query.eq('city_id', cityId);
    if (subcategory) query = query.eq('subcategory', subcategory);
    query = query.limit(mode === 'relampago' ? 5 : TOTAL_QUESTIONS);
    let { data } = await query;
    if (!data || data.length === 0) {
      const fallback = await supabase.from('questions_safe').select('*').eq('active', true).limit(TOTAL_QUESTIONS);
      data = fallback.data;
    }
    if (data && data.length > 0) setQuestions(data.sort(() => Math.random() - 0.5));
    setLoading(false);
  }

  function startTimer() {
    clearInterval(timerRef.current);
    const duration = mode === 'relampago' ? 30 : TIME_PER_QUESTION;
    setTimeLeft(duration);
    Animated.timing(progressAnim, { toValue: 1, duration: 0, useNativeDriver: false }).start();
    Animated.timing(progressAnim, { toValue: 0, duration: duration * 1000, useNativeDriver: false }).start();
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); if (!answered) handleAnswer(-1); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleAnswer(index: number) {
    if (answered) return;
    clearInterval(timerRef.current);
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

    if (result.is_correct) {
      setScore(prev => { scoreRef.current = prev + 1; return prev + 1; });
      setXpEarned(prev => { xpRef.current = prev + result.xp; return prev + result.xp; });
    }

    setTimeout(() => nextQuestion(), 1800);
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

  async function finishQuiz() {
    setFinished(true);
    if (!user) return;
    if (xpRef.current > 0) {
      // Atualiza XP atomicamente no servidor (evita race condition)
      await Promise.all([
        supabase.rpc('update_xp_and_level',  { p_user_id: user.id, p_xp_gained: xpRef.current }),
        supabase.rpc('update_city_ranking',   { p_user_id: user.id, p_xp_gained: xpRef.current }),
      ]);
    }
    await supabase.rpc('update_streak_on_play', { p_user_id: user.id });
  }

  const timerColor = timeLeft <= 5 ? colors.danger : timeLeft <= 10 ? '#BA7517' : colors.primary;

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
          <Trophy size={56} color={pct >= 80 ? '#FFDF00' : pct >= 60 ? colors.primary : colors.textMuted} />
          <Text style={[styles.resultMsg,   { color: colors.text }]}>{msg}</Text>
          <Text style={[styles.resultScore, { color: colors.primary }]}>{score}/{questions.length} corretas</Text>
          <View style={[styles.xpEarned, { backgroundColor: colors.primary+'15', borderColor: colors.primary+'30' }]}>
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
          <View style={[styles.timerBadge, { backgroundColor: timerColor+'20' }]}>
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
            backgroundColor: i < current ? colors.primary : i === current ? colors.primary+'60' : colors.border
          }]} />
        ))}
      </View>

      <Animated.View style={[styles.questionWrap, { opacity: fadeAnim }]}>
        <View style={styles.metaRow}>
          <View style={[styles.metaBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{q.subcategory}</Text>
          </View>
          <View style={[styles.metaBadge, {
            backgroundColor: q.difficulty==='easy' ? '#009C3B20' : q.difficulty==='medium' ? '#BA751720' : '#D85A3020',
            borderColor:     q.difficulty==='easy' ? '#009C3B40' : q.difficulty==='medium' ? '#BA751740' : '#D85A3040',
          }]}>
            <Text style={[styles.metaText, {
              color: q.difficulty==='easy' ? '#009C3B' : q.difficulty==='medium' ? '#BA7517' : '#D85A30',
            }]}>{q.difficulty==='easy'?'Fácil':q.difficulty==='medium'?'Médio':'Difícil'}</Text>
          </View>
        </View>

        <Text style={[styles.questionText, { color: colors.text }]}>{q.text}</Text>

        <View style={styles.options}>
          {q.options.map((opt: string, i: number) => {
            const isCorrect  = answered && i === answerResult?.correct_index;
            const isSelected = i === selected;
            let bg = colors.card, border = colors.border, textColor = colors.text;
            if (answered) {
              if (isCorrect)               { bg='#009C3B20'; border='#009C3B'; textColor='#009C3B'; }
              else if (isSelected)         { bg=colors.danger+'20'; border=colors.danger; textColor=colors.danger; }
            } else if (isSelected)         { bg=colors.primary+'15'; border=colors.primary; textColor=colors.primary; }
            return (
              <TouchableOpacity key={i} onPress={() => handleAnswer(i)} disabled={answered}
                style={[styles.option, { backgroundColor: bg, borderColor: border }]}
              >
                <View style={[styles.optionLetter, { backgroundColor: border+'30' }]}>
                  <Text style={[styles.optionLetterText, { color: textColor }]}>{['A','B','C','D'][i]}</Text>
                </View>
                <Text style={[styles.optionText, { color: textColor }]}>{opt}</Text>
                {answered && isCorrect               && <CheckCircle size={18} color="#009C3B" />}
                {answered && isSelected && !isCorrect && <XCircle size={18} color={colors.danger} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {answered && answerResult?.explanation && (
          <View style={[styles.explanation, { backgroundColor: colors.primary+'10', borderColor: colors.primary+'30' }]}>
            <Text style={[styles.explanationText, { color: colors.textSecondary }]}>{answerResult.explanation}</Text>
          </View>
        )}
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
  topBar:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.xl, paddingTop: 56, borderBottomWidth: 0.5 },
  topTitle:        { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  topRight:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flagBtn:         { padding: 4 },
  timerBadge:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  timerText:       { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  progressBg:      { height: 3 },
  progressFill:    { height: 3 },
  counterRow:      { flexDirection: 'row', gap: 6, paddingHorizontal: Spacing.xl, marginVertical: Spacing.md },
  counterDot:      { flex: 1, height: 4, borderRadius: 2 },
  questionWrap:    { flex: 1, padding: Spacing.xl },
  metaRow:         { flexDirection: 'row', gap: 8, marginBottom: Spacing.lg },
  metaBadge:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 0.5 },
  metaText:        { fontSize: 11, fontWeight: FontWeight.medium },
  questionText:    { fontSize: FontSize.lg, fontWeight: FontWeight.bold, lineHeight: 28, marginBottom: Spacing.xl },
  options:         { gap: 10 },
  option:          { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.md, borderWidth: 0.5, padding: Spacing.md, gap: 12 },
  optionLetter:    { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  optionLetterText:{ fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  optionText:      { flex: 1, fontSize: FontSize.sm, lineHeight: 20 },
  explanation:     { marginTop: Spacing.lg, borderRadius: Radius.md, borderWidth: 0.5, padding: Spacing.md },
  explanationText: { fontSize: FontSize.sm, lineHeight: 20 },
  resultCard:      { margin: Spacing.xl, marginTop: 80, borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.xl, alignItems: 'center', gap: 8 },
  resultMsg:       { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  resultScore:     { fontSize: FontSize.lg, fontWeight: FontWeight.medium },
  xpEarned:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 0.5 },
  xpEarnedText:   { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  resultDots:      { flexDirection: 'row', gap: 8 },
  dot:             { width: 10, height: 10, borderRadius: 5 },
  statsRow:        { flexDirection: 'row', width: '100%', paddingTop: Spacing.lg, borderTopWidth: 0.5, marginTop: Spacing.sm },
  stat:            { flex: 1, alignItems: 'center' },
  statVal:         { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  statLbl:         { fontSize: FontSize.xs, marginTop: 2 },
  statDivider:     { width: 0.5, height: 40 },
  resultActions:   { paddingHorizontal: Spacing.xl, gap: 10 },
  resultBtn:       { height: 50, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  resultBtnText:   { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.medium },
});
