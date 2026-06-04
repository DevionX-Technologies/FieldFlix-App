import { RAZORPAY_KEY_ID } from '@/data/constants';
import {
  createRecordingPaymentOrder,
  getFieldflixApiErrorMessage,
  getRecordingById,
  type PlanOrderResponse,
  verifyRazorpayPayment,
} from '@/lib/fieldflix-api';
import { appendLocalPaymentHistory } from '@/lib/paymentHistoryLocal';
import { mergeServerUnlockedRecordingIds } from '@/lib/unlockedRecordingSync';
import { FF } from '@/screens/fieldflix/fonts';
import {
  homeSportPlanFromRecording,
  parsePlannedDurationSecFromMetadata,
  recordingSportUi,
} from '@/utils/recordingDisplay';
import { presentEventNotification } from '@/utils/presentEventNotification';
import {
  HALF_HOUR_SEC,
  formatPlannedDurationLabel,
  recordingUnlockBaseInr,
  sportPricingGstFromBase,
  sportPricingTotalFromBase,
} from '@/utils/sportPlanPricing';
import {
  persistUnlockedRecordingIds,
  readUnlockedRecordingIds,
} from '@/utils/unlockedRecordingsStorage';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const ACCENT = '#22C55E';

type Props = {
  visible: boolean;
  recordingId: string;
  onClose: () => void;
  /** Called after unlock succeeds (paid or free) so parent can refresh entitlement. */
  onUnlocked?: () => void;
};

async function unlockRecordingLocally(recordingId: string): Promise<void> {
  const id = String(recordingId).trim();
  if (!id) return;
  const list = await readUnlockedRecordingIds();
  if (list.includes(id)) return;
  await persistUnlockedRecordingIds([id, ...list].slice(0, 120));
}

/**
 * Per-recording Razorpay checkout sheet (sport-specific pricing).
 * Used from Highlights and from the video player preview paywall.
 */
export function RecordingUnlockSheet({
  visible,
  recordingId,
  onClose,
  onUnlocked,
}: Props) {
  const [recording, setRecording] = useState<any | null>(null);
  const [checkoutQuote, setCheckoutQuote] = useState<PlanOrderResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [paymentSuccessVisible, setPaymentSuccessVisible] = useState(false);

  const sportLabel = useMemo(() => {
    if (!recording) return 'Pickleball';
    return recordingSportUi(recording).sportLabel;
  }, [recording]);

  const sportPlan = useMemo<'cricket' | 'pickleball' | 'padel'>(() => {
    if (!recording) return 'pickleball';
    return homeSportPlanFromRecording(recording);
  }, [recording]);

  const plannedDurationSec = useMemo(() => {
    return (
      parsePlannedDurationSecFromMetadata(recording?.metadata) ?? HALF_HOUR_SEC
    );
  }, [recording?.metadata]);
  const basePrice = useMemo(
    () => recordingUnlockBaseInr(sportPlan, plannedDurationSec),
    [sportPlan, plannedDurationSec],
  );
  const totalAmount = useMemo(
    () => sportPricingTotalFromBase(basePrice),
    [basePrice],
  );
  const gstAmount = useMemo(
    () => sportPricingGstFromBase(basePrice),
    [basePrice],
  );
  const isFreeSportUnlock = totalAmount === 0;
  const plannedDurationLabel = useMemo(
    () => formatPlannedDurationLabel(plannedDurationSec),
    [plannedDurationSec],
  );

  const displayTotal =
    checkoutQuote != null ? Number(checkoutQuote.amount) : totalAmount;
  const displayBase =
    checkoutQuote != null && checkoutQuote.base_amount != null
      ? Number(checkoutQuote.base_amount)
      : basePrice;
  const displayGst = Math.max(0, displayTotal - displayBase);
  const isQuoteFree =
    checkoutQuote != null
      ? Number(checkoutQuote.amount) <= 0 || checkoutQuote.status === 'completed'
      : isFreeSportUnlock;

  useEffect(() => {
    if (!visible || !recordingId) {
      setRecording(null);
      setCheckoutQuote(null);
      setQuoteError(null);
      setQuoteLoading(false);
      return;
    }
    let cancelled = false;
    void getRecordingById(recordingId)
      .then((rec) => {
        if (!cancelled) setRecording(rec);
      })
      .catch(() => {
        if (!cancelled) setRecording(null);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, recordingId]);

  useEffect(() => {
    if (!visible || !recordingId) {
      setCheckoutQuote(null);
      setQuoteError(null);
      setQuoteLoading(false);
      return;
    }
    let cancelled = false;
    setQuoteLoading(true);
    setQuoteError(null);
    void createRecordingPaymentOrder(recordingId)
      .then((q) => {
        if (!cancelled) setCheckoutQuote(q);
      })
      .catch((e) => {
        if (!cancelled) {
          setCheckoutQuote(null);
          setQuoteError(getFieldflixApiErrorMessage(e, 'Could not load price'));
        }
      })
      .finally(() => {
        if (!cancelled) setQuoteLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, recordingId]);

  const closeSheet = useCallback(() => {
    if (checkoutBusy) return;
    onClose();
  }, [checkoutBusy, onClose]);

  const runCheckout = useCallback(async () => {
    if (checkoutBusy || !recordingId) return;
    const token = await SecureStore.getItemAsync('token');
    if (!token?.trim()) {
      Alert.alert('Sign in required', 'Log in to unlock this recording.');
      return;
    }
    setCheckoutBusy(true);
    try {
      const order = await createRecordingPaymentOrder(recordingId);
      const orderAmount = Number(order.amount);

      if (orderAmount === 0 || order.status === 'completed') {
        await mergeServerUnlockedRecordingIds();
        await unlockRecordingLocally(recordingId);
        await appendLocalPaymentHistory({
          id: `unlock-${recordingId}-${order.id}`,
          kind: 'recording_unlock',
          recordingId: String(recordingId),
          sport: sportPlan,
          amountInr: 0,
          currency: 'INR',
          status: 'completed',
          createdAtIso: new Date().toISOString(),
          note: `${sportLabel} recording unlock`,
          razorpay_order_id: order.razorpay_order_id,
          server_payment_id: order.id,
        });
        onClose();
        setPaymentSuccessVisible(true);
        try {
          await presentEventNotification({
            title: 'Recording unlocked',
            body: `Your ${sportLabel} recording is now unlocked. Tap to watch.`,
            notificationType: 'LOCAL_PAYMENT_SUCCESS',
            data: {
              recordingId: String(recordingId),
              sport: String(sportPlan),
              amount: '0',
            },
          });
        } catch {
          /* ignore */
        }
        onUnlocked?.();
        return;
      }

      if (!RAZORPAY_KEY_ID) {
        Alert.alert(
          'Payments',
          'Add EXPO_PUBLIC_RAZORPAY_KEY_ID in .env to enable checkout.',
        );
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const RazorpayCheckout = require('react-native-razorpay').default as {
        open: (opts: Record<string, unknown>) => Promise<{
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }>;
      };
      const amountPaise = String(Math.round(orderAmount * 100));
      const data = await RazorpayCheckout.open({
        key: RAZORPAY_KEY_ID,
        name: 'FieldFlicks',
        description: `${sportLabel} video unlock`,
        order_id: order.razorpay_order_id,
        currency: order.currency ?? 'INR',
        amount: amountPaise,
        theme: { color: '#22C55E' },
      });
      const signature =
        typeof data.razorpay_signature === 'string'
          ? data.razorpay_signature.trim()
          : '';
      const payId =
        typeof data.razorpay_payment_id === 'string'
          ? data.razorpay_payment_id.trim()
          : '';
      if (!signature || !payId || !data.razorpay_order_id?.trim()) {
        throw new Error(
          'Payment did not finish — missing Razorpay confirmation. Nothing was charged for access.',
        );
      }
      const verified = await verifyRazorpayPayment({
        razorpay_order_id: data.razorpay_order_id,
        razorpay_payment_id: payId,
        razorpay_signature: signature,
        status: 'completed',
      });
      await mergeServerUnlockedRecordingIds();
      await unlockRecordingLocally(recordingId);
      await appendLocalPaymentHistory({
        id: `paid-${recordingId}-${data.razorpay_order_id}-${Date.now()}`,
        kind: 'recording_unlock',
        recordingId: String(recordingId),
        sport: sportPlan,
        amountInr: orderAmount,
        currency: 'INR',
        status: 'completed',
        createdAtIso: new Date().toISOString(),
        note: `${sportLabel} recording unlock`,
        razorpay_order_id: data.razorpay_order_id,
        razorpay_payment_id: payId,
        server_payment_id: verified.payment_id,
      });
      onClose();
      setPaymentSuccessVisible(true);
      try {
        await presentEventNotification({
          title: 'Payment successful',
          body: `Your ${sportLabel} recording is now unlocked. Tap to watch.`,
          notificationType: 'LOCAL_PAYMENT_SUCCESS',
          data: {
            recordingId: String(recordingId),
            sport: String(sportPlan),
            amount: String(orderAmount),
          },
        });
      } catch {
        /* ignore */
      }
      onUnlocked?.();
    } catch (e) {
      const msg = getFieldflixApiErrorMessage(e, 'Could not complete payment');
      if (!String(msg).toLowerCase().includes('cancel')) {
        Alert.alert('Payment', msg);
      }
    } finally {
      setCheckoutBusy(false);
    }
  }, [
    checkoutBusy,
    recordingId,
    sportPlan,
    sportLabel,
    onClose,
    onUnlocked,
  ]);

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={closeSheet}
      >
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={closeSheet} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.previewEnded}>Preview ended</Text>
            <Text style={styles.title}>Recording + Highlights</Text>
            <View style={styles.planRow}>
              <Text style={styles.planName}>{sportLabel} video unlock</Text>
              <Text style={styles.price}>
                {quoteLoading
                  ? '…'
                  : quoteError
                    ? '—'
                    : isQuoteFree
                      ? 'Free'
                      : `₹${displayTotal}`}
              </Text>
            </View>
            <Text style={styles.sub}>
              Session length {plannedDurationLabel} (selected at recording start)
              • full playback for this recording only • incl. highlights
            </Text>
            {quoteError ? (
              <Text style={styles.errorText}>{quoteError}</Text>
            ) : null}
            <View style={styles.bill}>
              <View style={styles.billRow}>
                <Text style={styles.billText}>Base amount</Text>
                <Text style={styles.billText}>
                  {quoteLoading ? '…' : `₹${displayBase}`}
                </Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billText}>GST (18%)</Text>
                <Text style={styles.billText}>
                  {quoteLoading ? '…' : `₹${displayGst}`}
                </Text>
              </View>
              <View style={[styles.billRow, styles.billTotal]}>
                <Text style={styles.totalText}>Total</Text>
                <Text style={styles.totalText}>
                  {quoteLoading ? '…' : `₹${displayTotal}`}
                </Text>
              </View>
            </View>
            <Pressable
              style={[
                styles.cta,
                (checkoutBusy || quoteLoading || !!quoteError || !checkoutQuote) && {
                  opacity: 0.65,
                },
              ]}
              onPress={() => void runCheckout()}
              disabled={checkoutBusy || quoteLoading || !!quoteError || !checkoutQuote}
            >
              <Text style={styles.ctaText}>
                {checkoutBusy || quoteLoading
                  ? quoteLoading
                    ? 'Updating price…'
                    : 'Processing...'
                  : isQuoteFree
                    ? 'Unlock free'
                    : 'Unlock & Pay'}
              </Text>
            </Pressable>
            <Text style={styles.foot}>
              {isQuoteFree
                ? 'No charge — free tier for this venue'
                : 'Secure payment • Unlocks only this recording'}
            </Text>
            <Pressable onPress={closeSheet} hitSlop={10} style={styles.dismiss}>
              <Text style={styles.dismissText}>Not now</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <PaymentSuccessModal
        visible={paymentSuccessVisible}
        onClose={() => {
          setPaymentSuccessVisible(false);
          onUnlocked?.();
        }}
      />
    </>
  );
}

function PaymentSuccessModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.successBackdrop} onPress={onClose}>
        <Pressable style={styles.successCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.successIconWrap}>
            <Ionicons name="checkmark" size={36} color="#022c22" />
          </View>
          <Text style={styles.successTitle}>Recording unlocked</Text>
          <Text style={styles.successBody}>
            You can watch this recording in full. Tap below to continue.
          </Text>
          <Pressable style={styles.successCta} onPress={onClose}>
            <Text style={styles.successCtaText}>Watch now</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(2,6,23,0.55)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: '#0c1218',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
    paddingTop: 12,
    paddingBottom: 36,
    paddingHorizontal: 22,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
    marginBottom: 14,
  },
  previewEnded: {
    fontFamily: FF.semiBold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    marginBottom: 4,
  },
  title: {
    fontFamily: FF.bold,
    fontSize: 22,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  planName: {
    flex: 1,
    fontFamily: FF.bold,
    fontSize: 16,
    color: '#fff',
  },
  price: {
    fontFamily: FF.bold,
    fontSize: 18,
    color: ACCENT,
  },
  sub: {
    marginTop: 6,
    fontFamily: FF.regular,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.62)',
  },
  errorText: {
    marginTop: 8,
    fontFamily: FF.medium,
    fontSize: 13,
    color: '#fca5a5',
  },
  bill: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
    gap: 8,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billTotal: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  billText: {
    fontFamily: FF.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
  },
  totalText: {
    fontFamily: FF.bold,
    fontSize: 15,
    color: '#fff',
  },
  cta: {
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: ACCENT,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: {
    color: '#03210e',
    fontFamily: FF.bold,
    fontSize: 16,
  },
  foot: {
    marginTop: 10,
    fontFamily: FF.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  dismiss: {
    marginTop: 12,
    alignSelf: 'center',
    paddingVertical: 8,
  },
  dismissText: {
    fontFamily: FF.semiBold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
  },
  successBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    backgroundColor: '#0c1218',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
    padding: 24,
    alignItems: 'center',
  },
  successIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontFamily: FF.bold,
    fontSize: 20,
    color: '#fff',
    marginBottom: 8,
  },
  successBody: {
    fontFamily: FF.regular,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    marginBottom: 20,
  },
  successCta: {
    width: '100%',
    borderRadius: 14,
    backgroundColor: ACCENT,
    paddingVertical: 14,
    alignItems: 'center',
  },
  successCtaText: {
    fontFamily: FF.bold,
    fontSize: 16,
    color: '#03210e',
  },
});
