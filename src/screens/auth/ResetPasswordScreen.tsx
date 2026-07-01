import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';

export function ResetPasswordScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});

  function validate() {
    const e: typeof errors = {};
    if (!password) e.password = 'Informe a nova senha';
    else if (password.length < 6) e.password = 'Mínimo 6 caracteres';
    if (!confirm) e.confirm = 'Confirme a senha';
    else if (confirm !== password) e.confirm = 'As senhas não coincidem';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleReset() {
    if (!validate()) return;
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      if (Platform.OS === 'web') window.alert(error.message);
      else Alert.alert('Erro', error.message);
    } else {
      if (Platform.OS === 'web') window.alert('Senha alterada com sucesso!');
      else Alert.alert('Sucesso', 'Senha alterada com sucesso!');
      navigation.navigate('Login');
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoWrap}>
          <View style={[styles.logoCircle, { backgroundColor: '#1A1A1A' }]}>
            <Text style={styles.logoText}>CN</Text>
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>Nova Senha</Text>
          <Text style={[styles.appSub, { color: colors.textSecondary }]}>Digite sua nova senha abaixo</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Input
            label="Nova senha"
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
          <Button label="Salvar nova senha" onPress={handleReset} loading={loading} style={styles.btn} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll:     { flexGrow: 1, padding: Spacing.xl, justifyContent: 'center' },
  logoWrap:   { alignItems: 'center', marginBottom: Spacing.xl },
  logoCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  logoText:   { color: '#FFFFFF', fontSize: 26, fontWeight: '700' },
  appName:    { fontSize: FontSize.xl, fontWeight: FontWeight.bold, letterSpacing: -0.5 },
  appSub:     { fontSize: FontSize.sm, marginTop: 4, textAlign: 'center' },
  card:       { borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.xl },
  btn:        { marginTop: Spacing.sm },
});
