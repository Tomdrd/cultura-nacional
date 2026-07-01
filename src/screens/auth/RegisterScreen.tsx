import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import { ArrowLeft, CheckCircle } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';

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
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleRegister() {
    if (!validate()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email:    email.trim(),
        password,
        options:  { data: { username: username.trim() } },
      });

      if (error) {
        const msg =
          error.message.includes('already registered')
            ? 'Este e-mail já está cadastrado. Tente fazer login.'
            : error.message.includes('invalid')
            ? 'E-mail inválido. Verifique e tente novamente.'
            : error.message;
        Alert.alert('Erro ao criar conta', msg);
        return;
      }

      // Cadastro bem-sucedido
      if (data.session) {
        // Sessão já ativa (confirmação de e-mail desativada) — vai pro Onboarding
        navigation.navigate('Onboarding');
      } else {
        // Confirmação de e-mail ativa — mostra tela de sucesso
        setScreenState('success');
      }
    } catch (err: any) {
      Alert.alert('Erro', 'Não foi possível criar a conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  // ── Tela de sucesso (e-mail de confirmação) ────────────────────
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
          <Button
            label="Já confirmei, fazer login"
            onPress={() => navigation.navigate('Login')}
            style={styles.successBtn}
          />
          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.laterBtn}>
            <Text style={[styles.laterText, { color: colors.textMuted }]}>Confirmar depois</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Formulário ─────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <ArrowLeft size={18} color={colors.primary} />
            <Text style={[styles.backText, { color: colors.primary }]}>Voltar</Text>
          </TouchableOpacity>
          <View style={[styles.logoCircle, { backgroundColor: '#009C3B' }]}>
            <Text style={styles.logoText}>CN</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Criar conta</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>Junte-se a milhares de brasileiros</Text>
        </View>

        {/* Form */}
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

          <Button
            label="Criar conta"
            onPress={handleRegister}
            loading={loading}
            style={styles.btn}
          />

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
  logoText:         { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
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
});
