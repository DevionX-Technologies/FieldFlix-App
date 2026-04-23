import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {MetricsSizes } from '@/theme/variables';
import { CText } from '@/components/atoms';
import { useTheme } from '@/theme';

type Props = {
  children: React.ReactNode;
  style?: any;
  label?: string;
  required?: boolean;
  parentStyle?: any;
  childStyle?: any;
};

const InputWrapper = ({
  children,
  style,
  label,
  required,
  parentStyle,
  childStyle,
}: Props) => {
  const { colors } = useTheme();
  const yOffset = useSharedValue(30);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: yOffset.value }],
    };
  });

  useEffect(() => {
    yOffset.value = withTiming(0, { duration: 1000 });
  }, []);

  return (
    <View style={[styles.parent, parentStyle]}>
      {label && (
        <Animated.View style={[animatedStyle]}>
          <CText >{label}</CText>
        </Animated.View>
      )}
      <View style={[styles.inputContainer, { borderColor: colors.outline }, childStyle]}>{children}</View>
    </View>
  );
};

export default InputWrapper;

const styles = StyleSheet.create({
  parent: {
    marginVertical: MetricsSizes.SMALL,
    overflow: 'hidden',
  },

  active: {
    // position: 'relative',
  },
  inputContainer: {
    height: MetricsSizes.BASE_HEIGHT,
    borderRadius: MetricsSizes.BASE_RADIUS,
    borderWidth: 1.5,
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
