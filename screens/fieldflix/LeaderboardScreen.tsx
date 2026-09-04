import { FieldflixScreenHeader } from '@/screens/fieldflix/FieldflixScreenHeader';
import { WebShell } from '@/screens/fieldflix/WebShell';
import { FF } from '@/screens/fieldflix/fonts';
import {
  getLeaderboard,
  type LeaderboardPeriod,
  type LeaderboardRow,
} from '@/lib/fieldflix-api';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Skeleton } from '@/components/atoms';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const BG = '#020617';
const ACCENT = '#22C55E';
const MUTED = '#94a3b8';

const PERIODS: { key: LeaderboardPeriod; label: string }[] = [
  { key: 'weekly', label: 'This week' },
  { key: 'monthly', label: 'This month' },
  { key: 'all', label: 'All time' },
];

/**
 * Public leaderboard.
 *
 * Layout:
 *   - Three-pill period switcher up top (weekly / monthly / all-time).
 *   - "Podium" for ranks 1 / 2 / 3, with rank 1 in the center, lifted.
 *   - Scrollable list of ranks 4..50 below, gold/silver/bronze stripe on the
 *     first three rows for continuity with the podium.
 *
 * Data:
 *   - One fetch per period switch. No pagination yet — the backend caps at 50.
 *   - Re-fetches on screen focus so the leaderboard reflects new points
 *     awarded while the user was on other screens.
 */
export default function LeaderboardScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState<LeaderboardPeriod>('weekly');
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [periodStart, setPeriodStart] = useState<string | null>(null);
  const [periodEnd, setPeriodEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: LeaderboardPeriod) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getLeaderboard(p, 50);
      setRows(Array.isArray(res?.rows) ? res.rows : []);
      setPeriodStart(res?.periodStart ?? null);
      setPeriodEnd(res?.periodEnd ?? null);
    } catch (e) {
      setError('Could not load the leaderboard. Pull to refresh in a moment.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(period);
  }, [load, period]);

  useFocusEffect(
    useCallback(() => {
      void load(period);
    }, [load, period]),
  );

  const top3 = useMemo(() => rows.slice(0, 3), [rows]);
  const rest = useMemo(() => rows.slice(3), [rows]);

  return (
    <WebShell backgroundColor={BG}>
      <View style={styles.flex}>
        <FieldflixScreenHeader
          title="Leaderboard"
          onBack={() => router.back()}
          backAccessibilityLabel="Back"
        />

        <View style={styles.segOuter}>
          <View style={styles.segTrack}>
            {PERIODS.map((p) => (
              <Pressable
                key={p.key}
                style={[
                  styles.segTab,
                  period === p.key && styles.segTabActive,
                ]}
                onPress={() => setPeriod(p.key)}
              >
                <Text
                  style={[
                    styles.segLabel,
                    period === p.key && styles.segLabelActive,
                  ]}
                >
                  {p.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.main}
          showsVerticalScrollIndicator={false}
        >
          {periodStart && periodEnd ? (
            <Text style={styles.periodLabel}>
              {formatPeriodWindow(periodStart, periodEnd)}
            </Text>
          ) : null}

          {loading ? (
            <LeaderboardSkeleton />
          ) : error ? (
            <Text style={styles.empty}>{error}</Text>
          ) : rows.length === 0 ? (
            <Text style={styles.empty}>
              No points awarded {period === 'all' ? 'yet' : 'this period'}. Be
              the first, start a session, share recordings, or get a highlight
              approved as a FlickShort.
            </Text>
          ) : (
            <>
              <Podium rows={top3} />
              {rest.length > 0 ? (
                <View style={styles.listSection}>
                  <Text style={styles.listSectionTitle}>The pack</Text>
                  {rest.map((r) => (
                    <LeaderRow key={r.userId} row={r} />
                  ))}
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </View>
    </WebShell>
  );
}

/** Top-3 podium. Center column (rank 1) is lifted; flanking 2 and 3 sit lower. */
function Podium({ rows }: { rows: LeaderboardRow[] }) {
  const r1 = rows.find((r) => r.rank === 1) ?? rows[0] ?? null;
  // Filter and sort the silver/bronze: prefer rank 2 / rank 3 entries; if there
  // are ties on rank 1, the second/third items in the list aren't rank 2/3.
  const others = rows.filter((r) => r.userId !== r1?.userId).slice(0, 2);
  const r2 = others[0] ?? null;
  const r3 = others[1] ?? null;

  return (
    <View style={styles.podium}>
      <View style={styles.podiumSide}>
        {r2 ? <PodiumColumn row={r2} medal="silver" /> : <PodiumPlaceholder />}
      </View>
      <View style={styles.podiumCenter}>
        {r1 ? <PodiumColumn row={r1} medal="gold" /> : <PodiumPlaceholder />}
      </View>
      <View style={styles.podiumSide}>
        {r3 ? <PodiumColumn row={r3} medal="bronze" /> : <PodiumPlaceholder />}
      </View>
    </View>
  );
}

function PodiumColumn({
  row,
  medal,
}: {
  row: LeaderboardRow;
  medal: 'gold' | 'silver' | 'bronze';
}) {
  const medalConfig = {
    gold: {
      gradient: ['#fde047', '#facc15', '#a16207'] as const,
      ring: '#fde68a',
      label: '1',
      size: 84,
    },
    silver: {
      gradient: ['#e5e7eb', '#9ca3af', '#4b5563'] as const,
      ring: 'rgba(229,231,235,0.85)',
      label: '2',
      size: 72,
    },
    bronze: {
      gradient: ['#fdba74', '#c2410c', '#7c2d12'] as const,
      ring: 'rgba(253,186,116,0.85)',
      label: '3',
      size: 72,
    },
  }[medal];

  return (
    <View style={styles.podiumColumn}>
      <LinearGradient
        colors={medalConfig.gradient}
        style={[
          styles.podiumAvatarRing,
          {
            width: medalConfig.size + 14,
            height: medalConfig.size + 14,
            borderRadius: (medalConfig.size + 14) / 2,
          },
        ]}
      >
        <View
          style={[
            styles.podiumAvatarInner,
            {
              width: medalConfig.size,
              height: medalConfig.size,
              borderRadius: medalConfig.size / 2,
            },
          ]}
        >
          {row.profileImagePath ? (
            <Image
              source={{ uri: row.profileImagePath }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.podiumInitials}>{initialsFor(row.name)}</Text>
          )}
        </View>
      </LinearGradient>
      <View style={styles.podiumBadge}>
        <Text style={styles.podiumBadgeText}>{medalConfig.label}</Text>
      </View>
      <Text style={styles.podiumName} numberOfLines={1}>
        {row.name?.trim() || 'Player'}
      </Text>
      <View style={styles.podiumPointsPill}>
        <MaterialCommunityIcons name="lightning-bolt" size={11} color="#fde68a" />
        <Text style={styles.podiumPointsText}>{row.points}</Text>
      </View>
    </View>
  );
}

function PodiumPlaceholder() {
  return (
    <View style={styles.podiumColumn}>
      <View style={styles.podiumPlaceholder}>
        <MaterialCommunityIcons name="account" size={36} color={MUTED} />
      </View>
      <Text style={[styles.podiumName, { color: MUTED }]} />
    </View>
  );
}

function LeaderRow({ row }: { row: LeaderboardRow }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowRank}>#{row.rank}</Text>
      <View style={styles.rowAvatar}>
        {row.profileImagePath ? (
          <Image
            source={{ uri: row.profileImagePath }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        ) : (
          <Text style={styles.rowInitials}>{initialsFor(row.name)}</Text>
        )}
      </View>
      <Text style={styles.rowName} numberOfLines={1}>
        {row.name?.trim() || 'Player'}
      </Text>
      <View style={styles.rowPointsPill}>
        <MaterialCommunityIcons name="lightning-bolt" size={11} color="#fde68a" />
        <Text style={styles.rowPointsText}>{row.points}</Text>
      </View>
    </View>
  );
}

function initialsFor(name: string | null | undefined): string {
  if (!name) return 'FF';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const joined = parts.map((p) => p[0] ?? '').join('');
  return joined.toUpperCase() || 'FF';
}

function formatPeriodWindow(startIso: string, endIso: string): string {
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
    return `${sStr} to ${eStr}`;
  } catch {
    return '';
  }
}

function LeaderboardSkeleton() {
  return (
    <View style={styles.flex}>
      {/* Podium Skeleton */}
      <View style={styles.podium}>
        <View style={styles.podiumSide}>
          <Skeleton width={86} height={86} style={{ borderRadius: 43 }} loading />
          <Skeleton width={60} height={14} style={{ marginTop: 10 }} loading />
          <Skeleton width={40} height={18} style={{ marginTop: 6, borderRadius: 9 }} loading />
        </View>
        <View style={styles.podiumCenter}>
          <Skeleton width={98} height={98} style={{ borderRadius: 49 }} loading />
          <Skeleton width={70} height={14} style={{ marginTop: 10 }} loading />
          <Skeleton width={45} height={18} style={{ marginTop: 6, borderRadius: 9 }} loading />
        </View>
        <View style={styles.podiumSide}>
          <Skeleton width={86} height={86} style={{ borderRadius: 43 }} loading />
          <Skeleton width={60} height={14} style={{ marginTop: 10 }} loading />
          <Skeleton width={40} height={18} style={{ marginTop: 6, borderRadius: 9 }} loading />
        </View>
      </View>

      {/* List Section Skeleton */}
      <View style={styles.listSection}>
        <Skeleton width={80} height={12} style={{ marginBottom: 12, marginLeft: 6 }} loading />
        {Array.from({ length: 5 }).map((_, index) => (
          <View key={`sk-${index}`} style={styles.row}>
            <Skeleton width={25} height={14} loading />
            <Skeleton width={36} height={36} style={{ borderRadius: 18 }} loading />
            <Skeleton width="45%" height={16} loading />
            <View style={{ flex: 1 }} />
            <Skeleton width={50} height={24} style={{ borderRadius: 12 }} loading />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  main: {
    paddingHorizontal: 18,
    paddingBottom: 60,
    paddingTop: 6,
  },
  segOuter: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 6,
  },
  segTrack: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15,23,42,0.7)',
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  segTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 999,
    alignItems: 'center',
  },
  segTabActive: {
    backgroundColor: ACCENT,
  },
  segLabel: {
    fontFamily: FF.semiBold,
    fontSize: 12,
    color: MUTED,
    letterSpacing: 0.4,
  },
  segLabelActive: {
    color: '#04130d',
  },
  periodLabel: {
    color: MUTED,
    fontFamily: FF.semiBold,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 14,
    letterSpacing: 0.4,
  },
  loadingBox: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  empty: {
    color: 'rgba(255,255,255,0.55)',
    fontFamily: FF.regular,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 26,
    paddingVertical: 60,
    lineHeight: 21,
  },
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 24,
    gap: 6,
  },
  podiumSide: {
    flex: 1,
    alignItems: 'center',
  },
  podiumCenter: {
    flex: 1.2,
    alignItems: 'center',
    marginBottom: 22,
  },
  podiumColumn: {
    alignItems: 'center',
  },
  podiumAvatarRing: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  podiumAvatarInner: {
    backgroundColor: '#1f2937',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumInitials: {
    color: '#fff',
    fontFamily: FF.bold,
    fontSize: 22,
  },
  podiumBadge: {
    marginTop: -10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumBadgeText: {
    color: '#fde68a',
    fontFamily: FF.bold,
    fontSize: 12,
  },
  podiumName: {
    color: '#fff',
    fontFamily: FF.semiBold,
    fontSize: 13,
    marginTop: 10,
    maxWidth: 100,
    textAlign: 'center',
  },
  podiumPointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(120,80,0,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(253,230,138,0.4)',
    marginTop: 6,
  },
  podiumPointsText: {
    color: '#fde68a',
    fontFamily: FF.bold,
    fontSize: 11,
  },
  podiumPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  listSection: {
    marginTop: 6,
  },
  listSectionTitle: {
    color: MUTED,
    fontFamily: FF.semiBold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(15,23,42,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 8,
    gap: 12,
  },
  rowRank: {
    color: MUTED,
    fontFamily: FF.bold,
    fontSize: 13,
    minWidth: 32,
  },
  rowAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1f2937',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInitials: {
    color: '#fff',
    fontFamily: FF.bold,
    fontSize: 13,
  },
  rowName: {
    flex: 1,
    color: '#fff',
    fontFamily: FF.semiBold,
    fontSize: 14,
  },
  rowPointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(120,80,0,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(253,230,138,0.4)',
  },
  rowPointsText: {
    color: '#fde68a',
    fontFamily: FF.bold,
    fontSize: 12,
  },
});
