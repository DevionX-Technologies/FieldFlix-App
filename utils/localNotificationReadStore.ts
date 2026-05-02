import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@fieldflicks/notification_read_state_v1";
const MAX_READ_IDS = 500;

type NotificationReadState = {
  lastReadAtMs: number;
  readIds: string[];
};

/** Fields used to build a stable read key (matches server + home + notifications list). */
export type NotificationRowRef = {
  id?: string | number | null;
  created_at?: string | null;
  title?: string | null;
  body?: string | null;
};

function toMs(input: string | null | undefined): number {
  if (!input) return 0;
  const ms = new Date(input).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * Single source of truth for “this notification row” when persisting read state.
 * Prefer real server `id`; otherwise derive from `created_at` + title/body.
 */
export function notificationReadRowKey(row: NotificationRowRef): string {
  const raw = row.id != null ? String(row.id).trim() : "";
  if (raw) return raw;
  const iso = typeof row.created_at === "string" ? row.created_at : "";
  const fuse = `${iso}\x1e${String(row.title ?? "")}\x1e${String(row.body ?? "")}`;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < fuse.length; i++) {
    h ^= fuse.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const ts = iso.replace(/\D/g, "").slice(0, 18);
  return `nf-${ts || "na"}-${(h >>> 0).toString(16)}`;
}

async function getState(): Promise<NotificationReadState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { lastReadAtMs: 0, readIds: [] };
    const parsed = JSON.parse(raw) as Partial<NotificationReadState>;
    return {
      lastReadAtMs:
        typeof parsed.lastReadAtMs === "number" && Number.isFinite(parsed.lastReadAtMs)
          ? parsed.lastReadAtMs
          : 0,
      readIds: Array.isArray(parsed.readIds)
        ? parsed.readIds.filter((x): x is string => typeof x === "string")
        : [],
    };
  } catch {
    return { lastReadAtMs: 0, readIds: [] };
  }
}

async function saveState(state: NotificationReadState): Promise<void> {
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify({
      lastReadAtMs: state.lastReadAtMs,
      readIds: state.readIds.slice(0, MAX_READ_IDS),
    }),
  );
}

function isReadByState(row: NotificationRowRef, state: NotificationReadState): boolean {
  const key = notificationReadRowKey(row);
  if (state.readIds.includes(key)) return true;
  const legacyId = row.id != null ? String(row.id).trim() : "";
  if (legacyId && state.readIds.includes(legacyId)) return true;
  const createdAtMs = toMs(row.created_at);
  return createdAtMs > 0 && createdAtMs <= state.lastReadAtMs;
}

export async function getUnreadApiNotificationCount(
  rows: NotificationRowRef[],
): Promise<number> {
  const state = await getState();
  let count = 0;
  for (const row of rows) {
    if (!isReadByState(row, state)) count += 1;
  }
  return count;
}

export async function markAllApiNotificationsRead(rows: NotificationRowRef[]): Promise<void> {
  const state = await getState();
  const ids = new Set(state.readIds);
  let newestMs = state.lastReadAtMs;

  for (const row of rows) {
    ids.add(notificationReadRowKey(row));
    const createdAtMs = toMs(row.created_at);
    if (createdAtMs > newestMs) newestMs = createdAtMs;
  }

  await saveState({
    lastReadAtMs: newestMs,
    readIds: Array.from(ids),
  });
}

export async function markNotificationReadLocally(id: string | number): Promise<void> {
  const state = await getState();
  const key = String(id);
  if (!key || state.readIds.includes(key)) return;
  await saveState({
    ...state,
    readIds: [key, ...state.readIds],
  });
}

/** Mark one notification read using the same key as unread counts / “mark all”. */
export async function markNotificationRowRead(row: NotificationRowRef): Promise<void> {
  return markNotificationReadLocally(notificationReadRowKey(row));
}
