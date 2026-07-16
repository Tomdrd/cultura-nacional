import React from 'react';
import { View, StyleSheet, StatusBar, ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { HomeTheme } from '../../constants/colors';
import { useContentWidth } from '../../hooks/useContentWidth';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function ScreenContainer({ children, style }: ScreenContainerProps) {
  const { isDark } = useTheme();
  const C = isDark ? HomeTheme.dark : HomeTheme.light;
  const { maxWidth } = useContentWidth();

  return (
    <View style={[styles.container, { backgroundColor: C.bg }, style]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />
      <View style={[styles.centered, { maxWidth }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered:  { flex: 1, width: '100%', alignSelf: 'center' },
});
