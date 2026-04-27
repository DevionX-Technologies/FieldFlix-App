import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { appendLocalNotification, type StoredLocalNotification } from '@/utils/localNotificationStore';

let androidChannelEnsured = false;

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android' || androidChannelEnsured) return;
  androidChannelEnsured = true;
  await Notifications.setNotificationChannelAsync('fieldflicks_events', {
    name: 'FieldFlicks',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
}

function stringifyData(data?: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  if (!data) return out;
  for (const [k, v] of Object.entries(data)) {
    if (v == null) out[k] = '';
    else if (typeof v === 'string') out[k] = v;
    else
      try {
        out[k] = JSON.stringify(v);
      } catch {
        out[k] = String(v);
      }
  }
  return out;
}

/**
 * In-app banner (Expo) + optional row in the local notification list (for the Notifications screen).
 * Server-backed events are still persisted by the API; local rows are a fallback and for pure client events.
 */
export async function presentEventNotification(opts: {
  title: string;
  body: string;
  notificationType: string;
  data?: Record<string, unknown>;
  /** When false, only shows the system-style banner, does not append to the local list. Default true. */
  persist?: boolean;
}): Promise<void> {
  const persist = opts.persist !== false;
  if (persist) {
    const row: Omit<StoredLocalNotification, 'id' | 'created_at'> = {
      title: opts.title,
      body: opts.body,
      notification_type: opts.notificationType,
      data: opts.data,
    };
    await appendLocalNotification(row);
  }

  await ensureAndroidChannel();

  const dataPayload: Record<string, string> = {
    notification_type: opts.notificationType,
    ...stringifyData(opts.data),
  };

  await Notifications.scheduleNotificationAsync({
    content: {
      title: opts.title,
      body: opts.body,
      data: dataPayload,
      sound: 'default',
      ...(Platform.OS === 'android'
        ? { android: { channelId: 'fieldflicks_events' } }
        : {}),
    },
    trigger: null,
  });
}
