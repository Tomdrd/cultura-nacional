import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';

export function RegisterScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!username.trim())               e.username = 'Informe um nome de usuário';
    else if (username.length < 3)       e.username = 'Mínimo 3 caracteres';
    if (!email.trim())                  e.email    = 'Informe seu e-mail';
    else if (!email.includes('@'))      e.email    = 'E-mail inválido';
    if (!password)                      e.password = 'Informe uma senha';
    else if (password.length < 6)       e.password = 'Mínimo 6 caracteres';
    if (password !== confirm)           e.confirm  = 'Senhas não coincidem';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleRegister() {
    if (!validate()) return;
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { username: username.trim() } },
    });
    setLoading(false);
    if (error) {
      Alert.alert('Erro ao cadastrar', error.message);
    } else {
      navigation.navigate('Onboarding');
    }
  }

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
            <Text style={[styles.backText, { color: colors.primary }]}>← Voltar</Text>
          </TouchableOpacity>
          <View style={[styles.logoCircle, { backgroundColor: '#1A1A1A' }]}>
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
            onChangeText={setUsername}
            autoCapitalize="none"
            error={errors.username}
          />
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
          <Input
            label="Confirmar senha"
            placeholder="••••••"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            error={errors.confirm}
          />

          <Button label="Criar conta" onPress={handleRegister} loading={loading} style={styles.btn} />

          <Text style={[styles.terms, { color: colors.textMuted }]}>
            Ao continuar, você concorda com nossos{' '}
            <Text style={{ color: colors.primary }} onPress={() => Linking.openURL('https://cultura-nacional.vercel.app/termos.html')}>Termos de Uso</Text>
            {' '}e{' '}
            <Text style={{ color: colors.primary }} onPress={() => Linking.openURL('https://cultura-nacional.vercel.app/privacidade.html')}>Política de Privacidade</Text>.
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
  scroll:     { flexGrow: 1, padding: Spacing.xl },
  header:     { alignItems: 'center', marginBottom: Spacing.xl, marginTop: Spacing.lg },
  back:       { alignSelf: 'flex-start', marginBottom: Spacing.lg },
  backText:   { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  logoCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  logoText:   { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  title:      { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  sub:        { fontSize: FontSize.sm, marginTop: 4 },
  card:       { borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.xl, marginBottom: Spacing.lg },
  btn:        { marginTop: Spacing.sm },
  terms:      { fontSize: 11, marginTop: Spacing.md, textAlign: 'center', lineHeight: 16 },
  loginRow:   { flexDirection: 'row', justifyContent: 'center' },
  loginText:  { fontSize: FontSize.sm },
  link:       { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
});
