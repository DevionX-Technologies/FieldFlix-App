import AsyncStorage from "@react-native-async-storage/async-storage";

export const UNLOCKED_RECORDINGS_KEY = "fieldflicks-unlocked-recordings-v1";

export async function readUnlockedRecordingIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(UNLOCKED_RECORDINGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}

export async function persistUnlockedRecordingIds(next: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(UNLOCKED_RECORDINGS_KEY, JSON.stringify(next));
  } catch {
    /* best effort */
  }
}
