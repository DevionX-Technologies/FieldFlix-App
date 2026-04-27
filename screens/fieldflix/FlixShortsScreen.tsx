import { Paths } from '@/data/paths';
import { FF } from '@/screens/fieldflix/fonts';
import { WebShell } from '@/screens/fieldflix/WebShell';
import { WEB } from '@/screens/fieldflix/webDesign';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const WIN = Dimensions.get('window');
const TOPBAR_H = 56;
const SPORT_TILES_H = 46;
const REEL_H = WIN.height - TOPBAR_H - SPORT_TILES_H;

/** Same order as web `REEL_IMAGES`: images23, 21, 19, 18 */
const REEL_IMAGES = [
  require('@/assets/fieldflix-web/reels/images23.jpg'),
  require('@/assets/fieldflix-web/reels/images21.jpg'),
  require('@/assets/fieldflix-web/reels/images19.jpg'),
  require('@/assets/fieldflix-web/reels/images18.jpg'),
] as const;

const SPORT_TILES = [
  {
    id: 'pickleball',
    label: 'Pickleball',
    icon: require('@/assets/fieldflix-web/pickleball.png'),
  },
  {
    id: 'padel',
    label: 'Padel',
    icon: require('@/assets/fieldflix-web/padel.png'),
  },
  {
    id: 'cricket',
    label: 'Cricket',
    icon: require('@/assets/fieldflix-web/coming-soon.png'),
  },
  {
    id: 'all',
    label: 'View All\nTab',
    icon: null,
  },
] as const;

/**
 * Vertical reels shell aligned with `web/src/screens/FlixShortsScreen.tsx`
 * (full-viewport slides, pause overlay, right rail).
 */
export default function FieldflixFlixShortsScreen() {
  const router = useRouter();
  const [liked, setLiked] = useState<Record<number, boolean>>({});
  const [subscribed, setSubscribed] = useState<Record<number, boolean>>({});

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(Paths.home);
  };

  return (
    <WebShell backgroundColor="#000000">
      <View style={styles.flex}>
        <View style={styles.topBar}>
          <Pressable onPress={goBack} hitSlop={12} style={styles.backBtn}>
            <MaterialCommunityIcons name="chevron-left" size={28} color="rgba(255,255,255,0.85)" />
          </Pressable>
          <Text style={styles.topTitle}>FlickShorts</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.sportsStrip}>
          {SPORT_TILES.map((tile) => (
            <Pressable key={tile.id} style={styles.sportTile} onPress={() => {}}>
              {tile.icon ? (
                <Image source={tile.icon} style={styles.sportIcon} resizeMode="contain" />
              ) : null}
              <Text style={styles.sportTileLabel}>{tile.label}</Text>
            </Pressable>
          ))}
        </View>

        <FlatList
          style={styles.list}
          data={[...REEL_IMAGES]}
          keyExtractor={(_, i) => String(i)}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={REEL_H}
          snapToAlignment="start"
          contentContainerStyle={{ paddingBottom: 0 }}
          getItemLayout={(_, index) => ({
            length: REEL_H,
            offset: REEL_H * index,
            index,
          })}
          renderItem={({ item, index }) => (
            <View style={[styles.reel, { height: REEL_H }]}>
              <Image source={item} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <View style={styles.reelDim} pointerEvents="none" />
              <View style={styles.pauseRing}>
                <MaterialCommunityIcons name="pause" size={40} color="#fff" />
              </View>

              <View style={styles.rail}>
                <ReelAction
                  label={liked[index] ? 'Liked' : 'Like'}
                  active={!!liked[index]}
                  onPress={() => setLiked((p) => ({ ...p, [index]: !p[index] }))}
                  icon={
                    <MaterialCommunityIcons
                      name={liked[index] ? 'heart' : 'heart-outline'}
                      size={32}
                      color={liked[index] ? '#f43f5e' : '#fff'}
                    />
                  }
                />
                <ReelAction
                  label="Share"
                  onPress={() => {}}
                  icon={<MaterialCommunityIcons name="share-variant" size={30} color="#fff" />}
                />
                <ReelAction
                  label={subscribed[index] ? 'Subscribed' : 'Subscribe'}
                  active={!!subscribed[index]}
                  onPress={() => setSubscribed((p) => ({ ...p, [index]: !p[index] }))}
                  icon={
                    <MaterialCommunityIcons
                      name={subscribed[index] ? 'bell' : 'bell-outline'}
                      size={30}
                      color="#fff"
                    />
                  }
                />
              </View>
            </View>
          )}
        />
      </View>
    </WebShell>
  );
}

function ReelAction({
  label,
  icon,
  onPress,
  active,
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={styles.railBtn}>
      {icon}
      <Text style={[styles.railLbl, active && { color: WEB.greenBright }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { flex: 1 },
  topBar: {
    height: TOPBAR_H,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FF.bold,
    fontSize: 18,
    color: WEB.white,
  },
  sportsStrip: {
    height: SPORT_TILES_H,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    backgroundColor: '#030712',
  },
  sportTile: {
    width: 72,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    gap: 1,
  },
  sportIcon: {
    width: 14,
    height: 14,
  },
  sportTileLabel: {
    fontFamily: FF.medium,
    fontSize: 9,
    lineHeight: 10,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
  },
  reel: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  reelDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  pauseRing: {
    zIndex: 1,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rail: {
    zIndex: 2,
    position: 'absolute',
    right: 12,
    bottom: 100,
    alignItems: 'center',
    gap: 20,
  },
  railBtn: {
    alignItems: 'center',
    gap: 4,
  },
  railLbl: {
    fontFamily: FF.medium,
    fontSize: 10,
    color: 'rgba(255,255,255,0.85)',
  },
});
