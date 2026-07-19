import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import MapPin from 'lucide-react-native/dist/esm/icons/map-pin';
import Trophy from 'lucide-react-native/dist/esm/icons/trophy';
import Zap from 'lucide-react-native/dist/esm/icons/zap';
import Music from 'lucide-react-native/dist/esm/icons/music';
import Map from 'lucide-react-native/dist/esm/icons/map';
import Tag from 'lucide-react-native/dist/esm/icons/tag';
import ChevronRight from 'lucide-react-native/dist/esm/icons/chevron-right';
import Video from 'lucide-react-native/dist/esm/icons/video';
import Flame from 'lucide-react-native/dist/esm/icons/flame';
import Star from 'lucide-react-native/dist/esm/icons/star';
import BookOpen from 'lucide-react-native/dist/esm/icons/book-open';
import Utensils from 'lucide-react-native/dist/esm/icons/utensils';
import Leaf from 'lucide-react-native/dist/esm/icons/leaf';
import Compass from 'lucide-react-native/dist/esm/icons/compass';
import Lightbulb from 'lucide-react-native/dist/esm/icons/lightbulb';
import Guitar from 'lucide-react-native/dist/esm/icons/guitar';
import Mic2 from 'lucide-react-native/dist/esm/icons/mic-vocal';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { useHeaderTopPadding } from '../../hooks/useHeaderTopPadding';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useUserPlan } from '../../hooks';
import { Spacing, FontSize, FontWeight, Radius, scaleFont } from '../../constants/layout';
import { getXpProgress, XP_PER_LEVEL } from '../../utils/xp';
import { HomeTheme } from '../../constants/colors';
import { VerifiedBadge } from '../../components/ui/VerifiedBadge';

interface Profile { username: string; xp: number; level: number; streak: number; city_natal_id: string | null; avatar_url: string | null; }
interface Question { id: string; text: string; options: string[]; subcategory: string; difficulty: string; }
interface PreviewQuestion { text: string; subcategory: string; }

// Mesmas 9 subcategorias usadas em Categorias + Música (fonte: distinct
// subcategory da tabela questions). O card "Aleatório" sorteia uma delas
// e usa a mesma categoria pras 5 perguntas da sessão, só que puxando de
// qualquer estado/cidade do Brasil.
const RANDOM_SUBCATEGORIES = ['Cultura', 'História', 'Gastronomia', 'Natureza', 'Turismo', 'Curiosidades', 'MPB', 'Reggae', 'RAP'];
function pickRandomSubcategory() {
  return RANDOM_SUBCATEGORIES[Math.floor(Math.random() * RANDOM_SUBCATEGORIES.length)];
}

// Ícone + cor por subcategoria pro card "Aleatório" — mesmos ícones já
// usados em Categorias/Música, cada um com uma cor própria pra dar
// identidade visual (o card antes usava um ícone genérico de shuffle).
const CATEGORY_META: Record<string, { Icon: any; color: string }> = {
  'Cultura':      { Icon: Star,      color: '#F5B942' },
  'História':     { Icon: BookOpen,  color: '#4C8DFF' },
  'Gastronomia':  { Icon: Utensils,  color: '#FF8A65' },
  'Natureza':     { Icon: Leaf,      color: '#3DC77A' },
  'Turismo':      { Icon: Compass,   color: '#3EC6C6' },
  'Curiosidades': { Icon: Lightbulb, color: '#FFD24D' },
  'MPB':          { Icon: Guitar,    color: '#A78BFA' },
  'Reggae':       { Icon: Leaf,      color: '#E2A33D' },
  'RAP':          { Icon: Mic2,      color: '#E2635B' },
};

export function HomeScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const C = isDark ? HomeTheme.dark : HomeTheme.light;
  const headerPaddingTop = useHeaderTopPadding();
  const { user } = useAuthStore();
  const { plan } = useUserPlan();
  const [profile,  setProfile]  = useState<Profile | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [cityNatal, setCityNatal] = useState<{ id: string; name: string; state_id: string; stateName: string; stateUf: string } | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<PreviewQuestion | null>(null);
  const [randomQuestions, setRandomQuestions] = useState<Question[] | null>(null);

  useFocusEffect(React.useCallback(() => { loadData(); loadPreviewQuestion(); }, []));

  async function loadPreviewQuestion() {
    setPreviewQuestion(null);
    setRandomQuestions(null);
    const subcategory = pickRandomSubcategory();
    const { data } = await supabase.rpc('get_random_quiz_questions', {
      p_state_id: null, p_city_id: null, p_subcategory: subcategory, p_limit: 5, p_progressive: false,
    });
    if (data && data.length > 0) {
      // Salva as 5 perguntas completas para serem usadas ao clicar
      setRandomQuestions(data);
      // Usa apenas a primeira como preview
      setPreviewQuestion({ text: data[0].text, subcategory: data[0].subcategory });
    }
  }

  async function loadData() {
    setLoading(true);
    const { data: profileData } = user ? await supabase.from('profiles').select('username, xp, level, streak, city_natal_id, avatar_url').eq('id', user.id).single() : { data: null };
    if (profileData) {
      setProfile(profileData);
      if (profileData.city_natal_id) {
        const { data: cityData } = await supabase.from('cities').select('id, name, state_id, states(name, uf)').eq('id', profileData.city_natal_id).single();

        if (cityData) setCityNatal({ id: cityData.id, name: cityData.name, state_id: cityData.state_id, stateName: (cityData.states as any)?.name ?? '', stateUf: (cityData.states as any)?.uf?.trim()?.toLowerCase() ?? '' });
      }
    }
    setLoading(false);
  }

  const xpToNext = XP_PER_LEVEL;
  const xpPct    = getXpProgress(profile?.xp ?? 0);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: C.bg }]}>
        <ActivityIndicator color={C.green} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.8}>
            <View style={[styles.headerAvatar, { backgroundColor: C.card, borderColor: C.border }]}>
              {(profile?.avatar_url || user?.user_metadata?.avatar_url) ? (
                <Image
                  source={{ uri: profile?.avatar_url ?? user?.user_metadata?.avatar_url }}
                  style={{ width: 38, height: 38, borderRadius: 19 }}
                />
              ) : (
                <Text style={{ fontSize: scaleFont(13), fontWeight: '700', color: C.subtle }}>
                  {profile?.username?.[0]?.toUpperCase() ?? '?'}
                </Text>
              )}
            </View>
          </TouchableOpacity>
          <View>
            <Text style={[styles.greeting, { color: C.muted }]}>Olá,</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.username, { color: C.text }]}>{profile?.username ?? 'Explorador'}</Text>
              {plan && <VerifiedBadge plan={plan} size={20} />}
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.streakCard,
            (profile?.streak ?? 0) > 0
              ? { backgroundColor: '#FF6B2022', borderColor: '#FF6B2055' }
              : { backgroundColor: C.iconBg,    borderColor: C.border },
          ]}
          onPress={() => navigation.navigate('Missions')}
          activeOpacity={0.75}
        >
          <Flame
            size={14}
            color={(profile?.streak ?? 0) > 0 ? '#FF6B20' : C.muted}
            fill={(profile?.streak ?? 0) > 0 ? '#FF6B2055' : 'transparent'}
          />
          <Text style={[styles.streakCount, { color: (profile?.streak ?? 0) > 0 ? '#FF6B20' : C.muted }]}>
            {profile?.streak ?? 0}
          </Text>
          <Text style={[styles.streakLabel, { color: C.muted }]}>
            {(profile?.streak ?? 0) > 0 ? 'sequência' : 'Reacenda!'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Nível / XP */}
      <TouchableOpacity
        style={[styles.card, styles.levelCard, { backgroundColor: C.card, borderColor: C.border }]}
        onPress={() => navigation.navigate('Achievements')}
        activeOpacity={0.8}
      >
        <View style={[styles.iconBox, { backgroundColor: C.iconBg, borderColor: C.border }]}>
          <Trophy size={18} color={C.yellow} fill={C.yellow + '55'} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 }}>
            <Text style={[styles.levelText, { color: C.text }]}>Nível {profile?.level ?? 1}</Text>
            <Text style={[styles.levelText, { color: C.green }]}>{profile?.xp ?? 0} XP</Text>
          </View>
          <View style={[styles.progressBg, { backgroundColor: C.border }]}>
            <View style={[styles.progressFill, { width: `${xpPct * 100}%`, backgroundColor: C.green }]} />
          </View>
        </View>
        <View style={[styles.pill, { backgroundColor: C.iconBg, borderColor: C.border }]}>
          <Text style={[styles.pillText, { color: C.subtle }]}>Curioso</Text>
        </View>
      </TouchableOpacity>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={[styles.card, styles.actionCard, { backgroundColor: C.card, borderColor: C.border }]} onPress={() => navigation.navigate('Quiz', { mode: 'relampago' })}>
          <View style={[styles.iconBoxSm, { backgroundColor: C.iconBg, borderColor: C.border }]}>
            <Zap size={16} color={C.text} />
          </View>
          <Text style={[styles.actionLabel, { color: C.text }]}>Relâmpago</Text>
          <Text style={[styles.actionSub, { color: C.muted }]}>30 segundos</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.card, styles.actionCard, { backgroundColor: C.card, borderColor: C.border }]} onPress={() => navigation.navigate('ViralMode')}>
          <View style={[styles.iconBoxSm, { backgroundColor: C.iconBg, borderColor: C.border }]}>
            <Video size={16} color={C.text} />
          </View>
          <Text style={[styles.actionLabel, { color: C.text }]}>Modo Viral</Text>
          <Text style={[styles.actionSub, { color: C.muted }]}>Grave e compartilhe</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.card, styles.actionCard, { backgroundColor: C.card, borderColor: C.border }]} onPress={() => navigation.navigate('Duel')}>
          <View style={[styles.iconBoxSm, { backgroundColor: C.iconBg, borderColor: C.border }]}>
            <Trophy size={16} color={C.text} />
          </View>
          <Text style={[styles.actionLabel, { color: C.text }]}>Duelo</Text>
          <Text style={[styles.actionSub, { color: C.muted }]}>1 vs 1</Text>
        </TouchableOpacity>
      </View>

      {/* Grid de seções */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: C.muted }]}>EXPLORAR</Text>

        <TouchableOpacity
          style={[styles.card, styles.randomCard, { backgroundColor: C.card, borderColor: C.border }]}
          onPress={() => {
            if (randomQuestions && randomQuestions.length > 0) {
              // Passa as 5 perguntas já carregadas para o Quiz
              navigation.navigate('Quiz', {
                preloadedQuestions: randomQuestions,
                random: true
              });
            } else {
              // Fallback: sorteie uma subcategoria e deixe o Quiz carregar normalmente
              navigation.navigate('Quiz', {
                subcategory: pickRandomSubcategory(),
                random: true
              });
            }
          }}
          disabled={!previewQuestion}
        >
          {(() => {
            const meta = previewQuestion ? CATEGORY_META[previewQuestion.subcategory] : null;
            const Icon = meta?.Icon ?? Star;
            const iconColor = meta?.color ?? C.green;
            return (
              <View style={[styles.randomIconBox, { backgroundColor: `${iconColor}29`, borderColor: `${iconColor}52` }]}>
                <Icon size={28} color={iconColor} />
              </View>
            );
          })()}
          <View style={{ flex: 1 }}>
            <Text style={[styles.randomEyebrow, { color: C.muted }]}>
              {previewQuestion?.subcategory ?? 'Aleatório'}
            </Text>
            <Text style={[styles.randomTitle, { color: C.text }]} numberOfLines={2}>
              {previewQuestion?.text ?? 'Carregando pergunta...'}
            </Text>
          </View>
          <ChevronRight size={16} color={C.muted} />
        </TouchableOpacity>

        <View style={styles.sectionGrid}>
          {cityNatal && (
            <TouchableOpacity style={[styles.card, styles.sectionCard, { backgroundColor: C.card, borderColor: C.border }]} onPress={() => navigation.navigate('Quiz', { stateId: cityNatal.state_id, stateName: cityNatal.stateName, cityName: cityNatal.name })}>
              <View style={[styles.iconBox, { backgroundColor: C.iconBg, borderColor: C.border }]}>
                <MapPin size={18} color={C.text} />
              </View>
              <Text style={[styles.uf, { color: C.muted }]}>{cityNatal.stateUf}</Text>
              <Text style={[styles.sectionCardName, { color: C.text }]}>{cityNatal.name}</Text>
              <Text style={[styles.sectionCardDesc, { color: C.muted }]}>Perguntas da sua cidade natal</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.card, styles.sectionCard, { backgroundColor: C.card, borderColor: C.border }]} onPress={() => navigation.navigate('Estados')}>
            <View style={[styles.iconBox, { backgroundColor: C.iconBg, borderColor: C.border }]}>
              <Map size={18} color={C.text} />
            </View>
            <Text style={[styles.sectionCardName, { color: C.text }]}>Estados</Text>
            <Text style={[styles.sectionCardDesc, { color: C.muted }]}>Explore todos os estados do Brasil</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.card, styles.sectionCard, { backgroundColor: C.card, borderColor: C.border }]} onPress={() => navigation.navigate('Categorias')}>
            <View style={[styles.iconBox, { backgroundColor: C.iconBg, borderColor: C.border }]}>
              <Tag size={18} color={C.text} />
            </View>
            <Text style={[styles.sectionCardName, { color: C.text }]}>Categorias</Text>
            <Text style={[styles.sectionCardDesc, { color: C.muted }]}>Cultura, história, gastronomia e mais</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.card, styles.sectionCard, { backgroundColor: C.card, borderColor: C.border }]} onPress={() => navigation.navigate('Musica')}>
            <View style={[styles.iconBox, { backgroundColor: C.iconBg, borderColor: C.border }]}>
              <Music size={18} color={C.text} />
            </View>
            <Text style={[styles.sectionCardName, { color: C.text }]}>Música</Text>
            <Text style={[styles.sectionCardDesc, { color: C.muted }]}>MPB, Reggae e RAP brasileiro</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingBottom: 14 },
  headerAvatar:    { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  greeting:        { fontSize: FontSize.xs },
  username:        { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  pill:            { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1 },
  pillText:        { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  streakCard:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.lg, borderWidth: 1 },
  streakCount:     { fontSize: FontSize.md, fontWeight: FontWeight.bold, lineHeight: 18 },
  streakLabel:     { fontSize: scaleFont(10), fontWeight: FontWeight.medium },
  card:            { borderWidth: 1, borderRadius: 16 },
  iconBox:         { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  iconBoxSm:       { width: 32, height: 32, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  levelCard:       { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: Spacing.xl, marginBottom: 14, padding: 12 },
  levelText:       { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  progressBg:      { height: 3, borderRadius: 99, overflow: 'hidden' },
  progressFill:    { height: 3, borderRadius: 99 },
  quickActions:    { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },
  actionCard:      { flex: 1, padding: 10 },
  actionLabel:     { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  actionSub:       { fontSize: scaleFont(9), marginTop: 1 },
  section:         { paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },
  sectionTitle:    { fontSize: FontSize.xs, fontWeight: FontWeight.bold, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  randomCard:      { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, marginBottom: 10 },
  randomIconBox:   { width: 56, height: 56, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  randomEyebrow:   { fontSize: FontSize.xs, fontWeight: FontWeight.bold, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 },
  randomTitle:     { fontSize: FontSize.sm, fontWeight: FontWeight.bold, lineHeight: 18 },
  sectionGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  sectionCard:     { flexGrow: 1, flexBasis: 150, minWidth: 150, padding: Spacing.md },
  uf:              { fontSize: scaleFont(9), fontWeight: FontWeight.bold, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 8 },
  sectionCardName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, marginTop: 4, marginBottom: 4 },
  sectionCardDesc: { fontSize: FontSize.xs, lineHeight: 17 },
});
