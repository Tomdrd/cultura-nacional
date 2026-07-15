import { useWindowDimensions } from 'react-native';
import { Breakpoints, ContentWidth } from '../constants/layout';

export type ScreenSize = 'mobile' | 'tablet' | 'desktop';

export function useContentWidth(columnsPerSize?: { mobile: number; tablet: number; desktop: number }) {
  const { width } = useWindowDimensions();

  let size: ScreenSize = 'mobile';
  if (width >= Breakpoints.desktop) size = 'desktop';
  else if (width >= Breakpoints.tablet) size = 'tablet';

  const maxWidth = Math.min(width, ContentWidth[size]);
  const numColumns = columnsPerSize ? columnsPerSize[size] : undefined;

  return { maxWidth, size, numColumns };
}
