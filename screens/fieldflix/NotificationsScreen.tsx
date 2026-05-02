import { getNotifications } from '@/lib/fieldflix-api';
import { FieldflixScreenHeader } from '@/screens/fieldflix/FieldflixScreenHeader';
import { FF } from '@/screens/fieldflix/fonts';
import { NOTIFICATION_ICON_SRC } from '@/screens/fieldflix/notificationAssets';
import type { NotificationIconId, NotificationItem } from '@/screens/fieldflix/notificationsSections';
import { WEB } from '@/screens/fieldflix/webDesign';
import { WebShell } from '@/screens/fieldflix/WebShell';
import {
  getUnreadApiNotificationCount,
  markAllApiNotificationsRead,
  markNotificationRowRead,
  notificationReadRowKey,
  type NotificationRowRef,
} from '@/utils/localNotificationReadStore';
import { getLocalNotifications } from '@/utils/localNotificationStore';
import { hrefFromNotificationData } from '@/utils/notificationRouting';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from "expo-haptics";
import { useRouter, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const BG = '#020617';
const CARD_BG = '#081020';
const MUTED = '#a8b0bc';

function iconForNotificationType(t: string | null | undefined): NotificationIconId {
  const u = String(t || '').toUpperCase();
  if (u.includes('WELCOME')) return 'bulb';
  if (u.includes('PAYMENT')) return 'trophy';
  if (u.includes('COMPLETE')) return 'trophy';
  if (u.includes('STOP')) return 'video';
  if (u.includes('RECORD')) return 'video';
  return 'trophy';
}

function notificationHref(type: string | null | undefined, data: any): Href | null {
  return hrefFromNotificationData(data, type);
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

type NotificationItemWithHref = NotificationItem & {
  href: Href | null;
  readRef: NotificationRowRef;
};

type MergedRow = {
  id: string;
  title: string;
  body: string;
  time: string;
  icon: NotificationIconId;
  at: number;
  href: Href | null;
  dedupeKey: string;
  readRef: NotificationRowRef;
};

function dedupeKeyForRow(row: { title: string; body: string; at: number }): string {
  const bucket = Math.floor(row.at / 120_000);
  return `${row.title}|${row.body}|${bucket}`;
}

function groupNotifications(
  list: {
    id: string;
    title: string;
    body: string;
    time: string;
    icon: NotificationIconId;
    at: number;
    href: Href | null;
    readRef: NotificationRowRef;
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
      readRef: row.readRef,
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
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<{ label: string; items: NotificationItemWithHref[] }[]>([]);
  const [apiRowsForRead, setApiRowsForRead] = useState<NotificationRowRef[]>([]);
  const [markingRead, setMarkingRead] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const markReadUnavailable =
    loading || markingRead || unreadCount <= 0;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await getNotifications(1, 50);
      const serverRows: MergedRow[] = (Array.isArray(raw) ? raw : []).map((e: any) => {
        const at = e?.created_at ? new Date(e.created_at).getTime() : 0;
        const title = String(e?.title ?? 'Notification');
        const body = String(e?.body ?? '');
        const readRef: NotificationRowRef = {
          id: e?.id,
          created_at: typeof e?.created_at === 'string' ? e.created_at : undefined,
          title,
          body,
        };
        const row: MergedRow = {
          id: notificationReadRowKey(readRef),
          title,
          body,
          time: formatNotifTime(e?.created_at),
          icon: iconForNotificationType(e?.notification_type),
          at,
          href: notificationHref(e?.notification_type, e?.data),
          dedupeKey: '',
          readRef,
        };
        row.dedupeKey = dedupeKeyForRow(row);
        return row;
      });

      const local = await getLocalNotifications();
      const localRows: MergedRow[] = local.map((e) => {
        const at = new Date(e.created_at).getTime();
        const title = e.title;
        const body = e.body;
        const readRef: NotificationRowRef = {
          id: e.id,
          created_at: e.created_at,
          title,
          body,
        };
        const row: MergedRow = {
          id: notificationReadRowKey(readRef),
          title,
          body,
          time: formatNotifTime(e.created_at),
          icon: iconForNotificationType(e.notification_type),
          at,
          href: notificationHref(e.notification_type, e.data),
          dedupeKey: '',
          readRef,
        };
        row.dedupeKey = dedupeKeyForRow(row);
        return row;
      });

      const seen = new Set<string>();
      const merged: MergedRow[] = [];
      for (const r of serverRows) {
        if (!seen.has(r.dedupeKey)) {
          seen.add(r.dedupeKey);
          merged.push(r);
        }
      }
      for (const r of localRows) {
        if (!seen.has(r.dedupeKey)) {
          seen.add(r.dedupeKey);
          merged.push(r);
        }
      }
      merged.sort((a, b) => b.at - a.at);
      const mergedRefs = merged.map((m) => m.readRef);
      setApiRowsForRead(mergedRefs);
      const unread = await getUnreadApiNotificationCount(mergedRefs);
      setUnreadCount(unread);
      setSections(
        groupNotifications(merged.map(({ dedupeKey: _, ...rest }) => rest)),
      );
    } catch {
      setSections([]);
      setApiRowsForRead([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <WebShell backgroundColor={BG}>
      <View style={styles.flex}>
        <FieldflixScreenHeader
          title="Notifications"
          rightAccessory={
            <Pressable
              onPressIn={() => {
                if (!markReadUnavailable) {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              onPress={async () => {
                if (markReadUnavailable) return;
                setMarkingRead(true);
                try {
                  await markAllApiNotificationsRead(apiRowsForRead);
                  await load();
                  void Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success,
                  );
                } finally {
                  setMarkingRead(false);
                }
              }}
              disabled={markReadUnavailable}
              style={({ pressed }) => [
                styles.markReadBtn,
                markReadUnavailable && styles.markReadBtnDisabled,
                pressed && !markReadUnavailable ? styles.markReadBtnPressed : null,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Mark all notifications as read"
              hitSlop={6}
            >
              {markingRead ? (
                <ActivityIndicator size="small" color={WEB.greenBright} />
              ) : (
                <Text
                  style={[
                    styles.markReadBtnText,
                    markReadUnavailable ? styles.markReadBtnTextDisabled : null,
                  ]}
                >
                  Mark as read
                </Text>
              )}
            </Pressable>
          }
        />

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#22C55E" />
          </View>
        ) : (
          <ScrollView
            style={styles.main}
            contentContainerStyle={styles.scrollContent}
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
                      onPress={
                        n.href
                          ? async () => {
                              await markNotificationRowRead(n.readRef);
                              const next = await getUnreadApiNotificationCount(
                                apiRowsForRead,
                              );
                              setUnreadCount(next);
                              router.push(n.href as Href);
                            }
                          : async () => {
                              await markNotificationRowRead(n.readRef);
                              const next = await getUnreadApiNotificationCount(
                                apiRowsForRead,
                              );
                              setUnreadCount(next);
                            }
                      }
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
  markReadBtn: {
    justifyContent: "center",
    alignItems: "center",
    minWidth: 96,
    minHeight: 36,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: "rgba(34,197,94,0.12)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(34,197,94,0.35)",
  },
  markReadBtnPressed: {
    backgroundColor: "rgba(34,197,94,0.22)",
    opacity: 0.94,
  },
  markReadBtnDisabled: {
    opacity: 0.42,
    backgroundColor: "rgba(148,163,184,0.08)",
    borderColor: "rgba(255,255,255,0.12)",
  },
  markReadBtnText: {
    fontFamily: FF.semiBold,
    fontSize: 13,
    color: WEB.greenBright,
    letterSpacing: -0.1,
    textAlign: "center",
  },
  markReadBtnTextDisabled: {
    color: "rgba(148,163,184,0.75)",
  },
  main: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 28,
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
    paddingTop: 12,
  },
  sectionRest: {
    marginTop: 22,
  },
  sectionLabel: {
    marginBottom: 10,
    fontFamily: FF.bold,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: WEB.green,
  },
  list: {
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 12,
    paddingHorizontal: 14,
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
