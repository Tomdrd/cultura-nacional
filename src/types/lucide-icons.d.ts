/**
 * Declaração de tipos para imports "profundos" de ícones do lucide-react-native.
 *
 * Por que isso existe: para reduzir o tamanho do bundle web (ver commit que
 * introduziu este arquivo), os ícones passaram a ser importados diretamente
 * de cada arquivo individual do pacote, em vez do "barrel" principal:
 *
 *   ❌ import { BadgeCheck } from 'lucide-react-native';
 *   ✅ import BadgeCheck from 'lucide-react-native/dist/esm/icons/badge-check';
 *
 * O pacote não expõe esses caminhos individuais no seu campo "exports" do
 * package.json (só expõe "." e "./icons"), então o TypeScript não encontra
 * declarações de tipo para eles por padrão — mesmo o Metro (bundler)
 * resolvendo o caminho normalmente em runtime via fallback de arquivo.
 *
 * Este arquivo resolve isso com uma declaração "coringa" (wildcard): diz ao
 * TypeScript que qualquer caminho dentro de
 * 'lucide-react-native/dist/esm/icons/*' exporta um componente de ícone
 * (mesmo tipo usado pelos ícones do barrel principal).
 *
 * Se, no futuro, o pacote lucide-react-native passar a expor oficialmente
 * esses subcaminhos (com seus próprios .d.ts), este arquivo pode ser
 * removido sem problemas.
 */

declare module 'lucide-react-native/dist/esm/icons/*' {
  import type { LucideIcon } from 'lucide-react-native';
  const icon: LucideIcon;
  export default icon;
}
