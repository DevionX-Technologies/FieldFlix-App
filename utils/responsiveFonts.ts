import { Dimensions, PixelRatio } from 'react-native';

// Get device dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (iPhone 6/7/8 as reference)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 667;

/**
 * Scale font size based on device screen width
 * Uses a combination of screen width ratio and pixel density
 */
export const scaleFont = (size: number): number => {
  // Calculate scale based on screen width
  const widthScale = SCREEN_WIDTH / BASE_WIDTH;
  
  // Get device pixel ratio for density scaling
  const pixelRatio = PixelRatio.get();
  
  // Create a normalized scale factor
  // - For small screens (< 360px): scale down more aggressively
  // - For medium screens (360-414px): use moderate scaling
  // - For large screens (> 414px): scale up more conservatively
  let scaleFactor: number;
  
  if (SCREEN_WIDTH < 360) {
    // Small phones - scale down more
    scaleFactor = Math.min(widthScale * 0.85, 1.0);
  } else if (SCREEN_WIDTH <= 414) {
    // Medium phones - moderate scaling
    scaleFactor = Math.min(widthScale * 0.95, 1.1);
  } else {
    // Large phones - conservative scaling
    scaleFactor = Math.min(widthScale * 0.98, 1.2);
  }
  
  // Apply pixel density adjustment for very high/low density screens
  const densityAdjustment = pixelRatio > 3 ? 0.95 : pixelRatio < 2 ? 1.05 : 1.0;
  
  const scaledSize = size * scaleFactor * densityAdjustment;
  
  // Ensure minimum readable size and round to nearest 0.5
  return Math.max(Math.round(scaledSize * 2) / 2, 8);
};

/**
 * Get responsive font size with device category awareness
 */
export const getResponsiveFontSize = (size: number): number => {
  return scaleFont(size);
};

/**
 * Device size categories for conditional styling
 */
export const DeviceSize = {
  isSmall: () => SCREEN_WIDTH < 360,
  isMedium: () => SCREEN_WIDTH >= 360 && SCREEN_WIDTH <= 414,
  isLarge: () => SCREEN_WIDTH > 414,
  
  // Specific breakpoints
  isIPhone5: () => SCREEN_WIDTH <= 320,
  isIPhoneX: () => SCREEN_WIDTH >= 375 && SCREEN_HEIGHT >= 812,
  isTablet: () => SCREEN_WIDTH >= 768,
};

/**
 * Predefined responsive font sizes based on your existing scale
 */
export const ResponsiveFontSizes = {
  tiny: getResponsiveFontSize(10),
  small: getResponsiveFontSize(12),
  medium: getResponsiveFontSize(16),
  large: getResponsiveFontSize(18),
  xlarge: getResponsiveFontSize(20),
  xxlarge: getResponsiveFontSize(24),
  huge: getResponsiveFontSize(32),
  massive: getResponsiveFontSize(40),
} as const;

/**
 * Debug information for development
 */
export const DeviceInfo = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  pixelRatio: PixelRatio.get(),
  fontScale: PixelRatio.getFontScale(),
  category: DeviceSize.isSmall() ? 'small' : DeviceSize.isMedium() ? 'medium' : 'large',
  
  // Sample scaled sizes for testing
  samples: {
    12: getResponsiveFontSize(12),
    16: getResponsiveFontSize(16),
    20: getResponsiveFontSize(20),
    24: getResponsiveFontSize(24),
  }
};

export default {
  scaleFont,
  getResponsiveFontSize,
  ResponsiveFontSizes,
  DeviceSize,
  DeviceInfo,
};