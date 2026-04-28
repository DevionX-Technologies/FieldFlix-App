import { BASE_URL, RAZORPAY_KEY_ID } from '@/data/constants';
import {
  createPlanOrder,
  getFieldflixApiErrorMessage,
  type PlanId,
  verifyRazorpayPayment,
} from '@/lib/fieldflix-api';
import { refreshEntitlement } from '@/lib/fieldflix-entitlement';
import { FF } from '@/screens/fieldflix/fonts';
import { FieldflixScreenHeader } from '@/screens/fieldflix/FieldflixScreenHeader';
import { WebShell } from '@/screens/fieldflix/WebShell';
import { gradientPillInner } from '@/screens/fieldflix/fieldflixUi';
import { WEB } from '@/screens/fieldflix/webDesign';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

/**
 * Only true raster PNGs are bundled. Codia “.png” URLs that return SVG were breaking
 * `mergeReleaseResources` (AAPT2: file failed to compile) — small UI marks use `react-native-svg` below.
 */
const RASTER = {
  planFree: require('@/assets/fieldflix-web/premium/plan-bg-free.png'),
  planPro: require('@/assets/fieldflix-web/premium/plan-bg-pro.png'),
  planPrem: require('@/assets/fieldflix-web/premium/plan-bg-premium.png'),
  payUpi: require('@/assets/fieldflix-web/premium/pay-upi.png'),
  payVisa: require('@/assets/fieldflix-web/premium/pay-visa-mc.png'),
  /** Design ticks — real PNGs so Android `mergeReleaseResources` stays valid. */
  insideplanTick: require('@/assets/fieldflix-web/premium/insideplan-tick.png'),
  featureTick: require('@/assets/fieldflix-web/premium/feature-tick.png'),
} as const;

const BG = '#020617';
const MUTED = '#94a3b8';
const BORDER = 'rgba(100,116,139,0.5)';
const ACCENT = '#22c55e';
const PLAN_CARD_W = 170;
const PLAN_GAP = 14;
const PLANS_H_PAD = 16;
/** Taller to fit 3 plan feature rows like `web/.../ProfilePremiumScreen.tsx` + `profilePremium.css`. */
const CARD_H = 258;

const PLAN_BULLETS: Record<PlanId, [string, string, string]> = {
  pro: ['Advanced features', 'Video Recording', 'View AI insights'],
  premium: ['AI features', 'AI features', 'Unlimited Storage'],
  free: ['Track Sessions', 'View basic Stats', 'View Analytics'],
};

type Pay = 'upi' | 'card' | 'netbank';

const PLAN_ORDER: { id: PlanId; name: string; sub: string; price: string; img: number }[] = [
  { id: 'free', name: 'Free Plan', sub: '(Basic)', price: '₹149', img: RASTER.planFree },
  { id: 'pro', name: 'Pro Plan', sub: '(Recommended)', price: '₹199', img: RASTER.planPro },
  { id: 'premium', name: 'Premium Plan', sub: '(Elite)', price: '₹399', img: RASTER.planPrem },
];

/**
 * Parity with `web/src/screens/ProfilePremiumScreen.tsx` + `profilePremium.css` (plan + payment art as PNG; other marks as SVG).
 * Checkout: `POST /payments/plan/create-order` → `react-native-razorpay` → `POST /payments/verify`.
 */
export default function FieldflixProfilePremiumScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [pay, setPay] = useState<Pay>('upi');
  const [plan, setPlan] = useState<PlanId>('pro');
  const [submitting, setSubmitting] = useState(false);
  const planScroll = useRef<ScrollView | null>(null);
  const planScrollViewportW = useRef(0);
  const planScrollContentW = useRef(0);

  const scrollPlansToProCenter = (contentW: number, viewportW: number) => {
    const el = planScroll.current as unknown as { scrollTo: (o: { x: number; animated: boolean }) => void } | null;
    if (!el?.scrollTo) return;
    if (viewportW <= 0 || contentW <= 0) return;
    const maxX = Math.max(0, contentW - viewportW);
    el.scrollTo({ x: maxX / 2, animated: false });
  };

  const onUpgrade = async () => {
    if (!RAZORPAY_KEY_ID) {
      Alert.alert('Payments', 'Add EXPO_PUBLIC_RAZORPAY_KEY_ID to your .env (publishable key from Razorpay).');
      return;
    }
    const token = await SecureStore.getItemAsync('token');
    if (!token?.trim()) {
      Alert.alert('Sign in required', 'Log in to create an order and complete upgrade.');
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      const order = await createPlanOrder(plan);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const RazorpayCheckout = require('react-native-razorpay').default as {
        open: (opts: Record<string, unknown>) => Promise<{
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature?: string;
        }>;
      };
      const amountPaise = String(Math.round(Number(order.amount) * 100));
      // Native module exports a class: call `RazorpayCheckout.open(...)`, not `RazorpayCheckout(...)`.
      const data = await RazorpayCheckout.open({
        key: RAZORPAY_KEY_ID,
        name: 'FieldFlicks',
        description: `FieldFlicks — ${plan} plan`,
        order_id: order.razorpay_order_id,
        currency: order.currency ?? 'INR',
        amount: amountPaise,
        theme: { color: '#22C55E' },
        /** Lets support correlate UI selection with the checkout session. Razorpay still shows all methods. */
        notes: { fieldflicks_preferred_method: pay },
      });
      await verifyRazorpayPayment({
        razorpay_order_id: data.razorpay_order_id,
        razorpay_payment_id: data.razorpay_payment_id,
        status: 'completed',
      });
      // Refresh server-truth entitlement so paywalled UI (preview cap, lock badges)
      // unlocks immediately when the user navigates back to a video.
      try {
        await refreshEntitlement();
      } catch {
        // entitlement cache will catch up on next app focus — non-fatal
      }
      Alert.alert('Payment', 'Your payment was received. Your plan will be activated shortly.');
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const st = e.response?.status;
        if (st === 401) {
          Alert.alert('Session expired', 'Sign in again, then try Upgrade.');
          return;
        }
        if (st === 404) {
          Alert.alert(
            'Payment',
            `Plan checkout is not available at this API (POST /payments/plan/create-order returned 404). ` +
              `Point EXPO_PUBLIC_BASE_URL at a server that has the FieldFlicks payment module deployed, or use your local API (e.g. http://LAN_IP:PORT). ` +
              `Current base: ${BASE_URL}`,
          );
          return;
        }
      }
      const msg = getFieldflixApiErrorMessage(e, 'Could not complete payment');
      if (String(msg).toLowerCase().includes('user')) {
        // user cancelled
        return;
      }
      Alert.alert('Payment', msg);
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
          contentContainerStyle={[styles.pageScrollContent, { paddingBottom: 28 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.max}>
            <View style={styles.kickerRow}>
              <IconKicker />
              <Text style={styles.kicker}>Unlock your potential</Text>
            </View>

            <Text style={styles.heroTitle}>Upgrade Your Game</Text>
            <Text style={styles.heroSub}>Unlock advanced features and insights</Text>

            <ScrollView
              ref={planScroll}
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              onLayout={(e) => {
                const vw = e.nativeEvent.layout.width;
                planScrollViewportW.current = vw;
                scrollPlansToProCenter(planScrollContentW.current, vw);
              }}
              onContentSizeChange={(w) => {
                planScrollContentW.current = w;
                scrollPlansToProCenter(w, planScrollViewportW.current);
              }}
              contentContainerStyle={styles.plansScroll}
            >
              {PLAN_ORDER.map((p) => {
                const on = plan === p.id;
                const bullets = PLAN_BULLETS[p.id];
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setPlan(p.id)}
                    style={[styles.planPress, { width: PLAN_CARD_W }]}
                  >
                    {p.id === 'pro' ? (
                      <View style={styles.popularOnPro} pointerEvents="none">
                        <LinearGradient
                          colors={['#22c55e', '#16a34a']}
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
                      style={[styles.planBg, { width: PLAN_CARD_W, height: CARD_H }]}
                      imageStyle={styles.planBgImage}
                      resizeMode="cover"
                    >
                      {on ? <View style={styles.planSelectedRing} pointerEvents="none" /> : null}
                      <View style={styles.planPad}>
                        <Text style={styles.planName}>{p.name}</Text>
                        <Text style={styles.planSub}>{p.sub}</Text>
                        <View style={styles.priceRow}>
                          <Text style={styles.priceNum}>{p.price.replace('₹', '₹')}</Text>
                          <Text style={styles.priceMo}> /month</Text>
                        </View>
                        <View style={styles.planBullets}>
                          {bullets.map((line, bi) => (
                            <View key={`${p.id}-${bi}`} style={styles.planBulletRow}>
                              <Image source={RASTER.insideplanTick} style={styles.tickInside} resizeMode="contain" />
                              <Text style={styles.planBulletText}>{line}</Text>
                            </View>
                          ))}
                        </View>
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
                  <Image source={RASTER.featureTick} style={styles.tickFeature} resizeMode="contain" />
                  <Text style={styles.fText}>Advanced Analytics</Text>
                </View>
                <View style={styles.fLine}>
                  <Image source={RASTER.featureTick} style={styles.tickFeature} resizeMode="contain" />
                  <Text style={styles.fText}>Video Recording & Replays</Text>
                </View>
                <View style={styles.fLine}>
                  <Image source={RASTER.featureTick} style={styles.tickFeature} resizeMode="contain" />
                  <Text style={styles.fText}>AI-Powered Performance Insights</Text>
                </View>
                <View style={styles.fLine}>
                  <Image source={RASTER.featureTick} style={styles.tickFeature} resizeMode="contain" />
                  <Text style={styles.fText}>Unlimited Data Storage</Text>
                </View>
              </View>
            </View>

            <View style={styles.pmHeader}>
              <Text style={styles.pmTitle}>Payment Methods</Text>
              <Text style={styles.pmSub}>Secure checkout with Razorpay. Choose a preferred method below, then pay in the Razorpay sheet.</Text>
            </View>

            <Pressable
              onPress={() => setPay('upi')}
              style={[styles.payRow, pay === 'upi' && styles.payRowOn]}
              accessibilityRole="button"
            >
              <View style={styles.payLeft}>
                <Image source={RASTER.payUpi} style={styles.payUpi} resizeMode="cover" />
                <Text style={styles.payTxt} numberOfLines={1}>
                  UPI
                </Text>
              </View>
              <IconPayChevron />
            </Pressable>

            <Pressable
              onPress={() => setPay('card')}
              style={[styles.payRow, pay === 'card' && styles.payRowOn]}
              accessibilityRole="button"
            >
              <View style={styles.payLeft}>
                <IconPayCard />
                <Text style={styles.payTxt} numberOfLines={2}>
                  Credit / Debit Card
                </Text>
              </View>
              <Image source={RASTER.payVisa} style={styles.payVisa} resizeMode="contain" />
            </Pressable>

            <Pressable
              onPress={() => setPay('netbank')}
              style={[styles.payRow, pay === 'netbank' && styles.payRowOn]}
              accessibilityRole="button"
            >
              <View style={styles.payLeft}>
                <IconPayBank />
                <Text style={styles.payTxt} numberOfLines={1}>
                  Net Banking
                </Text>
              </View>
              <View style={styles.payRowSpacer} />
            </Pressable>

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
                  colors={['#22c55e', '#16a34a']}
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

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: 0 },
  pageScroll: { flex: 1 },
  pageScrollContent: { flexGrow: 1 },
  max: { width: '100%', maxWidth: 402, alignSelf: 'center', alignItems: 'stretch' },
  kickerRow: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(34,197,94,0.2)',
  },
  kickerIcon: { width: 16, height: 16 },
  kicker: { fontFamily: FF.semiBold, fontSize: 12, color: '#fff' },
  heroTitle: {
    marginTop: 10,
    fontFamily: FF.extraBold,
    fontSize: 24,
    lineHeight: 32,
    color: '#fff',
    textAlign: 'center',
  },
  heroSub: { marginTop: 4, fontFamily: FF.semiBold, fontSize: 12, color: MUTED, textAlign: 'center' },
  popularPill: { paddingHorizontal: 15, paddingVertical: 5, borderRadius: 20 },
  popularText: { fontFamily: FF.semiBold, fontSize: 14, color: '#fff' },
  /** Sits on the Pro card (not a separate row). */
  popularOnPro: { position: 'absolute', top: -11, left: 0, right: 0, zIndex: 3, alignItems: 'center' },
  plansScroll: {
    marginTop: 10,
    paddingLeft: PLANS_H_PAD,
    paddingRight: PLANS_H_PAD + 8,
    paddingTop: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    gap: PLAN_GAP,
    alignItems: 'flex-start',
  },
  planPress: { position: 'relative' },
  planBg: { borderRadius: 20, overflow: 'hidden' },
  planBgImage: { borderRadius: 20 },
  planSelectedRing: { ...StyleSheet.absoluteFillObject, borderRadius: 20, borderWidth: 2, borderColor: ACCENT },
  planPad: { padding: 16, paddingBottom: 14, justifyContent: 'flex-start' },
  planName: { fontFamily: FF.bold, fontSize: 16, color: '#fff' },
  planSub: { marginTop: 2, fontFamily: FF.semiBold, fontSize: 12, color: MUTED },
  priceRow: { marginTop: 6, flexDirection: 'row', alignItems: 'baseline' },
  priceNum: { fontFamily: FF.bold, fontSize: 24, color: '#fff' },
  priceMo: { fontFamily: FF.semiBold, fontSize: 12, color: MUTED },
  planBullets: { marginTop: 6, gap: 2 },
  planBulletRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  tickInside: { width: 18, height: 18, flexShrink: 0 },
  planBulletText: { flex: 1, fontFamily: FF.semiBold, fontSize: 12, lineHeight: 16, color: MUTED },
  featSection: {
    marginTop: 16,
    paddingHorizontal: 16,
    width: '100%',
    alignSelf: 'stretch',
  },
  featBlock: { gap: 8, width: '100%' },
  featListTitle: { fontFamily: FF.bold, fontSize: 20, color: '#fff', marginBottom: 4 },
  fLine: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  tickFeature: { width: 20, height: 20, flexShrink: 0 },
  fText: { flex: 1, minWidth: 0, fontFamily: FF.semiBold, fontSize: 16, color: '#fff' },
  pmHeader: { marginTop: 30, marginHorizontal: 20, marginBottom: 14 },
  pmTitle: { fontFamily: FF.bold, fontSize: 20, color: '#fff' },
  pmSub: { marginTop: 6, fontFamily: FF.regular, fontSize: 12, lineHeight: 17, color: MUTED },
  payRow: {
    marginHorizontal: 20,
    marginBottom: 12,
    minHeight: 55,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#1e1e22',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  payRowOn: { borderColor: ACCENT },
  payLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, paddingRight: 4 },
  payUpi: { width: 28, height: 27 },
  payIcon24: { width: 24, height: 24 },
  payTxt: { fontFamily: FF.semiBold, fontSize: 20, lineHeight: 27, color: MUTED, flex: 1 },
  payVisa: { width: 61, height: 25 },
  payRowSpacer: { width: 24, height: 24 },
  /** Same horizontal inset as `payRow` so width matches; stretch fixes Pressable hugging text (no green pill) on some builds. */
  upgradeShell: {
    marginTop: 24,
    marginHorizontal: 20,
    alignSelf: 'stretch',
  },
  upgradePress: {
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  upgradeGrad: {
    minHeight: 56,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...gradientPillInner,
  },
  upText: { fontFamily: FF.bold, fontSize: 20, textAlign: 'center', color: WEB.white },
});
