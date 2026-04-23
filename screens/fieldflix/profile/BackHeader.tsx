import { FF } from '@/screens/fieldflix/fonts';
import { WEB } from '@/screens/fieldflix/webDesign';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

/**
 * Shared header used by every profile sub-screen. Mirrors the identical back +
 * centered title bar that appears in the web profile sub-screen CSS files.
 */
export function BackHeader({
  title,
  onBack,
  bottomBorder = true,
}: {
  title: string;
  onBack?: () => void;
  bottomBorder?: boolean;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pt = Math.max(12, insets.top);

  return (
    <View
      style={[
        styles.header,
        { paddingTop: pt },
        bottomBorder && styles.border,
      ]}
    >
      <Pressable
        accessibilityLabel="Go back"
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
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  border: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'left',
    fontFamily: FF.bold,
    fontSize: 20,
    letterSpacing: -0.3,
    color: WEB.white,
  },
  spacer: {
    width: 44,
  },
});
