import { Paths } from "@/data/paths";
import {
  getFieldflixApiErrorMessage,
  sendOtp,
  verifyOtp,
} from "@/lib/fieldflix-api";
import { BG } from "@/screens/fieldflix/bundledBackgrounds";
import { gradientPillInner } from "@/screens/fieldflix/fieldflixUi";
import { FF } from "@/screens/fieldflix/fonts";
import { ms, s, SCREEN_H, sf, vs } from "@/screens/fieldflix/scale";
import { WEB } from "@/screens/fieldflix/webDesign";
import { useShellWidth, WebShell } from "@/screens/fieldflix/WebShell";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  CodeField,
  Cursor,
  useBlurOnFulfill,
  useClearByFocusCell,
} from "react-native-confirmation-code-field";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CELL_COUNT = 6;

/** One in-flight `sendOtp` per mobile — blocks Strict Mode double effects and rapid retries until it finishes. */
const sendOtpInFlightByMobile = new Map<string, Promise<void>>();

function runSerializedSendOtp(
  mobile: string,
  task: () => Promise<void>,
): Promise<void> {
  const existing = sendOtpInFlightByMobile.get(mobile);
  if (existing) return existing;
  const p = (async () => {
    try {
      await task();
    } finally {
      sendOtpInFlightByMobile.delete(mobile);
    }
  })();
  sendOtpInFlightByMobile.set(mobile, p);
  return p;
}

function maskIndianMobile(mobile: string | undefined): string {
  if (!mobile) return "+91 XXXXXXXXXX";
  const d = mobile.replace(/\D/g, "");
  const last10 = d.length >= 10 ? d.slice(-10) : d;
  if (last10.length < 10) return "+91 XXXXXXXXXX";
  return `+91 ${"X".repeat(6)}${last10.slice(-4)}`;
}

/** Mirrors `web/src/screens/OtpScreen.tsx` — `/image16.png` background + vignette. */
export default function FieldflixOtpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mobile, isSignup } = useLocalSearchParams<{
    mobile: string;
    isSignup?: string;
  }>();
  const shellW = useShellWidth();
  const [value, setValue] = useState("");
  const [timer, setTimer] = useState(90);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [smsSending, setSmsSending] = useState(true);
  /** Blocks a second mount-triggered send for the same `mobile` until the countdown finishes (then use Resend). */
  const mountSendIssuedRef = useRef(false);
  const prevMobileParam = useRef<string | undefined>(undefined);

  const ref = useBlurOnFulfill({ value, cellCount: CELL_COUNT });
  const [clearProps, getCellOnLayoutHandler] = useClearByFocusCell({
    value,
    setValue,
  });

  const panelMax = Math.min(s(WEB.cardMaxW), shellW - s(40));
  /** Panel outer width when full-bleed inside `content` horizontal padding. */
  const panelOuterW = Math.min(panelMax, shellW - s(48));
  /** Inner width for OTP row (panel horizontal padding `styles.panel`). */
  const panelPadX = s(18) * 2;
  const otpRowInnerW = Math.max(0, panelOuterW - panelPadX);
  const maxGap = s(8);
  const idealBoxW = s(WEB.otpBoxW);
  const minBoxW = 24;
  let cellGap = maxGap;
  let boxW = Math.min(
    idealBoxW,
    Math.max(
      minBoxW,
      Math.floor((otpRowInnerW - cellGap * (CELL_COUNT - 1)) / CELL_COUNT),
    ),
  );
  for (
    let i = 0;
    i < 40 && CELL_COUNT * boxW + cellGap * (CELL_COUNT - 1) > otpRowInnerW;
    i++
  ) {
    if (cellGap > 2) cellGap -= 1;
    else if (boxW > minBoxW) boxW -= 1;
    else break;
  }
  const otpRowMax = CELL_COUNT * boxW + cellGap * (CELL_COUNT - 1);
  const boxH = Math.round(boxW * (WEB.otpBoxH / WEB.otpBoxW));
  const topSpacer = SCREEN_H * 0.12;

  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  useEffect(() => {
    if (!mobile) return;
    if (prevMobileParam.current !== mobile) {
      prevMobileParam.current = mobile;
      mountSendIssuedRef.current = false;
    }
  }, [mobile]);

  /** When the timer completes, allow one mount send again if the user re-enters OTP for the same number. */
  useEffect(() => {
    if (timer === 0) {
      mountSendIssuedRef.current = false;
    }
  }, [timer]);

  /** Server sends SMS via Fast2SMS (DLT) when this screen mounts — at most once per countdown cycle per `mobile`. */
  useEffect(() => {
    let cancelled = false;
    if (!mobile) return;
    if (mountSendIssuedRef.current) return;
    mountSendIssuedRef.current = true;

    void runSerializedSendOtp(mobile, async () => {
      try {
        setSmsSending(true);
        await sendOtp(mobile);
      } catch (e: unknown) {
        if (!cancelled) {
          Alert.alert(
            "Phone verification",
            getFieldflixApiErrorMessage(e, "Could not send SMS"),
          );
        }
      } finally {
        if (!cancelled) setSmsSending(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [mobile]);

  useEffect(() => {
    if (smsSending) return;
    const id = setTimeout(() => ref.current?.focus(), 120);
    return () => clearTimeout(id);
  }, [smsSending]); // eslint-disable-line react-hooks/exhaustive-deps -- ref from useBlurOnFulfill is stable

  const formatTime = (sec: number) => {
    const min = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const sPart = (sec % 60).toString().padStart(2, "0");
    return `${min}:${sPart}`;
  };

  const submit = async (code: string) => {
    if (code.length !== CELL_COUNT) return;
    if (!mobile) {
      Alert.alert("Session expired", "Go back and enter your number again.");
      return;
    }
    if (smsSending) {
      Alert.alert("Please wait", "Sending SMS…");
      return;
    }
    setSubmitting(true);
    try {
      const res = await verifyOtp(mobile, code);
      await SecureStore.setItemAsync("token", res.token);
      if (isSignup === "1") {
        router.replace(Paths.accountType);
      } else {
        router.replace(Paths.home);
      }
    } catch (e: unknown) {
      Alert.alert(
        "Error",
        getFieldflixApiErrorMessage(e, "Verification failed"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onCodeChange = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, CELL_COUNT);
    setValue(digits);
    if (digits.length === CELL_COUNT && !smsSending) void submit(digits);
  };

  const onResend = async () => {
    if (timer > 0 || !mobile || resending || smsSending) return;
    setResending(true);
    try {
      await runSerializedSendOtp(mobile, async () => {
        setSmsSending(true);
        try {
          await sendOtp(mobile);
          setTimer(90);
          setValue("");
          setTimeout(() => ref.current?.focus(), 0);
        } finally {
          setSmsSending(false);
        }
      });
    } catch (e: unknown) {
      Alert.alert(
        "Error",
        getFieldflixApiErrorMessage(e, "Could not resend SMS"),
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <WebShell backgroundColor="transparent">
      <View style={styles.root}>
        <ImageBackground
          source={BG.otp}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        >
          <LinearGradient
            colors={[
              "rgba(15,23,42,0.65)",
              "rgba(20,83,45,0.45)",
              "rgba(2,44,34,0.55)",
              "rgba(0,0,0,0.9)",
            ]}
            locations={[0, 0.3, 0.65, 1]}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={[
              "rgba(0,0,0,0.5)",
              "rgba(0,0,0,0.1)",
              "rgba(0,0,0,0.1)",
              "rgba(0,0,0,0.8)",
            ]}
            locations={[0, 0.3, 0.7, 1]}
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
              styles.content,
              { paddingBottom: Math.max(vs(16), insets.bottom + vs(10)) },
            ]}
          >
            <View style={{ height: topSpacer }} />

            <View style={[styles.panel, { maxWidth: panelMax }]}>
              <View style={styles.header}>
                <Text style={styles.kicker}>Mobile Number Verification</Text>
                <Text style={styles.title}>Enter OTP</Text>
                <Text style={styles.sub}>
                  We have sent a one-time password{"\n"}to{" "}
                  <Text style={styles.subStrong}>
                    {maskIndianMobile(mobile)}
                  </Text>
                </Text>
              </View>

              <View style={[styles.bannerSlot, { maxWidth: otpRowMax }]}>
                {smsSending ? (
                  <View style={styles.sendingBanner}>
                    <ActivityIndicator color={WEB.green} />
                    <Text style={styles.sendingText}>
                      Sending verification code…
                    </Text>
                  </View>
                ) : null}
              </View>

              <CodeField
                ref={ref}
                {...clearProps}
                value={value}
                onChangeText={onCodeChange}
                cellCount={CELL_COUNT}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete={
                  Platform.OS === "android" ? "sms-otp" : "one-time-code"
                }
                {...(Platform.OS === "android"
                  ? { importantForAutofill: "yes" as const }
                  : {})}
                editable={!smsSending}
                rootStyle={[
                  styles.codeFieldRoot,
                  { maxWidth: otpRowMax, gap: cellGap },
                ]}
                renderCell={({ index, symbol, isFocused }) => (
                  <View
                    key={index}
                    style={[
                      styles.otpCell,
                      {
                        width: boxW,
                        height: boxH,
                        borderRadius: ms(WEB.otpBoxRadius, 0.4),
                      },
                      symbol ? styles.otpCellFilled : styles.otpCellEmpty,
                      isFocused && !symbol && styles.otpCellFocused,
                    ]}
                    onLayout={getCellOnLayoutHandler(index)}
                  >
                    <Text
                      style={[
                        styles.otpCellText,
                        {
                          fontSize: Math.min(sf(24), boxW * 0.44),
                          lineHeight: Math.min(sf(28), boxW * 0.52),
                        },
                      ]}
                    >
                      {symbol || (isFocused ? <Cursor cursorSymbol="|" /> : "")}
                    </Text>
                  </View>
                )}
              />

              <View style={styles.timerBlock}>
                <Text style={styles.timerLabel}>Code expires in</Text>
                <Text style={styles.timer}>{formatTime(timer)}</Text>
              </View>

              <Pressable
                onPress={() => submit(value)}
                disabled={
                  submitting || smsSending || value.length !== CELL_COUNT
                }
                style={({ pressed }) => [
                  styles.verifyOuter,
                  { maxWidth: otpRowMax },
                  pressed && { transform: [{ scale: 0.98 }] },
                  (submitting || smsSending || value.length !== CELL_COUNT) &&
                    styles.verifyDisabled,
                ]}
              >
                <LinearGradient
                  colors={["#22c55e", "#16a34a"]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.verifyGradient}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.verifyText}>Verify OTP</Text>
                  )}
                </LinearGradient>
              </Pressable>

              <View style={styles.resendGroup}>
                <Text style={styles.resendHint}>
                  Didn&apos;t receive the code?
                </Text>
                <Pressable
                  onPress={onResend}
                  disabled={timer > 0 || resending}
                  style={styles.resendWrap}
                >
                  {resending ? (
                    <ActivityIndicator color={WEB.green} />
                  ) : (
                    <Text
                      style={[
                        styles.resend,
                        timer > 0 ? styles.resendDisabled : styles.resendActive,
                      ]}
                    >
                      Resend OTP
                    </Text>
                  )}
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
  flex: { flex: 1 },
  content: {
    alignItems: "center",
    paddingHorizontal: s(24),
    paddingTop: vs(20),
  },
  panel: {
    width: "100%",
    overflow: "hidden",
    borderRadius: ms(WEB.cardRadius, 0.45),
    borderWidth: 1.5,
    borderColor: "rgba(34, 197, 94, 0.45)",
    backgroundColor: "rgba(4, 10, 22, 0.58)",
    paddingTop: vs(26),
    paddingBottom: vs(22),
    paddingHorizontal: s(18),
    shadowColor: "rgba(5, 10, 24, 0.9)",
    shadowOffset: { width: 0, height: vs(8) },
    shadowOpacity: 1,
    shadowRadius: s(28),
    elevation: 9,
  },
  header: {
    alignItems: "center",
    paddingHorizontal: s(8),
    marginBottom: vs(6),
  },
  kicker: {
    fontFamily: FF.medium,
    fontSize: sf(13),
    letterSpacing: 1.2,
    color: "rgba(255,255,255,0.72)",
    textTransform: "uppercase",
  },
  title: {
    marginTop: vs(8),
    fontFamily: FF.bold,
    fontSize: sf(WEB.otpTitle),
    color: WEB.white,
    letterSpacing: -0.01 * WEB.otpTitle,
  },
  sub: {
    marginTop: vs(12),
    textAlign: "center",
    fontFamily: FF.regular,
    fontSize: sf(14),
    lineHeight: sf(22),
    color: "rgba(255,255,255,0.62)",
  },
  subStrong: {
    color: "rgba(255,255,255,0.88)",
    fontFamily: FF.medium,
  },
  bannerSlot: {
    marginTop: vs(10),
    marginBottom: vs(2),
    minHeight: vs(48),
    width: "100%",
    justifyContent: "center",
    alignSelf: "center",
  },
  sendingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(12),
    paddingVertical: vs(12),
    paddingHorizontal: s(16),
    borderRadius: ms(14, 0.45),
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  sendingText: {
    flex: 1,
    fontFamily: FF.medium,
    fontSize: sf(14),
    color: "rgba(255,255,255,0.85)",
  },
  codeFieldRoot: {
    width: "100%",
    marginTop: vs(6),
    alignSelf: "center",
  },
  otpCell: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(30, 30, 34, 0.95)",
    borderWidth: 2.5,
  },
  otpCellEmpty: {
    borderColor: "rgba(255,255,255,0.06)",
  },
  otpCellFilled: {
    borderColor: WEB.green,
  },
  otpCellFocused: {
    borderColor: "rgba(34, 197, 94, 0.55)",
    shadowColor: WEB.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: s(8),
    elevation: 4,
  },
  otpCellText: {
    fontFamily: FF.bold,
    color: WEB.white,
    textAlign: "center",
  },
  timerBlock: {
    marginTop: vs(28),
    alignItems: "center",
    gap: vs(4),
  },
  timerLabel: {
    fontFamily: FF.medium,
    fontSize: sf(12),
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.45)",
  },
  timer: {
    fontFamily: FF.bold,
    fontSize: sf(26),
    fontVariant: ["tabular-nums"],
    color: WEB.green,
  },
  verifyOuter: {
    marginTop: vs(22),
    width: "100%",
    borderRadius: WEB.pillRadius,
    overflow: "hidden",
    shadowColor: "rgba(34, 197, 94, 0.35)",
    shadowOffset: { width: 0, height: vs(4) },
    shadowOpacity: 1,
    shadowRadius: s(15),
    elevation: 6,
  },
  verifyDisabled: {
    opacity: 0.72,
  },
  verifyGradient: {
    minHeight: s(WEB.verifyBtnH),
    paddingVertical: vs(16),
    paddingHorizontal: s(28),
    ...gradientPillInner,
    alignItems: "center",
    justifyContent: "center",
  },
  verifyText: {
    fontFamily: FF.bold,
    fontSize: sf(17),
    lineHeight: sf(22),
    color: WEB.white,
  },
  resendGroup: {
    marginTop: vs(28),
    alignItems: "center",
    minHeight: vs(54),
  },
  resendHint: {
    fontFamily: FF.regular,
    fontSize: sf(13),
    color: "rgba(255,255,255,0.52)",
  },
  resendWrap: {
    minHeight: vs(26),
    justifyContent: "center",
    paddingVertical: vs(4),
  },
  resend: {
    fontFamily: FF.semiBold,
    fontSize: sf(15),
  },
  resendDisabled: {
    color: "rgba(255,255,255,0.5)",
  },
  resendActive: {
    color: WEB.green,
  },
});
