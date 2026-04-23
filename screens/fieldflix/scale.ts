import { Dimensions, PixelRatio } from 'react-native';

/**
 * Design width taken from web `App.tsx` max-w-[402px]. Scale helpers preserve
 * the web proportions on any phone width instead of letterboxing to 402.
 */
export const WEB_DESIGN_WIDTH = 402;
export const WEB_DESIGN_HEIGHT = 874;

const { width: _rawW, height: _rawH } = Dimensions.get('window');

/**
 * Cap scale at 480/402 ≈ 1.19 so layouts don't bloat on tablets; floor at 0.75
 * for very narrow phones.
 */
const widthScale = Math.min(480, Math.max(300, _rawW)) / WEB_DESIGN_WIDTH;
const heightScale = Math.min(1040, Math.max(640, _rawH)) / WEB_DESIGN_HEIGHT;

export const SCREEN_W = _rawW;
export const SCREEN_H = _rawH;

/** Scale a horizontal/px value (rounded to the nearest pixel density). */
export function s(n: number): number {
  const v = n * widthScale;
  return PixelRatio.roundToNearestPixel(v);
}

/** Scale a vertical/px value based on height ratio. */
export function vs(n: number): number {
  const v = n * heightScale;
  return PixelRatio.roundToNearestPixel(v);
}

/** Scale a font size; slightly dampened so large fonts stay readable. */
export function sf(n: number): number {
  const factor = 1 + (widthScale - 1) * 0.6;
  const v = n * factor;
  return PixelRatio.roundToNearestPixel(v);
}

/** Moderate a px value between horizontal scale and no scale (for radii etc). */
export function ms(n: number, factor = 0.5): number {
  const v = n + (s(n) - n) * factor;
  return PixelRatio.roundToNearestPixel(v);
}
