import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { HomeTheme } from '../../constants/colors';
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
  const { isDark } = useTheme();
  const C = isDark ? HomeTheme.dark : HomeTheme.light;

  const defaultButtons = buttons ?? [{ label: 'OK', onPress: onDismiss ?? (() => {}), variant: 'primary' as const }];

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={[styles.box, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.title, { color: C.text }]}>{title}</Text>
          {message ? <Text style={[styles.message, { color: C.muted }]}>{message}</Text> : null}
          <View style={[styles.divider, { backgroundColor: C.border }]} />
          <View style={styles.buttons}>
            {defaultButtons.map((btn, i) => (
              <TouchableOpacity
                key={i}
                onPress={btn.onPress}
                style={[
                  styles.btn,
                  i > 0 && { borderLeftWidth: 0.5, borderLeftColor: C.border },
                ]}
              >
                <Text style={[
                  styles.btnText,
                  btn.variant === 'danger'    && { color: C.danger },
                  btn.variant === 'secondary' && { color: C.muted },
                  (!btn.variant || btn.variant === 'primary') && { color: C.green, fontWeight: FontWeight.bold },
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
