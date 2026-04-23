import { Paths } from '@/data/paths';
import { FF } from '@/screens/fieldflix/fonts';
import { FieldflixBottomNav } from '@/screens/fieldflix/BottomNav';
import { WebShell } from '@/screens/fieldflix/WebShell';
import { BG } from '@/screens/fieldflix/bundledBackgrounds';
import { SESSIONS_BACK_ARROW, SESSIONS_ROW } from '@/screens/fieldflix/sessionsData';
import { WEB } from '@/screens/fieldflix/webDesign';
import { Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

/** 21px / 372px — right inset for play + Completed (web `SessionsScreen.tsx`) */
const CARD_PAD_X_PCT = (21 / 372) * 100;

type SessionRow = (typeof SESSIONS_ROW)[number];

/** Mirrors `web/src/screens/SessionsScreen.tsx` layout; list uses `SESSIONS_ROW` + Codia assets. */
export default function FieldflixSessionsScreen() {
  const router = useRouter();

  return (
    <WebShell backgroundColor={WEB.sessionsBg}>
      <View style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.pad}>
            <View style={styles.header}>
              <Pressable
                onPress={() => router.push(Paths.home)}
                accessibilityLabel="Back to home"
                style={styles.backBtn}
              >
                <Image source={SESSIONS_BACK_ARROW} style={{ width: 24, height: 24 }} resizeMode="cover" />
              </Pressable>
              <Text style={styles.headerTitle}>Sessions</Text>
            </View>

            <View style={styles.section}>
              <View style={styles.completedStrip}>
                <Text style={styles.completedText}>Completed Sessions</Text>
              </View>

              <View style={styles.cards}>
                {SESSIONS_ROW.map((row) => (
                  <SessionCard key={row.id} row={row} />
                ))}
              </View>
            </View>
          </View>
        </ScrollView>
        <FieldflixBottomNav active="sessions" />
      </View>
    </WebShell>
  );
}

function SessionCard({ row }: { row: SessionRow }) {
  return (
    <View style={styles.card}>
      <Image source={BG.sessionCard} style={StyleSheet.absoluteFill} resizeMode="cover" />

      <View
        style={[
          styles.frameMain,
          {
            top: '11.52%',
            left: '5.11%',
            width: '66.4%',
            height: '75.76%',
          },
        ]}
      >
        <View style={styles.sportRow}>
          <View style={styles.sportIconBg}>
            <Image source={row.sportIcon} style={{ width: 24, height: 24 }} resizeMode="contain" />
          </View>
          <Text style={styles.sportName} numberOfLines={1}>
            {row.sport}
          </Text>
        </View>

        <View style={styles.arenaRow}>
          <Text style={styles.arenaText} numberOfLines={1}>
            {row.arena}
          </Text>
        </View>

        <View style={styles.metaCol}>
          <View style={styles.metaLine}>
            <Image source={row.pinIcon} style={styles.metaIcon} resizeMode="cover" />
            <Text style={styles.metaText} numberOfLines={1}>
              {row.area}
            </Text>
          </View>
          <View style={styles.metaLine}>
            <Image source={row.clockIcon} style={styles.metaIcon} resizeMode="cover" />
            <Text style={styles.metaText} numberOfLines={1}>
              {row.when}
            </Text>
          </View>
        </View>
      </View>

      {row.playIcon ? (
        <Pressable
          style={[styles.playBtn, { top: '11.52%', right: `${CARD_PAD_X_PCT}%` }]}
          accessibilityLabel="Share or play session"
        >
          <Image source={row.playIcon} style={{ width: 24, height: 24 }} resizeMode="contain" />
        </Pressable>
      ) : null}

      <View
        style={[
          styles.completedBadge,
          {
            bottom: `${(21 / 165) * 100}%`,
            right: `${CARD_PAD_X_PCT}%`,
          },
        ]}
      >
        <Text style={styles.completedBadgeText}>Completed</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 200,
  },
  pad: {
    paddingHorizontal: 15,
    paddingBottom: 40,
  },
  header: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    height: 27,
    fontFamily: FF.bold,
    fontSize: 20,
    lineHeight: 27,
    color: WEB.white,
  },
  section: {
    marginTop: 30,
    gap: 40,
  },
  completedStrip: {
    width: '100%',
    borderBottomWidth: 2,
    borderBottomColor: WEB.green,
    paddingBottom: 10,
  },
  completedText: {
    textAlign: 'center',
    fontFamily: FF.semiBold,
    fontSize: 15,
    lineHeight: 20,
    color: WEB.white,
  },
  cards: {
    width: '100%',
    alignItems: 'center',
    gap: 30,
  },
  card: {
    position: 'relative',
    height: 165,
    width: '100%',
    maxWidth: 372,
    borderRadius: 20,
    overflow: 'hidden',
  },
  frameMain: {
    position: 'absolute',
    zIndex: 1,
    gap: 12,
  },
  sportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    height: 42,
  },
  sportIconBg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(34, 197, 94, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sportName: {
    height: 27,
    fontFamily: FF.semiBold,
    fontSize: 20,
    lineHeight: 27,
    color: WEB.white,
  },
  arenaRow: {
    height: 22,
    width: '100%',
    justifyContent: 'center',
  },
  arenaText: {
    fontFamily: FF.semiBold,
    fontSize: 16,
    lineHeight: 22,
    color: WEB.white,
  },
  metaCol: {
    height: 37,
    width: 163,
    maxWidth: '100%',
    gap: 5,
    justifyContent: 'center',
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaIcon: {
    width: 15,
    height: 15,
  },
  metaText: {
    flex: 1,
    fontFamily: FF.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: WEB.muted,
  },
  playBtn: {
    position: 'absolute',
    zIndex: 2,
    width: 45,
    height: 42,
    borderRadius: 20,
    paddingTop: 9,
    paddingRight: 10,
    paddingBottom: 9,
    paddingLeft: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedBadge: {
    position: 'absolute',
    zIndex: 2,
    height: 29,
    width: 94,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(34, 197, 94, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedBadgeText: {
    fontFamily: FF.semiBold,
    fontSize: 14,
    lineHeight: 19,
    color: WEB.green,
  },
});
