import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Radius, FontSize, FontWeight, Spacing } from '../../constants/layout';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({ label, onPress, variant = 'primary', loading, disabled, style, textStyle }: ButtonProps) {
  const { colors } = useTheme();

  const bg = {
    primary:   colors.primary,
    secondary: colors.card,
    ghost:     'transparent',
    danger:    colors.danger,
  }[variant];

  const textColor = {
    primary:   '#FFFFFF',
    secondary: colors.text,
    ghost:     colors.primary,
    danger:    '#FFFFFF',
  }[variant];

  const borderColor = {
    primary:   'transparent',
    secondary: colors.border,
    ghost:     'transparent',
    danger:    'transparent',
  }[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.btn,
        { backgroundColor: bg, borderColor, opacity: (disabled || loading) ? 0.5 : 1 },
        variant === 'secondary' && { borderWidth: 0.5 },
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={textColor} size="small" />
        : <Text style={[styles.label, { color: textColor }, textStyle]}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 50,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    letterSpacing: 0.2,
  },
});
