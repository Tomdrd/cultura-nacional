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
 *
 * ── Como usar em uma tela nova ──────────────────────────────────────────
 * Regra: qualquer View/TouchableOpacity ENCOSTADA na borda de cima da tela
 * (header, botão de voltar solto, barra de placar) precisa disso. Elementos
 * dentro de um container que já tem padding normal (não encostado no topo)
 * não precisam.
 *
 * 1. Chamar o hook no componente:
 *      const headerPaddingTop = useHeaderTopPadding();
 *
 * 2. Aplicar como override INLINE no array de style (não dá pra ir direto
 *    no StyleSheet.create porque o valor depende de estado do hook):
 *      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
 *
 * 3. NÃO deixar nenhum paddingTop fixo (nem "56") no styles.header do
 *    StyleSheet.create — isso é o bug que esse hook resolveu em 11 telas.
 *
 * Nunca hardcodear um número de paddingTop pra compensar status
 * bar/notch — sempre passar por aqui.
 */
export function useHeaderTopPadding() {
  const insets = useSafeAreaInsets();
  return Platform.OS === 'web' ? Spacing.xl : insets.top + Spacing.md;
}
