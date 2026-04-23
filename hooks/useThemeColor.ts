/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useColorScheme } from '@/hooks/useColorScheme';
// import { Colors } from 'react-native/Libraries/NewAppScreen';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme() ?? 'dark';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}


export const Colors = {
  light: {
    text: '#000',
    background: '#fff',
    // Add other keys as needed
  },
  dark: {
    text: '#fff',
    background: '#000',
    // Add other keys as needed
  },
};