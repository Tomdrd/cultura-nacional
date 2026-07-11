import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Linking, ActivityIndicator,
} from 'react-native';
import { ArrowLeft, CheckCircle, MapPin, Search } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { CustomAlert } from '../../components/ui/CustomAlert';
import { supabase } from '../../lib/supabase';
import CnLogo from '../../../assets/images/cn-logo.svg';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';

interface City { id: string; name: string; state_uf: string; }
type ScreenState = 'form' | 'success';

export function RegisterScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [screenState, setScreenState] = useState<ScreenState>('form');
  const [username,    setUsername]    = useState('');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [loading,     setLoading]     = useState(false);
  const [errors,      setErrors]      = useState<Record<string, string>>({});

  const [cityQuery,    setCityQuery]    = useState('');
  const [cityResults,  setCityResults]  = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [cityLoading,  setCityLoading]  = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
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
    setErrors(e => ({ ...e, city: '' }));
  }

  function handleCityQueryChange(text: string) {
    setCityQuery(text);
    if (selectedCity) setSelectedCity(null);
    setErrors(e => ({ ...e, city: '' }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!username.trim())          e.username = 'Informe um nome de usuário';
    else if (username.length < 3)  e.username = 'Mínimo 3 caracteres';
    if (!email.trim())             e.email    = 'Informe seu e-mail';
    else if (!email.includes('@')) e.email    = 'E-mail inválido';
    if (!password)                 e.password = 'Informe uma senha';
    else if (password.length < 6)  e.password = 'Mínimo 6 caracteres';
    if (!confirm)                  e.confirm  = 'Confirme sua senha';
    else if (confirm !== password) e.confirm  = 'As senhas não coincidem';
    if (!selectedCity)             e.city     = 'Selecione sua cidade natal';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleRegister() {
    if (!validate()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email:   email.trim(),
        password,
        options: { data: { username: username.trim() } },
      });

      if (error) {
        const msg =
          error.message.includes('already registered')
            ? 'Este e-mail já está cadastrado. Tente fazer login.'
            : error.message.includes('invalid')
            ? 'E-mail inválido. Verifique e tente novamente.'
            : error.message;
        showAlert('Erro ao criar conta', msg);
        return;
      }

      const userId = data.session?.user?.id ?? data.user?.id;
      if (userId && selectedCity) {
        await supabase.from('profiles').update({
          city_natal_id:   selectedCity.id,
          city_changed_at: new Date().toISOString(),
        }).eq('id', userId);
      }

      if (data.session) {
        navigation.reset({ index: 0, routes: [{ name: 'App' }] });
      } else {
        setScreenState('success');
      }
    } catch {
      showAlert('Erro', 'Não foi possível criar a conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  if (screenState === 'success') {
    return (
      <View style={[styles.successContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.successCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.successIcon, { backgroundColor: colors.primary + '20' }]}>
            <CheckCircle size={48} color={colors.primary} />
          </View>
          <Text style={[styles.successTitle, { color: colors.text }]}>Conta criada!</Text>
          <Text style={[styles.successMsg, { color: colors.textSecondary }]}>
            Enviamos um e-mail de confirmação para{'\n'}
            <Text style={{ color: colors.primary, fontWeight: FontWeight.bold }}>{email.trim()}</Text>
            {'\n\n'}Verifique sua caixa de entrada (e o spam) e clique no link para ativar sua conta.
          </Text>
          <Button label="Já confirmei, fazer login" onPress={() => navigation.navigate('Login')} style={styles.successBtn} />
          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.laterBtn}>
            <Text style={[styles.laterText, { color: colors.textMuted }]}>Confirmar depois</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <ArrowLeft size={18} color={colors.primary} />
            <Text style={[styles.backText, { color: colors.primary }]}>Voltar</Text>
          </TouchableOpacity>
          <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
            <CnLogo width={48} height={48} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Criar conta</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>Junte-se a milhares de brasileiros</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Input
            label="Nome de usuário"
            placeholder="seu_nome"
            value={username}
            onChangeText={t => { setUsername(t); setErrors(e => ({ ...e, username: '' })); }}
            autoCapitalize="none"
            error={errors.username}
          />
          <Input
            label="E-mail"
            placeholder="seu@email.com"
            value={email}
            onChangeText={t => { setEmail(t); setErrors(e => ({ ...e, email: '' })); }}
            keyboardType="email-address"
            error={errors.email}
          />
          <Input
            label="Senha"
            placeholder="••••••"
            value={password}
            onChangeText={t => { setPassword(t); setErrors(e => ({ ...e, password: '' })); }}
            secureTextEntry
            error={errors.password}
          />
          <Input
            label="Confirmar senha"
            placeholder="••••••"
            value={confirm}
            onChangeText={t => { setConfirm(t); setErrors(e => ({ ...e, confirm: '' })); }}
            secureTextEntry
            error={errors.confirm}
          />

          <View style={styles.cityWrap}>
            <Text style={[styles.cityLabel, { color: colors.textSecondary }]}>CIDADE NATAL</Text>
            <View style={[
              styles.cityInputRow,
              {
                backgroundColor: colors.backgroundAlt ?? colors.card,
                borderColor: errors.city ? colors.danger : selectedCity ? colors.primary : colors.border,
              }
            ]}>
              {cityLoading
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Search size={16} color={selectedCity ? colors.primary : colors.textMuted} />
              }
              <TextInput
                placeholder="Buscar cidade..."
                placeholderTextColor={colors.textMuted}
                value={cityQuery}
                onChangeText={handleCityQueryChange}
                style={[styles.cityInputField, { color: colors.text }]}
              />
              {selectedCity && <MapPin size={16} color={colors.primary} />}
            </View>
            {errors.city && (
              <Text style={[styles.errorText, { color: colors.danger }]}>{errors.city}</Text>
            )}
            {showDropdown && cityResults.length > 0 && (
              <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {cityResults.map((city, idx) => (
                  <TouchableOpacity
                    key={city.id}
                    style={[
                      styles.dropdownItem,
                      { borderBottomColor: colors.border },
                      idx === cityResults.length - 1 && { borderBottomWidth: 0 },
                    ]}
                    onPress={() => handleSelectCity(city)}
                  >
                    <MapPin size={14} color={colors.primary} />
                    <Text style={[styles.dropdownCity, { color: colors.text }]}>{city.name}</Text>
                    <Text style={[styles.dropdownUF, { color: colors.textMuted }]}>{city.state_uf}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <Button label="Criar conta" onPress={handleRegister} loading={loading} style={styles.btn} />

          <Text style={[styles.terms, { color: colors.textMuted }]}>
            Ao continuar, você concorda com nossos{' '}
            <Text style={{ color: colors.primary }} onPress={() => Linking.openURL('https://cultura-nacional.vercel.app/termos.html')}>
              Termos de Uso
            </Text>
            {' '}e{' '}
            <Text style={{ color: colors.primary }} onPress={() => Linking.openURL('https://cultura-nacional.vercel.app/privacidade.html')}>
              Política de Privacidade
            </Text>.
          </Text>
        </View>

        <View style={styles.loginRow}>
          <Text style={[styles.loginText, { color: colors.textSecondary }]}>Já tem conta? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={[styles.link, { color: colors.primary }]}>Entrar</Text>
          </TouchableOpacity>
        </View>

        <CustomAlert
          visible={alert.visible}
          title={alert.title}
          message={alert.message}
          onDismiss={() => setAlert({ visible: false, title: '' })}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll:           { flexGrow: 1, padding: Spacing.xl },
  header:           { alignItems: 'center', marginBottom: Spacing.xl, marginTop: Spacing.lg },
  back:             { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: Spacing.lg },
  backText:         { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  logoCircle:       { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  title:            { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  sub:              { fontSize: FontSize.sm, marginTop: 4 },
  card:             { borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.xl, marginBottom: Spacing.lg },
  btn:              { marginTop: Spacing.sm },
  terms:            { fontSize: 11, marginTop: Spacing.md, textAlign: 'center', lineHeight: 16 },
  loginRow:         { flexDirection: 'row', justifyContent: 'center' },
  loginText:        { fontSize: FontSize.sm },
  link:             { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  successContainer: { flex: 1, justifyContent: 'center', padding: Spacing.xl },
  successCard:      { borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.xl, alignItems: 'center', gap: 12 },
  successIcon:      { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  successTitle:     { fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  successMsg:       { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 22 },
  successBtn:       { width: '100%', marginTop: Spacing.md },
  laterBtn:         { paddingVertical: Spacing.sm },
  laterText:        { fontSize: FontSize.sm },
  cityWrap:         { marginBottom: Spacing.md, position: 'relative' },
  cityLabel:        { fontSize: FontSize.xs, fontWeight: '500', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  cityInputRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: Radius.md, borderWidth: 0.5, paddingHorizontal: Spacing.md },
  cityInputField:   { flex: 1, marginBottom: 0 },
  errorText:        { fontSize: FontSize.xs, marginTop: 4 },
  dropdown:         { borderRadius: Radius.md, borderWidth: 0.5, marginTop: 4, overflow: 'hidden' },
  dropdownItem:     { flexDirection: 'row', alignItems: 'center', gap: 8, padding: Spacing.md, borderBottomWidth: 0.5 },
  dropdownCity:     { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  dropdownUF:       { fontSize: FontSize.xs },
});
