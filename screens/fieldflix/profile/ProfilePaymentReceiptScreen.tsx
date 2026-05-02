import {
  getPaymentById,
  type PaymentReceiptDetail,
} from '@/lib/fieldflix-api';
import { readLocalPaymentHistory, type LocalPaymentHistoryItem } from '@/lib/paymentHistoryLocal';
import { FF } from '@/screens/fieldflix/fonts';
import { WebShell } from '@/screens/fieldflix/WebShell';
import { BackHeader } from '@/screens/fieldflix/profile/BackHeader';
import { buildPaymentInvoiceText, type InvoiceInput } from '@/utils/paymentInvoiceText';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BG = '#00050A';
const GREEN = '#22C55E';
const RED = '#F87171';

function formatPaidAt(label: string | null | undefined, createdAt: string | undefined): string {
  const raw = label || createdAt;
  if (!raw) return '—';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw);
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusTitle(status: string): string {
  const s = String(status ?? '').toLowerCase();
  if (s === 'completed') return 'Payment Successful';
  if (s === 'failed') return 'Payment Failed';
  return `Payment ${s || 'pending'}`;
}

function deriveInvoiceFromServer(p: PaymentReceiptDetail): InvoiceInput {
  const total = Number(p.amount ?? 0);
  const base = Number(p.base_amount ?? 0);
  const gst = Math.max(0, total - base);
  const turf = p.recording?.turf;
  const venueName = turf?.name?.trim() || p.recording?.recording_name?.trim() || 'FieldFlicks';
  const venueArea =
    turf?.address_line?.trim()?.split(',').slice(0, 2).join(', ') || 'India';
  const sportLine =
    p.payment_type === 'recording_access'
      ? `${sportLabelFromDescription(String(p.description ?? ''))} session`
      : 'Media unlock';
  return {
    title: statusTitle(String(p.status)),
    amountInr: total,
    status: String(p.status ?? ''),
    paidAtLabel: formatPaidAt(p.paid_at, p.created_at),
    venueName,
    venueArea,
    serviceLines: [
      sportLine,
      'Full match playback',
      p.payment_type === 'recording_access' ? 'Highlight included' : 'Sessions included',
    ],
    paymentMethod: 'UPI',
    orderId: p.razorpay_order_id ?? '—',
    paymentId:
      p.razorpay_payment_id?.trim() ||
      (total <= 0 ? p.razorpay_order_id ?? '—' : 'Pending capture'),
    recordingFeeInr: base,
    gstInr: gst,
  };
}

function sportLabelFromDescription(desc: string): string {
  const d = desc.toLowerCase();
  if (d.includes('padel')) return 'Padel';
  if (d.includes('cricket')) return 'Cricket';
  return 'Pickleball';
}

function deriveInvoiceFromLocal(l: LocalPaymentHistoryItem): InvoiceInput {
  const total = Number(l.amountInr ?? 0);
  const base =
    total <= 0
      ? 0
      : l.sport === 'pickleball'
        ? 200
        : l.sport === 'padel'
          ? 250
          : 0;
  const gst = Math.max(0, total - base);
  return {
    title: statusTitle(String(l.status)),
    amountInr: total,
    status: String(l.status),
    paidAtLabel: formatPaidAt(null, l.createdAtIso),
    venueName: 'FieldFlicks',
    venueArea: l.note || `Recording ${l.recordingId.slice(0, 8)}…`,
    serviceLines: [
      `${l.sport} session`,
      'Full match playback',
      'Highlight included',
    ],
    paymentMethod: 'UPI',
    orderId: l.razorpay_order_id ?? '—',
    paymentId:
      l.razorpay_payment_id?.trim() ||
      l.server_payment_id?.trim() ||
      l.razorpay_order_id ||
      '—',
    recordingFeeInr: base,
    gstInr: gst,
  };
}

export default function ProfilePaymentReceiptScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ paymentId?: string; locId?: string }>();
  const paymentIdRaw = params.paymentId;
  const locIdRaw = params.locId;
  const paymentId =
    typeof paymentIdRaw === 'string' ? paymentIdRaw : paymentIdRaw?.[0];
  const locId = typeof locIdRaw === 'string' ? locIdRaw : locIdRaw?.[0];

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<InvoiceInput | null>(null);
  const [slug, setSlug] = useState('receipt');

  const load = useCallback(async () => {
    setLoading(true);
    setInvoice(null);
    try {
      if (paymentId?.trim()) {
        const p = await getPaymentById(paymentId.trim());
        setSlug(paymentId.slice(0, 8));
        setInvoice(deriveInvoiceFromServer(p));
        return;
      }
      if (locId?.trim()) {
        const list = await readLocalPaymentHistory();
        const found = list.find((x) => x.id === locId.trim());
        if (found) {
          setSlug(locId.slice(0, 12));
          setInvoice(deriveInvoiceFromLocal(found));
          return;
        }
      }
      setInvoice(null);
    } catch {
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  }, [paymentId, locId]);

  useEffect(() => {
    void load();
  }, [load]);

  const statusColor = useMemo(() => {
    const st = invoice?.status?.toLowerCase() ?? '';
    if (st === 'completed') return GREEN;
    if (st === 'failed') return RED;
    return 'rgba(255,255,255,0.72)';
  }, [invoice?.status]);

  const exportTxt = invoice ? buildPaymentInvoiceText(invoice) : '';

  const onDownloadInvoice = useCallback(async () => {
    if (!invoice || !exportTxt.trim()) return;
    try {
      const dir = FileSystem.cacheDirectory;
      if (!dir) throw new Error('no cache');
      const path = `${dir}fieldflicks-receipt-${slug}.txt`;
      await FileSystem.writeAsStringAsync(path, exportTxt);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { mimeType: 'text/plain', dialogTitle: 'Invoice' });
      } else if (Platform.OS === 'web') {
        Alert.alert(
          'Receipt',
          'Sharing is not available in this preview. Copy the invoice text instead.',
        );
      } else {
        await Share.share({ message: exportTxt, title: 'Invoice' });
      }
    } catch (e) {
      Alert.alert('Invoice', String(e ?? 'Could not prepare file'));
    }
  }, [exportTxt, invoice, slug]);

  const onShareReceipt = useCallback(async () => {
    if (!invoice || !exportTxt.trim()) return;
    try {
      await Share.share({ message: exportTxt, title: 'FieldFlicks receipt' });
    } catch {
      /* dismissed */
    }
  }, [exportTxt, invoice]);

  return (
    <WebShell backgroundColor={BG}>
      <View style={styles.flex}>
        <BackHeader title="Receipt" />
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: 32 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <ActivityIndicator color="#4ade80" style={{ marginTop: 48 }} />
          ) : !invoice ? (
            <Text style={styles.empty}>Could not load this payment.</Text>
          ) : (
            <>
              <Text style={[styles.statusBig, { color: statusColor }]}>
                {invoice.title}
              </Text>
              <Text style={styles.amount}>₹{Math.round(invoice.amountInr)}</Text>
              <Text style={styles.timestamp}>{invoice.paidAtLabel}</Text>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Venue Information</Text>
                <Text style={styles.body}>{invoice.venueName}</Text>
                <Text style={styles.bodyMuted}>{invoice.venueArea}</Text>

                <Text style={[styles.sectionTitle, styles.mt]}>Service Details</Text>
                {invoice.serviceLines.map((line) => (
                  <Text key={line} style={styles.bullet}>
                    • {line}
                  </Text>
                ))}

                <Text style={[styles.sectionTitle, styles.mt]}>Payment Details</Text>
                <Text style={styles.body}>
                  Payment Method:{' '}
                  <Text style={styles.bodyStrong}>{invoice.paymentMethod}</Text>
                </Text>
                <Text style={styles.body}>
                  Razorpay order:{' '}
                  <Text style={styles.bodyStrong}>{invoice.orderId}</Text>
                </Text>
                <Text style={styles.body}>
                  Transaction ID:{' '}
                  <Text style={styles.bodyStrong}>{invoice.paymentId}</Text>
                </Text>
                <Text style={styles.body}>
                  Status:{' '}
                  <Text style={styles.bodyStrong}>{invoice.status}</Text>
                </Text>

                <Text style={[styles.sectionTitle, styles.mt]}>Price Breakdown</Text>
                <View style={styles.rowBill}>
                  <Text style={styles.body}>Recording Fee</Text>
                  <Text style={styles.body}>₹{Math.round(invoice.recordingFeeInr)}</Text>
                </View>
                <View style={styles.rowBill}>
                  <Text style={styles.body}>GST</Text>
                  <Text style={styles.body}>₹{Math.round(invoice.gstInr)}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.rowBill}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>₹{Math.round(invoice.amountInr)}</Text>
                </View>
              </View>

              <Pressable style={styles.btnPrimary} onPress={() => void onDownloadInvoice()}>
                <Text style={styles.btnPrimaryText}>Download Invoice</Text>
              </Pressable>
              <Pressable style={styles.btnGhost} onPress={() => void onShareReceipt()}>
                <Text style={styles.btnGhostText}>Share Receipt</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </View>
    </WebShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: 22,
    paddingTop: 8,
    alignItems: 'stretch',
  },
  empty: {
    marginTop: 48,
    textAlign: 'center',
    fontFamily: FF.regular,
    fontSize: 15,
    color: 'rgba(255,255,255,0.55)',
  },
  statusBig: {
    marginTop: 8,
    textAlign: 'center',
    fontFamily: FF.bold,
    fontSize: 18,
  },
  amount: {
    marginTop: 10,
    textAlign: 'center',
    fontFamily: FF.bold,
    fontSize: 36,
    color: '#fff',
  },
  timestamp: {
    marginTop: 6,
    textAlign: 'center',
    fontFamily: FF.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  card: {
    marginTop: 22,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 18,
  },
  sectionTitle: {
    fontFamily: FF.bold,
    fontSize: 13,
    color: '#fff',
  },
  mt: { marginTop: 16 },
  body: {
    marginTop: 6,
    fontFamily: FF.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
  },
  bodyMuted: {
    marginTop: 2,
    fontFamily: FF.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
  bullet: {
    marginTop: 4,
    fontFamily: FF.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
  },
  bodyStrong: {
    fontFamily: FF.semiBold,
    color: '#fff',
  },
  rowBill: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  divider: {
    marginTop: 12,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  totalLabel: {
    marginTop: 12,
    fontFamily: FF.bold,
    fontSize: 14,
    color: '#fff',
  },
  totalValue: {
    marginTop: 12,
    fontFamily: FF.bold,
    fontSize: 14,
    color: '#fff',
  },
  btnPrimary: {
    marginTop: 22,
    borderRadius: 14,
    backgroundColor: '#fff',
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontFamily: FF.semiBold,
    fontSize: 15,
    color: '#0a0f14',
  },
  btnGhost: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnGhostText: {
    fontFamily: FF.semiBold,
    fontSize: 15,
    color: '#fff',
  },
});
