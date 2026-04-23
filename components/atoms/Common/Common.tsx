import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MetricsSizes } from '@/theme/variables';
import { useTheme } from '@/theme';
import { config } from '@/theme/_config';
import { CText } from '..';

type Props = {};
const { SMALL, REGULAR, } = MetricsSizes;
const { colors } = config;

const Seperators = (props: Props) => {
  return (
    <View>
      <Text>Seperators</Text>
    </View>
  );
};

export const Vr = ({ style }: any) => {
  return <View style={[styles.Vr, style]} />;
};

interface IHr {
  style?: any;
  color?: string;
  dashed?: boolean;
}

export const Hr = ({ style, color = colors.outline, dashed }: IHr) => {
  const { layout } = useTheme();
  return (
    <View
      style={[
        layout.fullWidth,
        styles.Hr,
        style,
        color && { backgroundColor: color },
        dashed && styles.dashed,
      ]}
    />
  );
};

export const VGap = ({ style, gap }: any) => {
  return <View style={[styles.Gap, style, gap && { height: gap }]} />;
};

export const HGap = ({ style, gap }: any) => {
  return <View style={[styles.HGap, style, gap && { width: gap }]} />;
};



export default Seperators;

const styles = StyleSheet.create({
  Vr: {
    width: 0.5,
    backgroundColor: '#ccc',
    marginHorizontal: 10,
  },
  Hr: {
    height: 0.5,
    backgroundColor: colors.outline,
    marginVertical: 10,
  },
  Gap: {
    height: REGULAR,
  },
  HGap: {
    width: SMALL,
  },
  dashed: {
    borderStyle: 'dashed',
    borderColor: colors.outline,
    borderWidth: 1,
    borderRadius: 1,
  },
  Divider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerText: {
    paddingHorizontal: SMALL,
    color: colors.gray400
  }
});
