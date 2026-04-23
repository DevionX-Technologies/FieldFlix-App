import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

/**
 * Web `ToggleSwitch.tsx` clone — pill track + sliding thumb, green when on.
 */
export function ToggleSwitch({
  checked,
  onChange,
  onColor = '#22c55e',
  disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  onColor?: string;
  disabled?: boolean;
}) {
  const x = useSharedValue(checked ? 20 : 2);

  useEffect(() => {
    x.value = withTiming(checked ? 20 : 2, { duration: 180 });
  }, [checked, x]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={[
        styles.track,
        { backgroundColor: checked ? onColor : 'rgba(255,255,255,0.12)' },
        disabled && { opacity: 0.5 },
      ]}
    >
      <Animated.View style={[styles.thumb, thumbStyle]} />
      <View pointerEvents="none" style={StyleSheet.absoluteFill} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 44,
    height: 24,
    borderRadius: 999,
    justifyContent: 'center',
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },
});
