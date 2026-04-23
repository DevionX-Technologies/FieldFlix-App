import { Clickable, CText, IconByVariant } from '@/components/atoms';
import { Paths } from '@/data/paths';
import { useTheme } from '@/theme';
import { MetricsSizes } from '@/theme/variables';
import { StyleSheet, View } from 'react-native';

const ICON_SIZE = MetricsSizes.MEDIUM

const MainTabBar = ({ state, descriptors, navigation }: any) => {
  const { colors, layout, gutters,fonts } = useTheme();

  const renderTab = (route: any, index: number) => {
    const isFocused = state.index === index;
    const { path, size, label } = getIconPath(route.name, isFocused);

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    // Special styling for camera button (last tab)
    const isLastTab = index === state.routes.length - 1;
    if (isLastTab) {
      return (
        <Clickable
          key={route.key}
          onPress={onPress}
          style={[styles.cameraButton, { backgroundColor: colors.primary }]}
        >
          <IconByVariant 
            path="videoCamera"
            width={ICON_SIZE*1.25}
            height={ICON_SIZE*1.25}
          />
        </Clickable>
      );
    }

    // Regular tab items
    return (
      <Clickable
        key={route.key}
        onPress={onPress}
        style={styles.tab}
      >
        <IconByVariant
          path={path}
          width={size}
          height={size}
        />
        <CText
          style={[
            styles.label,
            isFocused && { color: colors.primary ,...fonts.bold}
          ]}
        >
          {label}
        </CText>
      </Clickable>
    );
  };

  return (
    // Outer container with transparent background
    <View style={[layout.absolute, {bottom: 10, left: ICON_SIZE, right: ICON_SIZE}]}>
      {/* Inner container with white background and rounded corners */}
      <View style={[
        styles.container, 
        layout.row, 
        layout.justifyBetween,
        layout.itemsCenter,
        gutters.paddingHorizontal_20,
        gutters.marginBottom_10,
        { backgroundColor: colors.white }
      ]}>
        {state.routes.map((route: any, index: number) => renderTab(route, index))}
      </View>
    </View>
  );
};

const getIconPath = (routeName: string, isFocused: boolean) => {
  const iconMap: Record<string, { path: string, size: number, label: string }> = {
    [Paths.HomeTab]:{ path: isFocused ? 'home-active' : 'home', size : ICON_SIZE, label : 'Home' },
    [Paths.RecordingsTab]:{ path: isFocused ? 'recordings-active' : 'recordings', size : ICON_SIZE*1.1, label : 'Recordings' },
    [Paths.ProfileTab]:{ path: isFocused ? 'user-active' : 'user', size : ICON_SIZE*1.25, label : 'Profile' },
  };
  return iconMap[routeName] || { path: 'home', size: ICON_SIZE };
};

const styles = StyleSheet.create({
  container: {
    height: MetricsSizes.BASE80 * 0.8,
    borderRadius: MetricsSizes.BASE80 * 0.4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: MetricsSizes.TINY,
    fontSize: MetricsSizes.SMALL,
  },
  cameraButton: {
    width: MetricsSizes.BASE80,
    height: MetricsSizes.BASE80,
    borderRadius: MetricsSizes.BASE80,
    borderWidth: MetricsSizes.SMALL,
    borderColor: '#BCE4C5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -MetricsSizes.LARGE,
  }
});

export default MainTabBar;
