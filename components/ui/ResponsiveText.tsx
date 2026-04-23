import { DeviceSize, getResponsiveFontSize } from '@/utils/responsiveFonts';
import React from 'react';
import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';

interface ResponsiveTextProps extends RNTextProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | number;
  children: React.ReactNode;
  style?: TextStyle | TextStyle[];
}

// Predefined responsive font sizes
const fontSizeMap = {
  xs: getResponsiveFontSize(10),
  sm: getResponsiveFontSize(12),
  md: getResponsiveFontSize(16),
  lg: getResponsiveFontSize(18),
  xl: getResponsiveFontSize(20),
  xxl: getResponsiveFontSize(24),
};

export const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  size = 'md',
  children,
  style,
  ...props
}) => {
  const fontSize = typeof size === 'number' ? getResponsiveFontSize(size) : fontSizeMap[size];
  
  const responsiveStyle: TextStyle = {
    fontSize,
    // Add additional responsive adjustments if needed
    lineHeight: fontSize * 1.4, // Maintain good line height ratio
  };

  const combinedStyle = Array.isArray(style) 
    ? [responsiveStyle, ...style]
    : [responsiveStyle, style];

  return (
    <RNText style={combinedStyle} {...props}>
      {children}
    </RNText>
  );
};

// Hook for getting responsive sizes programmatically
export const useResponsiveSizes = () => {
  return {
    fontSizes: fontSizeMap,
    getSize: (size: number) => getResponsiveFontSize(size),
    deviceCategory: DeviceSize.isSmall() ? 'small' : DeviceSize.isMedium() ? 'medium' : 'large',
    
    // Common spacing that scales with font size
    spacing: {
      xs: Math.round(fontSizeMap.xs * 0.5),
      sm: Math.round(fontSizeMap.sm * 0.5), 
      md: Math.round(fontSizeMap.md * 0.5),
      lg: Math.round(fontSizeMap.lg * 0.5),
    }
  };
};

export default ResponsiveText;