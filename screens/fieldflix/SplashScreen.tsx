import { Paths } from "@/data/paths";
import { WebShell } from "@/screens/fieldflix/WebShell";
import { WEB } from "@/screens/fieldflix/webDesign";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const WORD_LOGO = require("@/assets/fieldflix-web/fieldflix_word_logo.jpeg");

export default function FieldflixSplashScreen() {
  const router = useRouter();
  const revealProgress = useSharedValue(0);
  const ambientPulse = useSharedValue(0);
  const sheenProgress = useSharedValue(0);

  useEffect(() => {
    revealProgress.value = withTiming(1, {
      duration: 1050,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });

    ambientPulse.value = withRepeat(
      withTiming(1, {
        duration: 3600,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true
    );

    // One premium sweep after logo reveal (less looped feel).
    sheenProgress.value = withSequence(
      withDelay(
        560,
        withTiming(1, {
          duration: 980,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        })
      ),
      withTiming(0, { duration: 0 })
    );

    const t = setTimeout(() => {
      void (async () => {
        try {
          const token = await SecureStore.getItemAsync("token");
          router.replace(token ? Paths.home : Paths.login);
        } catch {
          // Never let startup routing crash the app; fail-safe to login.
          router.replace(Paths.login);
        }
      })();
    }, 2500);

    return () => {
      clearTimeout(t);
      cancelAnimation(revealProgress);
      cancelAnimation(ambientPulse);
      cancelAnimation(sheenProgress);
    };
  }, [ambientPulse, revealProgress, router, sheenProgress]);

  const logoStyle = useAnimatedStyle(() => {
    const opacity = interpolate(revealProgress.value, [0, 1], [0, 1]);
    const translateY = interpolate(revealProgress.value, [0, 1], [14, 0]);
    const scale = interpolate(ambientPulse.value, [0, 1], [0.998, 1.006]);
    return {
      opacity,
      transform: [{ translateY }, { scale }],
    };
  });

  const sheenStyle = useAnimatedStyle(() => {
    const translateX = interpolate(sheenProgress.value, [0, 1], [-360, 360]);
    const opacity = interpolate(
      sheenProgress.value,
      [0, 0.15, 0.32, 0.52, 1],
      [0, 0.18, 0.34, 0.12, 0]
    );
    const scale = interpolate(sheenProgress.value, [0, 1], [0.98, 1.03]);
    return {
      opacity,
      transform: [{ translateX }, { rotate: "-14deg" }, { scale }],
    };
  });

  const logoAuraStyle = useAnimatedStyle(() => {
    const opacity = interpolate(ambientPulse.value, [0, 1], [0.14, 0.24]);
    const scaleX = interpolate(ambientPulse.value, [0, 1], [0.96, 1.03]);
    return {
      opacity,
      transform: [{ scaleX }],
    };
  });

  return (
    <WebShell backgroundColor={WEB.splashBg}>
      <View style={styles.container}>
        <LinearGradient
          colors={["#03060D", "#061321", "#031019", "#03060D"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={["rgba(34,197,94,0.08)", "rgba(0,0,0,0)", "rgba(34,197,94,0.06)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={[styles.logoAura, logoAuraStyle]} />
        <Animated.View style={[styles.logoWrap, logoStyle]}>
          <Image source={WORD_LOGO} resizeMode="contain" style={styles.logo} accessibilityLabel="FieldFlix" />
          <Animated.View style={[styles.sheen, sheenStyle]} />
        </Animated.View>
      </View>
    </WebShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#01060F",
  },
  logoWrap: {
    width: "88%",
    maxWidth: 360,
    height: 78,
    justifyContent: "center",
    overflow: "hidden",
  },
  logoAura: {
    position: "absolute",
    width: "76%",
    maxWidth: 320,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(34,197,94,0.35)",
    shadowColor: "#22c55e",
    shadowOpacity: 0.34,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
  },
  logo: {
    width: "100%",
    height: "100%",
    shadowColor: "#86efac",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
  },
  sheen: {
    position: "absolute",
    top: -16,
    width: 64,
    height: 124,
    borderRadius: 12,
    backgroundColor: "rgba(220,252,231,0.96)",
  },
});