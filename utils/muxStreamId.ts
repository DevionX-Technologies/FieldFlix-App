/** Last path segment of a `stream.mux.com/.../*.m3u8` URL (playback id in path). */
export function extractMuxStreamId(url: string): string | null {
  try {
    if (!url || typeof url !== "string") {
      return null;
    }

    const { pathname } = new URL(url);
    const segments = pathname.split("/");
    const last = segments.pop() || "";

    if (!last.toLowerCase().endsWith(".m3u8")) {
      return null;
    }

    const streamId = last.slice(0, -".m3u8".length);
    return streamId.length > 0 ? streamId : null;
  } catch {
    return null;
  }
}
