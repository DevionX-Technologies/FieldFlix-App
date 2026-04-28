import { FF } from '@/screens/fieldflix/fonts';
import { WEB } from '@/screens/fieldflix/webDesign';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/** Total toolbar height below the root safe area — fixed so every screen measures identically. */
export const FIELD_FLIX_HEADER_HEIGHT = 52;

export type FieldflixScreenHeaderProps = {
  title: string;
  /** Defaults to `router.back()`. Use e.g. `() => router.push(Paths.home)` for profile root. */
  onBack?: () => void;
  backAccessibilityLabel?: string;
};

/** Shared top bar: same layout as Notifications (`paddingTop` excludes safe area — root `SafeAreaView` applies inset). */
export function FieldflixScreenHeader({
  title,
  onBack,
  backAccessibilityLabel = 'Go back',
}: FieldflixScreenHeaderProps) {
  const router = useRouter();
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel={backAccessibilityLabel}
        onPress={onBack ?? (() => router.back())}
        style={styles.backBtn}
        hitSlop={10}
      >
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
          <Path
            d="M15 19l-7-7 7-7"
            stroke="#fff"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: FIELD_FLIX_HEADER_HEIGHT,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  headerTitle: {
    flex: 1,
    minWidth: 0,
    fontFamily: FF.bold,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.25,
    color: WEB.white,
    textAlignVertical: Platform.OS === 'android' ? 'center' : undefined,
    ...Platform.select({
      android: { includeFontPadding: false },
      default: {},
    }),
  },
});
