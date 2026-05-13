import { processRecordingHighlightForShare } from '@/lib/fieldflix-api';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Reject HLS / Mux stream URLs — Expo file share expects a progressive file (e.g. MP4). */
export function isLikelyMp4ExportUrl(url: string): boolean {
  const u = url.toLowerCase();
  if (u.includes('.m3u8')) return false;
  if (u.includes('stream.mux.com')) return false;
  return true;
}

export async function shareHighlightAsMp4File(
  highlightId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await processRecordingHighlightForShare(highlightId);
  if (!res.success || !res.signedUrl?.trim()) {
    return {
      ok: false,
      message: res.message?.trim() || 'Could not prepare this highlight.',
    };
  }
  if (!isLikelyMp4ExportUrl(res.signedUrl)) {
    return {
      ok: false,
      message:
        'This highlight is still being converted for sharing. Please try again in a minute.',
    };
  }
  const base = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!base) {
    return { ok: false, message: 'Storage is not available on this device.' };
  }
  const fileUri = `${base}fieldflicks_highlight_${highlightId}.mp4`;
  const downloadResult = await FileSystem.downloadAsync(res.signedUrl, fileUri);
  if (downloadResult.status !== 200) {
    return {
      ok: false,
      message: 'Download failed. Check your connection and try again.',
    };
  }
  if (!(await Sharing.isAvailableAsync())) {
    return { ok: false, message: 'Sharing is not available on this device.' };
  }
  await Sharing.shareAsync(downloadResult.uri, {
    mimeType: 'video/mp4',
    dialogTitle: 'Share highlight',
  });
  try {
    await FileSystem.deleteAsync(downloadResult.uri, { idempotent: true });
  } catch {
    /* ignore */
  }
  return { ok: true };
}
