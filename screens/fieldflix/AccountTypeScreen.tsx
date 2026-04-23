import { Paths } from '@/data/paths';
import { getAccountType, setAccountType } from '@/lib/fieldflix-account-type';
import { FF } from '@/screens/fieldflix/fonts';
import { WebShell, useShellWidth } from '@/screens/fieldflix/WebShell';
import { BG } from '@/screens/fieldflix/bundledBackgrounds';
import { WEB } from '@/screens/fieldflix/webDesign';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const WORD_LOGO = require('@/assets/fieldflix-web/fieldflix_word_logo.jpeg');

/** Same as `web/src/screens/AccountTypeScreen.tsx` — design width 402px reference. */
const DESIGN_W = 402;

/** Must match `styles.scroll.paddingHorizontal` — column width accounts for this so the row does not overflow the padded area (which looked “shifted left” on LTR). */
const SCROLL_H_PAD = 12;

const ACCENT = '#39d353';
const ACCENT_SOFT = '#22c55e';

export default function FieldflixAccountTypeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const shellW = useShellWidth();
  /** Width available inside horizontal padding: cap at design max. */
  const columnW = Math.min(DESIGN_W, shellW - 2 * SCROLL_H_PAD);
  const [selected, setSelected] = useState<'public' | 'private'>('public');
  const [saving, setSaving] = useState(false);

  // Hydrate from previously saved preference if any (used when editing from settings).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const v = await getAccountType();
      if (!cancelled && v) setSelected(v);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onContinue = async () => {
    setSaving(true);
    try {
      await setAccountType(selected);
    } finally {
      setSaving(false);
      router.replace(Paths.home);
    }
  };

  return (
    <WebShell backgroundColor="transparent">
      <View style={styles.root}>
        <ImageBackground
          source={BG.accountType}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          imageStyle={styles.bgImage}
        >
          {/* Matches web: linear scrim */}
          <LinearGradient
            colors={[
              'rgba(0,8,24,0.55)',
              'rgba(0,0,0,0.2)',
              'rgba(0,0,0,0.4)',
              'rgba(0,0,0,0.88)',
            ]}
            locations={[0, 0.38, 0.62, 1]}
            style={StyleSheet.absoluteFill}
          />
        </ImageBackground>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: Math.max(insets.top, 12) + 16, paddingBottom: Math.max(insets.bottom, 20) + 12 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.column, { width: columnW }]}>
            <Image source={WORD_LOGO} style={styles.logo} resizeMode="contain" />

            <View style={styles.titleBlock}>
              <Text style={styles.title}>Choose your account type</Text>
              <Text style={styles.subtitle}>Select your preference</Text>
            </View>

            <View style={styles.cardsRow}>
              <AccountCard
                variant="public"
                selected={selected === 'public'}
                onPress={() => setSelected('public')}
              />
              <AccountCard
                variant="private"
                selected={selected === 'private'}
                onPress={() => setSelected('private')}
              />
            </View>

            <View style={styles.ctaBlock}>
              <Pressable
                onPress={onContinue}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel="Continue"
                style={({ pressed }) => [
                  styles.continueBtn,
                  pressed && { transform: [{ scale: 0.98 }] },
                ]}
              >
                <LinearGradient
                  colors={['#4ade80', '#22c55e']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.continueGradient}
                >
                  <Text style={styles.continueText}>Continue</Text>
                </LinearGradient>
              </Pressable>
              <Text style={styles.hint}>You can change this later in settings</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </WebShell>
  );
}

function AccountCard({
  variant,
  selected,
  onPress,
}: {
  variant: 'public' | 'private';
  selected: boolean;
  onPress: () => void;
}) {
  const isPublic = variant === 'public';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={isPublic ? 'Public account' : 'Private account'}
      style={({ pressed }) => [
        styles.card,
        selected ? styles.cardSelectedShadow : null,
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      {/* backdrop fill with its own clip (prevents bleed on Android) */}
      <View
        style={[
          styles.cardFill,
          selected ? styles.cardFillSelected : styles.cardFillIdle,
        ]}
        pointerEvents="none"
      >
        {selected ? (
          <LinearGradient
            colors={[
              'rgba(57,211,83,0.55)',
              'rgba(34,197,94,0.28)',
              'rgba(12,32,20,0.1)',
            ]}
            locations={[0, 0.55, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
      </View>

      {/* crisp rounded border overlay — always fully visible on all 4 sides */}
      <View
        style={[
          styles.cardBorder,
          selected ? styles.cardBorderSelected : styles.cardBorderIdle,
        ]}
        pointerEvents="none"
      />

      {selected ? (
        <View style={styles.checkDot} pointerEvents="none">
          <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
            <Path
              d="M5 13l4 4L19 7"
              stroke="#fff"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
      ) : null}

      {/* Web: inner flex col justify-center px-3 py-6; content max-w 148px gap-3 */}
      <View style={styles.cardInnerWrap}>
        <View style={styles.cardInner}>
          <View style={styles.iconCircle}>
            {isPublic ? (
              <Svg width={42} height={42} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                  stroke={ACCENT}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            ) : (
              <Svg width={42} height={42} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  stroke="#9ca3af"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            )}
          </View>

          <Text style={styles.cardLabel}>
            {isPublic ? 'Public Account' : 'Private Account'}
          </Text>

          <Text style={styles.cardBody}>
            {isPublic
              ? 'Anyone can view your highlights and profile'
              : 'This content can be accessed by you and all shared members'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bgImage: {
    /* ~ object-position: center 28% (web img) */
    width: '100%',
    height: '118%',
    top: '-9%',
    left: 0,
  },
  scrollView: { flex: 1 },
  scroll: {
    flexGrow: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SCROLL_H_PAD,
  },
  column: {
    alignSelf: 'center',
    alignItems: 'center',
    gap: 32,
  },
  logo: {
    width: '100%',
    height: 60,
    maxWidth: 280,
  },
  titleBlock: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  title: {
    fontFamily: FF.bold,
    fontSize: 26,
    lineHeight: 32,
    color: WEB.white,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 8,
    fontFamily: FF.regular,
    fontSize: 14,
    color: '#e5e5e5',
    textAlign: 'center',
  },
  cardsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 16,
    width: '100%',
  },
  card: {
    flex: 1,
    height: 236,
    minWidth: 0,
    borderRadius: 40,
    position: 'relative',
  },
  cardInnerWrap: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 40,
    overflow: 'hidden',
  },
  cardFillIdle: {
    backgroundColor: 'rgba(12,14,18,0.58)',
  },
  cardFillSelected: {
    backgroundColor: 'rgba(8,22,14,0.55)',
  },
  cardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 40,
  },
  cardBorderIdle: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cardBorderSelected: {
    borderWidth: 2.5,
    borderColor: ACCENT,
  },
  cardSelectedShadow: {
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 34,
    elevation: 12,
  },
  checkDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowColor: ACCENT,
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 4,
  },
  cardInner: {
    width: '100%',
    maxWidth: 148,
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    height: 42,
    width: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontFamily: FF.bold,
    fontSize: 15,
    lineHeight: 20,
    color: WEB.white,
    textAlign: 'center',
    width: '100%',
  },
  cardBody: {
    fontFamily: FF.regular,
    fontSize: 11,
    lineHeight: 16,
    color: '#c8c8c8',
    textAlign: 'center',
    width: '100%',
  },
  ctaBlock: {
    alignSelf: 'stretch',
    width: '100%',
    gap: 10,
    alignItems: 'stretch',
    marginTop: 8,
  },
  continueBtn: {
    alignSelf: 'stretch',
    width: '100%',
    height: 54,
    borderRadius: 999,
    shadowColor: ACCENT_SOFT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 10,
  },
  continueGradient: {
    height: 54,
    width: '100%',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  continueText: {
    fontFamily: FF.bold,
    fontSize: 17,
    color: WEB.white,
    letterSpacing: 0.2,
  },
  hint: {
    textAlign: 'center',
    fontFamily: FF.regular,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.9)',
  },
});
