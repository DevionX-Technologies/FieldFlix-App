import LottieView from 'lottie-react-native';
import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function LottieBackground() {
  const floatingAnimation = useSharedValue(0);

  React.useEffect(() => {
    floatingAnimation.value = withRepeat(
      withTiming(1, { duration: 6000 }),
      -1,
      true
    );
  }, [floatingAnimation]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      floatingAnimation.value,
      [0, 1],
      [-10, 10]
    );

    const scale = interpolate(
      floatingAnimation.value,
      [0, 0.5, 1],
      [0.8, 1, 0.8]
    );

    return {
      transform: [
        { translateY },
        { scale },
      ],
    };
  });

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <LottieView
        source={require('../../assets/animated-splash.json')}
        autoPlay
        loop
        style={styles.lottie}
        speed={0.5}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: screenHeight * 0.1,
    left: screenWidth * 0.1,
    width: screenWidth * 0.8,
    height: screenWidth * 0.8,
    opacity: 0.15,
    zIndex: 1,
  },
  lottie: {
    flex: 1,
  },
});