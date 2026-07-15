import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, Platform,
  KeyboardAvoidingView, StatusBar,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import CnLogo from '../../../assets/images/cn-logo.svg';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';
import { HomeTheme } from '../../constants/colors';

export function ResetPasswordScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const C = isDark ? HomeTheme.dark : HomeTheme.light;
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
      useAuthStore.getState().setIsPasswordRecovery(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />
      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoWrap}>
          <View style={[styles.logoCircle, { backgroundColor: C.green }]}>
            <CnLogo width={48} height={48} />
          </View>
          <Text style={[styles.appName, { color: C.text }]}>Nova Senha</Text>
          <Text style={[styles.appSub, { color: C.muted }]}>Digite sua nova senha abaixo</Text>
        </View>

        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
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
  appName:    { fontSize: FontSize.xl, fontWeight: FontWeight.bold, letterSpacing: -0.5 },
  appSub:     { fontSize: FontSize.sm, marginTop: 4, textAlign: 'center' },
  card:       { borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.xl },
  btn:        { marginTop: Spacing.sm },
});
