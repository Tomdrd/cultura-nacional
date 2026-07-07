import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Plan } from '../../types';

interface Props {
  plan: Plan;
  username: string;
}

const PLAN_CONFIG: Record<string, { label: string; color: string; description: string }> = {
  pro: {
    label: 'CN Pro',
    color: '#1877F2',
    description: 'Você agora tem acesso completo ao Cultura Nacional. Aproveite perguntas exclusivas, sem limites e com prioridade no ranking.',
  },
  family: {
    label: 'Família',
    color: '#009C3B',
    description: 'Sua família agora tem acesso completo ao Cultura Nacional. Compartilhe o conhecimento sobre o Brasil com quem você ama.',
  },
  education: {
    label: 'Educação',
    color: '#7F77DD',
    description: 'Sua instituição agora tem acesso completo ao Cultura Nacional. Use o app como ferramenta de aprendizado sobre a cultura brasileira.',
  },
}

export function WelcomePlanModal({ plan, username }: Props) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const config = PLAN_CONFIG[plan];

  useEffect(() => {
    if (!config) return;
    AsyncStorage.getItem(`welcome_shown_${plan}`).then(shown => {
      if (!shown) setVisible(true);
    });
  }, [plan]);

  async function dismiss() {
    await AsyncStorage.setItem(`welcome_shown_${plan}`, 'true');
    setVisible(false);
  }

  if (!config || !visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={dismiss}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: config.color + '40' }]}>
          <View style={[styles.iconWrap, { backgroundColor: config.color + '15' }]}>
            <Ionicons name="checkmark-circle" size={48} color={config.color} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            Bem-vindo ao {config.label}
          </Text>
          <Text style={[styles.username, { color: config.color }]}>{username}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {config.description}
          </Text>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: config.color }]}
            onPress={dismiss}
          >
            <Text style={styles.btnText}>Começar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: '#000000AA', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card:        { width: '100%', maxWidth: 360, borderRadius: 20, borderWidth: 1, padding: 28, alignItems: 'center', gap: 12 },
  iconWrap:    { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title:       { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  username:    { fontSize: 15, fontWeight: '600', textAlign: 'center', marginTop: -4 },
  description: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginTop: 4 },
  btn:         { marginTop: 8, width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnText:     { color: '#fff', fontSize: 15, fontWeight: '700' },
});
