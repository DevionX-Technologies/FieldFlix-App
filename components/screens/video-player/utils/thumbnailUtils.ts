import { extractMuxStreamId } from "../VideoPlayerScreen";

/**
 * Utility functions for handling video thumbnails
 */

/**
 * Generates a thumbnail URL from a Mux video URL
 */
export const getThumbnailUrl = (url: string, time: number = 2, width: number = 214, height: number = 121) => {
  const streamId = extractMuxStreamId(url);
  if (!streamId) {
    console.log('No stream ID found for URL:', url);
    return null;
  }
  const thumbnailUrl = `https://image.mux.com/${streamId}/thumbnail.png?width=${width}&height=${height}&time=${time}`;
  return thumbnailUrl;
};

/**
 * Checks if a video URL is valid and has a thumbnail
 */
export const hasValidThumbnail = (url: string) => {
  return getThumbnailUrl(url) !== null;
};