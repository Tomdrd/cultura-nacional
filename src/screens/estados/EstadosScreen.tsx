import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../../lib/supabase';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';

const REGION_COLORS: Record<string, string> = {
  Norte:          '#378ADD',
  Nordeste:       '#D85A30',
  'Centro-Oeste': '#BA7517',
  Sudeste:        '#7F77DD',
  Sul:            '#009C3B',
};

interface State { id: string; name: string; uf: string; region: string; }

export function EstadosScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [states,  setStates]  = useState<State[]>([]);
  const [region,  setRegion]  = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const regions = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];

  useEffect(() => {
    supabase.from('states').select('*').order('name').then(({ data }) => {
      if (data) setStates(data);
      setLoading(false);
    });
  }, []);

  const filtered = region ? states.filter(s => s.region === region) : states;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Explorar Estados</Text>
        <View style={{ width: 32 }} />
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.regionRow}>
            <TouchableOpacity onPress={() => setRegion(null)} style={[styles.regionPill, { backgroundColor: !region ? colors.primary : colors.card, borderColor: !region ? colors.primary : colors.border }]}>
              <Text style={[styles.regionText, { color: !region ? '#FFF' : colors.textSecondary }]}>Todos</Text>
            </TouchableOpacity>
            {regions.map(r => (
              <TouchableOpacity key={r} onPress={() => setRegion(r === region ? null : r)} style={[styles.regionPill, { backgroundColor: region === r ? REGION_COLORS[r] : colors.card, borderColor: region === r ? REGION_COLORS[r] : colors.border }]}>
                <Text style={[styles.regionText, { color: region === r ? '#FFF' : colors.textSecondary }]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.list}>
            {filtered.map(state => (
              <TouchableOpacity key={state.id} onPress={() => navigation.navigate('Quiz', { stateId: state.id, stateName: state.name })} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.ufBadge, { backgroundColor: REGION_COLORS[state.region] + '20' }]}>
                  <Text style={[styles.ufText, { color: REGION_COLORS[state.region] }]}>{state.uf}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stateName, { color: colors.text }]}>{state.name}</Text>
                  <Text style={[styles.stateRegion, { color: colors.textMuted }]}>{state.region}</Text>
                </View>
                <ChevronRight size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1 },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.xl, paddingTop: 56, borderBottomWidth: 0.5 },
  backBtn:     { width: 32, alignItems: 'flex-start' },
  title:       { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  regionRow:   { gap: 8, padding: Spacing.xl, paddingBottom: Spacing.md },
  regionPill:  { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 0.5 },
  regionText:  { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  list:        { paddingHorizontal: Spacing.xl, gap: 8 },
  card:        { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.md, borderWidth: 0.5, padding: Spacing.md, gap: 12 },
  ufBadge:     { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  ufText:      { fontSize: 13, fontWeight: FontWeight.bold },
  stateName:   { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  stateRegion: { fontSize: FontSize.xs, marginTop: 2 },
});
