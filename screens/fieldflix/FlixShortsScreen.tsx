import { FlickReelCell } from '@/components/fieldflix/FlickReelCell';
import { Paths } from '@/data/paths';
import { FF } from '@/screens/fieldflix/fonts';
import { WebShell } from '@/screens/fieldflix/WebShell';
import { WEB } from '@/screens/fieldflix/webDesign';
import {
  commentOnFlickShort,
  getFieldflixApiErrorMessage,
  getPublicFlickShorts,
  likeFlickShort,
  type FlickShortDto,
} from '@/lib/fieldflix-api';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewToken,
} from 'react-native';

const WIN = Dimensions.get('window');
const TOPBAR_H = 56;
const SPORT_TILES_H = 46;
const REEL_H = WIN.height - TOPBAR_H - SPORT_TILES_H;

const SPORT_TILES = [
  { id: 'all' as const, label: 'View All\nTab', icon: null as number | null },
  { id: 'pickleball' as const, label: 'Pickleball', icon: require('@/assets/fieldflix-web/pickleball.png') },
  { id: 'padel' as const, label: 'Padel', icon: require('@/assets/fieldflix-web/padel.png') },
  { id: 'cricket' as const, label: 'Cricket', icon: require('@/assets/fieldflix-web/coming-soon.png') },
] as const;

type SportId = (typeof SPORT_TILES)[number]['id'];

/**
 * FlickShorts: server-backed approved shorts, filtered by sport tab.
 */
export default function FieldflixFlixShortsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<FlickShortDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [sport, setSport] = useState<SportId>('all');
  const [activeIndex, setActiveIndex] = useState(0);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [commentItem, setCommentItem] = useState<FlickShortDto | null>(null);
  const [commentText, setCommentText] = useState('');

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(Paths.home);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getPublicFlickShorts(sport === 'all' ? undefined : sport);
      setItems(list);
      setActiveIndex(0);
    } catch (e) {
      Alert.alert('FlickShorts', getFieldflixApiErrorMessage(e, 'Could not load'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [sport]);

  useEffect(() => {
    void load();
  }, [load]);

  const onViewable = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index!);
      }
    },
    [],
  );

  const onLike = async (row: FlickShortDto) => {
    try {
      const u = await likeFlickShort(row.id);
      setItems((prev) => prev.map((r) => (r.id === u.id ? u : r)));
      setLiked((p) => ({ ...p, [row.id]: true }));
    } catch (e) {
      Alert.alert('Like', getFieldflixApiErrorMessage(e, 'Failed'));
    }
  };

  const submitComment = async () => {
    if (!commentItem) return;
    const t = commentText.trim();
    if (!t) {
      setCommentItem(null);
      return;
    }
    try {
      const u = await commentOnFlickShort(commentItem.id, t);
      setItems((prev) => prev.map((r) => (r.id === u.id ? u : r)));
      setCommentText('');
      setCommentItem(null);
    } catch (e) {
      Alert.alert('Comment', getFieldflixApiErrorMessage(e, 'Failed'));
    }
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
            <Pressable
              key={tile.id}
              style={[styles.sportTile, sport === tile.id && styles.sportTileOn]}
              onPress={() => setSport(tile.id)}
            >
              {tile.icon != null ? (
                <Image source={tile.icon} style={styles.sportIcon} resizeMode="contain" />
              ) : null}
              <Text style={styles.sportTileLabel}>{tile.label}</Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <View style={styles.empty}>
            <ActivityIndicator color={WEB.greenBright} size="large" />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No FlickShorts in this filter yet.</Text>
            <Text style={styles.emptySub}>
              Admins can publish highlights from the admin dashboard. Approve a short to show it
              here for everyone.
            </Text>
          </View>
        ) : (
          <FlatList
            style={styles.list}
            data={items}
            keyExtractor={(it) => it.id}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={REEL_H}
            snapToAlignment="start"
            onViewableItemsChanged={onViewable}
            viewabilityConfig={{ itemVisiblePercentThreshold: 70 }}
            getItemLayout={(_, index) => ({
              length: REEL_H,
              offset: REEL_H * index,
              index,
            })}
            renderItem={({ item, index }) => (
              <FlickReelCell
                item={item}
                height={REEL_H}
                isActive={index === activeIndex}
                liked={!!liked[item.id]}
                onLike={() => onLike(item)}
                onComment={() => setCommentItem(item)}
              />
            )}
          />
        )}
      </View>

      <Modal
        visible={commentItem != null}
        transparent
        animationType="slide"
        onRequestClose={() => setCommentItem(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Comments</Text>
            <FlatList
              style={styles.commentList}
              data={commentItem?.comments ?? []}
              keyExtractor={(c) => c.id}
              ListEmptyComponent={
                <Text style={styles.emptySub}>No comments yet. Be the first.</Text>
              }
              renderItem={({ item: c }) => (
                <View style={styles.commentRow}>
                  <Text style={styles.commentName}>{c.userName ?? 'Player'}</Text>
                  <Text style={styles.commentBody}>{c.text}</Text>
                </View>
              )}
            />
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment…"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={commentText}
              onChangeText={setCommentText}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setCommentItem(null)} style={styles.modalBtn}>
                <Text style={styles.modalBtnTxt}>Close</Text>
              </Pressable>
              <Pressable
                onPress={submitComment}
                style={[styles.modalBtn, styles.modalBtnPrimary]}
              >
                <Text style={styles.modalBtnPrimaryTxt}>Post</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </WebShell>
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
    flex: 1,
    minWidth: 0,
    maxHeight: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    gap: 1,
  },
  sportTileOn: {
    borderColor: WEB.greenBright,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  sportIcon: {
    width: 14,
    height: 14,
  },
  sportTileLabel: {
    fontFamily: FF.medium,
    fontSize: 8.5,
    lineHeight: 9,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: { fontFamily: FF.semiBold, color: '#fff', fontSize: 16, textAlign: 'center' },
  emptySub: {
    fontFamily: FF.regular,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0b1220',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '55%',
  },
  modalTitle: { fontFamily: FF.bold, color: '#fff', fontSize: 18, marginBottom: 8 },
  commentList: { maxHeight: 180, marginBottom: 8 },
  commentRow: { marginBottom: 10 },
  commentName: { fontFamily: FF.semiBold, color: WEB.greenBright, fontSize: 12 },
  commentBody: { fontFamily: FF.regular, color: 'rgba(255,255,255,0.9)', fontSize: 14, marginTop: 2 },
  commentInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 10,
    color: '#fff',
    fontFamily: FF.regular,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
  modalBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  modalBtnTxt: { color: 'rgba(255,255,255,0.75)', fontFamily: FF.semiBold },
  modalBtnPrimary: { backgroundColor: WEB.greenBright, borderRadius: 10 },
  modalBtnPrimaryTxt: { color: '#04130d', fontFamily: FF.bold, paddingHorizontal: 8 },
});
