import React, { useEffect } from 'react';
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from 'react-native-reanimated';

interface FadeSlideInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  slideDistance?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  style?: any;
}

export default function FadeSlideIn({
  children,
  delay = 0,
  duration = 1000,
  slideDistance = 50,
  direction = 'up',
  style,
}: FadeSlideInProps) {
  const animationProgress = useSharedValue(0);

  useEffect(() => {
    animationProgress.value = withDelay(
      delay,
      withTiming(1, {
        duration,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [animationProgress, delay, duration]);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      animationProgress.value,
      [0, 1],
      [0, 1]
    );

    const scale = interpolate(
      animationProgress.value,
      [0, 1],
      [0.9, 1]
    );

    let translateX = 0;
    let translateY = 0;

    switch (direction) {
      case 'up':
        translateY = interpolate(
          animationProgress.value,
          [0, 1],
          [slideDistance, 0]
        );
        break;
      case 'down':
        translateY = interpolate(
          animationProgress.value,
          [0, 1],
          [-slideDistance, 0]
        );
        break;
      case 'left':
        translateX = interpolate(
          animationProgress.value,
          [0, 1],
          [slideDistance, 0]
        );
        break;
      case 'right':
        translateX = interpolate(
          animationProgress.value,
          [0, 1],
          [-slideDistance, 0]
        );
        break;
    }

    return {
      opacity,
      transform: [
        { translateX },
        { translateY },
        { scale },
      ],
    };
  });

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}