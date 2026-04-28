import { Paths } from '@/data/paths';
import { FF } from '@/screens/fieldflix/fonts';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import type { ImageSourcePropType } from 'react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const QR = require('@/assets/fieldflix-web/qr.png');
const NAV_HOME = require('@/Home.png');
const NAV_SESSION = require('@/Session.png');
const NAV_FLICKSHORTS = require('@/Flickshorts.png');
const NAV_RECORDINGS = require('@/Recordings.png');

const ACCENT = '#22C55E';
const ACCENT_DEEP = '#14532d';
const BAR_BG = '#384553';
const INACTIVE = 'rgba(255,255,255,0.72)';
/** Solid tint for inactive Home (asset is green fill); outline tabs use native gray from PNG when idle. */
const INACTIVE_HOME_TINT = '#9ca3af';

type Tab = 'home' | 'sessions' | 'flix' | 'recordings';

/**
 * Floating pill bottom nav (see screenshot attached in the brief).
 * - Dark rounded bar detached from screen edges.
 * - QR FAB is a separately-positioned circle that sits above the bar.
 * - Active nav item becomes a solid green pill wrapping the icon + label.
 */
export function FieldflixBottomNav({
  active,
  centerAction = 'scan',
}: {
  active: Tab;
  centerAction?: 'scan';
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomGap = Math.max(14, insets.bottom + 6);

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: bottomGap }]}>
      <View style={styles.barShadow}>
        <View style={styles.bar}>
          <NavItem
            label="Home"
            active={active === 'home'}
            onPress={() => router.push(Paths.home)}
            icon={(on) => (
              <NavRasterIcon source={NAV_HOME} active={on} variant="home" />
            )}
          />
          <NavItem
            label="Sessions"
            active={active === 'sessions'}
            onPress={() => router.push(Paths.sessions)}
            icon={(on) => (
              <NavRasterIcon source={NAV_SESSION} active={on} variant="outline" />
            )}
          />
          {/* spacer for the QR FAB */}
          <View style={styles.centerSpacer} />
          <NavItem
            label="FlickShorts"
            active={active === 'flix'}
            onPress={() => router.push(Paths.flixshorts)}
            icon={(on) => (
              <NavRasterIcon source={NAV_FLICKSHORTS} active={on} variant="outline" />
            )}
          />
          <NavItem
            label="Recordings"
            active={active === 'recordings'}
            onPress={() => router.push(Paths.recordings)}
            icon={(on) => (
              <NavRasterIcon source={NAV_RECORDINGS} active={on} variant="outline" />
            )}
          />
        </View>
      </View>

      <Pressable
        accessibilityLabel="Scan QR code"
        onPress={() => centerAction === 'scan' && router.push(Paths.scan)}
        style={[styles.fab, { bottom: bottomGap + 40 }]}
      >
        <Image source={QR} style={{ width: 30, height: 30 }} contentFit="contain" />
      </Pressable>
    </View>
  );
}

function NavItem({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: (active: boolean) => ReactNode;
  active?: boolean;
  onPress: () => void;
}) {
  const isActive = !!active;
  return (
    <Pressable onPress={onPress} style={styles.slot} hitSlop={4}>
      <View style={[styles.pill, isActive && styles.pillActive]}>
        <View style={styles.iconBox}>{icon(isActive)}</View>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          allowFontScaling={false}
          style={[styles.label, isActive ? styles.labelActive : styles.labelIdle]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function NavRasterIcon({
  source,
  active,
  variant,
}: {
  source: ImageSourcePropType;
  active: boolean;
  variant: 'home' | 'outline';
}) {
  const tintColor =
    variant === 'home'
      ? active
        ? undefined
        : INACTIVE_HOME_TINT
      : active
        ? ACCENT
        : undefined;

  return (
    <Image
      source={source}
      style={[styles.navIcon, tintColor != null ? { tintColor } : null]}
      contentFit="contain"
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    paddingHorizontal: 14,
  },
  barShadow: {
    borderRadius: 38,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 22,
    elevation: 14,
  },
  bar: {
    height: 76,
    borderRadius: 38,
    backgroundColor: BAR_BG,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  slot: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  centerSpacer: { width: 60 },
  pill: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
    width: '100%',
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderRadius: 32,
    gap: 3,
  },
  pillActive: {
    backgroundColor: ACCENT_DEEP,
    paddingHorizontal: 6,
  },
  iconBox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIcon: {
    width: 24,
    height: 24,
  },
  label: {
    fontFamily: FF.semiBold,
    fontSize: 10.5,
    letterSpacing: 0,
    textAlign: 'center',
    width: '100%',
    includeFontPadding: false as unknown as boolean,
  },
  labelActive: { color: '#fff' },
  labelIdle: { color: INACTIVE },
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 14,
    borderWidth: 4,
    borderColor: 'rgba(5,10,14,0.95)',
  },
});
