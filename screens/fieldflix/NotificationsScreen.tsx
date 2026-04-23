import { FF } from '@/screens/fieldflix/fonts';
import { NOTIFICATION_ICON_SRC } from '@/screens/fieldflix/notificationAssets';
import type { NotificationItem } from '@/screens/fieldflix/notificationsSections';
import { NOTIFICATION_SECTIONS } from '@/screens/fieldflix/notificationsSections';
import { WebShell } from '@/screens/fieldflix/WebShell';
import { WEB } from '@/screens/fieldflix/webDesign';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

const BG = '#050A0E';
const CARD_BG = '#081020';
const MUTED = '#a8b0bc';

/** Mirrors `web/src/screens/NotificationsScreen.tsx`. */
export default function FieldflixNotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pt = Math.max(12, insets.top);

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

        <ScrollView
          style={styles.main}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {NOTIFICATION_SECTIONS.map((section, idx) => (
            <View key={section.label} style={idx === 0 ? styles.sectionFirst : styles.sectionRest}>
              <Text style={styles.sectionLabel}>{section.label}</Text>
              <View style={styles.list}>
                {section.items.map((n) => (
                  <NotificationCard key={n.id} item={n} />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </WebShell>
  );
}

function NotificationCard({ item }: { item: NotificationItem }) {
  const bulb = item.icon === 'bulb';

  return (
    <View style={[styles.card, { backgroundColor: CARD_BG }]}>
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
    </View>
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
