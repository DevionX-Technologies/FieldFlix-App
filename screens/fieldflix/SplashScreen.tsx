import { Paths } from "@/data/paths";
import { WebShell } from "@/screens/fieldflix/WebShell";
import { WEB } from "@/screens/fieldflix/webDesign";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
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
      duration: 1200,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });

    ambientPulse.value = withRepeat(
      withTiming(1, {
        duration: 3800,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );

    sheenProgress.value = withRepeat(
      withTiming(1, {
        duration: 3200,
        easing: Easing.inOut(Easing.cubic),
      }),
      -1,
      false
    );

    const t = setTimeout(async () => {
      const token = await SecureStore.getItemAsync("token");
      router.replace(token ? Paths.home : Paths.login);
    }, 2500);

    return () => clearTimeout(t);
  }, [ambientPulse, revealProgress, router, sheenProgress]);

  const logoStyle = useAnimatedStyle(() => {
    const opacity = interpolate(revealProgress.value, [0, 1], [0, 1]);
    const translateY = interpolate(revealProgress.value, [0, 1], [14, 0]);
    const scale = interpolate(ambientPulse.value, [0, 1], [0.998, 1.008]);
    return {
      opacity,
      transform: [{ translateY }, { scale }],
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    const opacity = interpolate(ambientPulse.value, [0, 1], [0.1, 0.2]);
    const scale = interpolate(ambientPulse.value, [0, 1], [0.96, 1.06]);
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const sheenStyle = useAnimatedStyle(() => {
    const translateX = interpolate(sheenProgress.value, [0, 1], [-250, 250]);
    const opacity = interpolate(sheenProgress.value, [0, 0.14, 0.86, 1], [0, 0.14, 0.14, 0]);
    return {
      opacity,
      transform: [{ translateX }, { rotate: "-11deg" }],
    };
  });

  return (
    <WebShell backgroundColor={WEB.splashBg}>
      <View style={styles.container}>
        <LinearGradient
          colors={["#01040B", "#041327", "#020A18", "#01040B"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={["rgba(0,0,0,0.35)", "rgba(0,0,0,0)", "rgba(0,0,0,0.45)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={[styles.glow, glowStyle]} />

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
  glow: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#3A8CFF",
    shadowColor: "#3A8CFF",
    shadowOpacity: 0.32,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: 10 },
  },
  logoWrap: {
    width: "88%",
    maxWidth: 360,
    height: 78,
    justifyContent: "center",
    overflow: "hidden",
  },
  logo: {
    width: "100%",
    height: "100%",
    shadowColor: "#FFFFFF",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  sheen: {
    position: "absolute",
    top: -10,
    width: 72,
    height: 96,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.88)",
  },
});
