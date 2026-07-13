import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, TextInput,
} from 'react-native';
import { MapPin, Search, ChevronRight, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHeaderTopPadding } from '../../hooks/useHeaderTopPadding';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';

interface State  { id: string; name: string; uf: string; }
interface City   { id: string; name: string; state_uf: string; }

export function CidadeSetupScreen({ navigation }: any) {
  const { colors } = useTheme();
  const headerPaddingTop = useHeaderTopPadding();
  const { user, setCityNatalId } = useAuthStore();

  const [step,     setStep]     = useState<'state' | 'city'>('state');
  const [states,   setStates]   = useState<State[]>([]);
  const [cities,   setCities]   = useState<City[]>([]);
  const [filtered, setFiltered] = useState<City[]>([]);
  const [selected, setSelected] = useState<State | null>(null);
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    supabase.from('states').select('id, name, uf').order('name').then(({ data }) => {
      if (data) setStates(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (search.trim() === '') {
      setFiltered(cities);
    } else {
      setFiltered(cities.filter(c => c.name.toLowerCase().includes(search.toLowerCase())));
    }
  }, [search, cities]);

  async function selectState(state: State) {
    setSelected(state);
    setLoading(true);
    setStep('city');
    const { data } = await supabase
      .from('cities')
      .select('id, name, state_uf')
      .eq('state_id', state.id)
      .order('name');
    if (data) { setCities(data); setFiltered(data); }
    setLoading(false);
  }

  async function selectCity(city: City) {
    if (!user) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('profiles')
      .update({ city_natal_id: city.id })
      .eq('id', user.id)
      .select('id');
    setSaving(false);

    if (error) {
      console.error('Erro ao salvar cidade natal:', error.message);
      return;
    }

    if (!data || data.length === 0) {
      // Update não encontrou nenhuma linha (perfil ausente ou bloqueado por RLS)
      console.error('Nenhum perfil encontrado para atualizar a cidade natal.');
      return;
    }

    setCityNatalId(city.id);
    navigation.reset({ index: 0, routes: [{ name: 'HomeTabs' }] });
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: headerPaddingTop }]}>
        {step === 'city' && (
          <TouchableOpacity onPress={() => { setStep('state'); setSearch(''); }} style={styles.backBtn}>
            <ArrowLeft size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
        <View style={styles.headerCenter}>
          <MapPin size={20} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {step === 'state' ? 'Selecione seu estado' : selected?.name}
          </Text>
        </View>
        {step === 'city' && <View style={{ width: 32 }} />}
      </View>

      {step === 'state' && (
        <View style={[styles.intro, { backgroundColor: colors.primary + '10', borderBottomColor: colors.primary + '20' }]}>
          <Text style={[styles.introText, { color: colors.textSecondary }]}>
            Selecione sua cidade natal para participar do ranking local e receber perguntas sobre sua região! 🇧🇷
          </Text>
        </View>
      )}

      {step === 'city' && (
        <View style={[styles.searchWrap, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Search size={16} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar cidade..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : step === 'state' ? (
        <FlatList
          data={states}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => selectState(item)}
            >
              <View style={[styles.ufBadge, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.ufText, { color: colors.primary }]}>{item.uf}</Text>
              </View>
              <Text style={[styles.itemText, { color: colors.text }]}>{item.name}</Text>
              <ChevronRight size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => selectCity(item)}
              disabled={saving}
            >
              <MapPin size={16} color={colors.textMuted} />
              <Text style={[styles.itemText, { color: colors.text }]}>{item.name}</Text>
              {saving
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <ChevronRight size={16} color={colors.textMuted} />
              }
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', padding: Spacing.xl, borderBottomWidth: 0.5, gap: 12 },
  backBtn:     { width: 32 },
  headerCenter:{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  intro:       { padding: Spacing.lg, borderBottomWidth: 0.5 },
  introText:   { fontSize: FontSize.sm, lineHeight: 20, textAlign: 'center' },
  searchWrap:  { flexDirection: 'row', alignItems: 'center', gap: 10, padding: Spacing.lg, borderBottomWidth: 0.5 },
  searchInput: { flex: 1, fontSize: FontSize.sm },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list:        { padding: Spacing.lg, gap: 8 },
  item:        { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 0.5 },
  ufBadge:     { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  ufText:      { fontSize: 12, fontWeight: FontWeight.bold },
  itemText:    { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
});
