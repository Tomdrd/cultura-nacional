import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Globe2 } from 'lucide-react-native';
import CnLogo from '../../../assets/images/cn-logo.svg';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';

export function LoginScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading,  setAppleLoading]  = useState(false);
  const [errors,   setErrors]   = useState<{ email?: string; password?: string }>({});

  function validate() {
    const e: typeof errors = {};
    if (!email.trim())            e.email    = 'Informe seu e-mail';
    else if (!email.includes('@')) e.email   = 'E-mail inválido';
    if (!password)                e.password = 'Informe sua senha';
    else if (password.length < 6) e.password = 'Mínimo 6 caracteres';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) Alert.alert('Erro ao entrar', error.message);
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    try {
      const redirectTo = Platform.OS === 'web'
        ? 'https://cultura-nacional.vercel.app/auth/callback'
        : 'culturanacional://auth/callback';

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: Platform.OS !== 'web',
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      if (error) throw error;

      if (Platform.OS !== 'web' && data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type === 'success' && result.url) {
          const url = new URL(result.url);
          const access_token  = url.searchParams.get('access_token')  ?? url.hash.match(/access_token=([^&]+)/)?.[1];
          const refresh_token = url.searchParams.get('refresh_token') ?? url.hash.match(/refresh_token=([^&]+)/)?.[1];
          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
          } else {
            await supabase.auth.getSession();
          }
        }
      }
    } catch (err: any) {
      Alert.alert('Erro com Google', err.message ?? 'Tente novamente.');
    }
    setGoogleLoading(false);
  }

  async function handleAppleLogin() {
    setAppleLoading(true);
    try {
      const redirectTo = 'culturanacional://auth/callback';
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type === 'success') {
          await supabase.auth.getSession();
        }
      }
    } catch (err: any) {
      Alert.alert('Erro com Apple', err.message ?? 'Tente novamente.');
    }
    setAppleLoading(false);
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      if (Platform.OS === 'web') window.alert('Digite seu e-mail no campo acima para receber o link de redefinição.');
      else Alert.alert('Informe seu e-mail', 'Digite seu e-mail no campo acima para receber o link de redefinição.');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: Platform.OS === 'web' ? 'https://cultura-nacional.vercel.app/auth/reset-password' : 'culturanacional://auth/reset-password',
    });
    if (error) {
      if (Platform.OS === 'web') window.alert(error.message);
      else Alert.alert('Erro', error.message);
    } else {
      if (Platform.OS === 'web') window.alert('E-mail enviado! Verifique sua caixa de entrada para redefinir a senha.');
      else Alert.alert('E-mail enviado!', 'Verifique sua caixa de entrada para redefinir a senha.');
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
            <CnLogo width={48} height={48} />
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>Cultura Nacional</Text>
          <Text style={[styles.appSub, { color: colors.textSecondary }]}>Quanto você sabe sobre o Brasil?</Text>
        </View>

        {/* OAuth buttons */}
        <View style={styles.oauthRow}>
          <TouchableOpacity
            onPress={handleGoogleLogin}
            disabled={googleLoading}
            style={[styles.oauthBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            {googleLoading
              ? <ActivityIndicator size="small" color={colors.text} />
              : <Globe2 size={18} color="#4285F4" />
            }
            <Text style={[styles.oauthText, { color: colors.text }]}>Google</Text>
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <TouchableOpacity
              onPress={handleAppleLogin}
              disabled={appleLoading}
              style={[styles.oauthBtn, { backgroundColor: '#000', borderColor: '#000' }]}
            >
              {appleLoading
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Text style={{ color: '#FFF', fontSize: 16 }}>􀣺</Text>
              }
              <Text style={[styles.oauthText, { color: '#FFF' }]}>Apple</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={[styles.line, { backgroundColor: colors.border }]} />
          <Text style={[styles.divText, { color: colors.textMuted }]}>ou entre com e-mail</Text>
          <View style={[styles.line, { backgroundColor: colors.border }]} />
        </View>

        {/* Email/Password Form */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Entrar</Text>

          <Input
            label="E-mail"
            placeholder="seu@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            error={errors.email}
          />
          <Input
            label="Senha"
            placeholder="••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            error={errors.password}
          />

          <Button label="Entrar" onPress={handleLogin} loading={loading} style={styles.btn} />

          <TouchableOpacity style={styles.forgot} onPress={handleForgotPassword}>
            <Text style={[styles.link, { color: colors.primary }]}>Esqueci minha senha</Text>
          </TouchableOpacity>
        </View>

        {/* Register */}
        <View style={styles.registerRow}>
          <Text style={[styles.registerText, { color: colors.textSecondary }]}>Ainda não tem conta? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={[styles.link, { color: colors.primary }]}>Cadastre-se</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.flag}>🇧🇷</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll:       { flexGrow: 1, padding: Spacing.xl, justifyContent: 'center' },
  logoWrap:     { alignItems: 'center', marginBottom: Spacing.xl },
  logoCircle:   { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  appName:      { fontSize: FontSize.xl, fontWeight: FontWeight.bold, letterSpacing: -0.5 },
  appSub:       { fontSize: FontSize.sm, marginTop: 4, textAlign: 'center' },
  oauthRow:     { flexDirection: 'row', gap: 12, marginBottom: Spacing.lg },
  oauthBtn:     { flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: Radius.md, borderWidth: 0.5 },
  oauthText:    { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  divider:      { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg },
  line:         { flex: 1, height: 0.5 },
  divText:      { marginHorizontal: Spacing.md, fontSize: FontSize.xs },
  card:         { borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.xl, marginBottom: Spacing.lg },
  title:        { fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginBottom: Spacing.lg },
  btn:          { marginTop: Spacing.sm },
  forgot:       { alignItems: 'center', marginTop: Spacing.md },
  registerRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  registerText: { fontSize: FontSize.sm },
  link:         { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  flag:         { textAlign: 'center', fontSize: 28, marginTop: Spacing.xl },
});
