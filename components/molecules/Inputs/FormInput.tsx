import React, { ReactNode, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { CText } from '@/components/atoms';
import { useTheme } from '@/theme';
import { MetricsSizes } from '@/theme/variables';
import { InputWrapper } from '@/components/wrappers';

export interface IFormInput extends React.ComponentProps<typeof TextInput> {
    required?: boolean;
    label?: string;
    RightComp?: ReactNode;
    parentStyle?: any;
    LeftComp?: ReactNode;
    as?: string;
    color?: string;
    textColor?: string;
    error?: string
}

const FormInput = ({
  style,
  placeholderTextColor ,
  RightComp,
  required,
  label,
  parentStyle,
  LeftComp,
  editable,
  as = 'med_rg',
  color ,
  textColor ,
  error,
  ...restProps
}: IFormInput) => {
  const [isFocused, setIsFocused] = useState(false);

  const { fonts, colors } = useTheme();

  let opacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 500 });
  }, []);

  const toggleFocus = () => setIsFocused(!isFocused);

  return (
    <>
      <Animated.View style={[animatedStyle]}>
        <InputWrapper
          required={required}
          parentStyle={[parentStyle]}
          childStyle={[
            !!error && { borderColor: colors.red500 },
            isFocused && { borderColor: colors.primary },
          ]}
          label={label}
        >
          <View
            style={[
              styles.inputRow,
              { backgroundColor: color || colors.white },
              editable == false && styles.disabledInput,
            ]}
          >
            {LeftComp && LeftComp}
            <TextInput
              style={[fonts.size_16 , styles.input, style, { color: textColor || colors.text }]}
              placeholderTextColor={placeholderTextColor || colors.gray400}
              editable={editable}
              onFocus={toggleFocus}
              onBlur={toggleFocus}
              {...restProps}
            />
            {RightComp && RightComp}
            {/* {error && (
              <IconComp
                name="exclamationcircleo"
                type="AntDesign"
                size={MetricsSizes.REGULAR}
                color={colors.red500}
              />
            )} */}
          </View>
        </InputWrapper>

        {error && (
          <CText as="pMed" color={colors.red500}>
            {error + '  '}
            {/* <IconComp
              name="exclamationcircleo"
              type="AntDesign"
              size={MetricsSizes.REGULAR}
              color={colors.red500}
            /> */}
          </CText>
        )}
      </Animated.View>
    </>
  );
};

export default FormInput;

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    borderRadius: MetricsSizes.SMALL,
    paddingHorizontal: MetricsSizes.SMALL,
    
  },
  input: {
    flex: 1,
    letterSpacing: 1,
  },
  disabledInput: {
    backgroundColor: "#efefef"
  },
});
