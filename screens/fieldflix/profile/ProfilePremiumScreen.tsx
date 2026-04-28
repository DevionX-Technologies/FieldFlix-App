import { BASE_URL, RAZORPAY_KEY_ID } from "@/data/constants";
import {
  createPlanOrder,
  getFieldflixApiErrorMessage,
  type PlanId,
  verifyRazorpayPayment,
} from "@/lib/fieldflix-api";
import { refreshEntitlement } from "@/lib/fieldflix-entitlement";
import { FieldflixScreenHeader } from "@/screens/fieldflix/FieldflixScreenHeader";
import { WebShell } from "@/screens/fieldflix/WebShell";
import { gradientPillInner } from "@/screens/fieldflix/fieldflixUi";
import { FF } from "@/screens/fieldflix/fonts";
import { WEB } from "@/screens/fieldflix/webDesign";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

/**
 * Only true raster PNGs are bundled. Codia “.png” URLs that return SVG were breaking
 * `mergeReleaseResources` (AAPT2: file failed to compile) — small UI marks use `react-native-svg` below.
 */
const RASTER = {
  planFree: require("@/assets/fieldflix-web/premium/plan-bg-free.png"),
  planPro: require("@/assets/fieldflix-web/premium/plan-bg-pro.png"),
  planPrem: require("@/assets/fieldflix-web/premium/plan-bg-premium.png"),
  payUpi: require("@/assets/fieldflix-web/premium/pay-upi.png"),
  payVisa: require("@/assets/fieldflix-web/premium/pay-visa-mc.png"),
  /** Design ticks — real PNGs so Android `mergeReleaseResources` stays valid. */
  insideplanTick: require("@/assets/fieldflix-web/premium/insideplan-tick.png"),
  featureTick: require("@/assets/fieldflix-web/premium/feature-tick.png"),
} as const;

const BG = "#020617";
const MUTED = "#94a3b8";
const ACCENT = "#22c55e";
const SURFACE = "rgba(10, 19, 36, 0.9)";
const SURFACE_SOFT = "rgba(9, 17, 31, 0.72)";
const TEXT_PRIMARY = "#f8fafc";
const TEXT_SECONDARY = "#cbd5e1";
const PLAN_CARD_W = 170;
const PLAN_GAP = 14;
const PLANS_H_PAD = 16;
/** Reduced height since plan bullets are hidden. */
const CARD_H = 182;

// const PLAN_BULLETS: Record<PlanId, [string, string, string]> = {
//   cricket: [
//     "Unlock all Cricket videos",
//     "Watch full matches",
//     "Access cricket highlights",
//   ],
//   pickleball: [
//     "Unlock all Pickleball videos",
//     "Watch full matches",
//     "Access pickleball highlights",
//   ],
//   padel: [
//     "Unlock all Padel videos",
//     "Watch full matches",
//     "Access padel highlights",
//   ],
//   pro: ["Advanced features", "Video Recording", "View AI insights"],
//   premium: ["AI features", "AI features", "Unlimited Storage"],
//   free: ["Track Sessions", "View basic Stats", "View Analytics"],
// };

type Pay = "upi" | "card" | "netbank";

const PLAN_ORDER: {
  id: PlanId;
  name: string;
  sub: string;
  basePrice: number;
  img: number;
}[] = [
  {
    id: "pickleball",
    name: "Pickleball Plan",
    sub: "(Sport Access)",
    basePrice: 200,
    img: RASTER.planFree,
  },
  {
    id: "padel",
    name: "Padel Plan",
    sub: "(Sport Access)",
    basePrice: 250,
    img: RASTER.planPro,
  },
  {
    id: "cricket",
    name: "Cricket Plan",
    sub: "(Sport Access)",
    basePrice: 350,
    img: RASTER.planPrem,
  },
];

const GST_RATE = 0.18;
const PLAN_BASE_PRICE: Record<PlanId, number> = {
  pickleball: 200,
  padel: 250,
  cricket: 350,
  pro: 0,
  premium: 0,
  free: 0,
};

function formatBasePrice(basePrice: number): string {
  return `₹${basePrice}`;
}

function checkoutAmountInr(planId: PlanId): number {
  const base = PLAN_BASE_PRICE[planId] ?? 0;
  return Math.round(base * (1 + GST_RATE));
}

/**
 * Parity with `web/src/screens/ProfilePremiumScreen.tsx` + `profilePremium.css` (plan + payment art as PNG; other marks as SVG).
 * Checkout: `POST /payments/plan/create-order` → `react-native-razorpay` → `POST /payments/verify`.
 */
export default function FieldflixProfilePremiumScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sport?: string }>();
  const insets = useSafeAreaInsets();
  const [pay, setPay] = useState<Pay>("upi");
  const [plan, setPlan] = useState<PlanId>("padel");
  const [submitting, setSubmitting] = useState(false);
  const planScroll = useRef<ScrollView | null>(null);
  const planScrollViewportW = useRef(0);
  const planScrollContentW = useRef(0);

  const scrollPlansToCenter = (contentW: number, viewportW: number) => {
    const el = planScroll.current as unknown as {
      scrollTo: (o: { x: number; animated: boolean }) => void;
    } | null;
    if (!el?.scrollTo) return;
    if (viewportW <= 0 || contentW <= 0) return;
    const selectedIndex = PLAN_ORDER.findIndex((p) => p.id === plan);
    if (selectedIndex < 0) return;
    const targetCenter =
      PLANS_H_PAD + selectedIndex * (PLAN_CARD_W + PLAN_GAP) + PLAN_CARD_W / 2;
    const x = Math.max(
      0,
      Math.min(contentW - viewportW, targetCenter - viewportW / 2),
    );
    el.scrollTo({ x, animated: false });
  };

  useEffect(() => {
    const raw = String(params.sport ?? "").toLowerCase();
    const preferred: PlanId | null = raw.includes("cricket")
      ? "cricket"
      : raw.includes("pickle")
        ? "pickleball"
        : raw.includes("padel") || raw.includes("paddle")
          ? "padel"
          : null;
    if (preferred) {
      setPlan(preferred);
    }
  }, [params.sport]);

  useEffect(() => {
    scrollPlansToCenter(
      planScrollContentW.current,
      planScrollViewportW.current,
    );
  }, [plan]);

  const onUpgrade = async () => {
    if (!RAZORPAY_KEY_ID) {
      Alert.alert(
        "Payments",
        "Add EXPO_PUBLIC_RAZORPAY_KEY_ID to your .env (publishable key from Razorpay).",
      );
      return;
    }
    const token = await SecureStore.getItemAsync("token");
    if (!token?.trim()) {
      Alert.alert(
        "Sign in required",
        "Log in to create an order and complete upgrade.",
      );
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      const order = await createPlanOrder(plan);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const RazorpayCheckout = require("react-native-razorpay").default as {
        open: (opts: Record<string, unknown>) => Promise<{
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature?: string;
        }>;
      };
      const amountPaise = String(checkoutAmountInr(plan) * 100);
      // Native module exports a class: call `RazorpayCheckout.open(...)`, not `RazorpayCheckout(...)`.
      const data = await RazorpayCheckout.open({
        key: RAZORPAY_KEY_ID,
        name: "FieldFlicks",
        description: `FieldFlicks — ${plan} plan`,
        order_id: order.razorpay_order_id,
        currency: order.currency ?? "INR",
        amount: amountPaise,
        theme: { color: "#22C55E" },
        /** Lets support correlate UI selection with the checkout session. Razorpay still shows all methods. */
        notes: { fieldflicks_preferred_method: pay },
      });
      await verifyRazorpayPayment({
        razorpay_order_id: data.razorpay_order_id,
        razorpay_payment_id: data.razorpay_payment_id,
        status: "completed",
      });
      // Refresh server-truth entitlement so paywalled UI (preview cap, lock badges)
      // unlocks immediately when the user navigates back to a video.
      try {
        await refreshEntitlement();
      } catch {
        // entitlement cache will catch up on next app focus — non-fatal
      }
      Alert.alert(
        "Payment",
        "Your payment was received. Your plan will be activated shortly.",
      );
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const st = e.response?.status;
        if (st === 401) {
          Alert.alert("Session expired", "Sign in again, then try Upgrade.");
          return;
        }
        if (st === 404) {
          Alert.alert(
            "Payment",
            `Plan checkout is not available at this API (POST /payments/plan/create-order returned 404). ` +
              `Point EXPO_PUBLIC_BASE_URL at a server that has the FieldFlicks payment module deployed, or use your local API (e.g. http://LAN_IP:PORT). ` +
              `Current base: ${BASE_URL}`,
          );
          return;
        }
      }
      const msg = getFieldflixApiErrorMessage(e, "Could not complete payment");
      if (String(msg).toLowerCase().includes("user")) {
        // user cancelled
        return;
      }
      Alert.alert("Payment", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <WebShell backgroundColor={BG}>
      <View style={[styles.root, { paddingBottom: insets.bottom }]}>
        <FieldflixScreenHeader title="Premium" onBack={() => router.back()} />
        <ScrollView
          style={styles.pageScroll}
          contentContainerStyle={[
            styles.pageScrollContent,
            { paddingBottom: 28 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.max}>
            <View style={styles.heroBlock}>
              <View style={styles.kickerRow}>
                <IconKicker />
                <Text style={styles.kicker}>Unlock your potential</Text>
              </View>

              <Text style={styles.heroTitle}>Upgrade Your Game</Text>
              <Text style={styles.heroSub}>
                Choose a sport plan to unlock videos for that sport
              </Text>
            </View>
            <View style={styles.sectionHeadRow}>
              <View style={styles.sectionHeadLine} />
              <Text style={styles.sectionHint}>Choose Your Plan</Text>
              <View style={styles.sectionHeadLine} />
            </View>

            <ScrollView
              ref={planScroll}
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              onLayout={(e) => {
                const vw = e.nativeEvent.layout.width;
                planScrollViewportW.current = vw;
                scrollPlansToCenter(planScrollContentW.current, vw);
              }}
              onContentSizeChange={(w) => {
                planScrollContentW.current = w;
                scrollPlansToCenter(w, planScrollViewportW.current);
              }}
              contentContainerStyle={styles.plansScroll}
            >
              {PLAN_ORDER.map((p) => {
                const on = plan === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setPlan(p.id)}
                    style={[styles.planPress, { width: PLAN_CARD_W }]}
                  >
                    {p.id === "padel" ? (
                      <View style={styles.popularOnPro} pointerEvents="none">
                        <LinearGradient
                          colors={["#22c55e", "#16a34a"]}
                          start={{ x: 0, y: 0.5 }}
                          end={{ x: 1, y: 0.5 }}
                          style={styles.popularPill}
                        >
                          <Text style={styles.popularText}>Most Popular</Text>
                        </LinearGradient>
                      </View>
                    ) : null}
                    <ImageBackground
                      source={p.img}
                      style={[
                        styles.planBg,
                        { width: PLAN_CARD_W, height: CARD_H },
                      ]}
                      imageStyle={styles.planBgImage}
                      resizeMode="cover"
                    >
                      <LinearGradient
                        colors={["rgba(2,6,23,0.15)", "rgba(2,6,23,0.72)"]}
                        locations={[0.12, 1]}
                        style={StyleSheet.absoluteFillObject}
                        pointerEvents="none"
                      />
                      {on ? (
                        <View
                          style={styles.planSelectedRing}
                          pointerEvents="none"
                        />
                      ) : null}
                      {on ? (
                        <View
                          style={styles.planSelectedGlow}
                          pointerEvents="none"
                        />
                      ) : null}
                      <View style={styles.planPad}>
                        <View style={styles.planHeadRow}>
                          <Text style={styles.planName} numberOfLines={1}>
                            {p.name}
                          </Text>
                        </View>
                        <Text style={styles.planSub}>{p.sub}</Text>
                        <View style={styles.priceRow}>
                          <Text style={styles.priceNum}>
                            {formatBasePrice(p.basePrice)}
                          </Text>
                          <Text style={styles.priceMo}> /month</Text>
                        </View>
                        <Text style={styles.priceGstNote}>
                          +{Math.round(GST_RATE * 100)}% GST extra
                        </Text>
                        {/* <View style={styles.planBullets}>
                          {bullets.map((line, bi) => (
                            <View
                              key={`${p.id}-${bi}`}
                              style={styles.planBulletRow}
                            >
                              <Image
                                source={RASTER.insideplanTick}
                                style={styles.tickInside}
                                resizeMode="contain"
                              />
                              <Text style={styles.planBulletText}>{line}</Text>
                            </View>
                          ))}
                        </View> */}
                      </View>
                    </ImageBackground>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.featSection}>
              <View style={styles.featBlock}>
                <Text style={styles.featListTitle}>Feature List</Text>
                <View style={styles.fLine}>
                  <Image
                    source={RASTER.featureTick}
                    style={styles.tickFeature}
                    resizeMode="contain"
                  />
                  <Text style={styles.fText}>
                    Sport-specific video access lock
                  </Text>
                </View>
                <View style={styles.fLine}>
                  <Image
                    source={RASTER.featureTick}
                    style={styles.tickFeature}
                    resizeMode="contain"
                  />
                  <Text style={styles.fText}>
                    Full match playback for your selected sport
                  </Text>
                </View>
                <View style={styles.fLine}>
                  <Image
                    source={RASTER.featureTick}
                    style={styles.tickFeature}
                    resizeMode="contain"
                  />
                  <Text style={styles.fText}>
                    Highlights unlocked for that sport
                  </Text>
                </View>
                <View style={styles.fLine}>
                  <Image
                    source={RASTER.featureTick}
                    style={styles.tickFeature}
                    resizeMode="contain"
                  />
                  <Text style={styles.fText}>
                    Instant entitlement after successful payment
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.pmSection}>
              <View style={styles.pmHeader}>
                <Text style={styles.pmTitle}>Payment Methods</Text>
                <Text style={styles.pmSub}>
                  Secure checkout with Razorpay. Choose a preferred method
                  below, then pay in the Razorpay sheet.
                </Text>
              </View>

              <Pressable
                onPress={() => setPay("upi")}
                style={[styles.payRow, pay === "upi" && styles.payRowOn]}
                accessibilityRole="button"
              >
                <View style={styles.payLeft}>
                  <Image
                    source={RASTER.payUpi}
                    style={styles.payUpi}
                    resizeMode="cover"
                  />
                  <Text
                    style={[styles.payTxt, pay === "upi" && styles.payTxtOn]}
                    numberOfLines={1}
                  >
                    UPI
                  </Text>
                </View>
                <View style={styles.payRight}>
                  <IconPayChevron />
                  {pay === "upi" ? <IconPaySelected /> : null}
                </View>
              </Pressable>

              <Pressable
                onPress={() => setPay("card")}
                style={[styles.payRow, pay === "card" && styles.payRowOn]}
                accessibilityRole="button"
              >
                <View style={styles.payLeft}>
                  <IconPayCard />
                  <Text
                    style={[styles.payTxt, pay === "card" && styles.payTxtOn]}
                    numberOfLines={2}
                  >
                    Credit / Debit Card
                  </Text>
                </View>
                <View style={styles.payRight}>
                  <Image
                    source={RASTER.payVisa}
                    style={styles.payVisa}
                    resizeMode="contain"
                  />
                  {pay === "card" ? <IconPaySelected /> : null}
                </View>
              </Pressable>

              <Pressable
                onPress={() => setPay("netbank")}
                style={[styles.payRow, pay === "netbank" && styles.payRowOn]}
                accessibilityRole="button"
              >
                <View style={styles.payLeft}>
                  <IconPayBank />
                  <Text
                    style={[
                      styles.payTxt,
                      pay === "netbank" && styles.payTxtOn,
                    ]}
                    numberOfLines={1}
                  >
                    Net Banking
                  </Text>
                </View>
                <View style={styles.payRight}>
                  <View style={styles.payRowSpacer} />
                  {pay === "netbank" ? <IconPaySelected /> : null}
                </View>
              </Pressable>

              <View style={styles.secureRow}>
                <IconShieldLock />
                <Text style={styles.secureTxt}>
                  100% secure checkout powered by Razorpay
                </Text>
              </View>
            </View>

            <View style={styles.upgradeShell} accessibilityLabel="Upgrade plan">
              <Pressable
                onPress={() => void onUpgrade()}
                disabled={submitting}
                style={({ pressed }) => [
                  styles.upgradePress,
                  (pressed || submitting) && { opacity: 0.86 },
                ]}
              >
                <LinearGradient
                  colors={["#22c55e", "#16a34a"]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.upgradeGrad}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.upText}>Upgrade Now</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </WebShell>
  );
}

/** Codia kicker mark (SVG in design — not AAPT-compilable as .png). */
function IconKicker() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path
        d="M7.033 12.133 10.483 8H7.817L8.3 4.217l-3.083 4.45h2.316L7.033 12.133zM6 10H3.933a.5.5 0 01-.408-.95L8.367 1.783a.6.6 0 01.983.567L8.333 6.667H11.917c.29 0 .491.127.608.383.116.256.08.494-.108.717L6.933 14.333a.6.6 0 01-1.066-.65L6 10z"
        fill={ACCENT}
      />
    </Svg>
  );
}

/** Web `profilePremium.css` `.group` chevron (UPI row, right). */
function IconPayChevron() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 6l6 6-6 6"
        stroke={MUTED}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconPayCard() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 20c-.55 0-1.02-.2-1.41-.59C2.2 19.02 2 18.55 2 18V6c0-.55.2-1.02.59-1.41C2.98 4.2 3.45 4 4 4h16c.55 0 1.02.2 1.41.59.39.39.59.86.59 1.41v12c0 .55-.2 1.02-.59 1.41-.39.39-.86.59-1.41.59H4zM4 12h16V8H4v4z"
        fill={MUTED}
      />
    </Svg>
  );
}

function IconPayBank() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 17V10h2v7H5zm6 0v-7h2v7h-2zM2 21v-2h20v2H2zm15-4v-7h2v7h-2zM2 8V6L12 1l10 5v2H2z"
        fill={MUTED}
      />
    </Svg>
  );
}

function IconPaySelected() {
  return (
    <View style={styles.paySelectedDot}>
      <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
        <Path
          d="M5.5 12.5 10 17l8.5-8.5"
          stroke={ACCENT}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

function IconShieldLock() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2 4 5v6c0 5.25 3.44 10.16 8 11.5 4.56-1.34 8-6.25 8-11.5V5l-8-3Zm0 6a2.5 2.5 0 0 1 2.5 2.5V12H15a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h.5v-1.5A2.5 2.5 0 0 1 12 8Zm0 1.5a1 1 0 0 0-1 1V12h2v-1.5a1 1 0 0 0-1-1Z"
        fill="#86efac"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: 0 },
  pageScroll: { flex: 1 },
  pageScrollContent: { flexGrow: 1, paddingTop: 6 },
  max: {
    width: "100%",
    maxWidth: 402,
    alignSelf: "center",
    alignItems: "stretch",
  },
  heroBlock: {
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(110,231,183,0.22)",
    backgroundColor: "rgba(8,18,34,0.72)",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
  },
  kickerRow: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(110,231,183,0.4)",
    backgroundColor: "rgba(22,101,52,0.35)",
  },
  kickerIcon: { width: 16, height: 16 },
  kicker: {
    fontFamily: FF.semiBold,
    fontSize: 12,
    color: TEXT_PRIMARY,
    letterSpacing: 0.2,
  },
  heroTitle: {
    marginTop: 12,
    fontFamily: FF.extraBold,
    fontSize: 28,
    lineHeight: 34,
    color: TEXT_PRIMARY,
    textAlign: "center",
    letterSpacing: -0.4,
  },
  heroSub: {
    marginTop: 8,
    fontFamily: FF.medium,
    fontSize: 13,
    lineHeight: 18,
    color: TEXT_SECONDARY,
    textAlign: "center",
    marginHorizontal: 28,
  },
  sectionHeadRow: {
    marginTop: 14,
    marginBottom: 4,
    marginHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionHeadLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(148,163,184,0.35)",
  },
  sectionHint: {
    fontFamily: FF.semiBold,
    fontSize: 11,
    color: "rgba(203,213,225,0.92)",
    letterSpacing: 1.05,
    textTransform: "uppercase",
    textAlign: "center",
  },
  popularPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  popularText: {
    fontFamily: FF.semiBold,
    fontSize: 11,
    color: "#fff",
    letterSpacing: 0.2,
  },
  /** Sits on the Pro card (not a separate row). */
  popularOnPro: {
    position: "absolute",
    top: -8,
    left: 0,
    right: 0,
    zIndex: 3,
    alignItems: "center",
  },
  plansScroll: {
    marginTop: 12,
    paddingLeft: PLANS_H_PAD,
    paddingRight: PLANS_H_PAD + 8,
    paddingTop: 18,
    paddingBottom: 14,
    flexDirection: "row",
    gap: PLAN_GAP,
    alignItems: "flex-start",
  },
  planPress: {
    position: "relative",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 5,
  },
  planBg: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.2)",
    backgroundColor: SURFACE_SOFT,
  },
  planBgImage: { borderRadius: 20 },
  planSelectedRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: ACCENT,
  },
  planSelectedGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    backgroundColor: "rgba(34,197,94,0.08)",
  },
  planPad: { padding: 14, paddingBottom: 14, justifyContent: "flex-start" },
  planHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  planName: { flex: 1, fontFamily: FF.bold, fontSize: 15, color: TEXT_PRIMARY },
  planSub: {
    marginTop: 4,
    fontFamily: FF.medium,
    fontSize: 11,
    color: TEXT_SECONDARY,
  },
  priceRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 1,
  },
  priceNum: {
    fontFamily: FF.bold,
    fontSize: 26,
    color: TEXT_PRIMARY,
    lineHeight: 30,
  },
  priceMo: { fontFamily: FF.medium, fontSize: 11, color: TEXT_SECONDARY },
  priceGstNote: {
    marginTop: 2,
    fontFamily: FF.medium,
    fontSize: 10,
    color: "rgba(187,247,208,0.9)",
    letterSpacing: 0.2,
  },
  planDivider: {
    marginTop: 8,
    marginBottom: 8,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(148,163,184,0.35)",
  },
  planBullets: { marginTop: 0, gap: 6 },
  planBulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  tickInside: { width: 16, height: 16, marginTop: 1, flexShrink: 0 },
  planBulletText: {
    flex: 1,
    fontFamily: FF.medium,
    fontSize: 11,
    lineHeight: 15,
    color: TEXT_SECONDARY,
  },
  featSection: {
    marginTop: 8,
    paddingHorizontal: 16,
    width: "100%",
    alignSelf: "stretch",
  },
  featBlock: {
    gap: 8,
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    backgroundColor: SURFACE,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  featListTitle: {
    fontFamily: FF.bold,
    fontSize: 18,
    color: TEXT_PRIMARY,
    marginBottom: 2,
  },
  fLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 5,
  },
  tickFeature: { width: 20, height: 20, flexShrink: 0 },
  fText: {
    flex: 1,
    minWidth: 0,
    fontFamily: FF.medium,
    fontSize: 14,
    lineHeight: 20,
    color: TEXT_SECONDARY,
  },
  pmSection: {
    marginTop: 22,
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    backgroundColor: SURFACE,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 6,
  },
  pmHeader: { marginHorizontal: 6, marginBottom: 12 },
  pmTitle: { fontFamily: FF.bold, fontSize: 18, color: TEXT_PRIMARY },
  pmSub: {
    marginTop: 6,
    fontFamily: FF.regular,
    fontSize: 12,
    lineHeight: 18,
    color: TEXT_SECONDARY,
  },
  payRow: {
    marginHorizontal: 4,
    marginBottom: 12,
    minHeight: 55,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(100,116,139,0.45)",
    backgroundColor: "rgba(15,23,42,0.82)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  payRowOn: {
    borderColor: "rgba(74,222,128,0.85)",
    backgroundColor: "rgba(20,83,45,0.28)",
  },
  payLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  payRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 56,
    justifyContent: "flex-end",
  },
  payUpi: { width: 28, height: 27 },
  payIcon24: { width: 24, height: 24 },
  payTxt: {
    fontFamily: FF.semiBold,
    fontSize: 16,
    lineHeight: 22,
    color: MUTED,
    flex: 1,
  },
  payTxtOn: { color: TEXT_PRIMARY },
  payVisa: { width: 61, height: 25 },
  payRowSpacer: { width: 24, height: 24 },
  paySelectedDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: ACCENT,
    backgroundColor: "rgba(34,197,94,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  secureRow: {
    marginTop: 2,
    marginBottom: 10,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  secureTxt: {
    fontFamily: FF.medium,
    fontSize: 12,
    color: "rgba(134,239,172,0.9)",
  },
  /** Same horizontal inset as `payRow` so width matches; stretch fixes Pressable hugging text (no green pill) on some builds. */
  upgradeShell: {
    marginTop: 22,
    marginHorizontal: 20,
    alignSelf: "stretch",
  },
  upgradePress: {
    width: "100%",
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "rgba(34,197,94,0.28)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 6,
  },
  upgradeGrad: {
    minHeight: WEB.btnPrimaryH,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    ...gradientPillInner,
  },
  upText: {
    fontFamily: FF.bold,
    fontSize: 17,
    letterSpacing: 0.3,
    textAlign: "center",
    color: WEB.white,
  },
});
