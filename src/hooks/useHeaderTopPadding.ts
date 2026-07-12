import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing } from '../constants/layout';

/**
 * Padding de topo pra headers "colados" na borda da tela.
 * - Web: não existe status bar/notch, então só um respiro fixo.
 * - iOS: a status bar/notch/Dynamic Island fica sobreposta ao conteúdo,
 *   então soma o inset real do dispositivo (varia por modelo) + respiro.
 * - Android: por padrão a status bar não é translúcida (não configuramos
 *   isso no app.json), então o SO já empurra o conteúdo sozinho — o inset
 *   real aqui tende a ser 0, e só usamos o respiro.
 */
export function useHeaderTopPadding() {
  const insets = useSafeAreaInsets();
  return Platform.OS === 'web' ? Spacing.xl : insets.top + Spacing.md;
}
