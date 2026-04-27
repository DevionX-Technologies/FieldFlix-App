import { Paths } from '@/data/paths';
import type { Href } from 'expo-router';

type RouterLike = { push: (to: Href) => void };

/**
 * In-app / FCM / Expo notification data routing (shared by `_layout` and `NotificationsScreen` href).
 */
export function hrefFromNotificationData(
  data: unknown,
  notificationType: string | null | undefined,
): Href | null {
  const u = String(notificationType || '').toUpperCase();
  const d = data as Record<string, unknown> | unknown[] | null | undefined;
  const first = Array.isArray(d) ? (d[0] as Record<string, unknown> | undefined) : (d as Record<string, unknown> | undefined);
  if (u === 'RECORDING_COMPLETE' || (u.includes('RECORDING') && u.includes('COMPLETE'))) {
    const recordingId =
      first?.recordingId ??
      first?.recording_id ??
      (d && !Array.isArray(d) ? (d as Record<string, unknown>).recordingId : undefined) ??
      (d && !Array.isArray(d) ? (d as Record<string, unknown>).recording_id : undefined);
    if (recordingId) {
      return { pathname: Paths.highlights, params: { id: String(recordingId) } } as Href;
    }
    return Paths.recordings as Href;
  }
  if (u === 'PAYMENT_SUCCESS' || (u.includes('PAYMENT') && u.includes('SUCCESS'))) {
    return Paths.profilePremium as Href;
  }
  if (u === 'RECORDING_START' || u === 'RECORDING_STOP' || u.includes('LOCAL_RECORDING')) {
    return Paths.recordings as Href;
  }
  return null;
}

export function routeFromNotificationData(
  data: unknown,
  router: RouterLike,
  notificationType?: string | null,
): void {
  const u = String(
    (data as Record<string, unknown> | undefined)?.click_action ??
      (data as Record<string, unknown> | undefined)?.notification_type ??
      notificationType ??
      '',
  ).toUpperCase();
  if (u === 'RECORDING_COMPLETE' || (u.includes('RECORDING') && u.includes('COMPLETE'))) {
    const d = (data ?? {}) as Record<string, unknown>;
    const recordingId = d?.recordingId ?? d?.recording_id ?? d?.id;
    if (recordingId) {
      router.push({
        pathname: '/highlights/[id]',
        params: { id: String(recordingId) },
      } as Href);
      return;
    }
    router.push(Paths.recordings);
    return;
  }
  if (u === 'PAYMENT_SUCCESS') {
    router.push(Paths.profilePremium);
    return;
  }
  if (u === 'RECORDING_START' || u === 'RECORDING_STOP') {
    router.push(Paths.recordings);
    return;
  }
}
