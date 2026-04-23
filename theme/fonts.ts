import type { UnionConfiguration } from '@/theme/types/config';
import type { FontColors, FontSizes } from '@/theme/types/fonts';
import type { TextStyle } from 'react-native';

import { config } from '@/theme/_config';
import { getResponsiveFontSize } from '@/utils/responsiveFonts';

export const fontFamily = {
  black: 'MartelSans-Black',
  bold: 'MartelSans-Bold',
  extraBold: 'MartelSans-ExtraBold',
  extraLight: 'MartelSans-ExtraLight',
  light: 'MartelSans-Light',
  regular: 'MartelSans-Regular',
  semiBold: 'MartelSans-SemiBold',
} as const;

export const generateFontColors = (configuration: UnionConfiguration) => {
  return Object.entries(configuration.fonts.colors ?? {}).reduce(
    (acc, [key, value]) => {
      return Object.assign(acc, {
        [`${key}`]: {
          color: value,
        },
      });
    },
    {} as FontColors,
  );
};

export const generateFontSizes = () => {
  return config.fonts.sizes.reduce((acc, size) => {
    return Object.assign(acc, {
      [`size_${size}`]: {
        fontSize: getResponsiveFontSize(size),
      },
    });
  }, {} as FontSizes);
};

export const staticFontStyles = {
  regular: {
    fontFamily: fontFamily.regular,
  },
  bold: {
    fontFamily: fontFamily.bold,
  },
  semiBold: {
    fontFamily: fontFamily.semiBold,
  },
  black: {
    fontFamily: fontFamily.black,
  },
  extraBold: {
    fontFamily: fontFamily.extraBold,
  },
  light: {
    fontFamily: fontFamily.light,
  },
  extraLight: {
    fontFamily: fontFamily.extraLight,
  },
  uppercase: {
    textTransform: 'uppercase',
  },
  capitalize: {
    textTransform: 'capitalize',
  },
  alignCenter: {
    textAlign: 'center',
  },
} as const satisfies Record<string, TextStyle>;
