/**
 * Declaração de tipos para imports de arquivos .svg como componentes React.
 *
 * O Metro (via react-native-svg-transformer, configurado em metro.config.js)
 * transforma cada import de .svg num componente React que renderiza o SVG
 * usando react-native-svg. O TypeScript não sabe disso por padrão e reclama
 * de "Cannot find module" para qualquer import de .svg (ver LoginScreen.tsx,
 * RegisterScreen.tsx, ResetPasswordScreen.tsx). Esta declaração resolve isso.
 */

declare module '*.svg' {
  import type { FC } from 'react';
  import type { SvgProps } from 'react-native-svg';
  const content: FC<SvgProps>;
  export default content;
}
