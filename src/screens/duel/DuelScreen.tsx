import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Share, TextInput, Alert, Animated, Image, Platform, ScrollView } from 'react-native';
import Swords from 'lucide-react-native/dist/esm/icons/swords';
import Clock from 'lucide-react-native/dist/esm/icons/clock';
import CheckCircle from 'lucide-react-native/dist/esm/icons/circle-check';
import XCircle from 'lucide-react-native/dist/esm/icons/circle-x';
import Trophy from 'lucide-react-native/dist/esm/icons/trophy';
import Copy from 'lucide-react-native/dist/esm/icons/copy';
import Users from 'lucide-react-native/dist/esm/icons/users';
import UserPlus from 'lucide-react-native/dist/esm/icons/user-plus';
import ArrowLeft from 'lucide-react-native/dist/esm/icons/arrow-left';
import X from 'lucide-react-native/dist/esm/icons/x';
import User from 'lucide-react-native/dist/esm/icons/user';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../hooks/useTheme';
import { useHeaderTopPadding } from '../../hooks/useHeaderTopPadding';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Spacing, FontSize, FontWeight, Radius, scaleFont } from '../../constants/layout';
import { HomeTheme, MedalColors } from '../../constants/colors';
import { useGlobalQuizTimer } from '../../hooks/useGlobalQuizTimer';

const DANGER = '#E24B4A';
const DANGER_TEXT = '#F09595';

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
  avatar_url?: string | null;
}

type ChallengeTab = 'friends' | 'top' | 'new';

interface ChallengeEntry {
  id: string;
  username: string;
  avatar_url?: string | null;
  level: number;
  xp: number;
}

const CHALLENGE_LIMIT = 5;

const TOTAL_QUESTIONS = 5;
const TIME_PER_QUESTION = 15;

export function DuelScreen({ route, navigation }: any) {
  const { isDark } = useTheme();
  const C = isDark ? HomeTheme.dark : HomeTheme.light;
  const headerPaddingTop = useHeaderTopPadding();
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
  const [myAvatar,     setMyAvatar]     = useState<string | null>(null);
  const [myAnswers,    setMyAnswers]     = useState<boolean[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [joinCode,     setJoinCode]     = useState('');
  const [showJoin,     setShowJoin]     = useState(false);

  // ─── Lista compacta pra desafiar (Amigos / Melhores / Novos) ───
  const [challengeTab,     setChallengeTab]     = useState<ChallengeTab>('friends');
  const [challengeList,    setChallengeList]    = useState<ChallengeEntry[]>([]);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [followingIds,     setFollowingIds]     = useState<Set<string>>(new Set());
  const [addingId,         setAddingId]         = useState<string | null>(null);

  const channelRef    = useRef<any>(null);
  // useRef para evitar stale closure no listener Realtime
  const duelStateRef  = useRef<DuelState>('lobby');
  const matchIdRef    = useRef<string | null>(null);
  const currentRef    = useRef(0);
  const answeredRef   = useRef(false);
  const myFinishedRef = useRef(false);

  const totalSeconds = TIME_PER_QUESTION * TOTAL_QUESTIONS;

  function handleTimeExpired() {
    // Tempo total do duelo zerou: marca localmente a pergunta atual (se não
    // respondida) e as restantes como erradas. Não grava cada uma no banco
    // (opção mais simples) - só sinaliza que este jogador terminou.
    setMyAnswers(prev => {
      const remaining = questions.length - prev.length;
      if (remaining <= 0) return prev;
      return [...prev, ...Array(remaining).fill(false)];
    });
    finishAsPlayer();
  }

  const {
    timeLeft, progressAnim,
    start: startTimer, stop: stopTimer,
  } = useGlobalQuizTimer({ totalSeconds, onExpire: handleTimeExpired });

  // Sincroniza refs com state
  useEffect(() => { duelStateRef.current  = duelState;  }, [duelState]);
  useEffect(() => { matchIdRef.current    = matchId;    }, [matchId]);
  useEffect(() => { currentRef.current    = current;    }, [current]);
  useEffect(() => { answeredRef.current   = answered;   }, [answered]);

  useEffect(() => { return () => cleanup(); }, []);

  // Acessibilidade por teclado (versão web): A/B/C/D marcam a alternativa
  // correspondente. Só ativo na web e enquanto o duelo está em andamento.
  // Diferente do QuizScreen, aqui não existe um botão "próxima pergunta"
  // manual — o avanço já é automático (setTimeout em handleAnswer, ver
  // nextQuestion), então não há atalho de Enter para avançar durante o duelo.
  // Na tela de resultado: Enter = jogar novamente; Backspace = voltar.
  useEffect(() => {
    if (Platform.OS !== 'web' || duelState !== 'playing') return;

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;

      const letters = ['A', 'B', 'C', 'D'];
      const key = e.key.toUpperCase();
      if (letters.includes(key)) {
        const index = letters.indexOf(key);
        if (!answered && index < (questions[current]?.options.length ?? 0)) {
          e.preventDefault();
          handleAnswer(index);
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [duelState, current, answered, questions]);

  // Teclado na tela de resultado do duelo
  useEffect(() => {
    if (Platform.OS !== 'web' || duelState !== 'finished') return;

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        resetDuel();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        navigation.goBack();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [duelState]);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('avatar_url').eq('id', user.id).single()
      .then(({ data }) => { if (data) setMyAvatar(data.avatar_url); });
  }, [user]);

  // ─── Carrega a lista compacta pra desafiar (Amigos / Melhores / Novos) ───
  useEffect(() => {
    if (!user || duelState !== 'lobby') return;
    loadChallengeList(challengeTab);
  }, [user, duelState, challengeTab]);

  async function loadChallengeList(tab: ChallengeTab) {
    if (!user) return;
    setChallengeLoading(true);
    let ids: string[] = [];

    if (tab === 'friends') {
      // Amigo = seguidor mútuo (eu sigo e ele me segue de volta)
      const [{ data: iFollow }, { data: followMe }] = await Promise.all([
        supabase.from('follows').select('following_id').eq('follower_id', user.id),
        supabase.from('follows').select('follower_id').eq('following_id', user.id),
      ]);
      const followMeSet = new Set((followMe ?? []).map((r: any) => r.follower_id));
      ids = (iFollow ?? [])
        .map((r: any) => r.following_id)
        .filter((id: string) => followMeSet.has(id))
        .slice(0, CHALLENGE_LIMIT);
    }

    let list: ChallengeEntry[] = [];
    if (tab === 'friends') {
      if (ids.length > 0) {
        const { data } = await supabase
          .from('profiles').select('id, username, avatar_url, level, xp')
          .in('id', ids);
        list = (data ?? []) as ChallengeEntry[];
      }
    } else if (tab === 'top') {
      const { data } = await supabase
        .from('profiles').select('id, username, avatar_url, level, xp')
        .neq('id', user.id)
        .order('xp', { ascending: false })
        .limit(CHALLENGE_LIMIT);
      list = (data ?? []) as ChallengeEntry[];
    } else {
      const { data } = await supabase
        .from('profiles').select('id, username, avatar_url, level, xp')
        .neq('id', user.id)
        .order('created_at', { ascending: false })
        .limit(CHALLENGE_LIMIT);
      list = (data ?? []) as ChallengeEntry[];
    }
    setChallengeList(list);

    // Descobre quais dessa lista o usuário já segue (pra esconder o botão de adicionar)
    if (tab !== 'friends' && list.length > 0) {
      const { data: mine } = await supabase
        .from('follows').select('following_id')
        .eq('follower_id', user.id)
        .in('following_id', list.map(l => l.id));
      setFollowingIds(new Set((mine ?? []).map((r: any) => r.following_id)));
    } else {
      setFollowingIds(new Set());
    }
    setChallengeLoading(false);
  }

  async function handleAddFriend(targetId: string) {
    if (!user || addingId) return;
    setAddingId(targetId);
    const { error } = await supabase.from('follows').insert({ follower_id: user.id, following_id: targetId });
    if (!error) setFollowingIds(prev => new Set(prev).add(targetId));
    setAddingId(null);
  }

  // ─── Lidar com Desafios e Convites por Parametros ─────────────
  useEffect(() => {
    console.log('[DuelScreen] useEffect params:', route.params);
    if (!user) {
      console.log('[DuelScreen] No user yet');
      return;
    }
    
    // Se recebemos um challengeUserId, criar desafio direcionado
    if (route.params?.challengeUserId) {
      console.log('[DuelScreen] Detected challengeUserId:', route.params.challengeUserId);
      // Limpar o parâmetro para não rodar duas vezes caso a tela seja re-focada
      const targetId = route.params.challengeUserId;
      navigation.setParams({ challengeUserId: undefined });
      createMatch(targetId);
    }
    // Se recebemos um joinCode, entrar automaticamente
    else if (route.params?.joinCode) {
      console.log('[DuelScreen] Detected joinCode:', route.params.joinCode);
      const code = route.params.joinCode;
      navigation.setParams({ joinCode: undefined });
      setJoinCode(code);
      joinMatch(code);
    }
  }, [route.params?.challengeUserId, route.params?.joinCode, user]);

  function cleanup() {
    stopTimer();
    if (channelRef.current) supabase.removeChannel(channelRef.current);
  }

  // ─── Criar duelo ───────────────────────────────────────────────
  async function createMatch(targetUserId?: string) {
    console.log('[DuelScreen] createMatch called with target:', targetUserId);
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

      // Se temos um alvo específico, envia a notificação de convite
      if (targetUserId) {
        console.log('[DuelScreen] Inserting notification for', targetUserId);
        const code = match.id.replace(/-/g, '').slice(0, 8).toUpperCase();
        const { data: myProfile } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single();
        const { error } = await supabase.from('notifications').insert({
          user_id: targetUserId,
          type:    'duel_invite',
          title:   'Você foi desafiado! ⚔️',
          body:    `${myProfile?.username ?? 'Alguém'} quer duelar com você.`,
          data:    { code, senderAvatar: myProfile?.avatar_url },
        });
        if (error) console.error('[DuelScreen] Error inserting notif:', error);
        else console.log('[DuelScreen] Notification inserted successfully!');
      }
    }
    setLoading(false);
  }

  // ─── Entrar no duelo por código ────────────────────────────────
  async function joinMatch(codeArg?: string) {
    const code = typeof codeArg === 'string' ? codeArg : joinCode;
    if (!user || !code.trim()) return;
    setLoading(true);

    // A busca + validação + entrada no duelo acontece toda no servidor via RPC,
    // evitando expor a lista de duelos abertos de outros usuários (RLS não
    // permitiria o SELECT direto antes de já ser player1/player2 do duelo).
    const { data: match, error } = await supabase.rpc('join_duel_by_code', {
      p_code: code.trim().toUpperCase(),
    });

    if (error || !match) {
      Alert.alert('Duelo não encontrado', 'Verifique o código e tente novamente.');
      setLoading(false);
      return;
    }

    // Busca oponente e perguntas em paralelo
    const [{ data: p1 }, { data: qs }] = await Promise.all([
      supabase.from('profiles').select('id, username, xp, level, avatar_url').eq('id', match.player1_id).single(),
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

    setMatchId(match.id);
    matchIdRef.current = match.id;
    setDuelState('playing');
    duelStateRef.current = 'playing';
    subscribeToMatch(match.id);
    startTimer();
    setLoading(false);
  }

  // ─── Compartilhar convite ──────────────────────────────────────
  async function shareInvite() {
    const message = `Me desafie no Cultura Nacional!\nCódigo: ${matchId?.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
    try {
      await Share.share({ message });
    } catch (err) {
      // Share.share não é suportado em alguns ambientes (ex: navegador web) -
      // nesse caso copia o convite para a área de transferência como alternativa
      await Clipboard.setStringAsync(message);
      Alert.alert('Convite copiado!', 'Cole em uma conversa para enviar ao seu amigo.');
    }
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
            .from('profiles').select('id, username, xp, level, avatar_url').eq('id', match.player2_id).single();
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
  // (useGlobalQuizTimer cuida disso agora - ver início do componente)

  // ─── Resposta ──────────────────────────────────────────────────
  async function handleAnswer(index: number) {
    if (answered || !matchId || !user) return;
    progressAnim.stopAnimation();
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
      time_ms:      (totalSeconds - timeLeft) * 1000,
    });

    setTimeout(() => nextQuestion(), 1800);
  }

  async function nextQuestion() {
    if (currentRef.current + 1 >= questions.length) {
      await finishAsPlayer();
    } else {
      setCurrent(prev => {
        currentRef.current = prev + 1;
        return prev + 1;
      });
      setSelected(null);
      setAnswered(false);
      setAnswerResult(null);
      answeredRef.current = false;
    }
  }

  async function finishAsPlayer() {
    // Marca que este jogador terminou - chamado tanto ao concluir todas as
    // perguntas normalmente quanto no timeout do tempo total (handleTimeExpired)
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
    if (user) await supabase.rpc('update_daily_mission_progress', {
      p_user_id:  user.id,
      p_state_id: match?.state_id ?? null,
      p_correct:  myScore,
      p_total:    questions.length,
    });
    const bothFinished = match?.player1_finished_at && match?.player2_finished_at;
    if (bothFinished) {
      await supabase.from('matches').update({ status: 'finished' }).eq('id', matchId);

      // Envia notificações de resultado para ambos os jogadores
      if (match.player1_id && match.player2_id) {
        const [{ data: p1 }, { data: p2 }] = await Promise.all([
          supabase.from('profiles').select('username, avatar_url').eq('id', match.player1_id).single(),
          supabase.from('profiles').select('username, avatar_url').eq('id', match.player2_id).single(),
        ]);

        // Conta acertos de cada jogador
        const { data: answers } = await supabase
          .from('match_answers')
          .select('user_id, is_correct')
          .eq('match_id', matchId);

        const scoreOf = (uid: string) =>
          (answers ?? []).filter((a: any) => a.user_id === uid && a.is_correct).length;

        const s1 = scoreOf(match.player1_id);
        const s2 = scoreOf(match.player2_id);

        const winner = s1 > s2 ? match.player1_id : s2 > s1 ? match.player2_id : null;
        await supabase.from('matches').update({ winner_id: winner }).eq('id', matchId);

        function buildNotif(recipientId: string, opponentUsername: string, opponentAvatar: string | null, myS: number, oppS: number) {
          const won  = winner === recipientId;
          const draw = winner === null;
          return {
            user_id: recipientId,
            type:    'duel_result',
            title:   won ? 'Você venceu o duelo! 🏆' : draw ? 'Duelo empatado!' : 'Você perdeu o duelo',
            body:    `Resultado contra ${opponentUsername}: ${myS}×${oppS}`,
            data:    { matchId, myScore: myS, oppScore: oppS, winnerId: winner, opponentAvatar },
          };
        }

        await supabase.from('notifications').insert([
          buildNotif(match.player1_id, p2?.username ?? 'Oponente', p2?.avatar_url ?? null, s1, s2),
          buildNotif(match.player2_id, p1?.username ?? 'Oponente', p1?.avatar_url ?? null, s2, s1),
        ]);
      }
    }

    setDuelState('finished');
    duelStateRef.current = 'finished';
    if (user) await supabase.rpc('check_and_grant_achievements', { p_user_id: user.id });
    cleanup();
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

  const timerColor = timeLeft <= 5 ? DANGER : timeLeft <= 10 ? C.yellow : C.green;

  // ══════════════════════════════════════════════════════════════
  // LOBBY
  // ══════════════════════════════════════════════════════════════
  if (duelState === 'lobby') {
    return (
      <View style={[styles.container, { backgroundColor: C.bg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.topBack, { paddingTop: headerPaddingTop }]}>
          <ArrowLeft size={22} color={C.text} />
        </TouchableOpacity>
        <ScrollView
          contentContainerStyle={[styles.center, { flexGrow: 1 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.iconWrap, { backgroundColor: C.iconBg, borderColor: C.border, borderWidth: 1 }]}>
            <Swords size={40} color={C.text} />
          </View>
          <Text style={[styles.lobbyTitle, { color: C.text }]}>Duelo 1v1</Text>
          <Text style={[styles.lobbySub, { color: C.muted }]}>
            Desafie um amigo ou entre em um duelo existente
          </Text>
          {!showJoin ? (
            <View style={styles.lobbyActions}>
              <TouchableOpacity onPress={() => createMatch()} style={[styles.lobbyBtn, { backgroundColor: C.green }]}>
                {loading
                  ? <ActivityIndicator color="#FFF" />
                  : <><Swords size={20} color="#FFF" /><Text style={styles.lobbyBtnText}>Criar duelo</Text></>
                }
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowJoin(true)} style={[styles.lobbyBtnOutline, { borderColor: C.border, backgroundColor: C.card }]}>
                <Users size={20} color={C.text} />
                <Text style={[styles.lobbyBtnOutlineText, { color: C.text }]}>Entrar com código</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.joinBox, { backgroundColor: C.card, borderColor: C.border }]}>
              <Text style={[styles.joinLabel, { color: C.muted }]}>Código do duelo</Text>
              <TextInput
                value={joinCode}
                onChangeText={t => setJoinCode(t.toUpperCase())}
                placeholder="Ex: 5F10991B"
                placeholderTextColor={C.muted}
                maxLength={8}
                autoCapitalize="characters"
                style={[styles.joinInput, { color: C.text, borderColor: joinCode.length === 8 ? C.green : C.border }]}
              />
              <View style={styles.joinBtns}>
                <TouchableOpacity onPress={() => setShowJoin(false)} style={[styles.joinCancel, { borderColor: C.border }]}>
                  <Text style={[styles.joinCancelText, { color: C.muted }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => joinMatch()} disabled={joinCode.length < 8 || loading}
                  style={[styles.joinConfirm, { backgroundColor: joinCode.length === 8 ? C.green : C.border }]}>
                  {loading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.joinConfirmText}>Entrar</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!showJoin && (
            <View style={styles.challengeSection}>
              <View style={[styles.challengeTabs, { borderColor: C.border }]}>
                {([
                  { key: 'friends', label: 'Amigos', Icon: Users },
                  { key: 'top',     label: 'Melhores', Icon: Trophy },
                  { key: 'new',     label: 'Novos', Icon: UserPlus },
                ] as { key: ChallengeTab; label: string; Icon: any }[]).map(({ key, label, Icon }) => (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setChallengeTab(key)}
                    style={[styles.challengeTab, challengeTab === key && { borderBottomColor: C.green, borderBottomWidth: 2 }]}
                  >
                    <Icon size={13} color={challengeTab === key ? C.green : C.muted} />
                    <Text style={[styles.challengeTabText, { color: challengeTab === key ? C.green : C.muted }]} numberOfLines={1}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {challengeLoading ? (
                <ActivityIndicator color={C.green} style={{ marginTop: Spacing.lg }} />
              ) : challengeList.length === 0 ? (
                <Text style={[styles.challengeEmpty, { color: C.muted }]}>
                  {challengeTab === 'friends' ? 'Nenhum amigo mútuo ainda.' : 'Ninguém por aqui ainda.'}
                </Text>
              ) : (
                <View style={styles.challengeList}>
                  {challengeList.map(entry => {
                    const alreadyFollowing = challengeTab === 'friends' || followingIds.has(entry.id);
                    return (
                      <View key={entry.id} style={[styles.challengeRow, { backgroundColor: C.card, borderColor: C.border }]}>
                        {entry.avatar_url
                          ? <Image source={{ uri: entry.avatar_url }} style={styles.challengeAvatar} />
                          : <View style={[styles.challengeAvatar, { backgroundColor: C.iconBg, alignItems: 'center', justifyContent: 'center' }]}><User size={14} color={C.muted} /></View>
                        }
                        <View style={styles.challengeInfo}>
                          <Text style={[styles.challengeName, { color: C.text }]} numberOfLines={1}>{entry.username}</Text>
                          <Text style={[styles.challengeMeta, { color: C.muted }]} numberOfLines={1}>Nv.{entry.level} · {entry.xp} XP</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => createMatch(entry.id)}
                          disabled={loading}
                          style={[styles.challengeIconBtn, { backgroundColor: `${C.green}18` }]}
                        >
                          <Swords size={15} color={C.green} />
                        </TouchableOpacity>
                        {!alreadyFollowing && (
                          <TouchableOpacity
                            onPress={() => handleAddFriend(entry.id)}
                            disabled={addingId === entry.id}
                            style={[styles.challengeIconBtn, { backgroundColor: C.iconBg }]}
                          >
                            {addingId === entry.id
                              ? <ActivityIndicator size="small" color={C.text} />
                              : <UserPlus size={15} color={C.text} />
                            }
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // WAITING
  // ══════════════════════════════════════════════════════════════
  if (duelState === 'waiting') {
    return (
      <View style={[styles.container, { backgroundColor: C.bg }]}>
        <View style={styles.center}>
          <ActivityIndicator color={C.green} size="large" />
          <Text style={[styles.waitTitle, { color: C.text }]}>Aguardando oponente...</Text>
          <Text style={[styles.waitSub, { color: C.muted }]}>Compartilhe o código com um amigo</Text>
          <View style={[styles.codeCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.codeLabel, { color: C.muted }]}>Código do duelo</Text>
            <Text style={[styles.codeValue, { color: C.text }]}>
              {matchId?.replace(/-/g, '').slice(0, 8).toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity
            onPress={shareInvite}
            style={[styles.shareBtn, { backgroundColor: `${C.green}14`, borderColor: `${C.green}44` }]}
          >
            <Copy size={16} color={C.green} />
            <Text style={[styles.shareBtnText, { color: C.green }]}>Compartilhar convite</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={resetDuel} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: C.muted }]}>Cancelar</Text>
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
      <View style={[styles.container, { backgroundColor: C.bg }]}>
        <View style={[styles.scoreBar, { paddingTop: headerPaddingTop }]}>
          <View style={styles.scoreItem}>
            <View style={[styles.avatarWrap, { backgroundColor: C.card, borderColor: C.green }]}>
              {myAvatar ? <Image source={{ uri: myAvatar }} style={styles.avatarImg} /> : <User size={18} color={C.green} />}
            </View>
            <Text style={[styles.scoreName, { color: C.green }]}>Você</Text>
            <Text style={[styles.scoreVal, { color: C.text }]}>{myScore}</Text>
          </View>

          <View style={styles.vsCol}>
            <View style={[styles.vsBadge, { backgroundColor: C.iconBg, borderColor: C.border }]}>
              <Text style={[styles.vsBadgeText, { color: C.muted }]}>VS</Text>
            </View>
            <View style={[styles.timerBadge, { backgroundColor: `${timerColor}20` }]}>
              <Clock size={13} color={timerColor} />
              <Text style={[styles.timerText, { color: timerColor }]}>{timeLeft}s</Text>
            </View>
          </View>

          <View style={styles.scoreItem}>
            <View style={[styles.avatarWrap, { backgroundColor: C.card, borderColor: C.border }]}>
              {opponent?.avatar_url ? <Image source={{ uri: opponent.avatar_url }} style={styles.avatarImg} /> : <User size={18} color={C.muted} />}
            </View>
            <Text style={[styles.scoreName, { color: C.muted }]} numberOfLines={1}>{opponent?.username ?? 'Oponente'}</Text>
            <Text style={[styles.scoreVal, { color: C.text }]}>{oppScore}</Text>
          </View>
        </View>

        <View style={[styles.progressBg, { backgroundColor: C.border }]}>
          <Animated.View style={[styles.progressFill, {
            backgroundColor: timerColor,
            width: progressAnim.interpolate({ inputRange: [0,1], outputRange: ['0%','100%'] }),
          }]} />
        </View>

        <View style={styles.counterRow}>
          {questions.map((_, i) => (
            <View key={i} style={[styles.counterDot, {
              backgroundColor: i < current ? C.green : i === current ? `${C.green}60` : C.border
            }]} />
          ))}
        </View>

        <View style={styles.questionWrap}>
          <Text style={[styles.questionText, { color: C.text }]}>{q.text}</Text>
          <View style={styles.options}>
            {q.options.map((opt: string, i: number) => {
              const isCorrect  = answered && i === answerResult?.correct_index;
              const isSelected = i === selected;
              let bg: string = C.card, border: string = C.border, textColor: string = C.text;
              if (answered) {
                if (isCorrect)               { bg = `${C.green}18`; border = C.green; textColor = C.green; }
                else if (isSelected)         { bg = `${DANGER}18`; border = DANGER; textColor = DANGER_TEXT; }
              } else if (isSelected)         { bg = `${C.green}14`; border = C.green; textColor = C.green; }
              return (
                <TouchableOpacity key={i} onPress={() => handleAnswer(i)} disabled={answered}
                  style={[styles.option, { backgroundColor: bg, borderColor: border }]}
                >
                  <View style={[styles.optLetter, { backgroundColor: C.iconBg }]}>
                    <Text style={[styles.optLetterText, { color: textColor }]}>{['A','B','C','D'][i]}</Text>
                  </View>
                  <Text style={[styles.optText, { color: textColor }]}>{opt}</Text>
                  {answered && isCorrect               && <CheckCircle size={18} color={C.green} />}
                  {answered && isSelected && !isCorrect && <XCircle size={18} color={DANGER_TEXT} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {Platform.OS === 'web' && !answered && (
            <Text style={[styles.keyboardHint, { color: C.muted }]}>Use A, B, C ou D para responder</Text>
          )}
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
      <View style={[styles.container, { backgroundColor: C.bg }]}>
        <View style={styles.center}>
          <View style={[styles.resultIcon, {
            backgroundColor: iWon ? `${MedalColors.gold}20` : isDraw ? `${C.green}20` : `${DANGER}20`
          }]}>
            <Trophy size={48} color={iWon ? MedalColors.gold : isDraw ? C.green : DANGER} />
          </View>
          <Text style={[styles.resultTitle, { color: C.text }]}>
            {iWon ? 'Você venceu!' : isDraw ? 'Empate!' : 'Você perdeu!'}
          </Text>
          <View style={[styles.finalScore, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={styles.finalItem}>
              <View style={[styles.avatarWrapLg, { backgroundColor: C.iconBg, borderColor: C.green }]}>
                {myAvatar ? <Image source={{ uri: myAvatar }} style={styles.avatarImgLg} /> : <User size={22} color={C.green} />}
              </View>
              <Text style={[styles.finalName, { color: C.green }]}>Você</Text>
              <Text style={[styles.finalVal, { color: C.text }]}>{myScore}</Text>
            </View>
            <X size={20} color={C.muted} />
            <View style={styles.finalItem}>
              <View style={[styles.avatarWrapLg, { backgroundColor: C.iconBg, borderColor: C.border }]}>
                {opponent?.avatar_url ? <Image source={{ uri: opponent.avatar_url }} style={styles.avatarImgLg} /> : <User size={22} color={C.muted} />}
              </View>
              <Text style={[styles.finalName, { color: C.muted }]} numberOfLines={1}>{opponent?.username ?? 'Oponente'}</Text>
              <Text style={[styles.finalVal, { color: C.text }]}>{oppScore}</Text>
            </View>
          </View>
          <View style={styles.resultDots}>
            {myAnswers.map((r, i) => (
              <View key={i} style={[styles.dot, { backgroundColor: r ? C.green : DANGER }]} />
            ))}
          </View>
          <TouchableOpacity onPress={() => resetDuel()} style={[styles.replayBtn, { backgroundColor: C.green }]}>
            <Text style={styles.replayBtnText}>Jogar novamente</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.homeBtn}>
            <Text style={[styles.homeBtnText, { color: C.muted }]}>Voltar ao início</Text>
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

  return (
    <View style={[styles.container, styles.center, { backgroundColor: C.bg }]}>
      <ActivityIndicator color={C.green} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1 },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  topBack:         { padding: Spacing.xl },
  iconWrap:        { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  lobbyTitle:      { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, marginBottom: 8 },
  lobbySub:        { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xxl },
  lobbyActions:    { width: '100%', gap: 12 },
  lobbyBtn:        { height: 52, borderRadius: Radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  lobbyBtnText:    { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  lobbyBtnOutline: { height: 52, borderRadius: Radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1 },
  lobbyBtnOutlineText: { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  joinBox:         { width: '100%', borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.xl, gap: 12 },
  joinLabel:       { fontSize: FontSize.xs, fontWeight: FontWeight.medium, textTransform: 'uppercase', letterSpacing: 0.5 },
  joinInput:       { height: 52, borderRadius: Radius.md, borderWidth: 1, textAlign: 'center', fontSize: scaleFont(24), fontWeight: FontWeight.bold, letterSpacing: 6 },
  joinBtns:        { flexDirection: 'row', gap: 10 },
  joinCancel:      { flex: 1, height: 44, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  joinCancelText:  { fontSize: FontSize.sm },
  joinConfirm:     { flex: 1, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  joinConfirmText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.bold },

  // Seção "desafiar" (Amigos / Melhores / Novos) — compacta pra caber em telas pequenas (ex: iPhone SE)
  challengeSection:  { width: '100%', marginTop: Spacing.xl },
  challengeTabs:      { flexDirection: 'row', borderBottomWidth: 1, marginBottom: Spacing.md },
  challengeTab:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8 },
  challengeTabText:   { fontSize: scaleFont(10), fontWeight: FontWeight.medium },
  challengeEmpty:     { fontSize: FontSize.xs, textAlign: 'center', paddingVertical: Spacing.lg },
  challengeList:      { gap: 6 },
  challengeRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, padding: 8 },
  challengeAvatar:    { width: 30, height: 30, borderRadius: 15 },
  challengeInfo:      { flex: 1, minWidth: 0 },
  challengeName:      { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  challengeMeta:      { fontSize: scaleFont(9), marginTop: 1 },
  challengeIconBtn:   { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  waitTitle:       { fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginTop: Spacing.xl, marginBottom: 8 },
  waitSub:         { fontSize: FontSize.sm, textAlign: 'center', marginBottom: Spacing.xl },
  codeCard:        { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.xl, alignItems: 'center', width: '100%', marginBottom: Spacing.md },
  codeLabel:       { fontSize: FontSize.xs, marginBottom: 6 },
  codeValue:       { fontSize: scaleFont(28), fontWeight: FontWeight.bold, letterSpacing: 4 },
  shareBtn:        { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: Radius.md, borderWidth: 1, marginBottom: Spacing.md },
  shareBtnText:    { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  cancelBtn:       { padding: Spacing.md },
  cancelText:      { fontSize: FontSize.sm },
  scoreBar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.xl },
  scoreItem:       { alignItems: 'center', gap: 4, width: 84 },
  avatarWrap:      { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg:       { width: '100%', height: '100%' },
  avatarWrapLg:    { width: 52, height: 52, borderRadius: 26, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 4 },
  avatarImgLg:     { width: '100%', height: '100%' },
  vsCol:           { alignItems: 'center', gap: 6 },
  vsBadge:         { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1 },
  vsBadgeText:     { fontSize: scaleFont(10), fontWeight: FontWeight.bold, letterSpacing: 0.5 },
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
  keyboardHint:    { fontSize: FontSize.xs, textAlign: 'center', marginTop: Spacing.md },
  option:          { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: 12 },
  optLetter:       { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  optLetterText:   { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  optText:         { flex: 1, fontSize: FontSize.sm, lineHeight: 20 },
  resultIcon:      { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  resultTitle:     { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, marginBottom: Spacing.xl },
  finalScore:      { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.xl, gap: Spacing.xl, marginBottom: Spacing.xl },
  finalItem:       { alignItems: 'center', gap: 4 },
  finalName:       { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  finalVal:        { fontSize: scaleFont(40), fontWeight: FontWeight.bold },
  finalX:          { fontSize: FontSize.xl },
  resultDots:      { flexDirection: 'row', gap: 8, marginBottom: Spacing.xl },
  dot:             { width: 10, height: 10, borderRadius: 5 },
  replayBtn:       { width: '100%', height: 50, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  replayBtnText:   { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.medium },
  homeBtn:         { padding: Spacing.md },
  homeBtnText:     { fontSize: FontSize.sm },
});
