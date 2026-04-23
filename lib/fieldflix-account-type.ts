import * as SecureStore from 'expo-secure-store';

export type AccountType = 'public' | 'private';

const KEY = 'fieldflix_account_type';

/** Returns saved account type, or `null` if the user has never chosen one. */
export async function getAccountType(): Promise<AccountType | null> {
  try {
    const v = await SecureStore.getItemAsync(KEY);
    if (v === 'public' || v === 'private') return v;
    return null;
  } catch {
    return null;
  }
}

export async function setAccountType(v: AccountType): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, v);
  } catch {
    /* best-effort: secure store may be unavailable in some environments */
  }
}

export async function clearAccountType(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    /* ignore */
  }
}
