import { Image, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { Clickable, CText, IconByVariant } from '@/components/atoms';
import { MetricsSizes } from '@/theme/variables';

const ICON_SIZE = MetricsSizes.LARGE
const DP_SIZE = ICON_SIZE*1.5
const HomeHeader = () => {
  const { layout, gutters, fonts, colors } = useTheme();

  return (
    <View 
      style={[
        layout.row,
        layout.justifyBetween,
        layout.itemsCenter,
        gutters.paddingHorizontal_20,
        gutters.paddingVertical_10
      ]}
    >
      {/* Left Section - Greeting */}
      <View style={[layout.row, layout.itemsCenter, { gap: MetricsSizes.SMALL }]}>
        <View style={[styles.dpContainer,{backgroundColor: colors.gray100,borderRadius: ICON_SIZE}]}>
            <Image 
                source={require('@/theme/assets/images/logo.png')}
                style={[layout.fullHeight,layout.fullWidth, {borderRadius: ICON_SIZE}]}
            />
        </View>

        <View>
            <CText style={[fonts.size_16, { color: colors.gray400 }]}>
            Hello!
            </CText>
            <CText style={[fonts.size_24, fonts.bold]}>
            Abby B
            </CText>
        </View>
      </View>

      {/* Right Section - Icons */}
      <View style={[layout.rowReverse , layout.itemsCenter, { gap: MetricsSizes.REGULAR }]}>
        <Clickable>
          <IconByVariant 
            path="headphone"
            width={ICON_SIZE} 
            height={ICON_SIZE}
          />
        </Clickable>

        <Clickable>
          <View>
            {/* Green dot notification indicator */}
            <View 
              style={[{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.primary,
                position: 'absolute',
                right: 2,
                top: 2,
                zIndex: 1
              }]} 
            />
            <IconByVariant 
              path="notification"
              width={ICON_SIZE} 
              height={ICON_SIZE}
            />
          </View>
        </Clickable>
      </View>
    </View>
  );
};

export default HomeHeader;

const styles = StyleSheet.create({
  dpContainer: {
    width: DP_SIZE,
    height: DP_SIZE,
  },
});
