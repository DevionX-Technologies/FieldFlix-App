import { DeviceSize, getResponsiveFontSize } from '@/utils/responsiveFonts';
import { useMemo } from 'react';
import { Dimensions, PixelRatio } from 'react-native';

/**
 * Hook for responsive design utilities
 * Provides font sizes, spacing, and device info for responsive layouts
 */
export const useResponsiveDesign = () => {
  const deviceInfo = useMemo(() => ({
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    pixelRatio: PixelRatio.get(),
    fontScale: PixelRatio.getFontScale(),
    isSmall: DeviceSize.isSmall(),
    isMedium: DeviceSize.isMedium(),
    isLarge: DeviceSize.isLarge(),
  }), []);

  const fontSizes = useMemo(() => ({
    xs: getResponsiveFontSize(10),
    sm: getResponsiveFontSize(12),
    md: getResponsiveFontSize(14),
    lg: getResponsiveFontSize(16),
    xl: getResponsiveFontSize(18),
    xxl: getResponsiveFontSize(20),
    xxxl: getResponsiveFontSize(24),
    
    // Custom size function
    custom: (size: number) => getResponsiveFontSize(size),
  }), []);

  const spacing = useMemo(() => {
    const base = deviceInfo.isSmall ? 6 : deviceInfo.isMedium ? 8 : 10;
    return {
      xs: base * 0.5,
      sm: base,
      md: base * 1.5,
      lg: base * 2,
      xl: base * 2.5,
      xxl: base * 3,
    };
  }, [deviceInfo]);

  const iconSizes = useMemo(() => ({
    xs: deviceInfo.isSmall ? 12 : 16,
    sm: deviceInfo.isSmall ? 16 : 20,
    md: deviceInfo.isSmall ? 20 : 24,
    lg: deviceInfo.isSmall ? 24 : 28,
    xl: deviceInfo.isSmall ? 28 : 32,
  }), [deviceInfo]);

  return {
    device: deviceInfo,
    font: fontSizes,
    spacing,
    icons: iconSizes,
    
    // Helper functions
    scale: (size: number) => {
      if (deviceInfo.isSmall) return size * 0.85;
      if (deviceInfo.isLarge) return size * 1.1;
      return size;
    },
    
    // Conditional values based on device size
    conditional: <T>(small: T, medium: T, large: T): T => {
      if (deviceInfo.isSmall) return small;
      if (deviceInfo.isMedium) return medium;
      return large;
    }
  };
};

export default useResponsiveDesign;