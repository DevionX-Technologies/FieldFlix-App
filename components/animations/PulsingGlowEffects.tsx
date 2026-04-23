import React, { useEffect } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface GlowOrbProps {
  size: number;
  color: string;
  x: number;
  y: number;
  duration: number;
  delay: number;
}

function GlowOrb({ size, color, x, y, duration, delay }: GlowOrbProps) {
  const pulseAnimation = useSharedValue(0);

  useEffect(() => {
    pulseAnimation.value = withRepeat(
      withTiming(1, { duration }),
      -1,
      true
    );
  }, [pulseAnimation, duration]);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      pulseAnimation.value,
      [0, 0.5, 1],
      [0.8, 1.2, 0.8]
    );

    const opacity = interpolate(
      pulseAnimation.value,
      [0, 0.5, 1],
      [0.2, 0.8, 0.2]
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.glowOrb,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          left: x,
          top: y,
        },
        animatedStyle,
      ]}
    />
  );
}

export default function PulsingGlowEffects() {
  const glowOrbs = [
    {
      id: 1,
      size: 120,
      color: 'rgba(182, 252, 0, 0.15)',
      x: screenWidth * 0.8,
      y: screenHeight * 0.15,
      duration: 4000,
      delay: 0,
    },
    {
      id: 2,
      size: 80,
      color: 'rgba(182, 252, 0, 0.1)',
      x: screenWidth * 0.1,
      y: screenHeight * 0.3,
      duration: 3500,
      delay: 1000,
    },
    {
      id: 3,
      size: 150,
      color: 'rgba(182, 252, 0, 0.08)',
      x: screenWidth * 0.6,
      y: screenHeight * 0.7,
      duration: 5000,
      delay: 2000,
    },
    {
      id: 4,
      size: 60,
      color: 'rgba(255, 255, 255, 0.1)',
      x: screenWidth * 0.2,
      y: screenHeight * 0.8,
      duration: 3000,
      delay: 500,
    },
  ];

  return (
    <Animated.View style={styles.container}>
      {glowOrbs.map((orb) => (
        <GlowOrb
          key={orb.id}
          size={orb.size}
          color={orb.color}
          x={orb.x}
          y={orb.y}
          duration={orb.duration}
          delay={orb.delay}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  glowOrb: {
    position: 'absolute',
    shadowColor: '#B6FC00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
});