import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Modal, ActivityIndicator } from 'react-native';
import AlertTriangle from 'lucide-react-native/dist/esm/icons/triangle-alert';
import X from 'lucide-react-native/dist/esm/icons/x';
import Send from 'lucide-react-native/dist/esm/icons/send';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Spacing, FontSize, FontWeight, Radius, scaleFont } from '../../constants/layout';

const REASONS = [
  'Resposta incorreta',
  'Pergunta confusa ou mal escrita',
  'Erro de português',
  'Informação desatualizada',
  'Pergunta duplicada',
  'Outro',
];

interface Props {
  visible: boolean;
  questionId: string;
  questionText: string;
  onClose: () => void;
}

export function ReportModal({ visible, questionId, questionText, onClose }: Props) {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const [reason,      setReason]      = useState('');
  const [description, setDescription] = useState('');
  const [loading,     setLoading]     = useState(false);

  async function handleSubmit() {
    if (!reason) {
      Alert.alert('Selecione um motivo');
      return;
    }
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from('question_reports').insert({
      question_id: questionId,
      user_id:     user.id,
      reason,
      description: description.trim() || null,
      status:      'pending',
    });
    setLoading(false);
    if (error) {
      Alert.alert('Erro', 'Não foi possível enviar o reporte.');
    } else {
      Alert.alert('Obrigado!', 'Seu reporte foi enviado. Vamos analisar em breve.');
      setReason('');
      setDescription('');
      onClose();
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <AlertTriangle size={18} color={colors.danger} />
              <Text style={[styles.title, { color: colors.text }]}>Reportar erro</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Question preview */}
          <View style={[styles.questionPreview, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.questionLabel, { color: colors.textMuted }]}>Pergunta</Text>
            <Text style={[styles.questionText, { color: colors.text }]} numberOfLines={2}>{questionText}</Text>
          </View>

          {/* Reasons */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Qual é o problema?</Text>
          <View style={styles.reasons}>
            {REASONS.map(r => (
              <TouchableOpacity
                key={r}
                onPress={() => setReason(r)}
                style={[
                  styles.reasonBtn,
                  {
                    backgroundColor: reason === r ? colors.danger + '20' : colors.background,
                    borderColor:     reason === r ? colors.danger : colors.border,
                  }
                ]}
              >
                <Text style={[styles.reasonText, { color: reason === r ? colors.danger : colors.textSecondary }]}>
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Description */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Detalhes (opcional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="Descreva o problema com mais detalhes..."
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading || !reason}
            style={[styles.submitBtn, { backgroundColor: loading || !reason ? colors.border : colors.danger }]}
          >
            {loading
              ? <ActivityIndicator color="#FFF" size="small" />
              : <><Send size={16} color="#FFF" /><Text style={styles.submitText}>Enviar reporte</Text></>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:           { borderRadius: Radius.lg, borderWidth: 0.5, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: Spacing.xl, paddingBottom: 36 },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 0.5 },
  headerLeft:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title:           { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  questionPreview: { borderRadius: Radius.md, borderWidth: 0.5, padding: Spacing.md, marginBottom: Spacing.lg },
  questionLabel:   { fontSize: scaleFont(11), marginBottom: 4 },
  questionText:    { fontSize: FontSize.sm, lineHeight: 20 },
  sectionLabel:    { fontSize: scaleFont(11), fontWeight: FontWeight.medium, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm },
  reasons:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.lg },
  reasonBtn:       { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 0.5 },
  reasonText:      { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  input:           { borderWidth: 0.5, borderRadius: Radius.md, padding: Spacing.md, fontSize: FontSize.sm, minHeight: 80, textAlignVertical: 'top', marginBottom: Spacing.lg },
  submitBtn:       { height: 48, borderRadius: Radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitText:      { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.medium },
});
