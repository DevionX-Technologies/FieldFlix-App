import {
  KeyboardAvoidingView,
  Platform,
  View,
} from 'react-native';

import { useTheme } from '@/theme';

import SafeScreen from '@/components/tmplts/SafeScreen';

import { Clickable, CText, IconByVariant } from '@/components/atoms';
import { HomeHeader } from '@/components/organisms';
import { MetricsSizes } from '@/theme/variables';
import { ScrollView } from 'react-native-gesture-handler';

type HomeLayoutProps = {
  children: React.ReactNode;
};

const HomeLayout = ({ children }: HomeLayoutProps) => {
  const { colors, layout, gutters, fonts } = useTheme();

  return (
    <SafeScreen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[layout.flex_1, { backgroundColor: colors.white }]}
      >
        {/* Fixed Header */}
        <HomeHeader />

        <ScrollView style={[layout.flex_1, { backgroundColor: colors.primary }]}>
            {/* Location Section with Primary Background */}
            <View style={[{height: MetricsSizes.BASE100}]}>
            <View 
                style={[
                layout.row,
                layout.justifyBetween,
                layout.itemsCenter,
                gutters.padding_20,
                ]}
            >
                {/* Location Info */}
                <Clickable style={[layout.row, layout.itemsCenter]}>
                    <View style={[layout.fullHeight,gutters.marginTop_16]}>
                        <IconByVariant 
                            path="location"
                            width={MetricsSizes.MEDIUM}
                            height={MetricsSizes.MEDIUM}
                            color={colors.white}
                        />
                    </View>
                    <View style={[gutters.marginLeft_10]}>
                        <CText style={[{ color: colors.white },fonts.size_18]}>Thane</CText>
                        <CText style={[fonts.size_12, { color: colors.white }]}>
                            Change
                        </CText>
                    </View>
                </Clickable>

                {/* Football Icon */}
                 <View style={[layout.absolute, { right: 0, top: 10 }]}>
                    <IconByVariant 
                    path="football"
                    width={MetricsSizes.BASE100}
                    height={MetricsSizes.BASE100}
                    />
                 </View>
            </View>
            </View>

            {/* Content Container */}
            <View 
            style={[
                layout.flex_1,
                gutters.paddingTop_26,
                {
                backgroundColor: colors.white,
                borderTopLeftRadius: MetricsSizes.LARGE,
                borderTopRightRadius: MetricsSizes.LARGE,
                marginTop: -MetricsSizes.REGULAR,
                minHeight: MetricsSizes.SCREEN_HEIGHT - MetricsSizes.BASE_HEIGHT,
                },
                Platform.select({
                ios: {
                    shadowColor: colors.gray800,
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 3,
                },
                android: {
                    elevation: 5,
                },
                }),
            ]}
            >
             <>
                {children}
             </>
            </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
};

export default HomeLayout;
