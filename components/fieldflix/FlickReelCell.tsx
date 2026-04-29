import type { FlickShortDto } from '@/lib/fieldflix-api';
import { FF } from '@/screens/fieldflix/fonts';
import { WEB } from '@/screens/fieldflix/webDesign';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from 'react-native';

const CLIP_FUDGE = 0.05;

function muxHlsUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

function muxPoster(playbackId: string, timeSec: number): string {
  const t = Math.max(0, Math.floor(timeSec));
  return `https://image.mux.com/${playbackId}/thumbnail.jpg?width=720&time=${t}`;
}

export function FlickReelCell({
  item,
  height,
  isActive,
  liked,
  isLiking,
  isSharing,
  onLike,
  onComment,
  onShareStart,
  onShareEnd,
}: {
  item: FlickShortDto;
  height: number;
  isActive: boolean;
  liked: boolean;
  isLiking?: boolean;
  isSharing?: boolean;
  onLike: () => void;
  onComment: () => void;
  onShareStart?: () => void;
  onShareEnd?: () => void;
}) {
  const startSec = item.startSec ?? 0;
  const endSec = item.endSec ?? 15;
  const hls = muxHlsUrl(item.muxPlaybackId);
  const isActiveRef = useRef(isActive);
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  const player = useVideoPlayer(hls, (p) => {
    p.loop = false;
    p.muted = false;
    p.timeUpdateEventInterval = 1 / 8;
  });

  useEffect(() => {
    const subLoad = player.addListener('sourceLoad', () => {
      player.currentTime = startSec;
    });
    const subTime = player.addListener('timeUpdate', (e: { currentTime?: number }) => {
      const t = e.currentTime ?? 0;
      if (t >= endSec - CLIP_FUDGE) {
        player.currentTime = startSec;
        if (isActiveRef.current) {
          void player.play();
        }
      }
    });
    return () => {
      subLoad.remove();
      subTime.remove();
    };
  }, [player, startSec, endSec, item.muxPlaybackId, item.id]);

  useEffect(() => {
    if (isActive) {
      player.currentTime = startSec;
      void player.play();
    } else {
      player.pause();
    }
  }, [isActive, player, startSec, item.muxPlaybackId, item.id]);

  const onShare = async () => {
    onShareStart?.();
    try {
      await Share.share({
        message: `${item.title || 'FlickShort'} (${Math.max(0, endSec - startSec).toFixed(0)}s)\n${hls}`,
        url: hls,
        title: item.title || 'FlickShort',
      });
    } catch {
      /* ignore */
    } finally {
      onShareEnd?.();
    }
  };

  const posterTime = startSec;
  const railBottom = Math.max(56, Math.min(104, Math.round(height * 0.135)));
  const captionBottom = Math.max(18, Math.min(36, Math.round(height * 0.05)));
  const videoInner =
    item.aspect === '16:9' ? (
      <View style={styles.letterboxCol}>
        <View style={styles.letterboxBand}>
          {item.topText ? (
            <Text style={styles.letterText} numberOfLines={3}>
              {item.topText}
            </Text>
          ) : null}
        </View>
        <View style={styles.video16x9}>
          <Image
            source={{ uri: muxPoster(item.muxPlaybackId, posterTime) }}
            style={[StyleSheet.absoluteFillObject, { zIndex: 0 }]}
            contentFit="cover"
          />
          <VideoView
            player={player}
            style={[StyleSheet.absoluteFillObject, { zIndex: 1 }]}
            contentFit="contain"
            nativeControls={false}
          />
        </View>
        <View style={styles.letterboxBand}>
          {item.bottomText ? (
            <Text style={styles.letterText} numberOfLines={3}>
              {item.bottomText}
            </Text>
          ) : null}
        </View>
      </View>
    ) : (
      <View style={styles.fill}>
        <Image
          source={{ uri: muxPoster(item.muxPlaybackId, posterTime) }}
          style={[StyleSheet.absoluteFillObject, { zIndex: 0 }]}
          contentFit="cover"
        />
        <VideoView
          player={player}
          style={[StyleSheet.absoluteFillObject, { zIndex: 1 }]}
          contentFit="cover"
          nativeControls={false}
        />
        {item.topText ? (
          <View style={[styles.overlayTop, styles.overlayPad]}>
            <Text style={styles.overlayText}>{item.topText}</Text>
          </View>
        ) : null}
        {item.bottomText ? (
          <View style={[styles.overlayBottom, styles.overlayPad]}>
            <Text style={styles.overlayText}>{item.bottomText}</Text>
          </View>
        ) : null}
      </View>
    );

  return (
    <View style={[styles.reel, { height }]}>
      {videoInner}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(0,0,0,0.44)', 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0.56)']}
        locations={[0, 0.5, 1]}
        style={styles.reelShade}
      />
      <View style={[styles.rail, { bottom: railBottom }]}>
        <ReelAction
          label={liked ? 'Liked' : 'Like'}
          active={liked}
          onPress={onLike}
          busy={!!isLiking}
          icon={
            isLiking ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialCommunityIcons
                name={liked ? 'heart' : 'heart-outline'}
                size={32}
                color={liked ? '#f43f5e' : '#fff'}
              />
            )
          }
        />
        <ReelAction
          label="Comment"
          onPress={onComment}
          icon={<MaterialCommunityIcons name="comment-outline" size={30} color="#fff" />}
        />
        <ReelAction
          label="Share"
          onPress={onShare}
          busy={!!isSharing}
          icon={
            isSharing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialCommunityIcons name="share-variant" size={30} color="#fff" />
            )
          }
        />
      </View>
      <View style={[styles.caption, { bottom: captionBottom }]} pointerEvents="none">
        <Text style={styles.captionTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.likesCount > 0 ? (
          <Text style={styles.captionSub}>{item.likesCount} likes</Text>
        ) : null}
        <Text style={styles.captionSub}>
          Clip {(endSec - startSec).toFixed(1)}s
        </Text>
      </View>
    </View>
  );
}

function ReelAction({
  label,
  icon,
  onPress,
  active,
  busy,
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  active?: boolean;
  busy?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={styles.railBtn} hitSlop={8} disabled={busy}>
      {icon}
      <Text style={[styles.railLbl, active && { color: WEB.greenBright }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  reel: { width: '100%', backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  fill: { flex: 1, width: '100%' },
  letterboxCol: { flex: 1, width: '100%' },
  letterboxBand: {
    flex: 1,
    width: '100%',
    backgroundColor: '#000',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  letterText: {
    fontFamily: FF.semiBold,
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14,
    textAlign: 'center',
  },
  video16x9: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  reelShade: {
    ...StyleSheet.absoluteFillObject,
  },
  rail: {
    zIndex: 2,
    position: 'absolute',
    right: 12,
    alignItems: 'center',
    gap: 14,
  },
  railBtn: { alignItems: 'center', gap: 5 },
  railLbl: {
    fontFamily: FF.medium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
  },
  overlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  overlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  overlayPad: { padding: 12, backgroundColor: 'rgba(0,0,0,0.35)' },
  overlayText: {
    fontFamily: FF.semiBold,
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  caption: {
    position: 'absolute',
    left: 12,
    right: 78,
    paddingRight: 6,
  },
  captionTitle: {
    fontFamily: FF.bold,
    color: '#fff',
    fontSize: 17,
    lineHeight: 22,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  captionSub: {
    marginTop: 4,
    fontFamily: FF.medium,
    color: 'rgba(255,255,255,0.84)',
    fontSize: 12,
    lineHeight: 16,
  },
});
