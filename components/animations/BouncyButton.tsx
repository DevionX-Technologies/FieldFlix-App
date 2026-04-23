import React, { useEffect } from 'react';
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

interface BouncyButtonProps {
  children: React.ReactNode;
  delay?: number;
  style?: any;
}

export default function BouncyButton({
  children,
  delay = 0,
  style,
}: BouncyButtonProps) {
  const animationProgress = useSharedValue(0);
  const scaleValue = useSharedValue(0);

  useEffect(() => {
    // Initial entrance animation
    animationProgress.value = withDelay(
      delay,
      withTiming(1, { duration: 800 })
    );

    // Bouncy scale animation
    scaleValue.value = withDelay(
      delay + 300,
      withSequence(
        withSpring(1.1, { damping: 8, stiffness: 200 }),
        withSpring(0.95, { damping: 8, stiffness: 200 }),
        withSpring(1, { damping: 8, stiffness: 200 })
      )
    );
  }, [animationProgress, scaleValue, delay]);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      animationProgress.value,
      [0, 1],
      [0, 1]
    );

    const translateY = interpolate(
      animationProgress.value,
      [0, 1],
      [30, 0]
    );

    return {
      opacity,
      transform: [
        { translateY },
        { scale: scaleValue.value },
      ],
    };
  });

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}