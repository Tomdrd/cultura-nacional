import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, useWindowDimensions, StatusBar,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Check, ArrowLeft } from 'lucide-react-native';
import { useHeaderTopPadding } from '../../hooks/useHeaderTopPadding';
import { supabase } from '../../lib/supabase';
import { Spacing, FontSize, FontWeight, Radius, scaleFont } from '../../constants/layout';

const QUESTIONS_PER_STATE = 20;

interface StateItem {
  id: string;
  name: string;
  uf: string;
  region: string;
  icon_svg: string | null;
  questions_answered: number;
  completed: boolean;
}

const REGIONS = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];

const COLORS = {
  bg:      '#0e1015',
  surface: '#16191f',
  card:    '#1c2029',
  border:  '#252b38',
  text:    '#f0f2f5',
  muted:   '#5a6070',
  sub:     '#8a92a0',
  green:   '#009C3B',
  yellow:  '#FEDD00',
};

export function EstadosScreen({ navigation }: any) {
  const headerPaddingTop = useHeaderTopPadding();
  const { width } = useWindowDimensions();
  const [states, setStates]   = useState<StateItem[]>([]);
  const [region, setRegion]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const [{ data: statesData }, { data: progressData }] = await Promise.all([
      supabase.from('states').select('id, name, uf, region, icon_svg').order('name'),
      user
        ? supabase.from('user_state_progress').select('state_id, questions_answered, completed').eq('user_id', user.id)
        : Promise.resolve({ data: [] }),
    ]);

    const progressMap: Record<string, { questions_answered: number; completed: boolean }> = {};
    (progressData ?? []).forEach((p: any) => {
      progressMap[p.state_id] = { questions_answered: p.questions_answered, completed: p.completed };
    });

    const merged: StateItem[] = (statesData ?? []).map((s: any) => ({
      ...s,
      questions_answered: progressMap[s.id]?.questions_answered ?? 0,
      completed: progressMap[s.id]?.completed ?? false,
    }));

    setStates(merged);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = region ? states.filter(s => s.region === region) : states;
  const completed = states.filter(s => s.completed).length;

  const numColumns = width >= 600 ? 3 : 2;
  const cardWidth = (Math.min(width, 480) - Spacing.xl * 2 - 12 * (numColumns - 1)) / numColumns;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ArrowLeft size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            Explorar <Text style={{ color: COLORS.green }}>Estados</Text>
          </Text>
          <Text style={styles.headerSub}>{completed}/{states.length} concluídos</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.green} size="large" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {['Todos', ...REGIONS].map(r => {
              const active = r === 'Todos' ? !region : region === r;
              return (
                <TouchableOpacity
                  key={r}
                  onPress={() => setRegion(r === 'Todos' ? null : (region === r ? null : r))}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{r}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.sectionLabel}>
            <Text style={styles.sectionText}>{filtered.length} estados</Text>
            {completed > 0 && (
              <Text style={styles.sectionCount}>{completed} concluídos</Text>
            )}
          </View>

          <View style={[styles.grid, { paddingHorizontal: Spacing.xl }]}>
            {filtered.map(state => {
              const progress = state.questions_answered / QUESTIONS_PER_STATE;
              const isComplete = state.completed;
              const isInProgress = !isComplete && state.questions_answered > 0;

              return (
                <TouchableOpacity
                  key={state.id}
                  style={[styles.card, { width: cardWidth }]}
                  onPress={() => navigation.navigate('Quiz', { stateId: state.id, stateName: state.name })}
                  activeOpacity={0.75}
                >
                  {isComplete && (
                    <View style={styles.badgeDone}>
                      <Check size={10} color="#fff" strokeWidth={3} />
                    </View>
                  )}

                  <View style={[
                    styles.iconBox,
                    isComplete  && styles.iconBoxGreen,
                    isInProgress && styles.iconBoxYellow,
                  ]}>
                    {state.icon_svg ? (
                      <SvgXml
                        xml={state.icon_svg.replace(
                          'stroke="currentColor"',
                          `stroke="${isComplete ? COLORS.green : isInProgress ? COLORS.yellow : COLORS.sub}"`
                        )}
                        width={24}
                        height={24}
                      />
                    ) : (
                      <Text style={styles.ufFallback}>{state.uf}</Text>
                    )}
                  </View>

                  <Text style={styles.uf}>{state.uf}</Text>
                  <Text style={styles.stateName} numberOfLines={2}>{state.name}</Text>

                  <View style={styles.progressBar}>
                    <View style={[
                      styles.progressFill,
                      { width: `${progress * 100}%` as any },
                      isComplete   && { backgroundColor: COLORS.green },
                      isInProgress && { backgroundColor: COLORS.yellow },
                    ]} />
                  </View>

                  <Text style={styles.counter}>
                    {state.questions_answered}/{QUESTIONS_PER_STATE} perguntas
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.bg },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingBottom: 16 },
  backBtn:        { marginRight: 12 },
  headerTitle:    { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: COLORS.text, letterSpacing: -0.5 },
  headerSub:      { fontSize: FontSize.sm, color: COLORS.muted, marginTop: 2 },
  filterRow:      { gap: 8, paddingHorizontal: Spacing.xl, paddingBottom: 16 },
  chip:           { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  chipActive:     { backgroundColor: COLORS.green, borderColor: COLORS.green },
  chipText:       { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: COLORS.sub },
  chipTextActive: { color: '#fff' },
  sectionLabel:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, marginBottom: 12 },
  sectionText:    { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionCount:   { fontSize: FontSize.xs, color: COLORS.green, fontWeight: FontWeight.medium },
  grid:           { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card:           { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 16, position: 'relative', overflow: 'hidden' },
  badgeDone:      { position: 'absolute', top: 10, right: 10, width: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center' },
  iconBox:        { width: 48, height: 48, borderRadius: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  iconBoxGreen:   { backgroundColor: '#009C3B18', borderColor: '#009C3B44' },
  iconBoxYellow:  { backgroundColor: '#FEDD0012', borderColor: '#FEDD0033' },
  ufFallback:     { fontSize: scaleFont(11), fontWeight: FontWeight.bold, color: COLORS.sub },
  uf:             { fontSize: scaleFont(10), fontWeight: FontWeight.bold, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  stateName:      { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: COLORS.text, marginBottom: 10, lineHeight: 18 },
  progressBar:    { height: 3, backgroundColor: COLORS.border, borderRadius: 99, overflow: 'hidden', marginBottom: 5 },
  progressFill:   { height: '100%', borderRadius: 99, backgroundColor: COLORS.border },
  counter:        { fontSize: scaleFont(10), color: COLORS.muted },
});
