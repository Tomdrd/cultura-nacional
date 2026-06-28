import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import { Colors, ThemeColors } from '../constants/colors';

export function useTheme(): { colors: ThemeColors; isDark: boolean } {
  const systemScheme = useColorScheme();
  const { themeMode } = useSettingsStore();

  const isDark =
    themeMode === 'dark'
      ? true
      : themeMode === 'light'
      ? false
      : systemScheme === 'dark';

  return {
    colors: isDark ? Colors.dark : Colors.light,
    isDark,
  };
}
