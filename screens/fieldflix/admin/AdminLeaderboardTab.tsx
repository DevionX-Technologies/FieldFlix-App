import { FF } from '@/screens/fieldflix/fonts';
import { WEB } from '@/screens/fieldflix/webDesign';
import {
  getLeaderboard,
  type LeaderboardPeriod,
  type LeaderboardRow,
} from '@/lib/fieldflix-api';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const PERIODS: { key: LeaderboardPeriod; label: string }[] = [
  { key: 'weekly', label: 'Week' },
  { key: 'monthly', label: 'Month' },
  { key: 'all', label: 'All time' },
];

/**
 * Admin → Leaderboard tab.
 *
 * Read-only viewer of the live leaderboard the user sees, but extended with
 * the period window string so admin knows exactly which range these numbers
 * are aggregated over.
 *
 * Phase-4 placeholder for the coupon-assign override flow: each row carries
 * a "Grant coupon" CTA that, once admin opens the Coupons tab and selects a
 * coupon, will be wired up to call `adminAssignCoupon`. We leave the
 * scaffolding in place for that follow-up so the layout doesn't have to
 * change later.
 */
export function AdminLeaderboardTab({
  onGrantPress,
}: {
  onGrantPress?: (row: LeaderboardRow) => void;
}) {
  const [period, setPeriod] = useState<LeaderboardPeriod>('weekly');
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [periodStart, setPeriodStart] = useState<string | null>(null);
  const [periodEnd, setPeriodEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: LeaderboardPeriod) => {
    setLoading(true);
    try {
      const res = await getLeaderboard(p, 100);
      setRows(res?.rows ?? []);
      setPeriodStart(res?.periodStart ?? null);
      setPeriodEnd(res?.periodEnd ?? null);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(period);
  }, [load, period]);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <MaterialCommunityIcons
          name="trophy-outline"
          size={18}
          color={WEB.greenBright}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>Live</Text>
          <Text style={styles.title}>Leaderboard</Text>
          {periodStart && periodEnd ? (
            <Text style={styles.subtitle}>
              {formatPeriod(periodStart, periodEnd)}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.segTrack}>
        {PERIODS.map((p) => (
          <Pressable
            key={p.key}
            onPress={() => setPeriod(p.key)}
            style={[
              styles.segItem,
              period === p.key && styles.segItemActive,
            ]}
          >
            <Text
              style={[
                styles.segText,
                period === p.key && styles.segTextActive,
              ]}
            >
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={WEB.greenBright} />
      ) : rows.length === 0 ? (
        <Text style={styles.empty}>No points awarded in this window.</Text>
      ) : (
        <View style={{ gap: 8 }}>
          {rows.map((r) => (
            <View key={r.userId} style={styles.row}>
              <Text style={styles.rowRank}>#{r.rank}</Text>
              <View style={styles.rowAvatar}>
                {r.profileImagePath ? (
                  <Image
                    source={{ uri: r.profileImagePath }}
                    style={StyleSheet.absoluteFillObject}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.rowInitials}>{initialsFor(r.name)}</Text>
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {r.name?.trim() || 'Player'}
                </Text>
                <Text style={styles.rowPoints}>{r.points} pts</Text>
              </View>
              {onGrantPress ? (
                <Pressable
                  onPress={() => onGrantPress(r)}
                  style={styles.grantBtn}
                >
                  <Text style={styles.grantBtnText}>Grant</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function initialsFor(name: string | null | undefined): string {
  if (!name) return 'FF';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const joined = parts.map((p) => p[0] ?? '').join('');
  return joined.toUpperCase() || 'FF';
}

function formatPeriod(startIso: string, endIso: string): string {
  try {
    const s = new Date(startIso);
    const e = new Date(endIso);
    const sStr = s.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
    });
    const eStr = new Date(e.getTime() - 1).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
    });
    return `${sStr} – ${eStr}`;
  } catch {
    return '';
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  eyebrow: {
    color: WEB.greenBright,
    fontFamily: FF.bold,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: WEB.white,
    fontFamily: FF.bold,
    fontSize: 18,
    marginTop: 2,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.55)',
    fontFamily: FF.regular,
    fontSize: 12,
    marginTop: 2,
  },
  segTrack: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.25)',
    padding: 4,
    borderRadius: 12,
  },
  segItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  segItemActive: { backgroundColor: WEB.greenBright },
  segText: {
    color: 'rgba(255,255,255,0.65)',
    fontFamily: FF.semiBold,
    fontSize: 12,
  },
  segTextActive: { color: '#04130d' },
  empty: {
    color: 'rgba(255,255,255,0.55)',
    fontFamily: FF.regular,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 10,
  },
  rowRank: {
    color: 'rgba(255,255,255,0.65)',
    fontFamily: FF.bold,
    fontSize: 12,
    minWidth: 28,
  },
  rowAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInitials: {
    color: WEB.white,
    fontFamily: FF.bold,
    fontSize: 12,
  },
  rowName: {
    color: WEB.white,
    fontFamily: FF.semiBold,
    fontSize: 13,
  },
  rowPoints: {
    color: '#fde68a',
    fontFamily: FF.bold,
    fontSize: 11,
    marginTop: 2,
  },
  grantBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.4)',
    borderRadius: 8,
  },
  grantBtnText: {
    color: WEB.greenBright,
    fontFamily: FF.bold,
    fontSize: 11,
    letterSpacing: 0.4,
  },
});
