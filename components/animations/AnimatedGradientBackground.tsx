import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

interface AnimatedGradientBackgroundProps {
  children?: React.ReactNode;
}

export default function AnimatedGradientBackground({ children }: AnimatedGradientBackgroundProps) {
  const animationProgress = useSharedValue(0);

  useEffect(() => {
    animationProgress.value = withRepeat(
      withTiming(1, { duration: 8000 }),
      -1,
      true
    );
  }, [animationProgress]);

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      animationProgress.value,
      [0, 0.5, 1],
      ['#0C0C11', '#1a0d2e', '#0C0C11']
    );

    return {
      backgroundColor,
    };
  });

  const overlayStyle = useAnimatedStyle(() => {
    const opacity = 0.3 + 0.2 * Math.sin(animationProgress.value * Math.PI * 2);
    return {
      opacity,
    };
  });

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {/* Animated overlay with subtle color shifts */}
      <Animated.View style={[styles.overlay, overlayStyle]} />
      
      {/* Radial gradient effect */}
      <Animated.View style={styles.radialGradient} />
      
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(182, 252, 0, 0.1)',
  },
  radialGradient: {
    position: 'absolute',
    top: '20%',
    left: '10%',
    width: '80%',
    height: '60%',
    backgroundColor: 'rgba(182, 252, 0, 0.05)',
    borderRadius: 1000,
    transform: [{ scaleX: 2 }, { scaleY: 0.8 }],
  },
});