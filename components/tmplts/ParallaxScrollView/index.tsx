import type { PropsWithChildren, ReactElement } from 'react';

import { useEffect, useMemo } from 'react';
import {
  Dimensions,
  Platform,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useScrollViewOffset,
  withTiming,
} from 'react-native-reanimated';

import SafeScreen from '@/components/tmplts/SafeScreen';

const HEADER_HEIGHT = 250;
const { height: WINDOW_HEIGHT } = Dimensions.get('window');

type Props = PropsWithChildren<{
  headerImage: ReactElement;
  headerBackgroundColor: { dark: string; light: string };
}>;

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
}: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const scrollRef = useAnimatedRef<Animated.ScrollView>();

  // Scroll offset with error handling
  const scrollOffset = (() => {
    try {
      return useScrollViewOffset(scrollRef);
    } catch (error) {
      console.error('Error setting up scroll offset:', error);
      return { value: 0 };
    }
  })();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      scrollOffset.value = withTiming(0);
    };
  }, []);

  // Memoized animated style for better performance
  const headerAnimatedStyle = useMemo(
    () =>
      useAnimatedStyle(() => ({
        transform: [
          {
            translateY: interpolate(
              scrollOffset.value,
              [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
              [-HEADER_HEIGHT / 2, 0, HEADER_HEIGHT * 0.75],
              'clamp', // Add clamp for smoother boundaries
            ),
          },
          {
            scale: interpolate(
              scrollOffset.value,
              [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
              [2, 1, 1],
              'clamp',
            ),
          },
        ],
      })),
    [],
  );

  // Platform specific props
  const platformSpecificProps = useMemo(
    () => ({
      scrollEventThrottle: Platform.OS === 'ios' ? 16 : 1,
      ...(Platform.OS === 'ios'
        ? { bounces: false }
        : { overScrollMode: 'never' as const }),
    }),
    [],
  );

  return (
    <SafeScreen style={styles.container}>
      <Animated.ScrollView
        ref={scrollRef}
        {...platformSpecificProps}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => {
          'worklet';
          // Add any scroll begin logic
        }}
        onScrollEndDrag={() => {
          'worklet';
          // Add any scroll end logic
        }}
        onMomentumScrollEnd={() => {
          'worklet';
          // Add any momentum scroll end logic
        }}
      >
        <Animated.View
          style={[
            styles.header,
            { backgroundColor: headerBackgroundColor[colorScheme] },
            headerAnimatedStyle,
          ]}
        >
          {headerImage}
        </Animated.View>
        <View style={styles.content}>{children}</View>
      </Animated.ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollViewContent: {
    flexGrow: 1,
    minHeight: WINDOW_HEIGHT,
  },
  header: {
    height: HEADER_HEIGHT,
    overflow: 'hidden',
    zIndex: 1,
    // Add shadow for depth
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  content: {
    flex: 1,
    padding: 32,
    gap: 16,
    overflow: 'hidden',
    minHeight: WINDOW_HEIGHT - HEADER_HEIGHT,
    // Add background color for content
    backgroundColor: 'white',
    // Round top corners for better design
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    // Negative margin to overlap with header
    marginTop: -20,
    zIndex: 2,
  },
});



