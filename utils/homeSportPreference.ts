import AsyncStorage from '@react-native-async-storage/async-storage';

import type { HomeSportKey } from '@/utils/turfSports';

const KEY = 'fieldflix.preferred_home_sport';

const ALLOWED = new Set<HomeSportKey>(['pickleball', 'padel', 'cricket']);

export async function readPreferredHomeSport(): Promise<HomeSportKey | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw || !ALLOWED.has(raw as HomeSportKey)) return null;
    return raw as HomeSportKey;
  } catch {
    return null;
  }
}

export async function writePreferredHomeSport(sport: HomeSportKey): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, sport);
  } catch {
    // ignore — preference is UX-only
  }
}
