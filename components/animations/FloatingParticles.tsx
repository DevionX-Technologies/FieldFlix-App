import React, { useEffect } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ParticleProps {
  delay: number;
  size: number;
  opacity: number;
  startX: number;
  duration: number;
}

function Particle({ delay, size, opacity, startX, duration }: ParticleProps) {
  const animationProgress = useSharedValue(0);

  useEffect(() => {
    animationProgress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration }),
        -1,
        false
      )
    );
  }, [animationProgress, delay, duration]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      animationProgress.value,
      [0, 1],
      [screenHeight + size, -size]
    );

    const translateX = interpolate(
      animationProgress.value,
      [0, 0.5, 1],
      [0, 30, -20]
    ) + startX;

    const scale = interpolate(
      animationProgress.value,
      [0, 0.2, 0.8, 1],
      [0, 1, 1, 0]
    );

    const particleOpacity = interpolate(
      animationProgress.value,
      [0, 0.2, 0.8, 1],
      [0, opacity, opacity, 0]
    );

    return {
      transform: [
        { translateX },
        { translateY },
        { scale },
      ],
      opacity: particleOpacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        animatedStyle,
      ]}
    />
  );
}

export default function FloatingParticles() {
  const particles = Array.from({ length: 20 }, (_, index) => ({
    id: index,
    delay: Math.random() * 5000,
    size: 4 + Math.random() * 8,
    opacity: 0.3 + Math.random() * 0.4,
    startX: Math.random() * screenWidth,
    duration: 8000 + Math.random() * 4000,
  }));

  return (
    <Animated.View style={styles.container}>
      {particles.map((particle) => (
        <Particle
          key={particle.id}
          delay={particle.delay}
          size={particle.size}
          opacity={particle.opacity}
          startX={particle.startX}
          duration={particle.duration}
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
  particle: {
    position: 'absolute',
    backgroundColor: 'rgba(182, 252, 0, 0.8)',
    shadowColor: '#B6FC00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
});