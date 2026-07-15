import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, StatusBar,
} from 'react-native';
import { ArrowLeft, MapPin, Search } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHeaderTopPadding } from '../../hooks/useHeaderTopPadding';
import { Button } from '../../components/ui/Button';
import { CustomAlert } from '../../components/ui/CustomAlert';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';
import { HomeTheme } from '../../constants/colors';

interface City {
  id: string;
  name: string;
  state_uf: string;
}

export function CidadeSetupScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const C = isDark ? HomeTheme.dark : HomeTheme.light;
  const headerPaddingTop = useHeaderTopPadding();
  const { user, setCityNatalId } = useAuthStore();

  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [cityLoading, setCityLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const searchTimeout = useRef<any>(null);

  const [alert, setAlert] = useState<{ visible: boolean; title: string; message?: string }>({ visible: false, title: '' });

  function showAlert(title: string, message?: string) {
    setAlert({ visible: true, title, message });
  }

  useEffect(() => {
    if (selectedCity) return;
    if (cityQuery.trim().length < 2) {
      setCityResults([]);
      setShowDropdown(false);
      return;
    }
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setCityLoading(true);
      const { data } = await supabase
        .from('cities')
        .select('id, name, state_uf')
        .ilike('name', `%${cityQuery.trim()}%`)
        .order('name')
        .limit(8);
      setCityResults(data ?? []);
      setShowDropdown(true);
      setCityLoading(false);
    }, 300);
  }, [cityQuery, selectedCity]);

  function handleSelectCity(city: City) {
    setSelectedCity(city);
    setCityQuery(`${city.name} - ${city.state_uf}`);
    setShowDropdown(false);
    setCityResults([]);
    setError('');
  }

  function handleCityQueryChange(text: string) {
    setCityQuery(text);
    if (selectedCity) setSelectedCity(null);
    setError('');
  }

  async function handleContinue() {
    if (!selectedCity) {
      setError('Selecione uma cidade para continuar');
      return;
    }

    if (!user) {
      showAlert('Erro', 'Usuário não autenticado. Tente fazer login novamente.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({
          city_natal_id: selectedCity.id,
          city_changed_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select('id');

      if (updateError) {
        showAlert('Erro', 'Não foi possível salvar sua cidade. Tente novamente.');
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        showAlert('Erro', 'Perfil não encontrado. Tente fazer login novamente.');
        setLoading(false);
        return;
      }

      setCityNatalId(selectedCity.id);
      navigation.reset({
        index: 0,
        routes: [{ name: 'HomeTabs' }],
      });
    } catch (err) {
      showAlert('Erro', 'Algo deu errado. Tente novamente.');
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />
      <View style={[styles.container, { backgroundColor: C.bg }]}>
        <View style={[styles.header, { paddingTop: headerPaddingTop, borderBottomColor: C.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <ArrowLeft size={20} color={C.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: C.text }]}>
              Selecione sua <Text style={{ color: C.green }}>Cidade</Text>
            </Text>
            <Text style={[styles.headerSub, { color: C.muted }]}>Essa será sua base para o ranking local</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.cityLabel, { color: C.muted }]}>CIDADE NATAL</Text>
            <View style={[
              styles.cityInputRow,
              {
                backgroundColor: C.iconBg,
                borderColor: error ? C.danger : selectedCity ? C.green : C.border,
              }
            ]}>
              {cityLoading
                ? <ActivityIndicator size="small" color={C.green} />
                : <Search size={16} color={selectedCity ? C.green : C.muted} />
              }
              <TextInput
                placeholder="Buscar cidade..."
                placeholderTextColor={C.muted}
                value={cityQuery}
                onChangeText={handleCityQueryChange}
                style={[styles.cityInputField, { color: C.text }]}
                autoFocus
              />
              {selectedCity && <MapPin size={16} color={C.green} />}
            </View>
            {error && (
              <Text style={[styles.errorText, { color: C.danger }]}>{error}</Text>
            )}
            {showDropdown && cityResults.length > 0 && (
              <View style={[styles.dropdown, { backgroundColor: C.card, borderColor: C.border }]}>
                {cityResults.map((city, idx) => (
                  <TouchableOpacity
                    key={city.id}
                    style={[
                      styles.dropdownItem,
                      { borderBottomColor: C.border },
                      idx === cityResults.length - 1 && { borderBottomWidth: 0 },
                    ]}
                    onPress={() => handleSelectCity(city)}
                  >
                    <MapPin size={14} color={C.green} />
                    <Text style={[styles.dropdownCity, { color: C.text }]}>{city.name}</Text>
                    <Text style={[styles.dropdownUF, { color: C.muted }]}>{city.state_uf}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <Text style={[styles.helperText, { color: C.muted }]}>
              Escolha sua cidade natal para competir no ranking local
            </Text>

            <Button
              label="Continuar"
              onPress={handleContinue}
              loading={loading}
              style={styles.btn}
            />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        <CustomAlert
          visible={alert.visible}
          title={alert.title}
          message={alert.message}
          onDismiss={() => setAlert({ visible: false, title: '' })}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1 },
  header:          { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: Spacing.xl, paddingBottom: 16, borderBottomWidth: 0.5 },
  backBtn:         { width: 20, paddingTop: 2 },
  headerTitle:     { fontSize: FontSize.lg, fontWeight: FontWeight.bold, lineHeight: 24 },
  headerSub:       { fontSize: FontSize.xs, marginTop: 2 },
  card:            { borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.xl, margin: Spacing.xl, marginBottom: Spacing.lg },
  cityLabel:       { fontSize: FontSize.xs, fontWeight: '500', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  cityInputRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: Radius.md, borderWidth: 0.5, paddingHorizontal: Spacing.md, height: 48, marginBottom: 8 },
  cityInputField:  { flex: 1, height: 48, fontSize: 16 },
  errorText:       { fontSize: FontSize.xs, marginBottom: 8, marginTop: -4, color: '#E24B4A' },
  helperText:      { fontSize: FontSize.xs, marginTop: Spacing.md, marginBottom: Spacing.lg },
  dropdown:        { borderRadius: Radius.md, borderWidth: 0.5, marginBottom: 12, overflow: 'hidden' },
  dropdownItem:    { flexDirection: 'row', alignItems: 'center', gap: 8, padding: Spacing.md, borderBottomWidth: 0.5 },
  dropdownCity:    { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  dropdownUF:      { fontSize: FontSize.xs },
  btn:             { marginTop: Spacing.sm },
});
