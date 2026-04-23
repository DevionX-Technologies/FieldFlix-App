import { StyleSheet, type ViewStyle } from 'react-native';
import { WEB } from '@/screens/fieldflix/webDesign';

/** Inner `LinearGradient` for pill CTAs — duplicate radius fixes Android square edges. */
export const gradientPillInner: ViewStyle = {
  borderRadius: WEB.pillRadius,
};

/** Hero image overlay — match rounded container (`WEB.heroRadius`). */
export const heroGradientOverlay: ViewStyle = {
  ...StyleSheet.absoluteFillObject,
  borderRadius: WEB.heroRadius,
};
