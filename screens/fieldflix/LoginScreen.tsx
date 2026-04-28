import { Paths } from "@/data/paths";
import { normalizeMobile } from "@/lib/fieldflix-api";
import { BG } from "@/screens/fieldflix/bundledBackgrounds";
import { gradientPillInner } from "@/screens/fieldflix/fieldflixUi";
import { FF } from "@/screens/fieldflix/fonts";
import { ms, s, sf, vs } from "@/screens/fieldflix/scale";
import { WEB } from "@/screens/fieldflix/webDesign";
import { useShellWidth, WebShell } from "@/screens/fieldflix/WebShell";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

/** Mirrors `web/src/screens/LoginScreen.tsx` layout and dimensions. */
export default function FieldflixLoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const shellW = useShellWidth();
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const cardMax = Math.min(WEB.cardMaxW, shellW - s(48));
  const digits = mobile.replace(/\D/g, "");
  const canSubmit = digits.length >= 10 && !loading;

  const onGetOtp = async () => {
    if (digits.length < 10) {
      Alert.alert("Invalid number", "Enter a valid mobile number.");
      return;
    }
    setLoading(true);
    try {
      router.push({
        pathname: Paths.otp,
        params: { mobile: normalizeMobile(mobile) },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <WebShell backgroundColor="transparent">
      <View style={styles.root}>
        <ImageBackground
          source={BG.login}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          imageStyle={styles.bgImage}
        >
          <LinearGradient
            colors={[
              "rgba(13,40,24,0.75)",
              "rgba(10,31,20,0.5)",
              "rgba(5,10,8,0.65)",
              "rgba(0,0,0,0.92)",
            ]}
            locations={[0, 0.35, 0.65, 1]}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={[
              "rgba(0,0,0,0.4)",
              "rgba(0,0,0,0)",
              "rgba(0,0,0,0)",
              "rgba(0,0,0,0.8)",
            ]}
            locations={[0, 0.25, 0.7, 1]}
            style={StyleSheet.absoluteFill}
          />
        </ImageBackground>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 8 : 0}
        >
          <View
            style={[
              styles.flex,
              styles.authContent,
              {
                paddingBottom: Math.max(vs(12), insets.bottom + vs(8)),
              },
            ]}
          >
            <View style={styles.headlineBlock}>
              <Text
                style={styles.heroTitle}
                numberOfLines={1}
                adjustsFontSizeToFit
                maxFontSizeMultiplier={1.28}
              >
                Level Up Your Game
              </Text>
              <Text style={styles.heroSubtitle} maxFontSizeMultiplier={1.25}>
                Track, analyze, and improve every move
              </Text>
            </View>

            <View style={{ height: vs(28) }} />

            <View style={[styles.card, { maxWidth: cardMax }]}>
              <View style={styles.cardInner}>
                <View style={styles.inputRow}>
                  <Svg
                    width={s(22)}
                    height={s(22)}
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <Path
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      stroke="rgba(255,255,255,0.48)"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                  <TextInput
                    placeholder="Mobile Number"
                    placeholderTextColor="rgba(255,255,255,0.38)"
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    autoCorrect={false}
                    autoCapitalize="none"
                    returnKeyType="done"
                    cursorColor={WEB.white}
                    selectionColor="rgba(255,255,255,0.35)"
                    value={mobile}
                    onChangeText={(v) =>
                      setMobile(v.replace(/[^\d+\-\s()]/g, "").slice(0, 16))
                    }
                    style={styles.input}
                    maxFontSizeMultiplier={1.25}
                    onSubmitEditing={() => {
                      if (canSubmit) {
                        void onGetOtp();
                      }
                    }}
                  />
                </View>

                <Pressable
                  onPress={onGetOtp}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.ctaOuter,
                    pressed && { transform: [{ scale: 0.98 }] },
                  ]}
                >
                  <LinearGradient
                    colors={["#4ade80", "#22c55e"]}
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
                <Text style={styles.footerMuted} maxFontSizeMultiplier={1.2}>
                  Don&apos;t have an account?{" "}
                </Text>
                <Pressable
                  onPress={() => router.push(Paths.signup)}
                  hitSlop={8}
                >
                  <Text style={styles.footerLink} maxFontSizeMultiplier={1.2}>
                    Sign up
                  </Text>
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
    overflow: "hidden",
  },
  /** Slight upward crop keeps subject centered; softer than previous offset. */
  bgImage: {
    width: "100%",
    height: "112%",
    top: "-6%",
    left: 0,
  },
  flex: {
    flex: 1,
  },
  /** Non-scrollable column: KAV resizes this view so content lifts with keyboard. */
  authContent: {
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: s(24),
    paddingTop: vs(24),
  },
  headlineBlock: {
    width: "100%",
    maxWidth: WEB.cardMaxW,
    alignItems: "center",
    paddingHorizontal: s(12),
  },
  heroTitle: {
    width: "100%",
    color: WEB.white,
    fontFamily: FF.displayItalic,
    fontSize: sf(WEB.heroTitleSize),
    lineHeight: sf(Math.round(WEB.heroTitleSize * 1.1)),
    letterSpacing: -0.018 * WEB.heroTitleSize,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.88)",
    textShadowOffset: { width: 0, height: s(2) },
    textShadowRadius: s(12),
    // RN: single shadow; web has green glow — approximate with extra elevation via second line (iOS)
    ...(Platform.OS === "ios"
      ? {
          shadowColor: "rgba(34, 197, 94, 0.45)",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: s(18),
        }
      : { elevation: 4 }),
  },
  heroSubtitle: {
    marginTop: vs(14),
    width: "100%",
    fontFamily: FF.medium,
    fontSize: sf(WEB.subtitleSize),
    lineHeight: sf(Math.round(WEB.subtitleSize * 1.45)),
    letterSpacing: 0.2,
    color: "rgba(255,255,255,0.92)",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.48)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: s(10),
  },
  card: {
    width: "100%",
    borderRadius: ms(WEB.cardRadius, 0.45),
    borderWidth: 1.5,
    borderColor: WEB.cardBorder,
    backgroundColor: WEB.cardBg,
    paddingTop: vs(28),
    paddingBottom: vs(26),
    paddingHorizontal: s(22),
    shadowColor: "rgba(15, 23, 42, 0.8)",
    shadowOffset: { width: 0, height: vs(6) },
    shadowOpacity: 1,
    shadowRadius: s(36),
    elevation: 8,
  },
  cardInner: {
    paddingHorizontal: s(4),
    gap: vs(18),
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(14),
    minHeight: s(WEB.inputHeight),
    borderRadius: WEB.pillRadius,
    paddingHorizontal: s(18),
    paddingVertical: Platform.OS === "android" ? vs(2) : 0,
    backgroundColor: WEB.inputBg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    shadowColor: "rgba(0,0,0,0.35)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.55,
    shadowRadius: s(8),
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: FF.regular,
    fontSize: sf(16),
    color: WEB.white,
    paddingVertical: Platform.OS === "ios" ? vs(2) : 0,
  },
  ctaOuter: {
    width: "100%",
    borderRadius: WEB.pillRadius,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "rgba(34, 197, 94, 0.28)",
    shadowOffset: { width: 0, height: vs(4) },
    shadowOpacity: 1,
    shadowRadius: s(14),
    elevation: 6,
  },
  ctaDisabled: {
    opacity: 0.9,
  },
  ctaGradient: {
    minHeight: s(WEB.btnPrimaryH),
    ...gradientPillInner,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    fontFamily: FF.bold,
    fontSize: sf(17),
    letterSpacing: 0.3,
    color: WEB.white,
  },
  footerRow: {
    marginTop: vs(40),
    paddingHorizontal: s(8),
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: s(2),
  },
  footerMuted: {
    fontFamily: FF.medium,
    fontSize: sf(15),
    color: WEB.subtitleLogin,
  },
  footerLink: {
    fontFamily: FF.bold,
    fontSize: sf(15),
    color: WEB.green,
  },
});
