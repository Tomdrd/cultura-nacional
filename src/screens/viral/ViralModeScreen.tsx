import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Dimensions, Alert, Platform, Share, ScrollView, Image,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { requestRecordingPermissionsAsync } from 'expo-audio';
import * as Sharing from 'expo-sharing';
import * as Speech from 'expo-speech';
import { useTheme } from '../../hooks/useTheme';
import { useQuizFeedback } from '../../hooks/useQuizFeedback';
import { supabase } from '../../lib/supabase';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';
import { APP_SHARE_URL } from '../../constants/app';
import { CategoryColors, MedalColors, QuickActionColors, withOpacity } from '../../constants/colors';
import { CheckCircle, XCircle, Clock, Video, RotateCcw, ArrowLeft, Mic, Share2, Volume2, Trophy, Star, BookOpen, Smartphone } from 'lucide-react-native';

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

const VIRAL_CATEGORIES = [
  { name: 'Aleatório',    color: CategoryColors.aleatorio },
  { name: 'Cultura',      color: CategoryColors.cultura },
  { name: 'História',     color: CategoryColors.historia },
  { name: 'Gastronomia',  color: CategoryColors.gastronomia },
  { name: 'Natureza',     color: CategoryColors.natureza },
  { name: 'Turismo',      color: CategoryColors.turismo },
  { name: 'Curiosidades', color: CategoryColors.curiosidades },
  { name: 'Reggae',       color: CategoryColors.reggae },
];
type Format = 'vertical' | 'horizontal';
type Phase = 'setup' | 'countdown' | 'quiz' | 'result';


export function ViralModeScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { playCorrect, playWrong, playResult, vibrateSelect } = useQuizFeedback();
  const { stateId, stateName, subcategory } = route.params ?? {};

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();


  const [format, setFormat] = useState<Format>('vertical');
  const [selectedCategory, setSelectedCategory] = useState<string>('Aleatório');
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
    const categoryFilter = selectedCategory === 'Aleatório' ? null : selectedCategory;
    let { data } = await supabase.rpc('get_random_quiz_questions', {
      p_state_id:    stateId ?? null,
      p_city_id:     null,
      p_subcategory: categoryFilter,
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


  function handleTimeout() {
    setAnswered(true);
    setResults(r => [...r, false]);
    setCorrectStreak(0);
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
    setQuestions([]);
  }

  const timerColor = timeLeft <= 5 ? colors.danger : timeLeft <= 10 ? CategoryColors.gastronomia : colors.primary;
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
          <View style={[styles.viralBadge, { backgroundColor: withOpacity(colors.danger, 12.5), borderColor: withOpacity(colors.danger, 25.1) }]}>
            <Video size={18} color={colors.danger} />
            <Text style={[styles.viralBadgeText, { color: colors.danger }]}>MODO VIRAL</Text>
          </View>

          <Text style={[styles.setupTitle, { color: colors.text }]}>
            Grave seu quiz{'\n'}e compartilhe!
          </Text>
          <Text style={[styles.setupSub, { color: colors.textSecondary }]}>
            Sua câmera + quiz = conteúdo pronto{'\n'}para Reels, TikTok e YouTube Shorts
          </Text>

          {/* Category selector */}
          <Text style={[styles.formatLabel, { color: colors.textSecondary }]}>Escolha a categoria</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryRow}
          >
            {VIRAL_CATEGORIES.map(({ name, color }) => {
              const active = selectedCategory === name;
              return (
                <TouchableOpacity
                  key={name}
                  onPress={() => setSelectedCategory(name)}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: active ? withOpacity(color, 12.5) : colors.card,
                      borderColor: active ? color : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.categoryChipText, { color: active ? color : colors.textSecondary }]}>
                    {name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Aviso importante */}
          <View style={[styles.warningCard, { backgroundColor: withOpacity(CategoryColors.gastronomia, 8.2), borderColor: withOpacity(CategoryColors.gastronomia, 25.1) }]}>
            <View style={styles.warningHeader}>
              <Smartphone size={20} color={CategoryColors.gastronomia} />
              <Text style={[styles.warningTitle, { color: CategoryColors.gastronomia }]}>Antes de começar</Text>
            </View>
            <Text style={[styles.warningText, { color: colors.textSecondary }]}>
              Ative a gravação de tela do seu celular antes de iniciar. O app grava sua câmera, mas é a gravação de tela que captura tudo junto: pergunta, resposta e sua reação.
            </Text>
          </View>

          {/* Features */}
          <View style={[styles.featureList, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {([
              { Icon: Mic,       label: 'Perguntas narradas automaticamente', color: CategoryColors.curiosidades },
              { Icon: Volume2,   label: 'Efeitos sonoros e vibração ao responder', color: CategoryColors.gastronomia },
              { Icon: Share2,    label: 'Compartilhe direto nas redes',        color: CategoryColors.turismo },
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
            style={[styles.startBtn, { backgroundColor: QuickActionColors.viral.bg }]}
          >
            {loading
              ? <ActivityIndicator color={QuickActionColors.viral.fg} />
              : <><Video size={20} color={QuickActionColors.viral.fg} /><Text style={[styles.startBtnText, { color: QuickActionColors.viral.fg }]}>Começar gravação</Text></>
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
      <View style={[styles.fullscreen, { flexDirection: isQuiz && isVertical ? 'column' : isQuiz ? 'row' : 'column', backgroundColor: colors.background }]}>

        {/* Camera — mesma instância entre countdown e quiz */}
        <View style={isQuiz ? (isVertical ? { height: cameraH, width: SW } : { width: SW * 0.4, height: SH }) : styles.fullscreen}>
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" onCameraReady={() => setCameraReady(true)} />

          {/* Marca d'água */}
          <Image
            source={require('../../../assets/images/icon.png')}
            style={styles.watermark}
          />

          {/* Countdown overlay */}
          {phase === 'countdown' && (
            <View style={[StyleSheet.absoluteFill, styles.countdownOverlay]}>
              <Text style={styles.countdownNum}>{countdown}</Text>
              <Text style={styles.countdownText}>Prepare-se!</Text>
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
                { backgroundColor: i < current ? colors.primary : i === current ? withOpacity(colors.primary, 43.9) : colors.border }
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
                if (isCorrect) { bg = withOpacity(colors.success, 12.5); border = colors.success; tc = colors.success; }
                else if (isSelected) { bg = withOpacity(colors.danger, 12.5); border = colors.danger; tc = colors.danger; }
              } else if (isSelected) { bg = withOpacity(colors.primary, 8.2); border = colors.primary; tc = colors.primary; }

              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => handleAnswer(i)}
                  disabled={answered}
                  style={[styles.option, { backgroundColor: bg, borderColor: border }]}
                >
                  <View style={[styles.optLetter, { backgroundColor: withOpacity(border, 18.8) }]}>
                    <Text style={[styles.optLetterText, { color: tc }]}>{['A', 'B', 'C', 'D'][i]}</Text>
                  </View>
                  <Text style={[styles.optText, { color: tc }]} numberOfLines={2}>{opt}</Text>
                  {revealed && isCorrect && <CheckCircle size={16} color={colors.success} />}
                  {revealed && isSelected && !isCorrect && <XCircle size={16} color={colors.danger} />}
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
    const msg = `Joguei Cultura Nacional no Modo Viral e acertei ${score}/${questions.length} perguntas (${pct}%)! 🇧🇷\nBaixe o app e me desafie!\n${APP_SHARE_URL}`;

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
      await Share.share({ message: msg, url: APP_SHARE_URL });
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
    const resultIconColor = pct >= 80 ? MedalColors.gold : pct >= 60 ? colors.primary : colors.textSecondary;
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.resultCenter}>
          <ResultIcon size={56} color={resultIconColor} />
          <Text style={[styles.resultTitle, { color: colors.text }]}>{msg}</Text>
          <Text style={[styles.resultScore, { color: colors.text }]}>{score}/{questions.length} acertos</Text>

          <View style={styles.resultDots}>
            {results.map((r, i) => (
              <View key={i} style={[styles.resultDot, { backgroundColor: r ? colors.success : colors.danger }]} />
            ))}
          </View>

          <View style={[styles.shareCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.shareTitle, { color: colors.text }]}>Compartilhe seu resultado!</Text>
            <Text style={[styles.shareSub, { color: colors.textSecondary }]}>
              O vídeo será gerado com sua câmera e as perguntas respondidas
            </Text>
            <TouchableOpacity
              style={[styles.shareBtn, { backgroundColor: QuickActionColors.viral.bg }]}
              onPress={handleShareResult}
            >
              <Share2 size={18} color={QuickActionColors.viral.fg} />
              <Text style={[styles.shareBtnText, { color: QuickActionColors.viral.fg }]}>Compartilhar resultado</Text>
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
  viralBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 1 },
  setupTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, textAlign: 'center', lineHeight: 34 },
  setupSub: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 22 },
  formatLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, textTransform: 'uppercase', letterSpacing: 0.5 },
  formatRow: { flexDirection: 'row', gap: 12 },
  categoryScroll: { flexGrow: 0 },
  categoryRow: { flexDirection: 'row', gap: 8, paddingVertical: 4, alignItems: 'center' },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.full, borderWidth: 0.5 },
  categoryChipText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  formatBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: Radius.lg, borderWidth: 0.5, paddingVertical: Spacing.lg },
  formatIcon: { backgroundColor: 'transparent' },
  formatName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  formatSub: { fontSize: FontSize.xs },
  warningCard: { borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.lg, gap: 8 },
  warningHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  warningTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  warningText: { fontSize: FontSize.xs, lineHeight: 18 },
  featureList: { borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.lg, gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureIcon: { fontSize: 18 },
  featureText: { fontSize: FontSize.sm, flex: 1 },
  startBtn: { height: 52, borderRadius: Radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  startBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  countdownOverlay: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  countdownNum: { fontSize: 120, fontWeight: FontWeight.bold, color: '#FFF' },
  countdownText: { fontSize: FontSize.xl, color: '#FFF', fontWeight: FontWeight.medium },
  cameraTopBar: { position: 'absolute', top: 48, left: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 6 },
  watermark: { position: 'absolute', top: 48, right: Spacing.lg, width: 32, height: 32, borderRadius: 8, opacity: 0.85 },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E24B4A' },
  recText: { color: '#FFF', fontSize: 12, fontWeight: FontWeight.bold },
  quizArea: { padding: Spacing.md },
  dotsRow: { flexDirection: 'row', gap: 5, marginBottom: Spacing.sm },
  dot: { flex: 1, height: 3, borderRadius: 2 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  timerBarBg: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  timerBarFill: { height: 4, borderRadius: 2 },
  timerNum: { fontSize: 12, fontWeight: FontWeight.bold, width: 28, textAlign: 'right' },
  questionBox: { borderRadius: Radius.md, borderWidth: 0.5, padding: Spacing.md, marginBottom: Spacing.sm },
  subcatBadge: { fontSize: FontSize.xs, marginBottom: 4, fontWeight: FontWeight.medium },
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
  shareBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  retryBtn: { height: 44, borderRadius: Radius.md, borderWidth: 0.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  retryBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
});
