import { Paths } from '@/data/paths';
import { getNotifications } from '@/lib/fieldflix-api';
import { FF } from '@/screens/fieldflix/fonts';
import { NOTIFICATION_ICON_SRC } from '@/screens/fieldflix/notificationAssets';
import type { NotificationIconId, NotificationItem } from '@/screens/fieldflix/notificationsSections';
import { WebShell } from '@/screens/fieldflix/WebShell';
import { WEB } from '@/screens/fieldflix/webDesign';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

const BG = '#050A0E';
const CARD_BG = '#081020';
const MUTED = '#a8b0bc';

function iconForNotificationType(t: string | null | undefined): NotificationIconId {
  const u = String(t || '').toUpperCase();
  if (u.includes('WELCOME')) return 'bulb';
  if (u.includes('COMPLETE')) return 'trophy';
  if (u.includes('STOP')) return 'video';
  if (u.includes('RECORD')) return 'video';
  return 'trophy';
}

/**
 * Resolves a notification's tap-target. Currently routes `RECORDING_COMPLETE`
 * straight to the per-recording Highlights screen using the recording id stored
 * inside the JSONB `data` column on the backend (see
 * `recording-highlight.service.ts#sendRecordingCompleteNotification`).
 */
function notificationHref(
  type: string | null | undefined,
  data: any,
): Href | null {
  const u = String(type || '').toUpperCase();
  if (u === 'RECORDING_COMPLETE') {
    const first = Array.isArray(data) ? data[0] : data;
    const recordingId = first?.recordingId ?? first?.recording_id;
    if (recordingId) {
      return { pathname: Paths.highlights, params: { id: String(recordingId) } };
    }
    return Paths.recordings as Href;
  }
  if (u === 'RECORDING_STOP' || u === 'RECORDING_START') {
    return Paths.recordings as Href;
  }
  return null;
}

function formatNotifTime(iso: string | Date | undefined): string {
  if (iso == null) return '';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function startOfLocalDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

type NotificationItemWithHref = NotificationItem & { href: Href | null };

function groupNotifications(
  list: {
    id: string;
    title: string;
    body: string;
    time: string;
    icon: NotificationIconId;
    at: number;
    href: Href | null;
  }[],
): { label: string; items: NotificationItemWithHref[] }[] {
  const now = new Date();
  const today0 = startOfLocalDay(now);
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  const y0 = startOfLocalDay(y);
  const week0 = new Date(now);
  week0.setDate(week0.getDate() - 7);
  const weekStart = startOfLocalDay(week0);

  const today: NotificationItemWithHref[] = [];
  const yesterday: NotificationItemWithHref[] = [];
  const thisWeek: NotificationItemWithHref[] = [];
  const earlier: NotificationItemWithHref[] = [];

  for (const row of list) {
    const it: NotificationItemWithHref = {
      id: row.id,
      title: row.title,
      description: row.body,
      time: row.time,
      icon: row.icon,
      href: row.href,
    };
    if (row.at >= today0) today.push(it);
    else if (row.at >= y0) yesterday.push(it);
    else if (row.at >= weekStart) thisWeek.push(it);
    else earlier.push(it);
  }

  const out: { label: string; items: NotificationItemWithHref[] }[] = [];
  if (today.length) out.push({ label: 'Today', items: today });
  if (yesterday.length) out.push({ label: 'Yesterday', items: yesterday });
  if (thisWeek.length) out.push({ label: 'This week', items: thisWeek });
  if (earlier.length) out.push({ label: 'Earlier', items: earlier });
  return out;
}

/** Fetches from `GET /notification`; same layout as `web/src/screens/NotificationsScreen.tsx`. */
export default function FieldflixNotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pt = Math.max(12, insets.top);
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<{ label: string; items: NotificationItemWithHref[] }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await getNotifications(1, 50);
      const list = (Array.isArray(raw) ? raw : []).map((e: any) => {
        const at = e?.created_at ? new Date(e.created_at).getTime() : 0;
        return {
          id: String(e?.id ?? ''),
          title: String(e?.title ?? 'Notification'),
          body: String(e?.body ?? ''),
          time: formatNotifTime(e?.created_at),
          icon: iconForNotificationType(e?.notification_type),
          at,
          href: notificationHref(e?.notification_type, e?.data),
        };
      });
      setSections(groupNotifications(list));
    } catch {
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <WebShell backgroundColor={BG}>
      <View style={styles.flex}>
        <View style={[styles.header, { paddingTop: pt }]}>
          <Pressable
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
              <Path
                d="M15 19l-7-7 7-7"
                stroke="#fff"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#22C55E" />
          </View>
        ) : (
          <ScrollView
            style={styles.main}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
          >
            {sections.length === 0 ? (
              <Text style={styles.empty}>No notifications yet.</Text>
            ) : null}
            {sections.map((section, idx) => (
              <View
                key={section.label}
                style={idx === 0 ? styles.sectionFirst : styles.sectionRest}
              >
                <Text style={styles.sectionLabel}>{section.label}</Text>
                <View style={styles.list}>
                  {section.items.map((n) => (
                    <NotificationCard
                      key={n.id}
                      item={n}
                      onPress={n.href ? () => router.push(n.href as Href) : undefined}
                    />
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </WebShell>
  );
}

function NotificationCard({
  item,
  onPress,
}: {
  item: NotificationItem;
  onPress?: () => void;
}) {
  const bulb = item.icon === 'bulb';

  const inner = (
    <>
      <View
        style={[
          styles.iconWrap,
          bulb ? styles.iconWrapBulb : styles.iconWrapDefault,
        ]}
      >
        <Image
          source={NOTIFICATION_ICON_SRC[item.icon]}
          style={bulb ? styles.iconImgBulb : styles.iconImg}
          resizeMode="contain"
        />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardDesc}>{item.description}</Text>
        <Text style={styles.cardTime}>{item.time}</Text>
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        style={[styles.card, { backgroundColor: CARD_BG }]}
        onPress={onPress}
        accessibilityRole="button"
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: CARD_BG }]}>{inner}</View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  headerTitle: {
    fontFamily: FF.bold,
    fontSize: 20,
    letterSpacing: -0.3,
    color: WEB.white,
  },
  main: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
  },
  empty: {
    fontFamily: FF.regular,
    fontSize: 15,
    color: MUTED,
    textAlign: 'center',
    marginTop: 32,
  },
  sectionFirst: {
    paddingTop: 20,
  },
  sectionRest: {
    marginTop: 28,
  },
  sectionLabel: {
    marginBottom: 12,
    fontFamily: FF.bold,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: WEB.green,
  },
  list: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapDefault: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  iconWrapBulb: {
    overflow: 'hidden',
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  iconImg: {
    width: 32,
    height: 32,
  },
  iconImgBulb: {
    width: 28,
    height: 28,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontFamily: FF.bold,
    fontSize: 15,
    lineHeight: 20,
    color: WEB.white,
  },
  cardDesc: {
    marginTop: 4,
    fontFamily: FF.regular,
    fontSize: 13,
    lineHeight: 20,
    color: MUTED,
  },
  cardTime: {
    marginTop: 8,
    fontFamily: FF.medium,
    fontSize: 12,
    color: WEB.green,
  },
});
