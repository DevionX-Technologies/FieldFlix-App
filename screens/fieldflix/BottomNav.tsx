import { Paths } from '@/data/paths';
import { FF } from '@/screens/fieldflix/fonts';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

const QR = require('@/assets/fieldflix-web/qr.png');

const ACCENT = '#22C55E';
const ACCENT_DEEP = '#14532d';
const BAR_BG = '#384553';
const INACTIVE = 'rgba(255,255,255,0.72)';

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
            icon={(on) => <HomeIcon active={on} />}
          />
          <NavItem
            label="Sessions"
            active={active === 'sessions'}
            onPress={() => router.push(Paths.sessions)}
            icon={(on) => <SessionsIcon active={on} />}
          />
          {/* spacer for the QR FAB */}
          <View style={styles.centerSpacer} />
          <NavItem
            label="FlickShorts"
            active={active === 'flix'}
            onPress={() => router.push(Paths.flixshorts)}
            icon={(on) => <PlayIcon active={on} />}
          />
          <NavItem
            label="Recordings"
            active={active === 'recordings'}
            onPress={() => router.push(Paths.recordings)}
            icon={(on) => <ShutterIcon active={on} />}
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
/* pill layout: vertical stack (icon on top, label below) */

function HomeIcon({ active }: { active: boolean }) {
  const c = active ? '#fff' : INACTIVE;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 11.5L12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-8.5z"
        stroke={c}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SessionsIcon({ active }: { active: boolean }) {
  const c = active ? '#fff' : INACTIVE;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={7} width={12} height={10} rx={2} stroke={c} strokeWidth={1.9} />
      <Path
        d="M15 10.5l5-2.4a.6.6 0 0 1 .9.5v6.8a.6.6 0 0 1-.9.5L15 13.5"
        stroke={c}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PlayIcon({ active }: { active: boolean }) {
  const c = active ? '#fff' : INACTIVE;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={c} strokeWidth={1.8} />
      <Path d="M10 8.5l6 3.5-6 3.5v-7z" fill={c} />
    </Svg>
  );
}

function ShutterIcon({ active }: { active: boolean }) {
  const c = active ? '#fff' : INACTIVE;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.25} stroke={c} strokeWidth={1.9} />
      <Path
        d="M12 3.75c2 3 2 12.5 0 16.5M3.75 12c3-2 12.5-2 16.5 0M6.2 6.2c3.3.3 10 7 11.6 11.6M6.2 17.8c.3-3.3 7-10 11.6-11.6"
        stroke={c}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </Svg>
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
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
