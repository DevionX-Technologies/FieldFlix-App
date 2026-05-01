import AsyncStorage from '@react-native-async-storage/async-storage';

export const LOCAL_PAYMENT_HISTORY_KEY = 'fieldflicks-local-payment-history-v1';

export type LocalPaymentHistoryItem = {
  id: string;
  kind: 'recording_unlock';
  recordingId: string;
  sport: 'pickleball' | 'padel' | 'cricket';
  amountInr: number;
  currency: 'INR';
  status: 'completed';
  createdAtIso: string;
  note: string;
};

export async function readLocalPaymentHistory(): Promise<LocalPaymentHistoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_PAYMENT_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalPaymentHistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function appendLocalPaymentHistory(
  item: LocalPaymentHistoryItem,
): Promise<void> {
  try {
    const list = await readLocalPaymentHistory();
    const next = [item, ...list.filter((x) => x.id !== item.id)].slice(0, 200);
    await AsyncStorage.setItem(LOCAL_PAYMENT_HISTORY_KEY, JSON.stringify(next));
  } catch {
    // no-op
  }
}
