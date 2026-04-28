import { Paths } from "@/data/paths";
import { useCustomModal } from "@/hooks/useCustomModal";
import { normalizeMobile } from "@/lib/fieldflix-api";
import { BG } from "@/screens/fieldflix/bundledBackgrounds";
import { gradientPillInner } from "@/screens/fieldflix/fieldflixUi";
import { FF } from "@/screens/fieldflix/fonts";
import { s, sf, vs } from "@/screens/fieldflix/scale";
import { WEB } from "@/screens/fieldflix/webDesign";
import { useShellWidth, WebShell } from "@/screens/fieldflix/WebShell";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

/** Mirrors `web/src/screens/SignupScreen.tsx` — `/image15.jpeg` background + vignette. */
export default function FieldflixSignupScreen() {
  const router = useRouter();
  const { ModalComponent, showError } = useCustomModal();
  const shellW = useShellWidth();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<"name" | "mobile" | null>(
    null,
  );
  const mobileInputRef = useRef<TextInput | null>(null);
  const cardMax = Math.min(WEB.cardMaxW, shellW - s(48));
  const digits = mobile.replace(/\D/g, "");
  const canSubmit = name.trim().length >= 2 && digits.length >= 10 && !loading;

  const onContinue = async () => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      showError("Name required", "Please enter your full name.");
      return;
    }
    if (digits.length < 10) {
      showError("Invalid number", "Enter a valid 10-digit mobile number.");
      return;
    }
    setLoading(true);
    try {
      router.push({
        pathname: Paths.otp,
        params: {
          mobile: normalizeMobile(mobile),
          displayName: trimmedName,
          isSignup: "1",
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const onPrimaryPressIn = () => {
    if (canSubmit) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
            colors={[
              "rgba(0,0,0,0.98)",
              "rgba(0,0,0,0.9)",
              "rgba(0,0,0,0.0)",
              "rgba(0,0,0,0.0)",
            ]}
            locations={[0, 0.4, 0.5, 1]}
            start={{ x: 0.5, y: 1 }}
            end={{ x: 0.5, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </ImageBackground>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
          keyboardVerticalOffset={
            Platform.OS === "ios" ? insets.top + vs(8) : vs(12)
          }
        >
          <TouchableWithoutFeedback
            onPress={Keyboard.dismiss}
            accessible={false}
          >
            <View
              style={[
                styles.flex,
                styles.page,
                {
                  paddingBottom: Math.max(vs(20), insets.bottom + vs(18)),
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
                  Create Your Account
                </Text>
                <Text style={styles.heroSubtitle} maxFontSizeMultiplier={1.25}>
                  Start tracking your performance today
                </Text>
              </View>

              <View style={styles.headlineSpacer} />

              <View style={[styles.cardShell, { maxWidth: cardMax }]}>
                <View style={styles.card}>
                  <View style={styles.formPill}>
                    <Text style={styles.formPillText}>Quick Onboarding</Text>
                  </View>
                  {/* <Text style={styles.formTitle} maxFontSizeMultiplier={1.2}>
                    Set up your profile
                  </Text> */}
                  <Text style={styles.formSubtitle} maxFontSizeMultiplier={1.2}>
                    Add your details to create your account
                  </Text>

                  <View style={styles.cardInner}>
                    <View
                      style={[
                        styles.inputRow,
                        focusedField === "name" && styles.inputRowFocused,
                      ]}
                    >
                      <Svg
                        width={s(22)}
                        height={s(22)}
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <Path
                          stroke="rgba(255,255,255,0.48)"
                          strokeWidth={1.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </Svg>
                      <TextInput
                        placeholder="Full Name"
                        placeholderTextColor="rgba(255,255,255,0.38)"
                        autoComplete="name"
                        autoCorrect={false}
                        autoCapitalize="words"
                        returnKeyType="next"
                        cursorColor={WEB.white}
                        selectionColor="rgba(255,255,255,0.35)"
                        value={name}
                        onChangeText={setName}
                        onFocus={() => setFocusedField("name")}
                        onBlur={() => setFocusedField(null)}
                        style={styles.input}
                        maxFontSizeMultiplier={1.25}
                        onSubmitEditing={() => mobileInputRef.current?.focus()}
                        blurOnSubmit={false}
                      />
                    </View>

                    <View
                      style={[
                        styles.inputRow,
                        focusedField === "mobile" && styles.inputRowFocused,
                      ]}
                    >
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
                        ref={mobileInputRef}
                        onChangeText={(v) =>
                          setMobile(v.replace(/[^\d+\-\s()]/g, "").slice(0, 16))
                        }
                        onFocus={() => setFocusedField("mobile")}
                        onBlur={() => setFocusedField(null)}
                        style={styles.input}
                        maxFontSizeMultiplier={1.25}
                        onSubmitEditing={() => {
                          if (canSubmit) {
                            void onContinue();
                          }
                        }}
                        blurOnSubmit
                      />
                    </View>

                    <Pressable
                      onPress={onContinue}
                      onPressIn={onPrimaryPressIn}
                      disabled={!canSubmit}
                      android_ripple={{ color: "rgba(255,255,255,0.12)" }}
                      style={({ pressed }) => [
                        styles.ctaOuter,
                        !canSubmit && styles.ctaDisabled,
                        pressed && canSubmit && styles.ctaPressed,
                      ]}
                    >
                      {({ pressed }) => (
                        <LinearGradient
                          colors={
                            pressed && canSubmit
                              ? ["#22c55e", "#169a46"]
                              : ["#4ade80", "#22c55e"]
                          }
                          start={{ x: 0.5, y: 0 }}
                          end={{ x: 0.5, y: 1 }}
                          style={[
                            styles.ctaGradient,
                            pressed && canSubmit && styles.ctaGradientPressed,
                          ]}
                        >
                          {pressed && canSubmit ? (
                            <View style={styles.ctaPressedOverlay} />
                          ) : null}
                          {loading ? (
                            <ActivityIndicator color="#fff" />
                          ) : (
                            <Text
                              style={[
                                styles.ctaText,
                                pressed && canSubmit && styles.ctaTextPressed,
                              ]}
                            >
                              Get OTP
                            </Text>
                          )}
                        </LinearGradient>
                      )}
                    </Pressable>
                  </View>

                  <View style={styles.footerRow}>
                    <Text
                      style={styles.footerMuted}
                      maxFontSizeMultiplier={1.2}
                    >
                      Already have an account?{" "}
                    </Text>
                    <Pressable
                      onPress={() => router.push(Paths.login)}
                      hitSlop={8}
                    >
                      <Text
                        style={styles.footerLink}
                        maxFontSizeMultiplier={1.2}
                      >
                        Log in
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
        {ModalComponent}
      </View>
    </WebShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: "hidden",
  },
  /** Match login: shift background crop upward without moving UI. */
  bgImage: {
    width: "100%",
    height: "112%",
    top: "-6%",
    left: 0,
  },
  flex: { flex: 1 },
  page: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: s(20),
    paddingTop: vs(18),
  },
  cardShell: {
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 2,
    marginBottom: vs(10),
  },
  headlineBlock: {
    width: "100%",
    maxWidth: WEB.cardMaxW,
    alignItems: "center",
    paddingHorizontal: s(12),
  },
  headlineSpacer: {
    height: vs(18),
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
    marginTop: vs(10),
    width: "100%",
    fontFamily: FF.medium,
    fontSize: sf(WEB.subtitleSize),
    lineHeight: sf(Math.round(WEB.subtitleSize * 1.35)),
    letterSpacing: 0.2,
    color: "rgba(255,255,255,0.92)",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.48)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: s(10),
  },
  card: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.26)",
    backgroundColor: "rgba(6, 15, 30, 0.72)",
    paddingTop: vs(18),
    paddingBottom: vs(18),
    paddingHorizontal: s(16),
    shadowColor: "rgba(15, 23, 42, 0.8)",
    shadowOffset: { width: 0, height: vs(6) },
    shadowOpacity: 0.55,
    shadowRadius: s(22),
    elevation: 6,
  },
  cardInner: {
    marginTop: vs(14),
    paddingHorizontal: 0,
    gap: vs(12),
  },
  formPill: {
    alignSelf: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(167,243,208,0.35)",
    backgroundColor: "rgba(13, 26, 34, 0.65)",
    paddingHorizontal: s(14),
    paddingVertical: vs(5),
  },
  formPillText: {
    fontFamily: FF.semiBold,
    fontSize: sf(11),
    color: "rgba(187,247,208,0.92)",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  formTitle: {
    fontFamily: FF.bold,
    fontSize: sf(21),
    lineHeight: sf(26),
    color: WEB.white,
    textAlign: "center",
    letterSpacing: 0.2,
  },
  formSubtitle: {
    marginTop: vs(8),
    fontFamily: FF.medium,
    fontSize: sf(14),
    lineHeight: sf(19),
    color: "rgba(255,255,255,0.78)",
    textAlign: "center",
    letterSpacing: 0.15,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(12),
    minHeight: 50,
    borderRadius: 12,
    paddingHorizontal: s(14),
    paddingVertical: Platform.OS === "android" ? vs(2) : 0,
    backgroundColor: WEB.inputBg,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.28)",
    shadowColor: "rgba(0,0,0,0.35)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: s(6),
  },
  inputRowFocused: {
    borderColor: "rgba(74,222,128,0.72)",
    shadowColor: "rgba(34,197,94,0.45)",
    shadowOpacity: 0.85,
    shadowRadius: s(12),
    elevation: 5,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: FF.regular,
    fontSize: sf(16),
    color: WEB.white,
    paddingVertical: Platform.OS === "ios" ? vs(3) : vs(1),
  },
  ctaOuter: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "rgba(34, 197, 94, 0.28)",
    shadowOffset: { width: 0, height: vs(4) },
    shadowOpacity: 0.65,
    shadowRadius: s(10),
    elevation: 5,
  },
  ctaDisabled: {
    opacity: 0.55,
    shadowOpacity: 0.2,
    elevation: 0,
  },
  ctaPressed: {
    transform: [{ scale: 0.965 }, { translateY: 2 }],
    shadowOpacity: 0.35,
    shadowRadius: s(6),
    elevation: 1,
  },
  ctaGradient: {
    minHeight: 50,
    ...gradientPillInner,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaGradientPressed: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  ctaPressedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  ctaText: {
    fontFamily: FF.bold,
    fontSize: sf(16),
    letterSpacing: 0.3,
    color: WEB.white,
  },
  ctaTextPressed: {
    opacity: 0.92,
  },
  footerRow: {
    marginTop: vs(22),
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
