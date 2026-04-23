import { FF } from '@/screens/fieldflix/fonts';
import { WebShell } from '@/screens/fieldflix/WebShell';
import { WEB } from '@/screens/fieldflix/webDesign';
import { BackHeader } from '@/screens/fieldflix/profile/BackHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Path, Rect, Stop } from 'react-native-svg';

type PaymentMethod = 'upi' | 'card' | 'netbank';

const PG = '#22c55e';
const PG_SOFT = '#4ade80';
const PG_DEEP = '#166534';
const MUTED = '#94a3b8';
const CARD_BG = '#0f1218';
const CARD_BORDER = 'rgba(100,116,139,0.5)';

type Plan = {
  id: 'free' | 'pro' | 'premium';
  name: string;
  tagline: string;
  price: string;
  features: string[];
  recommended?: boolean;
};

const PLANS: Plan[] = [
  { id: 'free', name: 'Free Plan', tagline: '(Basic)', price: '₹149', features: ['Track Sessions', 'View basic Stats', 'View Analyts'] },
  { id: 'pro', name: 'Pro Plan', tagline: '(Recommended)', price: '₹199', features: ['Advanced features', 'Video Recording', 'View AI insights'], recommended: true },
  { id: 'premium', name: 'Premium Plan', tagline: '(Elite)', price: '₹399', features: ['AI features', 'AI features', 'Unlimited Storage'] },
];

/** Matches `web/src/screens/ProfilePremiumScreen.tsx` visual design. */
export default function FieldflixProfilePremiumScreen() {
  const insets = useSafeAreaInsets();
  const [payment, setPayment] = useState<PaymentMethod>('upi');
  const [plan, setPlan] = useState<Plan['id']>('pro');

  return (
    <WebShell backgroundColor="#020617">
      <View style={styles.flex}>
        <BackHeader title="" bottomBorder={false} />
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scroll, { paddingBottom: 40 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.kickerRow}>
            <CrownIcon />
            <Text style={styles.kicker}>Unlock your potential</Text>
          </View>

          <Text style={styles.heroTitle}>Upgrade Your Game</Text>
          <Text style={styles.heroSub}>Unlock advanced features and insights</Text>

          <View style={styles.popularWrap}>
            <LinearGradient
              colors={['#22c55e', '#16a34a']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.popularPill}
            >
              <Text style={styles.popularText}>Most Popular</Text>
            </LinearGradient>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.plansRow}
          >
            {PLANS.map((p) => {
              const selected = plan === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setPlan(p.id)}
                  style={[styles.planCard, selected && styles.planCardSelected]}
                >
                  {selected ? (
                    <LinearGradient
                      colors={['rgba(34,197,94,0.18)', 'rgba(22,101,52,0.08)']}
                      style={StyleSheet.absoluteFill}
                    />
                  ) : null}
                  <View style={styles.planHead}>
                    <Text style={styles.planName}>{p.name}</Text>
                    <Text style={styles.planTag}>{p.tagline}</Text>
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={styles.price}>{p.price}</Text>
                    <Text style={styles.perMonth}> /month</Text>
                  </View>
                  <View style={styles.featureList}>
                    {p.features.map((f, idx) => (
                      <View key={`${f}-${idx}`} style={styles.featureRow}>
                        <CheckDot />
                        <Text style={styles.featureText}>{f}</Text>
                      </View>
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.recordingsCard}>
            <View style={styles.recordingsHead}>
              <View style={styles.recordingsHeadLeft}>
                <VideoIcon />
                <Text style={styles.recordingsTitle}>Recordings</Text>
              </View>
              <View style={styles.dotOuter}>
                <View style={styles.dotInner} />
              </View>
            </View>
            <Text style={styles.recordingsBody}>
              Access full match recordings anytime, on demand.
            </Text>
          </View>

          <View style={styles.featuresCard}>
            <Text style={styles.featuresCardTitle}>Feature List</Text>
            <FeatureRow icon={<ChartIcon />} label="Advanced Analytics" />
            <FeatureRow icon={<PlayIcon />} label="Video Recording & Replays" />
            <FeatureRow icon={<BrainIcon />} label="AI-Powered Performance Insights" />
            <FeatureRow icon={<DatabaseIcon />} label="Unlimited Data Storage" />
          </View>

          <Text style={styles.paymentTitle}>Payment Methods</Text>

          <PaymentRow
            active={payment === 'upi'}
            onPress={() => setPayment('upi')}
            left={
              <View style={styles.payLeft}>
                <UpiLogo />
                <Text style={styles.payLabel}>UPI</Text>
              </View>
            }
            right={<UpiArrowIcon />}
          />

          <PaymentRow
            active={payment === 'card'}
            onPress={() => setPayment('card')}
            left={
              <View style={styles.payLeft}>
                <CardIcon />
                <Text style={styles.payLabel}>Credit / Debit Card</Text>
              </View>
            }
            right={<VisaMcLogo />}
          />

          <PaymentRow
            active={payment === 'netbank'}
            onPress={() => setPayment('netbank')}
            left={
              <View style={styles.payLeft}>
                <BankIcon />
                <Text style={styles.payLabel}>Net Banking</Text>
              </View>
            }
          />

          <Pressable style={styles.upgradeBtn}>
            <Text style={styles.upgradeText}>Upgrade Now</Text>
          </Pressable>
        </ScrollView>
      </View>
    </WebShell>
  );
}

/* -------------------------- Small presentational -------------------------- */

function FeatureRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={styles.featLine}>
      <View style={styles.featIcon}>{icon}</View>
      <Text style={styles.featLabel}>{label}</Text>
    </View>
  );
}

function PaymentRow({
  active,
  onPress,
  left,
  right,
}: {
  active: boolean;
  onPress: () => void;
  left: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.paymentRow, active && styles.paymentRowActive]}
    >
      {left}
      <View>{right}</View>
    </Pressable>
  );
}

/* ------------------------------ SVG icons ------------------------------- */

function CrownIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill={PG}>
      <Path d="M3 18l2-9 4 3 3-6 3 6 4-3 2 9H3zm0 2h18v2H3v-2z" />
    </Svg>
  );
}

function CheckDot() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={10} fill={PG} />
      <Path
        d="M7 12.5l3.2 3.2L17 9"
        stroke="#fff"
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

function VideoIcon() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Rect x={2} y={6} width={14} height={12} rx={3} stroke={PG} strokeWidth={2} />
      <Path
        d="M16 10l5-2.6a.6.6 0 0 1 .9.5v8.2a.6.6 0 0 1-.9.5L16 14"
        stroke={PG}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChartIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 20V4m0 16h18M7 14l4-4 3 3 5-6"
        stroke={PG}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PlayIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={PG} strokeWidth={2} />
      <Path d="M10 8.5l6 3.5-6 3.5V8.5z" fill={PG} />
    </Svg>
  );
}

function BrainIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 4a3 3 0 0 0-3 3 2.5 2.5 0 0 0-1 4.8A3 3 0 0 0 7 17a3 3 0 0 0 5 1.2A3 3 0 0 0 17 17a3 3 0 0 0 2-5.2A2.5 2.5 0 0 0 18 7a3 3 0 0 0-3-3 3 3 0 0 0-3 1.5A3 3 0 0 0 9 4zM12 5.5v13"
        stroke={PG}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function DatabaseIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"
        stroke={PG}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function UpiLogo() {
  // UPI/BHIM-style mark: orange + green triangle inside, framed
  return (
    <Svg width={30} height={26} viewBox="0 0 30 26">
      <Rect x={0.5} y={0.5} width={29} height={25} rx={4} fill="#fff" stroke="#e5e7eb" />
      <Path d="M6 19L12 5h3l-6 14H6z" fill="#f97316" />
      <Path d="M14 19L20 5h3l-6 14h-3z" fill="#10b981" />
    </Svg>
  );
}

function UpiArrowIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 17L17 7M8 7h9v9"
        stroke={MUTED}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CardIcon() {
  return (
    <Svg width={26} height={20} viewBox="0 0 26 20" fill="none">
      <Defs>
        <SvgLinearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#3b82f6" />
          <Stop offset="1" stopColor="#1e40af" />
        </SvgLinearGradient>
      </Defs>
      <Rect x={0.5} y={0.5} width={25} height={19} rx={3} fill="url(#cardGrad)" />
      <Rect x={2} y={6} width={22} height={2.5} fill="#1e293b" />
      <Rect x={3} y={12} width={6} height={1.5} rx={0.5} fill="#bfdbfe" />
      <Rect x={3} y={14.5} width={8} height={1.5} rx={0.5} fill="#bfdbfe" />
    </Svg>
  );
}

function VisaMcLogo() {
  return (
    <Svg width={58} height={22} viewBox="0 0 58 22">
      {/* Visa wordmark */}
      <Path
        d="M3 16l3-10h2l-3 10H3zm5-5c.3-1.8 1.6-3 3.4-3 .7 0 1.3.1 1.7.3l-.4 1.5c-.3-.1-.7-.2-1-.2-.7 0-1.2.3-1.3 1l-.3 1.8h-1.5l.3-1.8c.2-.8.6-1.3 1.1-1.6zm6 5l.6-2h1.5l.2.9h1.5l-1.2-4.5h-1.3l-2.6 4.5H14zm2.5-2.8l.5 1.3h-1l.5-1.3zM22 10l1.5 2 1-2h2l-2 3.5 1.6 3h-2l-1-2-1.3 2h-2l2.5-3.5L20 10h2z"
        fill="#1a1f71"
      />
      {/* Mastercard circles */}
      <Circle cx={42} cy={11} r={6} fill="#eb001b" />
      <Circle cx={50} cy={11} r={6} fill="#f79e1b" opacity={0.9} />
    </Svg>
  );
}

function BankIcon() {
  return (
    <Svg width={26} height={24} viewBox="0 0 26 24" fill="none">
      <Path
        d="M13 2L2 8h22L13 2zm-9 8v9m5-9v9m8-9v9m5-9v9M2 21h22"
        stroke={MUTED}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/* ---------------------------------- styles --------------------------------- */

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  kickerRow: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(34,197,94,0.2)',
  },
  kicker: {
    fontFamily: FF.semiBold,
    fontSize: 12,
    color: '#fff',
    lineHeight: 16,
  },
  heroTitle: {
    marginTop: 10,
    fontFamily: FF.bold,
    fontSize: 26,
    lineHeight: 32,
    color: WEB.white,
    letterSpacing: 0.24,
    textAlign: 'center',
  },
  heroSub: {
    marginTop: 2,
    fontFamily: FF.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: MUTED,
    textAlign: 'center',
  },
  popularWrap: {
    alignItems: 'center',
    marginTop: 17,
  },
  popularPill: {
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
  },
  popularText: {
    fontFamily: FF.semiBold,
    fontSize: 14,
    color: '#fff',
    lineHeight: 19,
  },
  plansRow: {
    gap: 12,
    paddingVertical: 16,
    paddingRight: 4,
  },
  planCard: {
    width: 170,
    minHeight: 230,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: CARD_BG,
    overflow: 'hidden',
  },
  planCardSelected: {
    borderColor: PG,
    borderWidth: 2,
    shadowColor: PG,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  planHead: {
    marginBottom: 8,
  },
  planName: {
    fontFamily: FF.bold,
    fontSize: 16,
    lineHeight: 22,
    color: WEB.white,
  },
  planTag: {
    marginTop: 2,
    fontFamily: FF.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: MUTED,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
    marginTop: 4,
  },
  price: {
    fontFamily: FF.bold,
    fontSize: 24,
    lineHeight: 33,
    color: WEB.white,
  },
  perMonth: {
    fontFamily: FF.semiBold,
    fontSize: 12,
    color: MUTED,
  },
  featureList: {
    gap: 4,
    marginTop: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    flex: 1,
    fontFamily: FF.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: MUTED,
  },
  recordingsCard: {
    marginTop: 12,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: '#1e1e22',
  },
  recordingsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  recordingsHeadLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  recordingsTitle: {
    fontFamily: FF.bold,
    fontSize: 20,
    lineHeight: 27,
    color: WEB.white,
  },
  dotOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(34,197,94,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PG,
  },
  recordingsBody: {
    fontFamily: FF.semiBold,
    fontSize: 14,
    lineHeight: 19,
    color: MUTED,
  },
  featuresCard: {
    marginTop: 20,
    gap: 10,
  },
  featuresCardTitle: {
    fontFamily: FF.bold,
    fontSize: 20,
    lineHeight: 27,
    color: WEB.white,
    marginBottom: 2,
  },
  featLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  featIcon: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featLabel: {
    flex: 1,
    fontFamily: FF.semiBold,
    fontSize: 16,
    lineHeight: 22,
    color: WEB.white,
  },
  paymentTitle: {
    marginTop: 28,
    marginBottom: 14,
    fontFamily: FF.bold,
    fontSize: 20,
    lineHeight: 27,
    color: WEB.white,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 55,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: '#1e1e22',
    marginBottom: 12,
  },
  paymentRowActive: {
    borderColor: PG,
  },
  payLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  payLabel: {
    fontFamily: FF.semiBold,
    fontSize: 18,
    lineHeight: 24,
    color: MUTED,
  },
  upgradeBtn: {
    marginTop: 30,
    alignSelf: 'center',
    width: '90%',
    maxWidth: 332,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PG,
    shadowColor: PG,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  upgradeText: {
    fontFamily: FF.bold,
    fontSize: 20,
    lineHeight: 27,
    color: WEB.white,
  },
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepDeep = PG_SOFT + PG_DEEP;
