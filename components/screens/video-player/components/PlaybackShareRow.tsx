import { RecordingHighlight } from '@/components/screens/video-player/type';
import {
  shareFullMatchRecording,
  shareHighlightClipMp4,
} from '@/utils/recordingPlaybackShare';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export type PlaybackShareRowProps = {
  allowShare: boolean;
  shareRecordingId: string | null;
  /** Highlight currently loaded in the player, or null for full match. */
  activeHighlightClip: RecordingHighlight | null;
};

export const PlaybackShareRow: React.FC<PlaybackShareRowProps> = ({
  allowShare,
  shareRecordingId,
  activeHighlightClip,
}) => {
  if (!allowShare || !shareRecordingId?.trim()) {
    return null;
  }

  const mainPlaying = activeHighlightClip == null;
  const hid = activeHighlightClip
    ? String(activeHighlightClip.id ?? '')
    : '';
  const flick = hid.startsWith('flick-');

  if (!mainPlaying) {
    return (
      <View style={styles.row}>
        {!flick ? (
          <Pressable
            style={[styles.btn, styles.btnFlex]}
            onPress={() => void shareHighlightClipMp4(hid)}
            accessibilityRole="button"
            accessibilityLabel="Share highlight"
          >
            <Ionicons name="share" size={18} color="#FFFFFF" />
            <Text style={styles.btnLabel}>Share highlight</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={[styles.btn, styles.btnFlex, !flick && styles.btnSecond]}
          onPress={() =>
            void shareFullMatchRecording(shareRecordingId)
          }
          accessibilityRole="button"
          accessibilityLabel="Share full match"
        >
          <Ionicons name="share" size={18} color="#FFFFFF" />
          <Text style={styles.btnLabel}>Share full match</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      style={styles.btn}
      onPress={() => void shareFullMatchRecording(shareRecordingId)}
      accessibilityRole="button"
      accessibilityLabel="Share full match"
    >
      <Ionicons name="share" size={18} color="#FFFFFF" />
      <Text style={styles.btnLabel}>Share full match</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#22C55E',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 4,
  },
  btnFlex: {
    flex: 1,
    marginTop: 0,
  },
  btnSecond: {
    backgroundColor: '#15803d',
  },
  btnLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
