import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, useWindowDimensions } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHeaderTopPadding } from '../../hooks/useHeaderTopPadding';
import { supabase } from '../../lib/supabase';
import { StateFlagIcon } from '../../components/ui/StateFlagIcon';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';
import { RegionColors } from '../../constants/colors';

// Largura mínima confortável por item (ícone + nome), usada para calcular colunas
const ITEM_MIN_WIDTH = 92;
const GRID_GAP = 12;
const MAX_COLUMNS = 10;
const CONTENT_MAX_WIDTH = 960;

interface State { id: string; name: string; uf: string; region: string; }

export function EstadosScreen({ navigation }: any) {
  const { colors } = useTheme();
  const headerPaddingTop = useHeaderTopPadding();
  const { width } = useWindowDimensions();
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

  // Colunas responsivas: mínimo 4 (mobile), cresce conforme a tela fica mais larga
  const effectiveWidth = Math.min(width, CONTENT_MAX_WIDTH);
  const availableWidth = effectiveWidth - Spacing.xl * 2;
  const numColumns = Math.max(4, Math.min(MAX_COLUMNS, Math.floor((availableWidth + GRID_GAP) / (ITEM_MIN_WIDTH + GRID_GAP))));
  const itemWidth = (availableWidth - GRID_GAP * (numColumns - 1)) / numColumns;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: headerPaddingTop }]}>
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
              <TouchableOpacity key={r} onPress={() => setRegion(r === region ? null : r)} style={[styles.regionPill, { backgroundColor: region === r ? RegionColors[r as keyof typeof RegionColors] : colors.card, borderColor: region === r ? RegionColors[r as keyof typeof RegionColors] : colors.border }]}>
                <Text style={[styles.regionText, { color: region === r ? '#FFF' : colors.textSecondary }]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={{ width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' }}>
          <View style={[styles.grid, { columnGap: GRID_GAP }]}>
            {filtered.map(state => (
              <TouchableOpacity
                key={state.id}
                onPress={() => navigation.navigate('Quiz', { stateId: state.id, stateName: state.name })}
                style={[styles.gridItem, { width: itemWidth }]}
              >
                <StateFlagIcon uf={state.uf} name={state.name} size={56} />
              </TouchableOpacity>
            ))}
          </View>
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
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.xl, borderBottomWidth: 0.5 },
  backBtn:     { width: 32, alignItems: 'flex-start' },
  title:       { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  regionRow:   { gap: 8, padding: Spacing.xl, paddingBottom: Spacing.md },
  regionPill:  { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 0.5 },
  regionText:  { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  grid:        { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.xl, rowGap: 20 },
  gridItem:    { alignItems: 'center' },
});
