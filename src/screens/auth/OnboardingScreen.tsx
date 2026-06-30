import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';

type Step = 'welcome' | 'state' | 'city' | 'done';

interface State { id: string; name: string; uf: string; region: string; }
interface City  { id: string; name: string; state_uf: string; is_capital: boolean; }

export function OnboardingScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuthStore();

  const [step,        setStep]        = useState<Step>('welcome');
  const [states,      setStates]      = useState<State[]>([]);
  const [cities,      setCities]      = useState<City[]>([]);
  const [search,      setSearch]      = useState('');
  const [selectedState, setSelectedState] = useState<State | null>(null);
  const [selectedCity,  setSelectedCity]  = useState<City | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [saving,      setSaving]      = useState(false);

  useEffect(() => {
    if (step === 'state') loadStates();
  }, [step]);

  useEffect(() => {
    if (selectedState) loadCities(selectedState.id);
  }, [selectedState]);

  async function loadStates() {
    setLoading(true);
    const { data } = await supabase.from('states').select('*').order('name');
    if (data) setStates(data);
    setLoading(false);
  }

  async function loadCities(stateId: string) {
    setLoading(true);
    const { data } = await supabase.from('cities').select('*').eq('state_id', stateId).order('name');
    if (data) setCities(data);
    setLoading(false);
  }

async function handleFinish() {
    if (saving) return;
    setSaving(true);
    if (user) {
      await supabase.from('profiles').update({
        city_natal_id: selectedCity?.id ?? null,
        city_changed_at: new Date().toISOString(),
      }).eq('id', user.id);
    }
    setSaving(false);
    navigation.reset({ index: 0, routes: [{ name: 'App' }] });
  }

  const filteredStates = states.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.uf.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCities = cities.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  // WELCOME STEP
  if (step === 'welcome') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Text style={styles.emoji}>🗺️</Text>
          <Text style={[styles.welcomeTitle, { color: colors.text }]}>Bem-vindo ao{'\n'}Cultura Nacional!</Text>
          <Text style={[styles.welcomeSub, { color: colors.textSecondary }]}>
            Vamos personalizar sua experiência.{'\n'}Nos conte de onde você é!
          </Text>
          <View style={styles.featureList}>
            {[
              ['🏙️', 'Perguntas da sua cidade natal'],
              ['🏆', 'Ranking entre os moradores'],
              ['🗺️', 'Explore todos os estados'],
            ].map(([icon, text]) => (
              <View key={text} style={[styles.feature, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={styles.featureIcon}>{icon}</Text>
                <Text style={[styles.featureText, { color: colors.text }]}>{text}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.footer}>
          <Button label="Escolher minha cidade" onPress={() => { setStep('state'); setSearch(''); }} />
          <TouchableOpacity style={styles.skip} onPress={handleFinish}>
            <Text style={[styles.skipText, { color: colors.textMuted }]}>Pular por agora</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // STATE STEP
  if (step === 'state') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.stepHeader}>
          <TouchableOpacity onPress={() => setStep('welcome')}>
            <Text style={[styles.back, { color: colors.primary }]}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={[styles.stepTitle, { color: colors.text }]}>Qual é o seu estado?</Text>
          <Text style={[styles.stepSub, { color: colors.textSecondary }]}>Passo 1 de 2</Text>
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ color: colors.textMuted, marginRight: 8 }}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar estado..."
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>

        {loading
          ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          : (
            <FlatList
              data={filteredStates}
              keyExtractor={item => item.id}
              contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 20 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => { setSelectedState(item); setStep('city'); setSearch(''); }}
                  style={[
                    styles.listItem,
                    { backgroundColor: colors.card, borderColor: colors.border }
                  ]}
                >
                  <View style={[styles.ufBadge, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.ufText, { color: colors.primary }]}>{item.uf}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.itemSub, { color: colors.textMuted }]}>{item.region}</Text>
                  </View>
                  <Text style={{ color: colors.textMuted }}>›</Text>
                </TouchableOpacity>
              )}
            />
          )
        }
      </View>
    );
  }

  // CITY STEP
  if (step === 'city') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.stepHeader}>
          <TouchableOpacity onPress={() => { setStep('state'); setSearch(''); }}>
            <Text style={[styles.back, { color: colors.primary }]}>← {selectedState?.uf}</Text>
          </TouchableOpacity>
          <Text style={[styles.stepTitle, { color: colors.text }]}>Qual é a sua cidade?</Text>
          <Text style={[styles.stepSub, { color: colors.textSecondary }]}>{selectedState?.name} · Passo 2 de 2</Text>
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ color: colors.textMuted, marginRight: 8 }}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={`Buscar em ${selectedState?.name}...`}
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>

        {loading
          ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          : (
            <FlatList
              data={filteredCities}
              keyExtractor={item => item.id}
              contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 100 }}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    Cidade não encontrada.{'\n'}Ela pode ser adicionada em breve!
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const selected = selectedCity?.id === item.id;
                return (
                  <TouchableOpacity
                    onPress={() => setSelectedCity(item)}
                    style={[
                      styles.listItem,
                      {
                        backgroundColor: selected ? colors.primary + '15' : colors.card,
                        borderColor: selected ? colors.primary : colors.border,
                      }
                    ]}
                  >
                    <Text style={styles.cityIcon}>{item.is_capital ? '🏛️' : '🏙️'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemName, { color: selected ? colors.primary : colors.text }]}>{item.name}</Text>
                      {item.is_capital && (
                        <Text style={[styles.itemSub, { color: colors.textMuted }]}>Capital</Text>
                      )}
                    </View>
                    {selected && <Text style={{ color: colors.primary, fontSize: 18 }}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
            />
          )
        }

        <View style={[styles.cityFooter, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <Button
            label={selectedCity ? `Confirmar: ${selectedCity.name}` : 'Selecione uma cidade'}
            onPress={handleFinish}
            loading={saving}
            disabled={!selectedCity}
          />
          <TouchableOpacity style={styles.skip} onPress={handleFinish}>
            <Text style={[styles.skipText, { color: colors.textMuted }]}>Não encontrei minha cidade</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  emoji:        { fontSize: 56, marginBottom: Spacing.lg },
  welcomeTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, textAlign: 'center', lineHeight: 34 },
  welcomeSub:   { fontSize: FontSize.sm, textAlign: 'center', marginTop: Spacing.md, lineHeight: 22 },
  featureList:  { width: '100%', marginTop: Spacing.xl, gap: 10 },
  feature:      { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.md, borderWidth: 0.5, padding: Spacing.md, gap: 12 },
  featureIcon:  { fontSize: 20 },
  featureText:  { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  footer:       { padding: Spacing.xl, gap: 12 },
  skip:         { alignItems: 'center', paddingVertical: Spacing.sm },
  skipText:     { fontSize: FontSize.sm },
  stepHeader:   { padding: Spacing.xl, paddingTop: 60 },
  back:         { fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginBottom: Spacing.md },
  stepTitle:    { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  stepSub:      { fontSize: FontSize.sm, marginTop: 4 },
  searchBar:    { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.xl, marginBottom: Spacing.md, borderRadius: Radius.md, borderWidth: 0.5, paddingHorizontal: Spacing.md, height: 44 },
  searchInput:  { flex: 1, fontSize: FontSize.md },
  listItem:     { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.md, borderWidth: 0.5, padding: Spacing.md, marginBottom: 8, gap: 12 },
  ufBadge:      { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  ufText:       { fontSize: 12, fontWeight: FontWeight.bold },
  cityIcon:     { fontSize: 20 },
  itemName:     { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  itemSub:      { fontSize: FontSize.xs, marginTop: 2 },
  emptyWrap:    { alignItems: 'center', marginTop: 40 },
  emptyText:    { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 22 },
  cityFooter:   { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.xl, borderTopWidth: 0.5, gap: 8 },
});
