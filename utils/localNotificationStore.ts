import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@fieldflicks/local_notifications_v1';
const MAX = 150;

export type StoredLocalNotification = {
  id: string;
  title: string;
  body: string;
  notification_type: string;
  created_at: string;
  data?: unknown;
};

export async function getLocalNotifications(): Promise<StoredLocalNotification[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as StoredLocalNotification[]) : [];
  } catch {
    return [];
  }
}

export async function appendLocalNotification(
  item: Omit<StoredLocalNotification, 'id' | 'created_at'> & {
    id?: string;
    created_at?: string;
  },
): Promise<void> {
  const list = await getLocalNotifications();
  const row: StoredLocalNotification = {
    id: item.id ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: item.title,
    body: item.body,
    notification_type: item.notification_type,
    created_at: item.created_at ?? new Date().toISOString(),
    data: item.data,
  };
  list.unshift(row);
  if (list.length > MAX) list.length = MAX;
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export async function clearLocalNotifications(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
