import { FF } from "@/screens/fieldflix/fonts";
import { WEB } from "@/screens/fieldflix/webDesign";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useId } from "react";
import { StyleSheet, View } from "react-native";
import Svg, {
  Defs,
  Stop,
  LinearGradient as SvgLinearGradient,
  Text as SvgText,
} from "react-native-svg";
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const ACCENT = WEB.greenBright;
const ORBIT_RADIUS = 78;
const ORBIT_DOT = 10;

function OrbitDot({ phaseDeg }: { phaseDeg: number }) {
  const spin = useSharedValue(0);

  useEffect(() => {
    spin.value = withRepeat(
      withTiming(1, { duration: 9000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [spin]);

  const style = useAnimatedStyle(() => {
    const angle = (phaseDeg + spin.value * 360) * (Math.PI / 180);
    return {
      transform: [
        { translateX: Math.cos(angle) * ORBIT_RADIUS },
        { translateY: Math.sin(angle) * ORBIT_RADIUS },
        {
          scale: interpolate(
            spin.value,
            [0, 0.5, 1],
            [0.85, 1.15, 0.85],
          ),
        },
      ],
      opacity: interpolate(spin.value, [0, 0.5, 1], [0.55, 1, 0.55]),
    };
  });

  return (
    <Animated.View style={[styles.orbitDot, style]}>
      <LinearGradient
        colors={[ACCENT, "#86efac"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
    </Animated.View>
  );
}

function FloatingSpark({ delayMs, leftPct, size }: { delayMs: number; leftPct: number; size: number }) {
  const drift = useSharedValue(0);

  useEffect(() => {
    drift.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
  }, [drift, delayMs]);

  const style = useAnimatedStyle(() => ({
    left: `${leftPct}%`,
    opacity: interpolate(drift.value, [0, 0.5, 1], [0.15, 0.75, 0.15]),
    transform: [
      { translateY: interpolate(drift.value, [0, 1], [18, -42]) },
      { scale: interpolate(drift.value, [0, 0.5, 1], [0.6, 1, 0.6]) },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.spark,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    />
  );
}

const TITLE_SVG_W = 248;
const TITLE_SVG_H = 48;

function ComingSoonTitle({
  shimmer,
}: {
  shimmer: Animated.SharedValue<number>;
}) {
  const gradId = useId().replace(/:/g, "");

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.28, 0.62]),
    transform: [
      { scale: interpolate(shimmer.value, [0, 1], [0.92, 1.08]) },
    ],
  }));

  const lineStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(shimmer.value, [0, 1], [-56, 56]),
      },
    ],
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0.35, 1, 0.35]),
  }));

  return (
    <View style={titleStyles.wrap}>
      <Animated.View style={[titleStyles.glow, glowStyle]} />

      <LinearGradient
        colors={[
          "rgba(134,239,172,0.9)",
          "rgba(34,197,94,0.45)",
          "rgba(187,247,208,0.75)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={titleStyles.border}
      >
        <View style={titleStyles.inner}>
          <Svg width={TITLE_SVG_W} height={TITLE_SVG_H}>
            <Defs>
              <SvgLinearGradient
                id={gradId}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <Stop offset="0%" stopColor="#f0fdf4" />
                <Stop offset="28%" stopColor="#bbf7d0" />
                <Stop offset="52%" stopColor="#4ade80" />
                <Stop offset="78%" stopColor="#22c55e" />
                <Stop offset="100%" stopColor="#ecfdf5" />
              </SvgLinearGradient>
            </Defs>
            <SvgText
              x={TITLE_SVG_W / 2}
              y={36}
              textAnchor="middle"
              fill={`url(#${gradId})`}
              fontSize={30}
              fontWeight="700"
              fontFamily={FF.bold}
              letterSpacing={1.2}
            >
              Coming soon
            </SvgText>
          </Svg>
        </View>
      </LinearGradient>

      <View style={titleStyles.lineTrack}>
        <Animated.View style={[titleStyles.lineShimmer, lineStyle]}>
          <LinearGradient
            colors={[
              "transparent",
              "rgba(34,197,94,0.15)",
              ACCENT,
              "#86efac",
              ACCENT,
              "rgba(34,197,94,0.15)",
              "transparent",
            ]}
            locations={[0, 0.2, 0.42, 0.5, 0.58, 0.8, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const titleStyles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingTop: 4,
  },
  glow: {
    position: "absolute",
    top: 8,
    width: TITLE_SVG_W + 40,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(34,197,94,0.22)",
    shadowColor: ACCENT,
    shadowOpacity: 0.9,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
  },
  border: {
    padding: 1.5,
    borderRadius: 20,
    shadowColor: ACCENT,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  inner: {
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: "rgba(2,6,23,0.88)",
    alignItems: "center",
    justifyContent: "center",
  },
  lineTrack: {
    marginTop: 14,
    width: TITLE_SVG_W - 24,
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: "rgba(34,197,94,0.12)",
  },
  lineShimmer: {
    width: "55%",
    height: "100%",
    borderRadius: 2,
  },
});

/**
 * OTA-safe empty state for FlickShorts (Reanimated + RN views only — no new native modules).
 */
export function FlickShortsComingSoonEmpty() {
  const pulse = useSharedValue(0);
  const ringSpin = useSharedValue(0);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    ringSpin.value = withRepeat(
      withTiming(1, { duration: 14000, easing: Easing.linear }),
      -1,
      false,
    );
    shimmer.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulse, ringSpin, shimmer]);

  const hubStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(pulse.value, [0, 1], [1, 1.08]),
      },
    ],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ringSpin.value * 360}deg` }],
    opacity: interpolate(pulse.value, [0, 1], [0.35, 0.7]),
  }));

  const titleBlockStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(shimmer.value, [0, 1], [3, -3]),
      },
    ],
  }));

  return (
    <View style={styles.root} accessibilityRole="text" accessibilityLabel="Coming soon">
      <View style={styles.stage}>
        <FloatingSpark delayMs={0} leftPct={12} size={6} />
        <FloatingSpark delayMs={400} leftPct={78} size={8} />
        <FloatingSpark delayMs={900} leftPct={48} size={5} />
        <FloatingSpark delayMs={1200} leftPct={28} size={7} />
        <FloatingSpark delayMs={600} leftPct={62} size={6} />

        <Animated.View entering={FadeIn.duration(600)} style={styles.glowBack} />
        <Animated.View
          entering={FadeIn.delay(120).duration(800)}
          style={[styles.glowFront, hubStyle]}
        />

        <View style={styles.orbitCenter}>
          <Animated.View style={[styles.dashedRing, ringStyle]} />
          <OrbitDot phaseDeg={0} />
          <OrbitDot phaseDeg={120} />
          <OrbitDot phaseDeg={240} />

          <Animated.View style={[styles.hub, hubStyle]}>
            <LinearGradient
              colors={["rgba(34,197,94,0.35)", "rgba(15,23,42,0.95)"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
            />
            <MaterialCommunityIcons
              name="play-circle"
              size={56}
              color={ACCENT}
            />
          </Animated.View>
        </View>
      </View>

      <Animated.View
        entering={FadeInUp.delay(280).duration(700)}
        style={titleBlockStyle}
      >
        <ComingSoonTitle shimmer={shimmer} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingBottom: 24,
  },
  stage: {
    width: 220,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  glowBack: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(34,197,94,0.12)",
  },
  glowFront: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(34,197,94,0.18)",
  },
  orbitCenter: {
    width: ORBIT_RADIUS * 2 + ORBIT_DOT,
    height: ORBIT_RADIUS * 2 + ORBIT_DOT,
    alignItems: "center",
    justifyContent: "center",
  },
  dashedRing: {
    position: "absolute",
    width: ORBIT_RADIUS * 2 + 24,
    height: ORBIT_RADIUS * 2 + 24,
    borderRadius: (ORBIT_RADIUS * 2 + 24) / 2,
    borderWidth: 1.5,
    borderColor: "rgba(34,197,94,0.35)",
    borderStyle: "dashed",
  },
  orbitDot: {
    position: "absolute",
    width: ORBIT_DOT,
    height: ORBIT_DOT,
    borderRadius: ORBIT_DOT / 2,
    overflow: "hidden",
    shadowColor: ACCENT,
    shadowOpacity: 0.85,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  hub: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(34,197,94,0.45)",
    overflow: "hidden",
  },
  spark: {
    position: "absolute",
    bottom: 40,
    backgroundColor: ACCENT,
  },
});
