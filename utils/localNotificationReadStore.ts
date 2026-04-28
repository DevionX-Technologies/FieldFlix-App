import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@fieldflicks/notification_read_state_v1";
const MAX_READ_IDS = 500;

type NotificationReadState = {
  lastReadAtMs: number;
  readIds: string[];
};

type NotificationLike = {
  id?: string | number | null;
  created_at?: string | null;
};

function toMs(input: string | null | undefined): number {
  if (!input) return 0;
  const ms = new Date(input).getTime();
  return Number.isFinite(ms) ? ms : 0;
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

function isReadByState(row: NotificationLike, state: NotificationReadState): boolean {
  const id = row.id != null ? String(row.id) : "";
  if (id && state.readIds.includes(id)) return true;
  const createdAtMs = toMs(row.created_at);
  return createdAtMs > 0 && createdAtMs <= state.lastReadAtMs;
}

export async function getUnreadApiNotificationCount(rows: NotificationLike[]): Promise<number> {
  const state = await getState();
  let count = 0;
  for (const row of rows) {
    if (!isReadByState(row, state)) count += 1;
  }
  return count;
}

export async function markAllApiNotificationsRead(rows: NotificationLike[]): Promise<void> {
  const state = await getState();
  const ids = new Set(state.readIds);
  let newestMs = state.lastReadAtMs;

  for (const row of rows) {
    const id = row.id != null ? String(row.id) : "";
    if (id) ids.add(id);
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
