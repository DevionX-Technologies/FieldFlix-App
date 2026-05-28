import { processRecordingHighlightForShare } from '@/lib/fieldflix-api';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** One timestamped step for support / repro (URLs redacted elsewhere). */
export type ShareHighlightDebugEntry = {
  t: string;
  step: string;
  detail?: Record<string, unknown>;
};

export type ShareHighlightAsMp4Result =
  | { ok: true; debug: ShareHighlightDebugEntry[] }
  | { ok: false; message: string; debug: ShareHighlightDebugEntry[] };

/** Reject HLS master URLs — Expo file share expects a progressive file (e.g. MP4). */
export function isLikelyMp4ExportUrl(url: string): boolean {
  const u = url.toLowerCase();
  if (u.includes('.m3u8')) return false;
  if (u.includes('stream.mux.com') && !u.includes('.mp4')) return false;
  if (!u.includes('.mp4')) return false;
  return true;
}

function createLogger(): {
  debug: ShareHighlightDebugEntry[];
  log: (step: string, detail?: Record<string, unknown>) => void;
} {
  const debug: ShareHighlightDebugEntry[] = [];
  const log = (step: string, detail?: Record<string, unknown>) => {
    debug.push({ t: new Date().toISOString(), step, detail });
  };
  return { debug, log };
}

function signedUrlForLog(url: string): string {
  try {
    const u = new URL(url);
    if (u.searchParams.has('token')) {
      u.searchParams.set('token', '<redacted>');
    }
    return u.toString();
  } catch {
    return url.length > 160 ? `${url.slice(0, 160)}…` : url;
  }
}

export type ShareHighlightProgressStage = 'preparing' | 'downloading' | 'sharing';

export type ShareHighlightProgressUpdate = {
  stage: ShareHighlightProgressStage;
  /** 0–1 overall; `null` while server prepares export (unknown duration). */
  progress: number | null;
  message: string;
};

export async function shareHighlightAsMp4File(
  highlightId: string,
  onProgress?: (update: ShareHighlightProgressUpdate) => void,
): Promise<ShareHighlightAsMp4Result> {
  const { debug, log } = createLogger();
  const hid = String(highlightId ?? '').trim();
  log('start', { highlightId: hid });

  if (!hid) {
    log('invalid_highlight_id');
    return { ok: false, message: 'Missing highlight id.', debug };
  }

  onProgress?.({
    stage: 'preparing',
    progress: null,
    message: 'Preparing your highlight MP4 on our servers…',
  });

  let res: Awaited<ReturnType<typeof processRecordingHighlightForShare>>;
  try {
    res = await processRecordingHighlightForShare(hid);
  } catch (e) {
    const ax = axios.isAxiosError(e);
    log('api_request_failed', {
      error: String(e),
      ...(ax
        ? {
            status: e.response?.status,
            responseData: e.response?.data,
          }
        : {}),
    });
    return {
      ok: false,
      message:
        ax && e.response?.status
          ? `Server error (${e.response.status}). Try again in a moment.`
          : 'Could not reach the server. Check your connection.',
      debug,
    };
  }

  log('api_response', {
    success: res.success,
    message: res.message,
    highlightIdFromApi: res.highlightId,
    hasSignedUrl: Boolean(res.signedUrl?.trim()),
    signedUrl: res.signedUrl ? signedUrlForLog(res.signedUrl) : null,
    s3Path: res.s3Path ?? null,
    bucketName: res.bucketName ?? null,
  });

  // API sometimes returns success + HLS playback URL — unusable for single-file share.
  if (
    res.success &&
    res.signedUrl?.trim() &&
    !isLikelyMp4ExportUrl(res.signedUrl)
  ) {
    log('api_success_but_non_mp4_url', {
      message: res.message,
      signedUrl: signedUrlForLog(res.signedUrl),
    });
    return {
      ok: false,
      message:
        res.message?.trim() ||
        'The server sent a streaming playback link (HLS), not a file you can attach. In-app playback still works. Try again after MP4 export is ready, or contact support with this highlight id.',
      debug,
    };
  }

  if (!res.success || !res.signedUrl?.trim()) {
    return {
      ok: false,
      message:
        res.message?.trim() ||
        'Could not prepare this highlight for sharing. Export runs on our servers (MP4), separate from playback.',
      debug,
    };
  }

  const base = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  log('storage_base', {
    hasCache: Boolean(FileSystem.cacheDirectory),
    hasDocument: Boolean(FileSystem.documentDirectory),
  });

  if (!base) {
    log('no_storage_base');
    return { ok: false, message: 'Storage is not available on this device.', debug };
  }

  const fileUri = `${base}fieldflicks_highlight_${hid}.mp4`;
  log('download_start', { fileUri, signedUrl: signedUrlForLog(res.signedUrl) });

  onProgress?.({
    stage: 'downloading',
    progress: 0,
    message: 'Downloading video to your device…',
  });

  let downloadUri: string | null = null;
  try {
    const existing = await FileSystem.getInfoAsync(fileUri);
    if (existing.exists) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    }

    const downloadResumable = FileSystem.createDownloadResumable(
      res.signedUrl,
      fileUri,
      {},
      ({ totalBytesExpectedToWrite, totalBytesWritten }) => {
        if (totalBytesExpectedToWrite > 0) {
          const ratio = totalBytesWritten / totalBytesExpectedToWrite;
          onProgress?.({
            stage: 'downloading',
            progress: ratio,
            message: 'Downloading video to your device…',
          });
        }
      },
    );
    const downloadResult = await downloadResumable.downloadAsync();
    if (!downloadResult?.uri || downloadResult.status !== 200) {
      log('download_failed', { status: downloadResult?.status ?? null });
      return {
        ok: false,
        message: 'Download failed. Check your connection and try again.',
        debug,
      };
    }
    downloadUri = downloadResult.uri;
    log('download_finished', {
      status: downloadResult.status,
      uri: downloadResult.uri,
      mimeType: downloadResult.mimeType ?? null,
    });
  } catch (e) {
    log('download_threw', { error: String(e) });
    return {
      ok: false,
      message: 'Download failed. Check your connection and try again.',
      debug,
    };
  }

  let sharingAvailable: boolean;
  try {
    sharingAvailable = await Sharing.isAvailableAsync();
  } catch (e) {
    log('sharing_available_check_failed', { error: String(e) });
    sharingAvailable = false;
  }

  log('sharing_available', { sharingAvailable });

  if (!sharingAvailable) {
    return { ok: false, message: 'Sharing is not available on this device.', debug };
  }

  onProgress?.({
    stage: 'sharing',
    progress: 1,
    message: 'Opening share options…',
  });

  try {
    await Sharing.shareAsync(downloadUri, {
      mimeType: 'video/mp4',
      dialogTitle: 'Share highlight',
    });
    log('share_sheet_closed');
  } catch (e) {
    log('share_async_failed', { error: String(e) });
    try {
      await FileSystem.deleteAsync(downloadUri, { idempotent: true });
    } catch {
      /* ignore */
    }
    return {
      ok: false,
      message: 'Could not open the share sheet. Try again.',
      debug,
    };
  }

  try {
    await FileSystem.deleteAsync(downloadUri, { idempotent: true });
    log('temp_file_deleted');
  } catch (e) {
    log('temp_file_delete_failed', { error: String(e) });
  }

  return { ok: true, debug };
}
