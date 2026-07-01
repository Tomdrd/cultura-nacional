import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Share, TextInput, Alert, Animated } from 'react-native';
import { Swords, Clock, CheckCircle, XCircle, Trophy, Copy, Users, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';

type DuelState = 'lobby' | 'waiting' | 'playing' | 'finished';

interface Question {
  id: string;
  text: string;
  options: string[];
  difficulty: string;
}

interface AnswerResult {
  is_correct: boolean;
  correct_index: number;
  xp: number;
}

interface Opponent {
  id: string;
  username: string;
  xp: number;
  level: number;
}

const TOTAL_QUESTIONS = 5;
const TIME_PER_QUESTION = 15;

export function DuelScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuthStore();

  const [duelState,    setDuelState]    = useState<DuelState>('lobby');
  const [matchId,      setMatchId]      = useState<string | null>(null);
  const [questions,    setQuestions]    = useState<Question[]>([]);
  const [current,      setCurrent]      = useState(0);
  const [selected,     setSelected]     = useState<number | null>(null);
  const [answered,     setAnswered]     = useState(false);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [myScore,      setMyScore]      = useState(0);
  const [oppScore,     setOppScore]     = useState(0);
  const [opponent,     setOpponent]     = useState<Opponent | null>(null);
  const [timeLeft,     setTimeLeft]     = useState(TIME_PER_QUESTION);
  const [myAnswers,    setMyAnswers]     = useState<boolean[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [joinCode,     setJoinCode]     = useState('');
  const [showJoin,     setShowJoin]     = useState(false);

  const timerRef      = useRef<any>(null);
  const channelRef    = useRef<any>(null);
  const progressAnim  = useRef(new Animated.Value(1)).current;
  // useRef para evitar stale closure no listener Realtime
  const duelStateRef  = useRef<DuelState>('lobby');
  const matchIdRef    = useRef<string | null>(null);
  const currentRef    = useRef(0);
  const answeredRef   = useRef(false);
  const myFinishedRef = useRef(false);

  // Sincroniza refs com state
  useEffect(() => { duelStateRef.current  = duelState;  }, [duelState]);
  useEffect(() => { matchIdRef.current    = matchId;    }, [matchId]);
  useEffect(() => { currentRef.current    = current;    }, [current]);
  useEffect(() => { answeredRef.current   = answered;   }, [answered]);

  useEffect(() => { return () => cleanup(); }, []);

  function cleanup() {
    clearInterval(timerRef.current);
    if (channelRef.current) supabase.removeChannel(channelRef.current);
  }

  // ─── Criar duelo ───────────────────────────────────────────────
  async function createMatch() {
    if (!user) return;
    setLoading(true);

    // Busca perguntas via view segura
    const { data: qs } = await supabase
      .from('questions_safe').select('*').eq('active', true).limit(TOTAL_QUESTIONS);
    if (!qs || qs.length === 0) {
      Alert.alert('Erro', 'Nenhuma pergunta disponível.');
      setLoading(false);
      return;
    }

    const shuffled = qs.sort(() => Math.random() - 0.5);
    const questionIds = shuffled.map((q: Question) => q.id);

    // Salva IDs das perguntas no match para ambos jogadores usarem as mesmas
    const { data: match } = await supabase.from('matches').insert({
      player1_id:   user.id,
      status:       'waiting',
      question_ids: questionIds,
    }).select().single();

    if (match) {
      setMatchId(match.id);
      matchIdRef.current = match.id;
      setQuestions(shuffled);
      setDuelState('waiting');
      duelStateRef.current = 'waiting';
      subscribeToMatch(match.id);
    }
    setLoading(false);
  }

  // ─── Entrar no duelo por código ────────────────────────────────
  async function joinMatch() {
    if (!user || !joinCode.trim()) return;
    setLoading(true);

    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'waiting')
      .neq('player1_id', user.id);

    const match = matches?.find((m: any) =>
      m.id.replace(/-/g, '').slice(0, 8).toUpperCase() === joinCode.trim().toUpperCase()
    );

    if (!match) {
      Alert.alert('Duelo não encontrado', 'Verifique o código e tente novamente.');
      setLoading(false);
      return;
    }

    // Busca oponente e perguntas em paralelo
    const [{ data: p1 }, { data: qs }] = await Promise.all([
      supabase.from('profiles').select('id, username, xp, level').eq('id', match.player1_id).single(),
      // Usa os mesmos IDs de perguntas salvos no match
      match.question_ids
        ? supabase.from('questions_safe').select('*').in('id', match.question_ids)
        : supabase.from('questions_safe').select('*').eq('active', true).limit(TOTAL_QUESTIONS),
    ]);

    if (p1) setOpponent(p1);
    if (qs) {
      // Preserva a ordem original dos IDs
      const ordered = match.question_ids
        ? match.question_ids.map((id: string) => qs.find((q: Question) => q.id === id)).filter(Boolean)
        : qs;
      setQuestions(ordered);
    }

    await supabase.from('matches').update({
      player2_id: user.id,
      status:     'active',
    }).eq('id', match.id);

    setMatchId(match.id);
    matchIdRef.current = match.id;
    setDuelState('playing');
    duelStateRef.current = 'playing';
    subscribeToMatch(match.id);
    startTimer();
    setLoading(false);
  }

  // ─── Realtime ──────────────────────────────────────────────────
  function subscribeToMatch(id: string) {
    const channel = supabase.channel(`match:${id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${id}`
      }, async (payload) => {
        const match = payload.new as any;

        // Player1: detecta player2 entrando (usa ref, não state)
        if (match.status === 'active' && match.player2_id && duelStateRef.current === 'waiting') {
          const { data: opp } = await supabase
            .from('profiles').select('id, username, xp, level').eq('id', match.player2_id).single();
          if (opp) setOpponent(opp);
          setDuelState('playing');
          duelStateRef.current = 'playing';
          startTimer();
        }

        // Ambos os jogadores terminaram
        if (match.status === 'finished' && match.player1_finished_at && match.player2_finished_at) {
          setDuelState('finished');
          duelStateRef.current = 'finished';
          cleanup();
        }
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'match_answers', filter: `match_id=eq.${id}`
      }, (payload) => {
        const answer = payload.new as any;
        if (answer.user_id !== user?.id && answer.is_correct) {
          setOppScore(prev => prev + 1);
        }
      })
      .subscribe();
    channelRef.current = channel;
  }

  // ─── Timer ─────────────────────────────────────────────────────
  function startTimer() {
    clearInterval(timerRef.current);
    setTimeLeft(TIME_PER_QUESTION);
    Animated.timing(progressAnim, { toValue: 1, duration: 0, useNativeDriver: false }).start();
    Animated.timing(progressAnim, { toValue: 0, duration: TIME_PER_QUESTION * 1000, useNativeDriver: false }).start();
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (!answeredRef.current) handleAnswer(-1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  // ─── Resposta ──────────────────────────────────────────────────
  async function handleAnswer(index: number) {
    if (answered || !matchId || !user) return;
    clearInterval(timerRef.current);
    setSelected(index);
    setAnswered(true);
    answeredRef.current = true;

    const q = questions[current];

    // Valida resposta no servidor
    const { data } = await supabase.rpc('submit_answer', {
      p_question_id:  q.id,
      p_answer_index: index,
    });

    const result: AnswerResult = data ?? { is_correct: false, correct_index: -1, xp: 0 };
    setAnswerResult(result);
    setMyAnswers(prev => [...prev, result.is_correct]);
    if (result.is_correct) setMyScore(prev => prev + 1);

    // Grava resposta no banco (is_correct vem do servidor)
    await supabase.from('match_answers').insert({
      match_id:     matchId,
      user_id:      user.id,
      question_id:  q.id,
      answer_index: index,
      is_correct:   result.is_correct,
      time_ms:      (TIME_PER_QUESTION - timeLeft) * 1000,
    });

    setTimeout(() => nextQuestion(), 1800);
  }

  async function nextQuestion() {
    if (currentRef.current + 1 >= questions.length) {
      // Marca que este jogador terminou
      myFinishedRef.current = true;
      const finishField = matchId
        ? (await supabase.from('matches').select('player1_id').eq('id', matchId).single())
          .data?.player1_id === user?.id
          ? 'player1_finished_at'
          : 'player2_finished_at'
        : null;

      if (finishField) {
        await supabase.from('matches').update({
          [finishField]: new Date().toISOString(),
        }).eq('id', matchId);
      }

      // Verifica se oponente já terminou também
      const { data: match } = await supabase.from('matches').select('*').eq('id', matchId).single();
      const bothFinished = match?.player1_finished_at && match?.player2_finished_at;
      if (bothFinished) {
        await supabase.from('matches').update({ status: 'finished' }).eq('id', matchId);
      }

      setDuelState('finished');
      duelStateRef.current = 'finished';
      cleanup();
    } else {
      setCurrent(prev => {
        currentRef.current = prev + 1;
        return prev + 1;
      });
      setSelected(null);
      setAnswered(false);
      setAnswerResult(null);
      answeredRef.current = false;
      startTimer();
    }
  }

  function resetDuel() {
    cleanup();
    myFinishedRef.current = false;
    duelStateRef.current  = 'lobby';
    currentRef.current    = 0;
    answeredRef.current   = false;
    setDuelState('lobby');
    setCurrent(0);
    setMyScore(0);
    setOppScore(0);
    setMyAnswers([]);
    setOpponent(null);
    setMatchId(null);
    setSelected(null);
    setAnswered(false);
    setAnswerResult(null);
    setJoinCode('');
    setShowJoin(false);
  }

  const timerColor = timeLeft <= 5 ? colors.danger : timeLeft <= 10 ? '#BA7517' : colors.primary;

  // ══════════════════════════════════════════════════════════════
  // LOBBY
  // ══════════════════════════════════════════════════════════════
  if (duelState === 'lobby') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topBack}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.center}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primary + '20' }]}>
            <Swords size={48} color={colors.primary} />
          </View>
          <Text style={[styles.lobbyTitle, { color: colors.text }]}>Duelo 1v1</Text>
          <Text style={[styles.lobbySub, { color: colors.textSecondary }]}>
            Desafie um amigo ou entre em um duelo existente
          </Text>
          {!showJoin ? (
            <View style={styles.lobbyActions}>
              <TouchableOpacity onPress={createMatch} style={[styles.lobbyBtn, { backgroundColor: colors.primary }]}>
                {loading
                  ? <ActivityIndicator color="#FFF" />
                  : <><Swords size={20} color="#FFF" /><Text style={styles.lobbyBtnText}>Criar duelo</Text></>
                }
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowJoin(true)} style={[styles.lobbyBtnOutline, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Users size={20} color={colors.primary} />
                <Text style={[styles.lobbyBtnOutlineText, { color: colors.text }]}>Entrar com código</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.joinBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.joinLabel, { color: colors.textSecondary }]}>Código do duelo</Text>
              <TextInput
                value={joinCode}
                onChangeText={t => setJoinCode(t.toUpperCase())}
                placeholder="Ex: 5F10991B"
                placeholderTextColor={colors.textMuted}
                maxLength={8}
                autoCapitalize="characters"
                style={[styles.joinInput, { color: colors.text, borderColor: joinCode.length === 8 ? colors.primary : colors.border }]}
              />
              <View style={styles.joinBtns}>
                <TouchableOpacity onPress={() => setShowJoin(false)} style={[styles.joinCancel, { borderColor: colors.border }]}>
                  <Text style={[styles.joinCancelText, { color: colors.textSecondary }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={joinMatch} disabled={joinCode.length < 8 || loading}
                  style={[styles.joinConfirm, { backgroundColor: joinCode.length === 8 ? colors.primary : colors.border }]}>
                  {loading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.joinConfirmText}>Entrar</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // WAITING
  // ══════════════════════════════════════════════════════════════
  if (duelState === 'waiting') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.waitTitle, { color: colors.text }]}>Aguardando oponente...</Text>
          <Text style={[styles.waitSub, { color: colors.textSecondary }]}>Compartilhe o código com um amigo</Text>
          <View style={[styles.codeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.codeLabel, { color: colors.textMuted }]}>Código do duelo</Text>
            <Text style={[styles.codeValue, { color: colors.text }]}>
              {matchId?.replace(/-/g, '').slice(0, 8).toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => Share.share({ message: `Me desafie no Cultura Nacional!\nCódigo: ${matchId?.replace(/-/g, '').slice(0, 8).toUpperCase()}` })}
            style={[styles.shareBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}
          >
            <Copy size={16} color={colors.primary} />
            <Text style={[styles.shareBtnText, { color: colors.primary }]}>Compartilhar convite</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={resetDuel} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // PLAYING
  // ══════════════════════════════════════════════════════════════
  if (duelState === 'playing' && questions.length > 0) {
    const q = questions[current];
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.scoreBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.scoreItem}>
            <Text style={[styles.scoreName, { color: colors.primary }]}>Você</Text>
            <Text style={[styles.scoreVal, { color: colors.text }]}>{myScore}</Text>
          </View>
          <View style={[styles.timerBadge, { backgroundColor: timerColor + '20' }]}>
            <Clock size={13} color={timerColor} />
            <Text style={[styles.timerText, { color: timerColor }]}>{timeLeft}s</Text>
          </View>
          <View style={styles.scoreItem}>
            <Text style={[styles.scoreName, { color: colors.textSecondary }]}>{opponent?.username ?? 'Oponente'}</Text>
            <Text style={[styles.scoreVal, { color: colors.text }]}>{oppScore}</Text>
          </View>
        </View>

        <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
          <Animated.View style={[styles.progressFill, {
            backgroundColor: timerColor,
            width: progressAnim.interpolate({ inputRange: [0,1], outputRange: ['0%','100%'] }),
          }]} />
        </View>

        <View style={styles.counterRow}>
          {questions.map((_, i) => (
            <View key={i} style={[styles.counterDot, {
              backgroundColor: i < current ? colors.primary : i === current ? colors.primary+'60' : colors.border
            }]} />
          ))}
        </View>

        <View style={styles.questionWrap}>
          <Text style={[styles.questionText, { color: colors.text }]}>{q.text}</Text>
          <View style={styles.options}>
            {q.options.map((opt: string, i: number) => {
              const isCorrect  = answered && i === answerResult?.correct_index;
              const isSelected = i === selected;
              let bg = colors.card, border = colors.border, textColor = colors.text;
              if (answered) {
                if (isCorrect)               { bg = '#009C3B20'; border = '#009C3B'; textColor = '#009C3B'; }
                else if (isSelected)         { bg = colors.danger+'20'; border = colors.danger; textColor = colors.danger; }
              } else if (isSelected)         { bg = colors.primary+'15'; border = colors.primary; textColor = colors.primary; }
              return (
                <TouchableOpacity key={i} onPress={() => handleAnswer(i)} disabled={answered}
                  style={[styles.option, { backgroundColor: bg, borderColor: border }]}
                >
                  <View style={[styles.optLetter, { backgroundColor: border+'30' }]}>
                    <Text style={[styles.optLetterText, { color: textColor }]}>{['A','B','C','D'][i]}</Text>
                  </View>
                  <Text style={[styles.optText, { color: textColor }]}>{opt}</Text>
                  {answered && isCorrect               && <CheckCircle size={18} color="#009C3B" />}
                  {answered && isSelected && !isCorrect && <XCircle size={18} color={colors.danger} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // FINISHED
  // ══════════════════════════════════════════════════════════════
  if (duelState === 'finished') {
    const iWon   = myScore > oppScore;
    const isDraw = myScore === oppScore;
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <View style={[styles.resultIcon, {
            backgroundColor: iWon ? '#FFDF0020' : isDraw ? colors.primary+'20' : colors.danger+'20'
          }]}>
            <Trophy size={48} color={iWon ? '#FFDF00' : isDraw ? colors.primary : colors.danger} />
          </View>
          <Text style={[styles.resultTitle, { color: colors.text }]}>
            {iWon ? 'Você venceu!' : isDraw ? 'Empate!' : 'Você perdeu!'}
          </Text>
          <View style={[styles.finalScore, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.finalItem}>
              <Text style={[styles.finalName, { color: colors.primary }]}>Você</Text>
              <Text style={[styles.finalVal, { color: colors.text }]}>{myScore}</Text>
            </View>
            <X size={20} color={colors.textMuted} />
            <View style={styles.finalItem}>
              <Text style={[styles.finalName, { color: colors.textSecondary }]}>{opponent?.username ?? 'Oponente'}</Text>
              <Text style={[styles.finalVal, { color: colors.text }]}>{oppScore}</Text>
            </View>
          </View>
          <View style={styles.resultDots}>
            {myAnswers.map((r, i) => (
              <View key={i} style={[styles.dot, { backgroundColor: r ? colors.primary : colors.danger }]} />
            ))}
          </View>
          <TouchableOpacity onPress={resetDuel} style={[styles.replayBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.replayBtnText}>Jogar novamente</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.homeBtn}>
            <Text style={[styles.homeBtnText, { color: colors.textSecondary }]}>Voltar ao início</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1 },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  topBack:         { padding: Spacing.xl, paddingTop: 56 },
  iconWrap:        { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  lobbyTitle:      { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, marginBottom: 8 },
  lobbySub:        { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xxl },
  lobbyActions:    { width: '100%', gap: 12 },
  lobbyBtn:        { height: 52, borderRadius: Radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  lobbyBtnText:    { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  lobbyBtnOutline: { height: 52, borderRadius: Radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 0.5 },
  lobbyBtnOutlineText: { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  joinBox:         { width: '100%', borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.xl, gap: 12 },
  joinLabel:       { fontSize: FontSize.xs, fontWeight: FontWeight.medium, textTransform: 'uppercase', letterSpacing: 0.5 },
  joinInput:       { height: 52, borderRadius: Radius.md, borderWidth: 0.5, textAlign: 'center', fontSize: 24, fontWeight: FontWeight.bold, letterSpacing: 6 },
  joinBtns:        { flexDirection: 'row', gap: 10 },
  joinCancel:      { flex: 1, height: 44, borderRadius: Radius.md, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  joinCancelText:  { fontSize: FontSize.sm },
  joinConfirm:     { flex: 1, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  joinConfirmText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  waitTitle:       { fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginTop: Spacing.xl, marginBottom: 8 },
  waitSub:         { fontSize: FontSize.sm, textAlign: 'center', marginBottom: Spacing.xl },
  codeCard:        { borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.xl, alignItems: 'center', width: '100%', marginBottom: Spacing.md },
  codeLabel:       { fontSize: FontSize.xs, marginBottom: 6 },
  codeValue:       { fontSize: 28, fontWeight: FontWeight.bold, letterSpacing: 4 },
  shareBtn:        { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: Radius.md, borderWidth: 0.5, marginBottom: Spacing.md },
  shareBtnText:    { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  cancelBtn:       { padding: Spacing.md },
  cancelText:      { fontSize: FontSize.sm },
  scoreBar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.xl, paddingTop: 56, borderBottomWidth: 0.5 },
  scoreItem:       { alignItems: 'center', gap: 2 },
  scoreName:       { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  scoreVal:        { fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  timerBadge:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full },
  timerText:       { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  progressBg:      { height: 3 },
  progressFill:    { height: 3 },
  counterRow:      { flexDirection: 'row', gap: 6, padding: Spacing.xl, paddingBottom: 0 },
  counterDot:      { flex: 1, height: 4, borderRadius: 2 },
  questionWrap:    { flex: 1, padding: Spacing.xl },
  questionText:    { fontSize: FontSize.lg, fontWeight: FontWeight.bold, lineHeight: 28, marginBottom: Spacing.xl },
  options:         { gap: 10 },
  option:          { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.md, borderWidth: 0.5, padding: Spacing.md, gap: 12 },
  optLetter:       { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  optLetterText:   { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  optText:         { flex: 1, fontSize: FontSize.sm, lineHeight: 20 },
  resultIcon:      { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  resultTitle:     { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, marginBottom: Spacing.xl },
  finalScore:      { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.xl, gap: Spacing.xl, marginBottom: Spacing.xl },
  finalItem:       { alignItems: 'center', gap: 4 },
  finalName:       { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  finalVal:        { fontSize: 40, fontWeight: FontWeight.bold },
  finalX:          { fontSize: FontSize.xl },
  resultDots:      { flexDirection: 'row', gap: 8, marginBottom: Spacing.xl },
  dot:             { width: 10, height: 10, borderRadius: 5 },
  replayBtn:       { width: '100%', height: 50, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  replayBtnText:   { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.medium },
  homeBtn:         { padding: Spacing.md },
  homeBtnText:     { fontSize: FontSize.sm },
});
