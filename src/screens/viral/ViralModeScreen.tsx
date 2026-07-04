import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Dimensions, Alert, Platform, Share,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { requestRecordingPermissionsAsync } from 'expo-audio';
import * as Sharing from 'expo-sharing';
import * as Speech from 'expo-speech';
import { useTheme } from '../../hooks/useTheme';
import { useQuizFeedback } from '../../hooks/useQuizFeedback';
import { supabase } from '../../lib/supabase';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';
import { CheckCircle, XCircle, Clock, Video, RotateCcw, ArrowLeft, Mic, Share2, Volume2, Trophy, Star, BookOpen } from 'lucide-react-native';

const { width: SW, height: SH } = Dimensions.get('window');

interface Question {
  id: string;
  text: string;
  options: string[];
  difficulty: string;
  subcategory: string;
}
interface AnswerResult {
  is_correct: boolean;
  correct_index: number;
  explanation: string | null;
  xp: number;
}

type Format = 'vertical' | 'horizontal';
type Phase = 'setup' | 'countdown' | 'quiz' | 'result';

const MEME_TEXTS: Record<string, string> = {
  correct_common: 'Acertou, mizeravi!',
  correct_streak: 'Tá voando, visse!',
  correct_excellent: 'Você é o bichão mesmo, hein!',
  wrong: 'Eita lasqueira!',
  timeout: 'Ô meu povo...',
  bad_score: 'Estudar mais um poco, né?',
};

export function ViralModeScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { playCorrect, playWrong, playResult, vibrateSelect } = useQuizFeedback();
  const { stateId, stateName, subcategory } = route.params ?? {};

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();


  const [format, setFormat] = useState<Format>('vertical');
  const [phase, setPhase] = useState<Phase>('setup');
  const [countdown, setCountdown] = useState(3);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [timerActive, setTimerActive] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [memeText, setMemeText] = useState('');
  const [showMeme, setShowMeme] = useState(false);
  const [loading, setLoading] = useState(false);
  const [correctStreak, setCorrectStreak] = useState(0);
  const [score, setScore] = useState(0);

  const cameraRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const recordingPromiseRef = useRef<Promise<any> | null>(null);
  const [recordedVideoUri, setRecordedVideoUri] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const isVertical = format === 'vertical';
  const TOTAL_Q = 5;
  const TIME_PER_Q = 15;

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      Speech.stop();
    };
  }, []);

  // ─── Countdown ───────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      startQuiz();
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // ─── Timer ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!timerActive) return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timerActive, current]);

  async function requestAllPermissions() {
    const cam = await requestCameraPermission();
    const mic = await requestRecordingPermissionsAsync();
    return cam.granted && mic.granted;
  }

  async function loadQuestions() {
    setLoading(true);
    let { data } = await supabase.rpc('get_random_quiz_questions', {
      p_state_id:    stateId ?? null,
      p_city_id:     null,
      p_subcategory: subcategory ?? null,
      p_limit:       TOTAL_Q,
    });
    if (!data || data.length < 3) {
      const fallback = await supabase.rpc('get_random_quiz_questions', {
        p_state_id: null, p_city_id: null, p_subcategory: null, p_limit: TOTAL_Q,
      });
      data = fallback.data;
    }
    if (data) setQuestions(data);
    setLoading(false);
  }

  async function handleStart() {
    const ok = await requestAllPermissions();
    if (!ok) {
      Alert.alert('Permissões necessárias', 'Precisamos acesso à câmera e microfone para o Modo Viral.');
      return;
    }
    await loadQuestions();
    setPhase('countdown');
  }

  async function startQuiz() {
    setCameraReady(false);
    setPhase('quiz');
    await narrateQuestion(questions[0]);
  }
  useEffect(() => {
    if (phase === 'quiz' && cameraReady && Platform.OS !== 'web' && cameraRef.current && !isRecording) {
      setIsRecording(true);
      recordingPromiseRef.current = cameraRef.current.recordAsync().catch((err: any) => {
        console.log('Erro ao gravar vídeo:', err);
        return null;
      });
    }
  }, [phase, cameraReady]);

  async function narrateQuestion(q: Question) {
    setTimerActive(false);
    setTimeLeft(TIME_PER_Q);
    return new Promise<void>(resolve => {
      Speech.speak(q.text, {
        language: 'pt-BR',
        rate: 0.9,
        pitch: 1.0,
        onDone: () => { setTimerActive(true); resolve(); },
        onError: () => { setTimerActive(true); resolve(); },
      });
    });
  }

  async function playMeme(key: string) {
    setMemeText(MEME_TEXTS[key] ?? '');
    setShowMeme(true);
    setTimeout(() => setShowMeme(false), 2000);
  }

  function handleTimeout() {
    setAnswered(true);
    setResults(r => [...r, false]);
    setCorrectStreak(0);
    playMeme('timeout');
    setTimeout(() => goNext(), 2500);
  }

  async function handleAnswer(index: number) {
    if (answered || !timerActive) return;
    vibrateSelect();
    clearInterval(timerRef.current);
    setTimerActive(false);
    setSelected(index);
    setAnswered(true);

    const q = questions[current];
    const { data } = await supabase.rpc('submit_answer', {
      p_question_id:  q.id,
      p_answer_index: index,
    });
    const result: AnswerResult = data ?? { is_correct: false, correct_index: -1, explanation: null, xp: 0 };
    setAnswerResult(result);
    const correct = result.is_correct;
    const newStreak = correct ? correctStreak + 1 : 0;

    setResults(r => [...r, correct]);
    setCorrectStreak(newStreak);
    if (correct) setScore(s => s + 1);
    if (correct) { playCorrect(); } else { playWrong(); }

    if (correct) {
      if (newStreak >= 3) await playMeme('correct_streak');
      else await playMeme('correct_common');
    } else {
      await playMeme('wrong');
    }

    setTimeout(() => goNext(), 2200);
  }

  async function goNext() {
    const nextIdx = current + 1;
    if (nextIdx >= questions.length) {
      finishQuiz();
    } else {
      setCurrent(nextIdx);
      setSelected(null);
      setAnswered(false);
      setAnswerResult(null);
      await narrateQuestion(questions[nextIdx]);
    }
  }

  async function finishQuiz() {
    Speech.stop();
    clearInterval(timerRef.current);
    if (Platform.OS !== 'web' && isRecording && cameraRef.current) {
      try {
        cameraRef.current.stopRecording();
        const result = await recordingPromiseRef.current;
        if (result?.uri) setRecordedVideoUri(result.uri);
      } catch (err) {
        console.log('Erro ao parar gravação:', err);
      }
      setIsRecording(false);
    }
    const pct = score / questions.length;
    if (pct >= 0.8) await playMeme('correct_excellent');
    else if (pct < 0.4) await playMeme('bad_score');
    playResult(pct >= 0.6);
    setPhase('result');
  }

  function resetAll() {
    setPhase('setup');
    setCountdown(3);
    setCurrent(0);
    setSelected(null);
    setAnswered(false);
    setTimerActive(false);
    setTimeLeft(TIME_PER_Q);
    setResults([]);
    setScore(0);
    setCorrectStreak(0);
    setMemeText('');
    setShowMeme(false);
    setQuestions([]);
  }

  const timerColor = timeLeft <= 5 ? '#E24B4A' : timeLeft <= 10 ? '#BA7517' : colors.primary;
  const q = questions[current];

  // ══════════════════════════════════════════
  // SETUP SCREEN
  // ══════════════════════════════════════════
  if (phase === 'setup') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={18} color={colors.primary} /><Text style={[styles.backText, { color: colors.primary }]}>Voltar</Text>
        </TouchableOpacity>

        <View style={styles.setupCenter}>
          <View style={[styles.viralBadge, { backgroundColor: '#E24B4A20', borderColor: '#E24B4A40' }]}>
            <Video size={18} color="#E24B4A" />
            <Text style={[styles.viralBadgeText, { color: '#E24B4A' }]}>MODO VIRAL</Text>
          </View>

          <Text style={[styles.setupTitle, { color: colors.text }]}>
            Grave seu quiz{'\n'}e compartilhe!
          </Text>
          <Text style={[styles.setupSub, { color: colors.textSecondary }]}>
            Sua câmera + quiz + memes = conteúdo viral{'\n'}para Reels, TikTok e YouTube Shorts
          </Text>

          {/* Format selector */}
          <Text style={[styles.formatLabel, { color: colors.textSecondary }]}>Escolha o formato</Text>
          <View style={styles.formatRow}>
            {(['vertical', 'horizontal'] as Format[]).map(f => (
              <TouchableOpacity
                key={f}
                onPress={() => setFormat(f)}
                style={[
                  styles.formatBtn,
                  {
                    backgroundColor: format === f ? '#E24B4A15' : colors.card,
                    borderColor: format === f ? '#E24B4A' : colors.border,
                  }
                ]}
              >
                <View style={[
                  styles.formatIcon,
                  f === 'vertical'
                    ? { width: 22, height: 36, borderColor: format === f ? '#E24B4A' : colors.textMuted }
                    : { width: 36, height: 22, borderColor: format === f ? '#E24B4A' : colors.textMuted },
                  { borderWidth: 2, borderRadius: 4 }
                ]} />
                <Text style={[styles.formatName, { color: format === f ? '#E24B4A' : colors.text }]}>
                  {f === 'vertical' ? 'Vertical' : 'Horizontal'}
                </Text>
                <Text style={[styles.formatSub, { color: colors.textMuted }]}>
                  {f === 'vertical' ? 'Reels / TikTok' : 'YouTube Shorts'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Features */}
          <View style={[styles.featureList, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {([
              { Icon: Mic,       label: 'Perguntas narradas automaticamente', color: '#D4537E' },
              { Icon: Volume2,   label: 'Efeitos sonoros com memes',          color: '#BA7517' },
              { Icon: Share2,    label: 'Compartilhe direto nas redes',        color: '#378ADD' },
            ] as { Icon: any; label: string; color: string }[]).map(({ Icon, label, color }) => (
              <View key={label} style={styles.featureRow}>
                <Icon size={18} color={color} />
                <Text style={[styles.featureText, { color: colors.textSecondary }]}>{label}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            onPress={handleStart}
            disabled={loading}
            style={[styles.startBtn, { backgroundColor: '#E24B4A' }]}
          >
            {loading
              ? <ActivityIndicator color="#FFF" />
              : <><Video size={20} color="#FFF" /><Text style={styles.startBtnText}>Começar gravação</Text></>
            }
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ══════════════════════════════════════════
  // COUNTDOWN + QUIZ + CÂMERA (câmera única, sem remontar entre fases)
  // ══════════════════════════════════════════
  if (phase === 'countdown' || (phase === 'quiz' && q)) {
    const cameraH = isVertical ? SH * 0.38 : SH * 0.5;
    const quizH = isVertical ? SH * 0.62 : SH * 0.5;
    const isQuiz = phase === 'quiz';

    return (
      <View style={[styles.fullscreen, { flexDirection: isQuiz && isVertical ? 'column' : isQuiz ? 'row' : 'column' }]}>

        {/* Camera — mesma instância entre countdown e quiz */}
        <View style={isQuiz ? (isVertical ? { height: cameraH, width: SW } : { width: SW * 0.4, height: SH }) : styles.fullscreen}>
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" onCameraReady={() => setCameraReady(true)} />

          {/* Countdown overlay */}
          {phase === 'countdown' && (
            <View style={[StyleSheet.absoluteFill, styles.countdownOverlay]}>
              <Text style={styles.countdownNum}>{countdown}</Text>
              <Text style={styles.countdownText}>Prepare-se!</Text>
            </View>
          )}

          {/* Meme overlay */}
          {isQuiz && showMeme && (
            <View style={styles.memeOverlay}>
              <Text style={styles.memeText}>{memeText}</Text>
            </View>
          )}

          {/* Top bar */}
          {isQuiz && (
            <View style={styles.cameraTopBar}>
              <View style={styles.recDot} />
              <Text style={styles.recText}>REC</Text>
            </View>
          )}
        </View>

        {!isQuiz && null}

        {/* Quiz area */}
        {isQuiz && (
        <View style={[
          isVertical
            ? { height: quizH, width: SW }
            : { width: SW * 0.6, height: SH },
          styles.quizArea,
          { backgroundColor: colors.background }
        ]}>
          {/* Progress dots */}
          <View style={styles.dotsRow}>
            {questions.map((_, i) => (
              <View key={i} style={[
                styles.dot,
                { backgroundColor: i < current ? colors.primary : i === current ? colors.primary + '70' : colors.border }
              ]} />
            ))}
          </View>

          {/* Timer */}
          <View style={styles.timerRow}>
            <Clock size={13} color={timerColor} />
            <View style={[styles.timerBarBg, { backgroundColor: colors.border }]}>
              <View style={[styles.timerBarFill, {
                width: `${(timeLeft / TIME_PER_Q) * 100}%`,
                backgroundColor: timerColor,
              }]} />
            </View>
            <Text style={[styles.timerNum, { color: timerColor }]}>{timeLeft}s</Text>
          </View>

          {/* Question */}
          <View style={[styles.questionBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.subcatBadge, { color: colors.textMuted }]}>{q.subcategory}</Text>
            <Text style={[styles.questionText, { color: colors.text }]} numberOfLines={4}>
              {q.text}
            </Text>
          </View>

          {/* Options */}
          <View style={styles.options}>
            {q.options.map((opt, i) => {
              const revealed  = answerResult !== null;
              const isCorrect = revealed && i === answerResult?.correct_index;
              const isSelected = i === selected;
              let bg = colors.card;
              let border = colors.border;
              let tc = colors.text;

              if (revealed) {
                if (isCorrect) { bg = '#009C3B20'; border = '#009C3B'; tc = '#009C3B'; }
                else if (isSelected) { bg = '#E24B4A20'; border = '#E24B4A'; tc = '#E24B4A'; }
              } else if (isSelected) { bg = colors.primary + '15'; border = colors.primary; tc = colors.primary; }

              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => handleAnswer(i)}
                  disabled={answered}
                  style={[styles.option, { backgroundColor: bg, borderColor: border }]}
                >
                  <View style={[styles.optLetter, { backgroundColor: border + '30' }]}>
                    <Text style={[styles.optLetterText, { color: tc }]}>{['A', 'B', 'C', 'D'][i]}</Text>
                  </View>
                  <Text style={[styles.optText, { color: tc }]} numberOfLines={2}>{opt}</Text>
                  {revealed && isCorrect && <CheckCircle size={16} color="#009C3B" />}
                  {revealed && isSelected && !isCorrect && <XCircle size={16} color="#E24B4A" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        )}
      </View>
    );
  }

  // ══════════════════════════════════════════
  async function handleShareResult() {
    const pct = Math.round((score / questions.length) * 100);
    const msg = `Joguei Cultura Nacional no Modo Viral e acertei ${score}/${questions.length} perguntas (${pct}%)! 🇧🇷\nBaixe o app e me desafie!`;

    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(msg);
        window.alert('Resultado copiado! Cole onde quiser compartilhar.');
      } catch {
        window.prompt('Copie o texto abaixo:', msg);
      }
      return;
    }

    try {
      await Share.share({ message: msg });
    } catch (err: any) {
      Alert.alert('Erro', 'Não foi possível compartilhar.');
    }
  }

  // RESULT
  // ══════════════════════════════════════════
  if (phase === 'result') {
    const pct = Math.round((score / questions.length) * 100);
    const msg = pct >= 80 ? 'Arrasou!' : pct >= 60 ? 'Muito bem!' : 'Treina mais!';
    const ResultIcon = pct >= 80 ? Trophy : pct >= 60 ? Star : BookOpen;
    const resultIconColor = pct >= 80 ? '#FFDF00' : pct >= 60 ? colors.primary : colors.textSecondary;
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.resultCenter}>
          <ResultIcon size={56} color={resultIconColor} />
          <Text style={[styles.resultTitle, { color: colors.text }]}>{msg}</Text>
          <Text style={[styles.resultScore, { color: '#E24B4A' }]}>{score}/{questions.length} acertos</Text>

          <View style={styles.resultDots}>
            {results.map((r, i) => (
              <View key={i} style={[styles.resultDot, { backgroundColor: r ? '#009C3B' : '#E24B4A' }]} />
            ))}
          </View>

          <View style={[styles.shareCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.shareTitle, { color: colors.text }]}>Compartilhe seu resultado!</Text>
            <Text style={[styles.shareSub, { color: colors.textSecondary }]}>
              O vídeo será gerado com sua câmera e as perguntas respondidas
            </Text>
            <TouchableOpacity
              style={[styles.shareBtn, { backgroundColor: '#E24B4A' }]}
              onPress={handleShareResult}
            >
              <Share2 size={18} color="#FFF" />
              <Text style={styles.shareBtnText}>Compartilhar resultado</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.retryBtn, { borderColor: colors.border }]}
              onPress={resetAll}
            >
              <RotateCcw size={16} color={colors.text} />
              <Text style={[styles.retryBtnText, { color: colors.text }]}>Jogar novamente</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fullscreen: { flex: 1 },
  backBtn: { padding: Spacing.xl, paddingTop: 56 },
  backText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  setupCenter: { flex: 1, padding: Spacing.xl, justifyContent: 'center', gap: 16 },
  viralBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 0.5 },
  viralBadgeText: { fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1 },
  setupTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, textAlign: 'center', lineHeight: 34 },
  setupSub: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 22 },
  formatLabel: { fontSize: 11, fontWeight: FontWeight.medium, textTransform: 'uppercase', letterSpacing: 0.5 },
  formatRow: { flexDirection: 'row', gap: 12 },
  formatBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: Radius.lg, borderWidth: 0.5, paddingVertical: Spacing.lg },
  formatIcon: { backgroundColor: 'transparent' },
  formatName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  formatSub: { fontSize: 11 },
  featureList: { borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.lg, gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureIcon: { fontSize: 18 },
  featureText: { fontSize: FontSize.sm, flex: 1 },
  startBtn: { height: 52, borderRadius: Radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  startBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  countdownOverlay: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  countdownNum: { fontSize: 120, fontWeight: FontWeight.bold, color: '#FFF' },
  countdownText: { fontSize: FontSize.xl, color: '#FFF', fontWeight: FontWeight.medium },
  cameraTopBar: { position: 'absolute', top: 48, left: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 6 },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E24B4A' },
  recText: { color: '#FFF', fontSize: 12, fontWeight: FontWeight.bold },
  memeOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
  memeText: { color: '#FFDF00', fontSize: 22, fontWeight: FontWeight.bold, textAlign: 'center', paddingHorizontal: 20 },
  quizArea: { padding: Spacing.md },
  dotsRow: { flexDirection: 'row', gap: 5, marginBottom: Spacing.sm },
  dot: { flex: 1, height: 3, borderRadius: 2 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  timerBarBg: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  timerBarFill: { height: 4, borderRadius: 2 },
  timerNum: { fontSize: 12, fontWeight: FontWeight.bold, width: 28, textAlign: 'right' },
  questionBox: { borderRadius: Radius.md, borderWidth: 0.5, padding: Spacing.md, marginBottom: Spacing.sm },
  subcatBadge: { fontSize: 10, marginBottom: 4, fontWeight: FontWeight.medium },
  questionText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, lineHeight: 22 },
  options: { gap: 6 },
  option: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.md, borderWidth: 0.5, paddingHorizontal: Spacing.sm, paddingVertical: 8, gap: 8 },
  optLetter: { width: 26, height: 26, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  optLetterText: { fontSize: 12, fontWeight: FontWeight.bold },
  optText: { flex: 1, fontSize: 12, lineHeight: 17 },
  resultCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  resultEmoji: { fontSize: 56, marginBottom: Spacing.sm },
  resultTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginBottom: 4 },
  resultScore: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginBottom: Spacing.lg },
  resultDots: { flexDirection: 'row', gap: 8, marginBottom: Spacing.xl },
  resultDot: { width: 12, height: 12, borderRadius: 6 },
  shareCard: { width: '100%', borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.xl, gap: 12 },
  shareTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, textAlign: 'center' },
  shareSub: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
  shareBtn: { height: 50, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  shareBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  retryBtn: { height: 44, borderRadius: Radius.md, borderWidth: 0.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  retryBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
});
