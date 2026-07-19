import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, ViewStyle, Platform } from 'react-native';
import Eye from 'lucide-react-native/dist/esm/icons/eye';
import EyeOff from 'lucide-react-native/dist/esm/icons/eye-off';
import { useTheme } from '../../hooks/useTheme';
import { HomeTheme } from '../../constants/colors';
import { Radius, FontSize, Spacing } from '../../constants/layout';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send';
  onSubmitEditing?: () => void;
  inputRef?: React.RefObject<TextInput>;
  error?: string;
  style?: ViewStyle;
}

export function Input({ label, placeholder, value, onChangeText, secureTextEntry, autoCapitalize = 'none', keyboardType = 'default', returnKeyType, onSubmitEditing, inputRef, error, style }: InputProps) {
  const { isDark } = useTheme();
  const C = isDark ? HomeTheme.dark : HomeTheme.light;
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrap, style]}>
      {label && <Text style={[styles.label, { color: C.muted }]}>{label}</Text>}
      <View style={[
        styles.row,
        { backgroundColor: C.iconBg, borderColor: focused ? C.green : (error ? C.danger : C.border), ...(Platform.OS === 'web' ? { colorScheme: isDark ? 'dark' : 'light' } : {}) }
      ]}>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.muted}
          secureTextEntry={secureTextEntry && !show}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, { color: C.text, backgroundColor: 'transparent' }]}
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setShow(!show)} style={styles.eye}>
            {show ? <EyeOff size={18} color={C.muted} /> : <Eye size={18} color={C.muted} />}
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={[styles.error, { color: C.danger }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.md },
  label: { fontSize: FontSize.xs, fontWeight: '500', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.md, borderWidth: 0.5, paddingHorizontal: Spacing.md },
  input: { flex: 1, height: 48, fontSize: FontSize.md },
  eye: { padding: Spacing.sm },
  error: { fontSize: FontSize.xs, marginTop: 4 },
});
