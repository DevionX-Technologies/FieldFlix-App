// File: src/hooks/useDownloadAndShare.ts

import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import { Alert } from "react-native";

interface UseDownloadAndShareResult {
  isDownloading: boolean;
  progress: number; // from 0 to 1
  downloadAndShare: (remoteUri: string, fileName?: string) => Promise<void>;
}

/**
 * Hook that downloads a remote URI to the device’s filesystem and then
 * invokes the native share sheet so the user can share it.
 */
export function useDownloadAndShare(): UseDownloadAndShareResult {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  /**
   * Downloads the file at `remoteUri` to `FileSystem.documentDirectory/downloads/[fileName]`,
   * then calls Sharing.shareAsync(localUri).
   *
   * @param remoteUri  The HTTPS URL of the video (e.g. S3 signed URL).
   * @param fileName   (Optional) the desired filename (e.g. "game.mp4"). Defaults to basename(remoteUri).
   */
  async function downloadAndShare(remoteUri: string, fileName?: string) {
    try {
      setIsDownloading(true);
      setProgress(0);

      // 1) Determine filename
      let inferredName = fileName;
      if (!inferredName) {
        // e.g. "https://.../myvideo.mp4?X-Amz-Signature=..."
        // strip query params and extract basename
        const urlNoQuery = remoteUri.split("?")[0];
        inferredName = urlNoQuery.substring(urlNoQuery.lastIndexOf("/") + 1);
        if (!inferredName) {
          inferredName = "downloaded_video.mp4";
        }
      }

      // 2) Ensure our "downloads" folder exists
      const downloadsDir = FileSystem.documentDirectory + "downloads/";
      const dirInfo = await FileSystem.getInfoAsync(downloadsDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(downloadsDir, { intermediates: true });
      }

      // 3) Download to local path
      const localUri = downloadsDir + inferredName;

      // If the file already exists locally, you may optionally skip redownloading.
      const exists = await FileSystem.getInfoAsync(localUri);
      if (exists.exists) {
        // skip straight to sharing
        await shareLocalFile(localUri);
        setIsDownloading(false);
        return;
      }

      const downloadResumable = FileSystem.createDownloadResumable(
        remoteUri,
        localUri,
        {},
        ({ totalBytesExpectedToWrite, totalBytesWritten }) => {
          if (totalBytesExpectedToWrite > 0) {
            setProgress(totalBytesWritten / totalBytesExpectedToWrite);
          }
        }
      );

      const data = await downloadResumable.downloadAsync();
      if (!data?.uri) {
        throw new Error("Failed to download file");
      }

      // 4) Once downloaded, open share sheet
      await shareLocalFile(data.uri);
    } catch (e: any) {
      console.error("downloadAndShare error:", e);
      Alert.alert("Download failed", e.message || "Unknown error");
    } finally {
      setIsDownloading(false);
      setProgress(0);
    }
  }

  async function shareLocalFile(localUri: string) {
    // On web, expo-sharing is not supported, so you might need a fallback.
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert("Sharing unavailable on this platform");
      return;
    }

    // On iOS/Android, this will open the native share sheet
    await Sharing.shareAsync(localUri, {
      mimeType: "video/mp4",
      dialogTitle: "Share Video",
    });
  }

  return { isDownloading, progress, downloadAndShare };
}