import { Paths } from '@/data/paths';
import { getPaymentHistory, type PaymentHistoryRow } from '@/lib/fieldflix-api';
import {
  readLocalPaymentHistory,
  type LocalPaymentHistoryItem,
} from '@/lib/paymentHistoryLocal';
import { FF } from '@/screens/fieldflix/fonts';
import { WebShell } from '@/screens/fieldflix/WebShell';
import { BackHeader } from '@/screens/fieldflix/profile/BackHeader';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BG = '#00050A';

type HistRowVM = {
  key: string;
  paymentId?: string;
  locId?: string;
  title: string;
  subtitle: string;
  amount: number;
  currency: string;
  status: string;
  ts: number;
};

/** Mirrors `web/src/screens/ProfilePaymentHistoryScreen.tsx` (mobile: tappable receipts). */
export default function FieldflixProfilePaymentHistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [serverRows, setServerRows] = useState<PaymentHistoryRow[]>([]);
  const [localRows, setLocalRows] = useState<LocalPaymentHistoryItem[]>([]);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const [server, local] = await Promise.all([
          getPaymentHistory().catch(() => []),
          readLocalPaymentHistory(),
        ]);
        if (dead) return;
        setServerRows(server);
        setLocalRows(local);
      } finally {
        if (!dead) setLoading(false);
      }
    })();
    return () => {
      dead = true;
    };
  }, []);

  const rows = useMemo(() => {
    const serverOrderIds = new Set(
      serverRows
        .map((s) => String(s.razorpay_order_id ?? '').trim())
        .filter(Boolean),
    );
    const normalizedLocalFiltered = localRows.filter((l) => {
      const o = l.razorpay_order_id?.trim();
      if (o && serverOrderIds.has(o)) return false;
      const sid = l.server_payment_id?.trim();
      if (sid && serverRows.some((s) => s.id === sid)) return false;
      return true;
    });

    const normalizedServer: HistRowVM[] = serverRows.map((s) => ({
      key: `srv-${s.id}`,
      paymentId: s.id,
      title:
        s.description?.trim() ||
        (s.payment_type === 'recording_access'
          ? 'Recording access'
          : s.payment_type === 'media_access'
            ? 'Plan purchase'
            : 'Payment'),
      subtitle: s.recording_id ? `Recording: ${s.recording_id.slice(0, 8)}…` : 'FieldFlicks',
      amount: Number(s.amount ?? 0),
      currency: s.currency ?? 'INR',
      status: String(s.status ?? 'pending'),
      ts: Date.parse(String(s.paid_at ?? s.created_at ?? new Date().toISOString())),
    }));

    const normalizedLocal: HistRowVM[] = normalizedLocalFiltered.map((l) => ({
      key: `loc-${l.id}`,
      locId: l.id,
      title:
        l.amountInr === 0
          ? `${l.sport} unlock (free)`
          : `${l.sport} recording unlock`,
      subtitle: l.note,
      amount: Number(l.amountInr ?? 0),
      currency: l.currency ?? 'INR',
      status: String(l.status ?? 'completed'),
      ts: Date.parse(l.createdAtIso),
    }));

    return [...normalizedLocal, ...normalizedServer].sort((a, b) => b.ts - a.ts);
  }, [localRows, serverRows]);

  const openReceipt = (r: HistRowVM) => {
    if (r.paymentId?.trim()) {
      router.push({
        pathname: Paths.profilePaymentReceipt,
        params: { paymentId: r.paymentId.trim() },
      });
      return;
    }
    if (r.locId?.trim()) {
      router.push({
        pathname: Paths.profilePaymentReceipt,
        params: { locId: r.locId.trim() },
      });
    }
  };

  return (
    <WebShell backgroundColor={BG}>
      <View style={styles.flex}>
        <BackHeader title="Payment History" />
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: 40 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <ActivityIndicator color="#4ade80" />
          ) : rows.length === 0 ? (
            <>
              <View style={styles.emptyIcon}>
                <MaterialCommunityIcons
                  name="wallet-outline"
                  size={40}
                  color="rgba(255,255,255,0.3)"
                />
              </View>
              <Text style={styles.emptyCopy}>
                No transactions yet. When you subscribe or make a purchase, your receipts will
                appear here.
              </Text>
            </>
          ) : (
            <View style={styles.list}>
              {rows.map((r) => {
                const isSuccess = ['paid', 'success', 'completed'].includes(r.status.toLowerCase());
                const isFailed = ['failed', 'error'].includes(r.status.toLowerCase());
                const statusColor = isSuccess ? '#22C55E' : isFailed ? '#EF4444' : '#94A3B8';
                const statusText = isSuccess ? 'Paid' : isFailed ? 'Failed' : r.status;
                
                const d = new Date(r.ts);
                const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                const timeLabel = `${dateStr}, ${timeStr}`;

                return (
                <Pressable
                  key={r.key}
                  style={styles.row}
                  onPress={() => openReceipt(r)}
                  accessibilityRole="button"
                  accessibilityLabel={`View receipt ${r.title}`}
                >
                  <View style={styles.rowIconBox}>
                    <MaterialCommunityIcons
                      name={isSuccess ? "check-circle" : isFailed ? "close-circle" : "clock"}
                      size={28}
                      color={statusColor}
                    />
                  </View>
                  <View style={styles.rowCenter}>
                    <Text style={styles.rowTitle}>{r.title}</Text>
                    <Text style={styles.rowSub}>{r.subtitle}</Text>
                    <Text style={styles.rowTs}>{timeLabel}</Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={styles.rowAmt}>₹{Math.round(r.amount)}</Text>
                    <Text style={[styles.rowStatus, { color: statusColor }]}>{statusText}</Text>
                  </View>
                </Pressable>
              )})}
            </View>
          )}
        </ScrollView>
      </View>
    </WebShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 80,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyCopy: {
    textAlign: 'center',
    fontFamily: FF.regular,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.55)',
  },
  list: {
    width: '100%',
    gap: 16,
    alignSelf: 'stretch',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#111620',
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignSelf: 'stretch',
  },
  rowIconBox: {
    marginRight: 14,
    paddingTop: 2,
  },
  rowCenter: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: FF.semiBold,
    fontSize: 14,
    color: '#fff',
  },
  rowSub: {
    marginTop: 4,
    fontFamily: FF.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  rowTs: {
    marginTop: 12,
    fontFamily: FF.medium,
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
  },
  rowRight: {
    alignItems: 'flex-end',
    paddingTop: 2,
  },
  rowAmt: {
    fontFamily: FF.bold,
    fontSize: 15,
    color: '#fff',
  },
  rowStatus: {
    marginTop: 4,
    fontFamily: FF.medium,
    fontSize: 11,
    textTransform: 'capitalize',
  },
});
