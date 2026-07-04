import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import CnLogo from '../../../assets/images/cn-logo.svg';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../../components/ui/Button';
import { CustomAlert } from '../../components/ui/CustomAlert';
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
  const [alert, setAlert] = useState<{ visible: boolean; title: string; message?: string }>({ visible: false, title: '' });

  function showAlert(title: string, message?: string) {
    setAlert({ visible: true, title, message });
  }

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
    if (error) showAlert('Erro ao entrar', error.message);
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
      showAlert('Erro com Google', err.message ?? 'Tente novamente.');
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
      showAlert('Erro com Apple', err.message ?? 'Tente novamente.');
    }
    setAppleLoading(false);
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      if (Platform.OS === 'web') window.alert('Digite seu e-mail no campo acima para receber o link de redefinição.');
      else showAlert('Informe seu e-mail', 'Digite seu e-mail no campo acima para receber o link de redefinição.');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: Platform.OS === 'web' ? 'https://cultura-nacional.vercel.app/auth/reset-password' : 'culturanacional://auth/reset-password',
    });
    if (error) {
      if (Platform.OS === 'web') window.alert(error.message);
      else showAlert('Erro', error.message);
    } else {
      if (Platform.OS === 'web') window.alert('E-mail enviado! Verifique sua caixa de entrada para redefinir a senha.');
      else showAlert('E-mail enviado!', 'Verifique sua caixa de entrada para redefinir a senha.');
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
              : <Svg width={18} height={18} viewBox="0 0 48 48">
                  <Path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-9 20-20 0-1.3-.1-2.7-.4-4z"/>
                  <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                  <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 35.5 26.9 36 24 36c-5.2 0-9.6-2.9-11.3-7.1l-6.6 4.9C9.8 39.8 16.4 44 24 44z"/>
                  <Path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.4-2.5 4.5-4.6 5.8l6.2 5.2C40.8 35.7 44 30.3 44 24c0-1.3-.1-2.7-.4-4z"/>
                </Svg>
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
