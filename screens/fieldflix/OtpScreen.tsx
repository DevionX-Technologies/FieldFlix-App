import { Paths } from '@/data/paths';
import { getFieldflixApiErrorMessage, sendOtp, verifyOtp } from '@/lib/fieldflix-api';
import { FF } from '@/screens/fieldflix/fonts';
import { useShellWidth, WebShell } from '@/screens/fieldflix/WebShell';
import { BG } from '@/screens/fieldflix/bundledBackgrounds';
import { gradientPillInner } from '@/screens/fieldflix/fieldflixUi';
import { WEB } from '@/screens/fieldflix/webDesign';
import * as SecureStore from 'expo-secure-store';
import { requestAndRegisterFcmToken, setupFcmTokenRefreshListener } from '@/utils/fcmTokenManager';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

function maskIndianMobile(mobile: string | undefined): string {
  if (!mobile) return '+91 XXXXXXXXXX';
  const d = mobile.replace(/\D/g, '');
  const last10 = d.length >= 10 ? d.slice(-10) : d;
  if (last10.length < 10) return '+91 XXXXXXXXXX';
  return `+91 ${'X'.repeat(6)}${last10.slice(-4)}`;
}

/** Mirrors `web/src/screens/OtpScreen.tsx` — `/image16.png` background + vignette. */
export default function FieldflixOtpScreen() {
  const router = useRouter();
  const { mobile, isSignup } = useLocalSearchParams<{ mobile: string; isSignup?: string }>();
  const shellW = useShellWidth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(90);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [smsSending, setSmsSending] = useState(true);
  const refs = useRef<(TextInput | null)[]>([]);

  const vh = Dimensions.get('window').height;
  const topSpacer = vh * 0.12;
  const otpRowMax = Math.min(360, shellW - 48);

  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  /** Server sends SMS via Fast2SMS (DLT) when this screen mounts. */
  useEffect(() => {
    let cancelled = false;
    if (!mobile) return;
    (async () => {
      try {
        setSmsSending(true);
        await sendOtp(mobile);
      } catch (e: unknown) {
        if (!cancelled) {
          Alert.alert('Phone verification', getFieldflixApiErrorMessage(e, 'Could not send SMS'));
        }
      } finally {
        if (!cancelled) setSmsSending(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mobile]);

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60)
      .toString()
      .padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  };

  const submit = async (code: string) => {
    if (code.length !== 6) return;
    if (!mobile) {
      Alert.alert('Session expired', 'Go back and enter your number again.');
      return;
    }
    if (smsSending) {
      Alert.alert('Please wait', 'Sending SMS…');
      return;
    }
    setSubmitting(true);
    try {
      const res = await verifyOtp(mobile, code);
      await SecureStore.setItemAsync('token', res.token);
      try {
        setupFcmTokenRefreshListener();
        await requestAndRegisterFcmToken();
      } catch {
        // FCM is optional; dev build / permissions may skip.
      }
      // AccountType is a one-time signup step. Returning users skip it.
      if (isSignup === '1') {
        router.replace(Paths.accountType);
      } else {
        router.replace(Paths.home);
      }
    } catch (e: unknown) {
      Alert.alert('Error', getFieldflixApiErrorMessage(e, 'Verification failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    if (timer > 0 || !mobile) return;
    setResending(true);
    try {
      setSmsSending(true);
      await sendOtp(mobile);
      setTimer(90);
      setOtp(['', '', '', '', '', '']);
      refs.current[0]?.focus();
    } catch (e: unknown) {
      Alert.alert('Error', getFieldflixApiErrorMessage(e, 'Could not resend SMS'));
    } finally {
      setSmsSending(false);
      setResending(false);
    }
  };

  const onChangeDigit = (index: number, value: string) => {
    const digits = value.replace(/\D/g, '');
    // Paste / SMS autofill / "suggest strong password" can deliver several digits at once.
    // Do NOT use maxLength={1} on TextInput — it truncates paste before onChangeText runs.
    if (digits.length > 1) {
      const chars = digits.slice(0, 6).split('');
      const next = ['', '', '', '', '', ''] as string[];
      for (let i = 0; i < 6; i++) next[i] = chars[i] ?? '';
      setOtp(next);
      const focusAt = Math.min(Math.max(chars.length - 1, 0), 5);
      setTimeout(() => refs.current[focusAt]?.focus(), 0);
      const joined = next.join('');
      if (joined.length === 6 && !smsSending) void submit(joined);
      return;
    }
    if (digits.length === 0) {
      const next = [...otp];
      next[index] = '';
      setOtp(next);
      return;
    }
    const next = [...otp];
    next[index] = digits[0] ?? '';
    setOtp(next);
    if (index < 5) refs.current[index + 1]?.focus();
    const joined = next.join('');
    if (joined.length === 6 && !smsSending) void submit(joined);
  };

  return (
    <WebShell backgroundColor="transparent">
      <View style={styles.root}>
        <ImageBackground source={BG.otp} style={StyleSheet.absoluteFill} resizeMode="cover">
          <LinearGradient
            colors={['rgba(15,23,42,0.65)', 'rgba(20,83,45,0.45)', 'rgba(2,44,34,0.55)', 'rgba(0,0,0,0.9)']}
            locations={[0, 0.3, 0.65, 1]}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.8)']}
            locations={[0, 0.3, 0.7, 1]}
            style={StyleSheet.absoluteFill}
          />
        </ImageBackground>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
          >
            <View style={{ height: topSpacer }} />

            <View style={styles.header}>
              <Text style={styles.kicker}>Mobile Number Verification</Text>
              <Text style={styles.title}>Enter OTP</Text>
              <Text style={styles.sub}>
                We have sent a one-time password{'\n'}to{' '}
                <Text style={styles.subStrong}>{maskIndianMobile(mobile)}</Text>
              </Text>
            </View>

            {smsSending ? (
              <View style={{ alignItems: 'center', marginBottom: 12 }}>
                <ActivityIndicator color="#fff" />
                <Text style={[styles.sub, { marginTop: 8, textAlign: 'center' }]}>
                  Sending verification code…
                </Text>
              </View>
            ) : null}

            <View style={[styles.otpRow, { maxWidth: otpRowMax }]}>
              {otp.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(r) => {
                    refs.current[i] = r;
                  }}
                  editable={!smsSending}
                  value={digit}
                  onChangeText={(v) => onChangeDigit(i, v)}
                  onKeyPress={({ nativeEvent }) => {
                    if (nativeEvent.key === 'Backspace' && !otp[i] && i > 0) {
                      refs.current[i - 1]?.focus();
                    }
                  }}
                  keyboardType="number-pad"
                  {...(Platform.OS === 'android' && i === 0 ? { autoComplete: 'sms-otp' as const } : {})}
                  textContentType={i === 0 ? 'oneTimeCode' : 'none'}
                  {...(Platform.OS === 'android' && i === 0 ? { importantForAutofill: 'yes' as const } : {})}
                  // maxLength omitted on purpose: native maxLength=1 breaks multi-digit paste; see onChangeDigit.
                  selectTextOnFocus
                  style={[
                    styles.otpBox,
                    digit ? styles.otpBoxActive : styles.otpBoxIdle,
                  ]}
                />
              ))}
            </View>

            <Text style={styles.timer}>{formatTime(timer)}</Text>

            <Pressable
              onPress={() => submit(otp.join(''))}
              disabled={submitting || smsSending || otp.join('').length !== 6}
              style={({ pressed }) => [
                styles.verifyOuter,
                { maxWidth: otpRowMax },
                pressed && { transform: [{ scale: 0.98 }] },
                (submitting || smsSending || otp.join('').length !== 6) && { opacity: 0.7 },
              ]}
            >
              <LinearGradient
                colors={['#22c55e', '#16a34a']}
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

            <Pressable onPress={onResend} disabled={timer > 0 || resending} style={styles.resendWrap}>
              {resending ? (
                <ActivityIndicator color={WEB.green} />
              ) : (
                <Text style={[styles.resend, timer > 0 ? styles.resendDisabled : styles.resendActive]}>
                  Resend OTP
                </Text>
              )}
            </Pressable>
          </ScrollView>
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
  flex: { flex: 1 },
  scroll: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 48,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  kicker: {
    fontFamily: FF.medium,
    fontSize: 13,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 8,
    fontFamily: FF.bold,
    fontSize: WEB.otpTitle,
    color: WEB.white,
    letterSpacing: -0.01 * WEB.otpTitle,
  },
  sub: {
    marginTop: 12,
    textAlign: 'center',
    fontFamily: FF.regular,
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.6)',
  },
  subStrong: {
    color: 'rgba(255,255,255,0.8)',
    fontFamily: FF.medium,
  },
  otpRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginTop: 48,
    gap: 8,
  },
  otpBox: {
    width: WEB.otpBoxW,
    height: WEB.otpBoxH,
    borderRadius: WEB.otpBoxRadius,
    backgroundColor: 'rgba(30, 30, 34, 0.95)',
    fontFamily: FF.bold,
    fontSize: 24,
    color: WEB.white,
    textAlign: 'center',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  otpBoxIdle: {
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  otpBoxActive: {
    borderWidth: 2.5,
    borderColor: WEB.green,
  },
  timer: {
    marginTop: 40,
    fontFamily: FF.bold,
    fontSize: 26,
    fontVariant: ['tabular-nums'],
    color: WEB.green,
  },
  verifyOuter: {
    marginTop: 40,
    width: '100%',
    borderRadius: WEB.pillRadius,
    overflow: 'hidden',
    shadowColor: 'rgba(34, 197, 94, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 6,
  },
  verifyGradient: {
    minHeight: WEB.verifyBtnH,
    paddingVertical: 16,
    paddingHorizontal: 28,
    ...gradientPillInner,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyText: {
    fontFamily: FF.bold,
    fontSize: 17,
    lineHeight: 22,
    color: WEB.white,
  },
  resendWrap: {
    marginTop: 48,
    minHeight: 24,
    justifyContent: 'center',
  },
  resend: {
    fontFamily: FF.semiBold,
    fontSize: 15,
  },
  resendDisabled: {
    color: 'rgba(255,255,255,0.5)',
  },
  resendActive: {
    color: WEB.green,
  },
});
