import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Alert, Platform, Share, ScrollView, Image, useWindowDimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { requestRecordingPermissionsAsync } from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Sharing from 'expo-sharing';
import * as Speech from 'expo-speech';
import { useTheme } from '../../hooks/useTheme';
import { useHeaderTopPadding } from '../../hooks/useHeaderTopPadding';
import { useQuizFeedback } from '../../hooks/useQuizFeedback';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { Spacing, FontSize, FontWeight, Radius, scaleFont } from '../../constants/layout';
import { APP_SHARE_URL } from '../../constants/app';
import { HomeTheme, MedalColors } from '../../constants/colors';
import { CheckCircle, XCircle, Clock, Video, RotateCcw, ArrowLeft, Mic, Share2, Volume2, Trophy, Star, BookOpen, Smartphone, X } from 'lucide-react-native';

const DANGER = '#E24B4A';
const DANGER_TEXT = '#F09595';


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

const VIRAL_CATEGORIES = ['Aleatório', 'Cultura', 'História', 'Gastronomia', 'Natureza', 'Turismo', 'Curiosidades', 'Reggae'];
type Format = 'vertical' | 'horizontal';
type Phase = 'setup' | 'countdown' | 'quiz' | 'result';


export function ViralModeScreen({ navigation, route }: any) {
  const { isDark } = useTheme();
  const C = isDark ? HomeTheme.dark : HomeTheme.light;
  const headerPaddingTop = useHeaderTopPadding();
  const { width: winW, height: winH } = useWindowDimensions();
  const { playCorrect, playWrong, playResult, vibrateSelect } = useQuizFeedback();
  const { user } = useAuthStore();
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
  const xpRef = useRef(0);
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
    narrateQuestion(questions[0]);
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

  function narrateQuestion(q: Question) {
    // Timer e respostas liberam na hora — a narração toca em paralelo e
    // nunca deve bloquear a interação (em iOS o onDone/onError do TTS pode
    // simplesmente não disparar, travando o quiz se dependermos dele).
    setTimeLeft(TIME_PER_Q);
    setTimerActive(true);
    Speech.stop();
    Speech.speak(q.text, { language: 'pt-BR', rate: 1.3, pitch: 0.85 });
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
    xpRef.current += result.xp;
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
      narrateQuestion(questions[nextIdx]);
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
    if (user) {
      await Promise.all([
        xpRef.current > 0
          ? Promise.all([
              supabase.rpc('update_xp_and_level', { p_user_id: user.id, p_xp_gained: xpRef.current }),
              supabase.rpc('update_city_ranking',  { p_user_id: user.id, p_xp_gained: xpRef.current }),
            ])
          : Promise.resolve(),
        supabase.rpc('update_streak_on_play', { p_user_id: user.id }),
        supabase.rpc('update_daily_mission_progress', {
          p_user_id:  user.id,
          p_state_id: stateId ?? null,
          p_correct:  score,
          p_total:    questions.length,
        }),
      ]);
      await supabase.rpc('check_and_grant_achievements', { p_user_id: user.id });
    }
    setPhase('result');
  }

  async function resetAll() {
    Speech.stop();
    clearInterval(timerRef.current);
    if (Platform.OS !== 'web' && isRecording && cameraRef.current) {
      try {
        cameraRef.current.stopRecording();
        await recordingPromiseRef.current;
      } catch (err) {
        console.log('Erro ao parar gravação:', err);
      }
      setIsRecording(false);
    }
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

  const timerColor = timeLeft <= 5 ? DANGER : timeLeft <= 10 ? C.yellow : C.green;
  const q = questions[current];

  // ══════════════════════════════════════════
  // SETUP SCREEN
  // ══════════════════════════════════════════
  if (phase === 'setup') {
    return (
      <View style={[styles.container, { backgroundColor: '#000', width: winW, height: winH }]}>
        {/* Imagem ilustrativa de fundo — gerada por IA (não é foto de pessoa real) */}
        <Image source={require('../../../assets/images/viral-setup-bg.jpg')} style={styles.setupBgImage} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.88)']}
          locations={[0, 0.42, 1]}
          style={styles.setupBgImage}
        />

        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { paddingTop: headerPaddingTop }]}>
          <ArrowLeft size={18} color="#FFF" /><Text style={[styles.backText, { color: '#FFF' }]}>Voltar</Text>
        </TouchableOpacity>

        <View style={styles.setupCenter}>
          <View style={styles.glassPill}>
            <Video size={14} color="#FFF" />
            <Text style={[styles.glassPillText, { letterSpacing: 1, fontWeight: FontWeight.bold }]}>MODO VIRAL</Text>
          </View>

          <Text style={[styles.setupTitle, { color: '#FFF' }]}>
            Grave seu quiz{'\n'}e compartilhe!
          </Text>
          <Text style={[styles.setupSub, { color: 'rgba(255,255,255,0.8)' }]}>
            Sua câmera + quiz = conteúdo pronto{'\n'}para Reels, TikTok e YouTube Shorts
          </Text>

          {/* Category selector */}
          <Text style={[styles.formatLabel, { color: 'rgba(255,255,255,0.65)' }]}>Escolha a categoria</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryRow}
          >
            {VIRAL_CATEGORIES.map((name) => {
              const active = selectedCategory === name;
              return (
                <TouchableOpacity
                  key={name}
                  onPress={() => setSelectedCategory(name)}
                  style={[
                    styles.categoryChip,
                    active
                      ? { backgroundColor: `${C.green}30`, borderColor: C.green }
                      : { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.22)' },
                  ]}
                >
                  <Text style={[styles.categoryChipText, { color: active ? '#5DCAA5' : 'rgba(255,255,255,0.8)' }]}>
                    {name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Aviso importante - mesmo tratamento "vidro" do card de baixo
              (featureListGlass): blur + tint sutil por cima, em vez de cor
              lisa translucida direto sobre a foto de fundo */}
          <View style={[styles.warningCard, { borderColor: `${C.yellow}55` }]}>
            <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: `${C.yellow}26` }]} />
            <View style={styles.warningHeader}>
              <Smartphone size={20} color={C.yellow} />
              <Text style={[styles.warningTitle, { color: C.yellow }]}>Antes de começar</Text>
            </View>
            <Text style={[styles.warningText, { color: 'rgba(255,255,255,0.85)' }]}>
              Ative a gravação de tela do seu celular antes de iniciar. O app grava sua câmera, mas é a gravação de tela que captura tudo junto: pergunta, resposta e sua reação.
            </Text>
          </View>

          {/* Features */}
          <BlurView intensity={35} tint="dark" style={styles.featureListGlass}>
            {([
              { Icon: Mic,     label: 'Perguntas narradas automaticamente' },
              { Icon: Volume2, label: 'Efeitos sonoros e vibração ao responder' },
              { Icon: Share2,  label: 'Compartilhe direto nas redes' },
            ] as { Icon: any; label: string }[]).map(({ Icon, label }) => (
              <View key={label} style={styles.featureRow}>
                <View style={[styles.featureIconBox, { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' }]}>
                  <Icon size={15} color="#FFF" />
                </View>
                <Text style={[styles.featureText, { color: 'rgba(255,255,255,0.85)' }]}>{label}</Text>
              </View>
            ))}
          </BlurView>

          <TouchableOpacity
            onPress={handleStart}
            disabled={loading}
            style={[styles.startBtn, { backgroundColor: C.green }]}
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
    const isQuiz = phase === 'quiz';

    // ── Formato vertical: câmera ocupa a tela toda, quiz vira overlay de vidro na base ──
    if (isVertical) {
      return (
        <View style={[styles.fullscreen, { backgroundColor: '#000', width: winW, height: winH }]}>
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" onCameraReady={() => setCameraReady(true)} />

          {/* Escurece o topo e a base pra manter o texto legível sobre o vídeo */}
          <LinearGradient
            colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.7)']}
            locations={[0, 0.22, 0.6, 1]}
            style={StyleSheet.absoluteFill}
          />

          <Image source={require('../../../assets/images/icon.png')} style={styles.watermark} />

          {phase === 'countdown' && (
            <View style={[StyleSheet.absoluteFill, styles.countdownOverlay]}>
              <Text style={styles.countdownNum}>{countdown}</Text>
              <Text style={styles.countdownText}>Prepare-se!</Text>
            </View>
          )}

          {isQuiz && (
            <View style={[styles.overlayTopBar, { paddingTop: headerPaddingTop }]}>
              <TouchableOpacity onPress={resetAll} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={20} color="#FFF" />
              </TouchableOpacity>
              <View style={styles.recBadge}>
                <View style={styles.recDot} />
                <Text style={styles.recText}>REC</Text>
              </View>
              <View style={{ width: 20 }} />
            </View>
          )}

          {isQuiz && (
            <>
              <View style={styles.overlayDotsRow}>
                {questions.map((_, i) => (
                  <View key={i} style={[
                    styles.dot,
                    { backgroundColor: i < current ? C.green : i === current ? `${C.green}90` : 'rgba(255,255,255,0.25)' }
                  ]} />
                ))}
              </View>

              <View style={styles.overlayBottom}>
                <View style={styles.overlayMetaRow}>
                  <View style={styles.glassPill}>
                    <Text style={styles.glassPillText}>{q.subcategory}</Text>
                  </View>
                  <View style={styles.glassPill}>
                    <Clock size={12} color={timerColor} />
                    <Text style={[styles.glassPillText, { color: timerColor, fontWeight: FontWeight.bold }]}>{timeLeft}s</Text>
                  </View>
                </View>

                <BlurView intensity={40} tint="dark" style={styles.glassCard}>
                  <Text style={styles.glassQuestionText} numberOfLines={4}>{q.text}</Text>
                  <View style={styles.options}>
                    {q.options.map((opt, i) => {
                      const revealed  = answerResult !== null;
                      const isCorrect = revealed && i === answerResult?.correct_index;
                      const isSelected = i === selected;
                      let bg = 'rgba(255,255,255,0.08)', border = 'rgba(255,255,255,0.18)', tc = '#FFF';
                      if (revealed) {
                        if (isCorrect)       { bg = `${C.green}30`; border = C.green; tc = C.green; }
                        else if (isSelected) { bg = `${DANGER}30`; border = DANGER; tc = DANGER_TEXT; }
                      } else if (isSelected) { bg = `${C.green}22`; border = C.green; tc = C.green; }
                      return (
                        <TouchableOpacity
                          key={i}
                          onPress={() => handleAnswer(i)}
                          disabled={answered}
                          style={[styles.glassOption, { backgroundColor: bg, borderColor: border }]}
                        >
                          <Text style={[styles.glassOptLetter, { color: tc }]}>{['A', 'B', 'C', 'D'][i]}</Text>
                          <Text style={[styles.glassOptText, { color: tc }]} numberOfLines={2}>{opt}</Text>
                          {revealed && isCorrect               && <CheckCircle size={16} color={C.green} />}
                          {revealed && isSelected && !isCorrect && <XCircle size={16} color={DANGER_TEXT} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </BlurView>
              </View>
            </>
          )}
        </View>
      );
    }

    // ── Formato horizontal: câmera e quiz lado a lado (sem overlay) ──
    const cameraW = winW * 0.4;
    return (
      <View style={[styles.fullscreen, { flexDirection: 'row', backgroundColor: C.bg, width: winW, height: winH }]}>
        <View style={{ width: cameraW, height: winH }}>
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" onCameraReady={() => setCameraReady(true)} />
          <Image source={require('../../../assets/images/icon.png')} style={styles.watermark} />
          {phase === 'countdown' && (
            <View style={[StyleSheet.absoluteFill, styles.countdownOverlay]}>
              <Text style={styles.countdownNum}>{countdown}</Text>
              <Text style={styles.countdownText}>Prepare-se!</Text>
            </View>
          )}
          {isQuiz && (
            <View style={[styles.overlayTopBar, { paddingTop: headerPaddingTop, paddingHorizontal: Spacing.md }]}>
              <View style={styles.recBadge}>
                <View style={styles.recDot} />
                <Text style={styles.recText}>REC</Text>
              </View>
            </View>
          )}
        </View>

        {isQuiz && (
          <View style={[{ width: winW - cameraW, height: winH }, styles.quizArea, { backgroundColor: C.bg }]}>
            <View style={styles.dotsRow}>
              {questions.map((_, i) => (
                <View key={i} style={[styles.dot, { backgroundColor: i < current ? C.green : i === current ? `${C.green}60` : C.border }]} />
              ))}
            </View>

            <View style={styles.timerRow}>
              <Clock size={13} color={timerColor} />
              <View style={[styles.timerBarBg, { backgroundColor: C.border }]}>
                <View style={[styles.timerBarFill, { width: `${(timeLeft / TIME_PER_Q) * 100}%`, backgroundColor: timerColor }]} />
              </View>
              <Text style={[styles.timerNum, { color: timerColor }]}>{timeLeft}s</Text>
            </View>

            <View style={[styles.questionBox, { backgroundColor: C.card, borderColor: C.border }]}>
              <Text style={[styles.subcatBadge, { color: C.muted }]}>{q.subcategory}</Text>
              <Text style={[styles.questionText, { color: C.text }]} numberOfLines={4}>{q.text}</Text>
            </View>

            <View style={styles.options}>
              {q.options.map((opt, i) => {
                const revealed  = answerResult !== null;
                const isCorrect = revealed && i === answerResult?.correct_index;
                const isSelected = i === selected;
                let bg: string = C.card, border: string = C.border, tc: string = C.text;
                if (revealed) {
                  if (isCorrect)       { bg = `${C.green}18`; border = C.green; tc = C.green; }
                  else if (isSelected) { bg = `${DANGER}18`; border = DANGER; tc = DANGER_TEXT; }
                } else if (isSelected) { bg = `${C.green}14`; border = C.green; tc = C.green; }
                return (
                  <TouchableOpacity key={i} onPress={() => handleAnswer(i)} disabled={answered} style={[styles.option, { backgroundColor: bg, borderColor: border }]}>
                    <View style={[styles.optLetter, { backgroundColor: C.iconBg }]}>
                      <Text style={[styles.optLetterText, { color: tc }]}>{['A', 'B', 'C', 'D'][i]}</Text>
                    </View>
                    <Text style={[styles.optText, { color: tc }]} numberOfLines={2}>{opt}</Text>
                    {revealed && isCorrect               && <CheckCircle size={16} color={C.green} />}
                    {revealed && isSelected && !isCorrect && <XCircle size={16} color={DANGER_TEXT} />}
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
    const resultIconColor = pct >= 80 ? MedalColors.gold : pct >= 60 ? C.green : C.muted;
    return (
      <View style={[styles.container, { backgroundColor: C.bg }]}>
        <View style={styles.resultCenter}>
          <ResultIcon size={56} color={resultIconColor} />
          <Text style={[styles.resultTitle, { color: C.text }]}>{msg}</Text>
          <Text style={[styles.resultScore, { color: C.text }]}>{score}/{questions.length} acertos</Text>

          <View style={styles.resultDots}>
            {results.map((r, i) => (
              <View key={i} style={[styles.resultDot, { backgroundColor: r ? C.green : DANGER }]} />
            ))}
          </View>

          <View style={[styles.shareCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.shareTitle, { color: C.text }]}>Compartilhe seu resultado!</Text>
            <Text style={[styles.shareSub, { color: C.muted }]}>
              O vídeo será gerado com sua câmera e as perguntas respondidas
            </Text>
            <TouchableOpacity
              style={[styles.shareBtn, { backgroundColor: C.green }]}
              onPress={handleShareResult}
            >
              <Share2 size={18} color="#FFF" />
              <Text style={styles.shareBtnText}>Compartilhar resultado</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.retryBtn, { borderColor: C.border }]}
              onPress={resetAll}
            >
              <RotateCcw size={16} color={C.text} />
              <Text style={[styles.retryBtnText, { color: C.text }]}>Jogar novamente</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', height: '100%' },
  fullscreen: { flex: 1, width: '100%', height: '100%' },
  setupBgImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  backBtn: { padding: Spacing.xl, flexDirection: 'row', alignItems: 'center', gap: 8 },
  backText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  setupCenter: { flex: 1, padding: Spacing.xl, justifyContent: 'center', gap: 16 },
  viralBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1 },
  viralBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 1 },
  setupTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, textAlign: 'center', lineHeight: 34 },
  setupSub: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 22 },
  formatLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, textTransform: 'uppercase', letterSpacing: 0.5 },
  formatRow: { flexDirection: 'row', gap: 12 },
  categoryScroll: { flexGrow: 0 },
  categoryRow: { flexDirection: 'row', gap: 8, paddingVertical: 4, alignItems: 'center' },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.full, borderWidth: 1 },
  categoryChipText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  formatBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: Radius.lg, borderWidth: 1, paddingVertical: Spacing.lg },
  formatIcon: { backgroundColor: 'transparent' },
  formatName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  formatSub: { fontSize: FontSize.xs },
  warningCard: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.lg, gap: 8, overflow: 'hidden' },
  warningHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  warningTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  warningText: { fontSize: FontSize.xs, lineHeight: 18 },
  featureList: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.lg, gap: 12 },
  featureListGlass: { borderRadius: Radius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', padding: Spacing.lg, gap: 12, overflow: 'hidden' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureIconBox: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  featureText: { fontSize: FontSize.sm, flex: 1 },
  startBtn: { height: 52, borderRadius: Radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  startBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#FFF' },
  countdownOverlay: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  countdownNum: { fontSize: scaleFont(120), fontWeight: FontWeight.bold, color: '#FFF' },
  countdownText: { fontSize: FontSize.xl, color: '#FFF', fontWeight: FontWeight.medium },
  watermark: { position: 'absolute', top: 48, right: Spacing.lg, width: 32, height: 32, borderRadius: 8, opacity: 0.85 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E24B4A' },
  recText: { color: '#FFF', fontSize: scaleFont(11), fontWeight: FontWeight.bold, letterSpacing: 0.5 },

  // Overlay de vidro (formato vertical)
  overlayTopBar:  { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingBottom: 10 },
  recBadge:       { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#E24B4A', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  overlayDotsRow: { position: 'absolute', top: 92, left: Spacing.lg, right: Spacing.lg, flexDirection: 'row', gap: 5 },
  overlayBottom:  { position: 'absolute', left: 0, right: 0, bottom: 0, padding: Spacing.lg, paddingBottom: Spacing.xl },
  overlayMetaRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  glassPill:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  glassPillText:  { fontSize: scaleFont(10), fontWeight: FontWeight.medium, color: '#FFF' },
  glassCard:      { borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', padding: Spacing.lg, overflow: 'hidden' },
  glassQuestionText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#FFF', lineHeight: 22, marginBottom: 12 },
  glassOption:    { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  glassOptLetter: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, width: 14 },
  glassOptText:   { flex: 1, fontSize: FontSize.xs, lineHeight: 17 },

  quizArea: { padding: Spacing.md },
  dotsRow: { flexDirection: 'row', gap: 5, marginBottom: Spacing.sm },
  dot: { flex: 1, height: 3, borderRadius: 2 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  timerBarBg: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  timerBarFill: { height: 4, borderRadius: 2 },
  timerNum: { fontSize: scaleFont(12), fontWeight: FontWeight.bold, width: 28, textAlign: 'right' },
  questionBox: { borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.sm },
  subcatBadge: { fontSize: FontSize.xs, marginBottom: 4, fontWeight: FontWeight.medium },
  questionText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, lineHeight: 22 },
  options: { gap: 8 },
  option: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: Spacing.sm, paddingVertical: 8, gap: 8 },
  optLetter: { width: 26, height: 26, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  optLetterText: { fontSize: scaleFont(12), fontWeight: FontWeight.bold },
  optText: { flex: 1, fontSize: scaleFont(12), lineHeight: 17 },
  resultCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  resultEmoji: { fontSize: scaleFont(56), marginBottom: Spacing.sm },
  resultTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginBottom: 4 },
  resultScore: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginBottom: Spacing.lg },
  resultDots: { flexDirection: 'row', gap: 8, marginBottom: Spacing.xl },
  resultDot: { width: 12, height: 12, borderRadius: 6 },
  shareCard: { width: '100%', borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.xl, gap: 12 },
  shareTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, textAlign: 'center' },
  shareSub: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
  shareBtn: { height: 50, borderRadius: Radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  shareBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#FFF' },
  retryBtn: { height: 44, borderRadius: Radius.md, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  retryBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
});
