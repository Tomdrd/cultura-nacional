import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { FontSize, FontWeight, Radius, Spacing } from '../../constants/layout';

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: {
    label: string;
    onPress: () => void;
    variant?: 'primary' | 'danger' | 'secondary';
  }[];
  onDismiss?: () => void;
}

export function CustomAlert({ visible, title, message, buttons, onDismiss }: CustomAlertProps) {
  const { colors } = useTheme();

  const defaultButtons = buttons ?? [{ label: 'OK', onPress: onDismiss ?? (() => {}), variant: 'primary' as const }];

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={[styles.box, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {message ? <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text> : null}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.buttons}>
            {defaultButtons.map((btn, i) => (
              <TouchableOpacity
                key={i}
                onPress={btn.onPress}
                style={[
                  styles.btn,
                  i > 0 && { borderLeftWidth: 0.5, borderLeftColor: colors.border },
                ]}
              >
                <Text style={[
                  styles.btnText,
                  btn.variant === 'danger'    && { color: '#EF4444' },
                  btn.variant === 'secondary' && { color: colors.textMuted },
                  (!btn.variant || btn.variant === 'primary') && { color: colors.primary, fontWeight: FontWeight.bold },
                ]}>
                  {btn.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  box:      { width: '100%', maxWidth: 320, borderRadius: Radius.xl, borderWidth: 0.5, overflow: 'hidden' },
  title:    { fontSize: FontSize.md, fontWeight: FontWeight.bold, textAlign: 'center', paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.sm },
  message:  { fontSize: FontSize.sm, textAlign: 'center', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl, lineHeight: 20 },
  divider:  { height: 0.5 },
  buttons:  { flexDirection: 'row' },
  btn:      { flex: 1, paddingVertical: Spacing.lg, alignItems: 'center', justifyContent: 'center' },
  btnText:  { fontSize: FontSize.sm },
});
