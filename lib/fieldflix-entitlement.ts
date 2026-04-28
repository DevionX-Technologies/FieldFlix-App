/**
 * Server-truth entitlement layer.
 *
 * The mobile app caches the latest `GET /payments/plan/active` response in SecureStore so that:
 *   • the paywall / 2.5-min preview cap can be evaluated synchronously while the network call
 *     refreshes in the background
 *   • the user keeps full access offline once the backend has confirmed payment
 *
 * Hooks/helpers exported here:
 *   • `useEntitlement()` — React hook used by paywalled UI
 *   • `refreshEntitlement()` — call this after a successful Razorpay verify to flip the local
 *     cache immediately (the user can then return to the video without waiting for a refetch)
 */
import { getActivePlan, type ActivePlan } from '@/lib/fieldflix-api';
import { useCallback, useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ENTITLEMENT_CACHE_KEY = 'fieldflicks-entitlement-v1';

export type EntitlementSnapshot = ActivePlan & { fetched_at: number };

const DEFAULT_SNAPSHOT: EntitlementSnapshot = {
  active: false,
  plan: null,
  paid_at: null,
  expires_at: null,
  payment_id: null,
  fetched_at: 0,
};

let listeners: Array<(snap: EntitlementSnapshot) => void> = [];
let inFlight: Promise<EntitlementSnapshot> | null = null;
let lastSnapshot: EntitlementSnapshot | null = null;

function notify(snap: EntitlementSnapshot) {
  lastSnapshot = snap;
  for (const fn of listeners) {
    try {
      fn(snap);
    } catch {
      // swallow — listeners are local hooks
    }
  }
}

async function readCachedSnapshot(): Promise<EntitlementSnapshot | null> {
  try {
    const raw = await SecureStore.getItemAsync(ENTITLEMENT_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EntitlementSnapshot;
    if (parsed && typeof parsed === 'object' && 'active' in parsed) return parsed;
    return null;
  } catch {
    return null;
  }
}

async function writeCachedSnapshot(snap: EntitlementSnapshot): Promise<void> {
  try {
    await SecureStore.setItemAsync(ENTITLEMENT_CACHE_KEY, JSON.stringify(snap));
  } catch {
    // SecureStore can throw on certain platforms — soft-fail; the network value still wins.
  }
}

/**
 * Refetches the active plan from the backend and updates the cache + every active
 * `useEntitlement()` consumer.
 */
export async function refreshEntitlement(): Promise<EntitlementSnapshot> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const plan = await getActivePlan();
      const snap: EntitlementSnapshot = {
        ...plan,
        fetched_at: Date.now(),
      };
      await writeCachedSnapshot(snap);
      notify(snap);
      return snap;
    } catch {
      const cached = (await readCachedSnapshot()) ?? DEFAULT_SNAPSHOT;
      notify(cached);
      return cached;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export type UseEntitlementResult = {
  loading: boolean;
  isPaid: boolean;
  plan: 'free' | 'pro' | 'premium' | null;
  snapshot: EntitlementSnapshot;
  refresh: () => Promise<EntitlementSnapshot>;
};

export function useEntitlement(): UseEntitlementResult {
  const [snapshot, setSnapshot] = useState<EntitlementSnapshot>(
    lastSnapshot ?? DEFAULT_SNAPSHOT,
  );
  const [loading, setLoading] = useState<boolean>(!lastSnapshot);

  useEffect(() => {
    let cancelled = false;

    const subscriber = (snap: EntitlementSnapshot) => {
      if (cancelled) return;
      setSnapshot(snap);
      setLoading(false);
    };
    listeners.push(subscriber);

    void (async () => {
      const cached = await readCachedSnapshot();
      if (!cancelled && cached) {
        setSnapshot(cached);
        setLoading(false);
      }
      try {
        await refreshEntitlement();
      } catch {
        // refreshEntitlement already handles errors
      }
    })();

    const sub = AppState.addEventListener(
      'change',
      (state: AppStateStatus) => {
        if (state === 'active') void refreshEntitlement();
      },
    );

    return () => {
      cancelled = true;
      listeners = listeners.filter((fn) => fn !== subscriber);
      sub?.remove?.();
    };
  }, []);

  const refresh = useCallback(() => refreshEntitlement(), []);

  // A "paid" plan is anything beyond `free`. A `null` plan with `active=true` (free trial,
  // legacy `MEDIA_ACCESS` purchases) is also treated as paid since the backend already
  // marked the user as having access to the content.
  const isPaid =
    snapshot.active &&
    (snapshot.plan === 'pro' ||
      snapshot.plan === 'premium' ||
      snapshot.plan === null);

  return {
    loading,
    isPaid,
    plan: snapshot.plan,
    snapshot,
    refresh,
  };
}
