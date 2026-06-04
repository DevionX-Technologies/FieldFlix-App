/**
 * Inline playback share helpers (parity with HighlightCard actions).
 */
import { createShareLink } from '@/lib/fieldflix-api';
import { buildHighlightsAppLink } from '@/utils/highlightsAppLink';
import {
  shareHighlightAsMp4File,
  type ShareHighlightProgressUpdate,
} from '@/utils/shareHighlightClip';
import { Alert, Share } from 'react-native';

export async function shareFullMatchRecording(
  recordingId: string | null | undefined,
): Promise<void> {
  const rid = String(recordingId ?? '').trim();
  if (!rid) {
    Alert.alert('Share', 'Recording id unavailable for share.');
    return;
  }
  try {
    let shareUrl: string | null = null;
    try {
      const { shareableLink } = await createShareLink(rid);
      shareUrl = shareableLink;
    } catch {
      shareUrl = buildHighlightsAppLink(rid);
    }
    if (!shareUrl) {
      Alert.alert('Share unavailable', 'Could not generate a shareable link.');
      return;
    }
    await Share.share({
      message: `Watch my full match on FieldFlicks: ${shareUrl}`,
      url: shareUrl,
      title: 'FieldFlicks',
    });
  } catch (e) {
    console.error('shareFullMatchRecording', e);
    Alert.alert('Share failed', 'Something went wrong. Please try again.');
  }
}

export async function shareHighlightClipMp4(
  highlightId: string,
  onProgress?: (update: ShareHighlightProgressUpdate) => void,
): Promise<void> {
  const clipId = String(highlightId).trim();
  if (!clipId || clipId === 'main-video') {
    Alert.alert('Share unavailable', 'This clip cannot be shared.');
    return;
  }
  try {
    const result = await shareHighlightAsMp4File(clipId, onProgress);
    if (!result.ok) {
      Alert.alert('Could not share', result.message);
    }
  } catch (e) {
    console.error('shareHighlightClipMp4', e);
    Alert.alert('Share failed', 'Something went wrong. Please try again.');
  }
}
