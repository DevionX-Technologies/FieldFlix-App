import { Paths } from '@/data/paths';
import { FF } from '@/screens/fieldflix/fonts';
import { WebShell } from '@/screens/fieldflix/WebShell';
import { WEB } from '@/screens/fieldflix/webDesign';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

const ACCENT = '#4ade80';
const MUTED = '#9ca3af';

const PRESETS = [
  { id: '30', seconds: 30 * 60, top: '30', bottom: 'min' },
  { id: '60', seconds: 60 * 60, top: '1', bottom: 'hr' },
  { id: '90', seconds: 90 * 60, top: '1:30', bottom: 'hrs' },
  { id: '120', seconds: 120 * 60, top: '2', bottom: 'hrs' },
] as const;

const STEP_SEC = 5 * 60;
const MIN_SEC = 60;
const MAX_SEC = 4 * 60 * 60;

function formatHMS(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export type RecordingTimeParams = {
  Name?: string;
  GroundLocation?: string;
  turfId?: string;
  cameraId?: string;
  GroundDescription?: string;
};

/** Mirrors `web/src/screens/RecordingTimeScreen.tsx` + `recordingTimeScreen.css`. */
export default function RecordingTimeScreen({ params }: { params: RecordingTimeParams }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const venueName = params.Name?.trim() || 'TGS Sports Arena';
  const venueAddress = params.GroundLocation?.trim() || 'Andheri West, Mumbai';
  const scanned =
    [params.GroundDescription, params.turfId, params.cameraId].filter(Boolean).join(' · ') || '';

  const [durationSec, setDurationSec] = useState(60 * 60);
  const [activePreset, setActivePreset] = useState<string>('60');

  const displayTime = useMemo(() => formatHMS(durationSec), [durationSec]);

  const applyPreset = useCallback((id: (typeof PRESETS)[number]['id']) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setDurationSec(p.seconds);
    setActivePreset(id);
  }, []);

  const bump = useCallback((delta: number) => {
    setDurationSec((prev) => {
      const next = Math.min(MAX_SEC, Math.max(MIN_SEC, prev + delta));
      const match = PRESETS.find((p) => p.seconds === next);
      setActivePreset(match?.id ?? '');
      return next;
    });
  }, []);

  const onStart = () => {
    const minutes = Math.round(durationSec / 60);
    router.push({
      pathname: Paths.recordingActive,
      params: {
        Name: venueName,
        GroundLocation: venueAddress,
        ChoosenTimeInMinutes: String(minutes),
        plannedDurationSec: String(durationSec),
        turfId: params.turfId ?? '',
        cameraId: params.cameraId ?? '',
        scanned: scanned.slice(0, 200),
      },
    });
  };

  const topPad = Math.max(52, insets.top + 44);
  const bottomPad = Math.max(28, insets.bottom);

  return (
    <WebShell backgroundColor="#000000">
      <View style={styles.page}>
        <Pressable
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={[styles.back, { top: Math.max(8, insets.top) }]}
        >
          <BackIcon />
        </Pressable>

        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: topPad, paddingBottom: bottomPad },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <View style={styles.location}>
              <View style={styles.pinWrap}>
                <PinIcon />
              </View>
              <View style={styles.locText}>
                <Text style={styles.locName}>{venueName}</Text>
                <Text style={styles.locAddr}>{venueAddress}</Text>
                {scanned ? (
                  <Text style={styles.locQr} numberOfLines={4}>
                    {scanned.length > 48 ? `${scanned.slice(0, 45)}…` : scanned}
                  </Text>
                ) : null}
              </View>
            </View>

            <Pressable style={styles.court} accessibilityRole="button">
              <GridIcon />
              <Text style={styles.courtText}>Court 1</Text>
            </Pressable>

            <View style={styles.timerRow}>
              <Pressable
                style={styles.step}
                onPress={() => bump(-STEP_SEC)}
                accessibilityLabel="Decrease duration"
              >
                <Text style={styles.stepTxt}>−</Text>
              </Pressable>

              <View style={styles.dial}>
                <Text style={styles.dialTime}>{displayTime}</Text>
              </View>

              <Pressable
                style={styles.step}
                onPress={() => bump(STEP_SEC)}
                accessibilityLabel="Increase duration"
              >
                <Text style={styles.stepTxt}>+</Text>
              </Pressable>
            </View>

            <View style={styles.presets}>
              {PRESETS.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => applyPreset(p.id)}
                  style={[styles.preset, activePreset === p.id && styles.presetActive]}
                >
                  <Text style={[styles.presetTop, activePreset === p.id && styles.presetTopActive]}>
                    {p.top}
                  </Text>
                  <Text
                    style={[styles.presetBot, activePreset === p.id && styles.presetBotActive]}
                  >
                    {p.bottom}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable style={styles.start} onPress={onStart}>
              <PlayIcon />
              <Text style={styles.startText}>Start Recording</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </WebShell>
  );
}

function BackIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 19l-7-7 7-7"
        stroke="#fff"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PinIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        fill={ACCENT}
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"
      />
    </Svg>
  );
}

function GridIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
      <Path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z" />
    </Svg>
  );
}

function PlayIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth={1.75} />
      <Path fill="#fff" d="M10.5 9.5v5l4-2.5-4-2.5z" />
    </Svg>
  );
}

const DIAL_SIZE = 168;

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#000000',
  },
  back: {
    position: 'absolute',
    left: 12,
    zIndex: 2,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 22,
    backgroundColor: 'rgba(25, 25, 25, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.45,
    shadowRadius: 48,
    elevation: 20,
  },
  location: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  pinWrap: {
    paddingTop: 2,
  },
  locText: {
    flex: 1,
    minWidth: 0,
  },
  locName: {
    fontFamily: FF.bold,
    fontSize: 17,
    letterSpacing: -0.34,
    lineHeight: 22,
    color: '#fff',
  },
  locAddr: {
    marginTop: 4,
    fontFamily: FF.medium,
    fontSize: 13,
    color: MUTED,
    lineHeight: 18,
  },
  locQr: {
    marginTop: 8,
    fontFamily: FF.medium,
    fontSize: 11,
    color: 'rgba(156, 163, 175, 0.9)',
    lineHeight: 15,
  },
  court: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: WEB.pillRadius,
    backgroundColor: ACCENT,
  },
  courtText: {
    fontFamily: FF.bold,
    fontSize: 15,
    letterSpacing: -0.15,
    color: '#fff',
  },
  timerRow: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  step: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTxt: {
    fontSize: 26,
    fontWeight: '500',
    color: '#000',
    marginTop: -2,
  },
  dial: {
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    borderRadius: DIAL_SIZE / 2,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialTime: {
    fontFamily: FF.bold,
    fontSize: 26,
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
    color: '#fff',
  },
  presets: {
    marginTop: 24,
    flexDirection: 'row',
    gap: 8,
  },
  preset: {
    flex: 1,
    minHeight: 56,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  presetActive: {
    backgroundColor: ACCENT,
    borderColor: 'transparent',
  },
  presetTop: {
    fontFamily: FF.bold,
    fontSize: 15,
    lineHeight: 17,
    color: '#fff',
  },
  presetTopActive: {
    color: '#fff',
  },
  presetBot: {
    fontFamily: FF.semiBold,
    fontSize: 10,
    textTransform: 'lowercase',
    color: 'rgba(255, 255, 255, 0.82)',
  },
  presetBotActive: {
    color: 'rgba(255, 255, 255, 0.95)',
  },
  start: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: WEB.pillRadius,
    backgroundColor: ACCENT,
  },
  startText: {
    fontFamily: FF.bold,
    fontSize: 16,
    letterSpacing: -0.32,
    color: '#fff',
  },
});
