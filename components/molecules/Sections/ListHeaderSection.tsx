import { View, Text, StyleProp, ViewStyle } from 'react-native'
import React from 'react'
import { useTheme } from '@/theme';
import { Clickable, CText } from '@/components/atoms';

type Props = {
    title: string;
    rightComponent?: React.ReactNode;
    hideShowAll?: boolean;
    onShowAll?: () => void;
    style?: StyleProp<ViewStyle>;
}

const ListHeaderSection = ({
    title,
    rightComponent,
    hideShowAll = false,
    onShowAll,
    style,
}: Props) => {
    const { colors, fonts,gutters,layout } = useTheme();
  return (
    <View style={[gutters.paddingVertical_10,layout.row, layout.justifyBetween, layout.itemsCenter, style]}>
      <CText style={[fonts.size_18, fonts.extraBold, {color: colors.primary}]}>{title}</CText>
      
      {
        hideShowAll ? null : !!rightComponent  ? rightComponent : 
        <Clickable onPress={onShowAll}>
            <CText style={[fonts.size_12,fonts.bold ]}>VIEW ALL</CText>
        </Clickable>
      }

    </View>
  )
}

export default ListHeaderSection