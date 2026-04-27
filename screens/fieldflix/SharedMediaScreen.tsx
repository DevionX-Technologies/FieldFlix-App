import { Paths } from '@/data/paths';
import { resolveShareToken, type ShareLinkResolution } from '@/lib/fieldflix-api';
import { useEntitlement } from '@/lib/fieldflix-entitlement';
import HighlightsScreen from '@/screens/fieldflix/HighlightsScreen';
import { FF } from '@/screens/fieldflix/fonts';
import { WebShell } from '@/screens/fieldflix/WebShell';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

const ACCENT = '#22C55E';

/**
 * Lands a viewer on a shared recording. Resolves the public share token (no auth required),
 * then forwards to the shared `HighlightsScreen` — paywall + 2.5-min preview cap is enforced
 * inside the player whenever the viewer's entitlement is `not paid`.
 *
 * App-only enforcement: the underlying Mux assets are configured with a `signed` playback
 * policy so the URL alone is not playable in a browser. The mobile app exchanges the
 * recording id for a fresh signed token via `GET /recording/:id/playback`.
 */
export default function SharedMediaScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const token = params.token as string | undefined;
  const { isPaid } = useEntitlement();

  const [loading, setLoading] = useState(true);
  const [resolved, setResolved] = useState<ShareLinkResolution | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setError('This share link is missing a token.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await resolveShareToken(token);
      if (!r?.recording_id) {
        setError('This share link is no longer valid.');
        setResolved(null);
      } else {
        setResolved(r);
      }
    } catch {
      setError('We could not resolve this shared recording. Please try again.');
      setResolved(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <WebShell backgroundColor="#020617">
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>Loading shared recording…</Text>
        </View>
      </WebShell>
    );
  }

  if (error || !resolved?.recording_id) {
    return (
      <WebShell backgroundColor="#020617">
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Shared link unavailable</Text>
          <Text style={styles.errorBody}>
            {error ?? 'The shared recording could not be opened.'}
          </Text>
          <Pressable style={styles.cta} onPress={() => router.replace(Paths.home)}>
            <Text style={styles.ctaText}>Open FieldFlicks</Text>
          </Pressable>
        </View>
      </WebShell>
    );
  }

  // Forward to the regular Highlights screen — non-owners that haven't paid
  // get the same 2.5-min capped preview. Once they buy a plan, the same screen
  // unlocks the full match without a separate route.
  return (
    <HighlightsScreen
      forcedRecordingId={resolved.recording_id}
      forcePreview={!isPaid}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  loadingText: {
    fontFamily: FF.semiBold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  errorTitle: {
    fontFamily: FF.bold,
    fontSize: 18,
    color: '#fff',
  },
  errorBody: {
    fontFamily: FF.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
  },
  cta: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: ACCENT,
  },
  ctaText: {
    fontFamily: FF.bold,
    color: '#fff',
    fontSize: 14,
  },
});
