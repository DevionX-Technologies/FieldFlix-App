import * as Linking from 'expo-linking';

/** In-app link for highlights (opens in FieldFlicks, not the browser). */
export function buildHighlightsAppLink(recordingId: string): string {
  return Linking.createURL(`/highlights/${encodeURIComponent(recordingId)}`);
}
