import { getPaymentHistory, type PaymentHistoryRow } from '@/lib/fieldflix-api';
import {
  readLocalPaymentHistory,
  type LocalPaymentHistoryItem,
} from '@/lib/paymentHistoryLocal';
import { FF } from '@/screens/fieldflix/fonts';
import { WebShell } from '@/screens/fieldflix/WebShell';
import { BackHeader } from '@/screens/fieldflix/profile/BackHeader';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BG = '#00050A';

/** Mirrors `web/src/screens/ProfilePaymentHistoryScreen.tsx`. */
export default function FieldflixProfilePaymentHistoryScreen() {
  const insets = useSafeAreaInsets();
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
    const normalizedServer = serverRows.map((s) => ({
      id: `srv-${s.id}`,
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
    const normalizedLocal = localRows.map((l) => ({
      id: `loc-${l.id}`,
      title:
        l.amountInr === 0
          ? `${l.sport} unlock (free)`
          : `${l.sport} recording unlock`,
      subtitle: l.note,
      amount: Number(l.amountInr ?? 0),
      currency: l.currency ?? 'INR',
      status: l.status,
      ts: Date.parse(l.createdAtIso),
    }));
    return [...normalizedLocal, ...normalizedServer].sort((a, b) => b.ts - a.ts);
  }, [localRows, serverRows]);

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
                <MaterialCommunityIcons name="wallet-outline" size={40} color="rgba(255,255,255,0.3)" />
              </View>
              <Text style={styles.emptyCopy}>
                No transactions yet. When you subscribe or make a purchase, your receipts will appear here.
              </Text>
            </>
          ) : (
            <View style={styles.list}>
              {rows.map((r) => (
                <View key={r.id} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{r.title}</Text>
                    <Text style={styles.rowSub}>{r.subtitle}</Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={styles.rowAmt}>₹{Math.round(r.amount)}</Text>
                    <Text style={styles.rowStatus}>{r.status}</Text>
                  </View>
                </View>
              ))}
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
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowTitle: {
    fontFamily: FF.semiBold,
    fontSize: 13,
    color: '#fff',
  },
  rowSub: {
    marginTop: 2,
    fontFamily: FF.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
  },
  rowRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  rowAmt: {
    fontFamily: FF.bold,
    fontSize: 14,
    color: '#4ade80',
  },
  rowStatus: {
    marginTop: 2,
    fontFamily: FF.medium,
    fontSize: 10,
    color: 'rgba(255,255,255,0.65)',
    textTransform: 'capitalize',
  },
});
