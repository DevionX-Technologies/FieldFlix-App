import React from 'react';
import { Text, TextProps } from 'react-native';

import { useTheme } from '@/theme';

type Props = {
  children?: React.ReactNode;
  style?: any;
  as?: string;
  size?: number;
  color?: string;
  align?: 'left' | 'right' | 'center' | 'justify' | 'auto';
};

const TextComp = ({
  children,
  as,
  style,
  size,
  color,
  align,
  ...restprops
}: Props & TextProps) => {
  const { fonts, colors } = useTheme();
  return (
    <Text
      style={[
        fonts.regular,
        { color: color || colors.text, },
        size && { fontSize: size },
        align && { textAlign: align },
        style,
      ]}
      {...restprops}
    >
      {children}
    </Text>
  );
};

export default TextComp;

