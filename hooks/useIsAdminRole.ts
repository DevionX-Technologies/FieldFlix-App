import { getMyAdminStatus, getMyProfile, type FieldflixUser } from '@/lib/fieldflix-api';
import { isAdminRolePhone } from '@/utils/phoneDigits';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';

/**
 * True when the current user's `phone_number` from `/users/:id` matches {@link ADMIN_ROLE_PHONE_DIGITS}.
 */
export function useIsAdminRole(): {
  isAdmin: boolean;
  user: FieldflixUser | null;
  isLoading: boolean;
  refresh: () => void;
} {
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<FieldflixUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) {
        setUser(null);
        setIsAdmin(false);
        return;
      }
      const u = await getMyProfile(token);
      setUser(u);
      try {
        const s = await getMyAdminStatus();
        setIsAdmin(!!s.isAdmin);
      } catch {
        setIsAdmin(isAdminRolePhone(u?.phone_number ?? null));
      }
    } catch {
      setUser(null);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { isAdmin, user, isLoading, refresh };
}
