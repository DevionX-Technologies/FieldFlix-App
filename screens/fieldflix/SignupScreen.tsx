import { Paths } from '@/data/paths';
import { normalizeMobile } from '@/lib/fieldflix-api';
import { FF } from '@/screens/fieldflix/fonts';
import { useShellWidth, WebShell } from '@/screens/fieldflix/WebShell';
import { BG } from '@/screens/fieldflix/bundledBackgrounds';
import { gradientPillInner } from '@/screens/fieldflix/fieldflixUi';
import { WEB } from '@/screens/fieldflix/webDesign';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

/** Mirrors `web/src/screens/SignupScreen.tsx` — `/image15.jpeg` background + vignette. */
export default function FieldflixSignupScreen() {
  const router = useRouter();
  const shellW = useShellWidth();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);

  const vh = Dimensions.get('window').height;
  /** Web uses ~40vh; pull 40px up vs previous mobile layout so hero + form fit without scrolling. */
  const spacerTop = Math.max(0, vh * 0.4 - 40);
  const cardMax = Math.min(WEB.cardMaxW, shellW - 48);

  const onContinue = async () => {
    if (name.trim().length < 2) {
      Alert.alert('Name', 'Please enter your name.');
      return;
    }
    const digits = mobile.replace(/\D/g, '');
    if (digits.length < 10) {
      Alert.alert('Invalid number', 'Enter a valid mobile number.');
      return;
    }
    setLoading(true);
    try {
      router.push({
        pathname: Paths.otp,
        params: {
          mobile: normalizeMobile(mobile),
          displayName: name.trim(),
          isSignup: '1',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <WebShell backgroundColor="transparent">
      <View style={styles.root}>
        <ImageBackground
          source={BG.signup}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          imageStyle={styles.bgImage}
        >
          <LinearGradient
            colors={['rgba(30,41,59,0.55)', 'rgba(66,32,6,0.35)', 'rgba(15,23,42,0.6)', 'rgba(2,6,23,0.92)']}
            locations={[0, 0.35, 0.7, 1]}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.85)']}
            locations={[0, 0.4, 0.6, 1]}
            style={StyleSheet.absoluteFill}
          />
        </ImageBackground>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <View
            style={[
              styles.page,
              { paddingBottom: Math.max(16, insets.bottom) },
            ]}
          >
            <View style={{ height: spacerTop }} />

            <View style={styles.headlineBlock}>
              <Text style={styles.heroTitle} numberOfLines={1} adjustsFontSizeToFit>
                Create Your Account
              </Text>
              <Text style={styles.heroSubtitle}>Start tracking your performance today</Text>
            </View>

            <View style={{ height: 32 }} />

            <View style={[styles.card, { maxWidth: cardMax }]}>
              <View style={styles.cardInner}>
                <View style={styles.inputRow}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <Path
                      stroke="rgba(255,255,255,0.4)"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </Svg>
                  <TextInput
                    placeholder="Full Name"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    autoComplete="name"
                    value={name}
                    onChangeText={setName}
                    style={styles.input}
                  />
                </View>

                <View style={styles.inputRow}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      stroke="rgba(255,255,255,0.4)"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                  <TextInput
                    placeholder="Mobile Number"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    value={mobile}
                    onChangeText={setMobile}
                    style={styles.input}
                  />
                </View>

                <Pressable
                  onPress={onContinue}
                  disabled={loading}
                  style={({ pressed }) => [styles.ctaOuter, pressed && { transform: [{ scale: 0.98 }] }]}
                >
                  <LinearGradient
                    colors={['#4ade80', '#22c55e']}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={styles.ctaGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.ctaText}>Get OTP</Text>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>

              <View style={styles.footerRow}>
                <Text style={styles.footerMuted}>Already have an account? </Text>
                <Pressable onPress={() => router.push(Paths.login)} hitSlop={8}>
                  <Text style={styles.footerLink}>Log in</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </WebShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  /** Match login: shift background crop upward without moving UI. */
  bgImage: {
    width: '100%',
    height: '118%',
    top: '-10%',
    left: 0,
  },
  flex: { flex: 1 },
  page: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  headlineBlock: {
    width: '100%',
    maxWidth: WEB.cardMaxW,
    alignItems: 'center',
  },
  heroTitle: {
    width: '100%',
    color: WEB.white,
    fontFamily: FF.displayItalic,
    fontSize: WEB.heroTitleSize,
    lineHeight: WEB.heroTitleSize,
    letterSpacing: -0.02 * WEB.heroTitleSize,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: 'rgba(34, 197, 94, 0.6)',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 20,
        }
      : { elevation: 4 }),
  },
  heroSubtitle: {
    marginTop: 16,
    fontFamily: FF.medium,
    fontSize: WEB.subtitleSize,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 12,
  },
  card: {
    width: '100%',
    borderRadius: WEB.cardRadius,
    borderWidth: 2,
    borderColor: WEB.cardBorder,
    backgroundColor: WEB.cardBg,
    paddingTop: 32,
    paddingBottom: 32,
    paddingHorizontal: 16,
    marginBottom: 0,
    shadowColor: WEB.cardShadow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 8,
  },
  cardInner: {
    paddingHorizontal: 20,
    gap: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    height: WEB.inputHeight,
    borderRadius: WEB.pillRadius,
    paddingHorizontal: 20,
    backgroundColor: WEB.inputBg,
    borderWidth: 1.2,
    borderColor: WEB.inputBorder,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: FF.regular,
    fontSize: 16,
    color: WEB.white,
    paddingVertical: 0,
  },
  ctaOuter: {
    width: '100%',
    borderRadius: WEB.pillRadius,
    overflow: 'hidden',
    shadowColor: 'rgba(34, 197, 94, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 6,
  },
  ctaGradient: {
    height: WEB.btnPrimaryH,
    ...gradientPillInner,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: FF.bold,
    fontSize: 17,
    color: WEB.white,
  },
  footerRow: {
    marginTop: 48,
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerMuted: {
    fontFamily: FF.medium,
    fontSize: 15,
    color: WEB.subtitleLogin,
  },
  footerLink: {
    fontFamily: FF.bold,
    fontSize: 15,
    color: WEB.green,
  },
});
