import {
  RECORDING_ACTIVE_ROUTE_PARAMS_KEY,
  TIME_GROUNDLOCATION,
  TIME_TOTAL,
  TIME_TURF_NAME,
} from '@/data/constants';
import { FF } from '@/screens/fieldflix/fonts';
import { WEB } from '@/screens/fieldflix/webDesign';
import { WebShell } from '@/screens/fieldflix/WebShell';
import axiosInstance from '@/utils/axiosInstance';
import { getRecordingButtonHighlightCount } from '@/lib/fieldflix-api';
import { hasPersistedRecordingSession } from '@/utils/recordingSessionGuard';
import { useNavigation } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  ImageBackground,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

/** Cricket field hero — same backdrop as the Setup screen so the recording
 *  flow keeps a consistent visual identity once the user has scanned a QR.
 *  Short, hyphenated filename → safe for Metro asset bundling. */
const FIELD_BG_IMAGE = require('@/assets/images/recording-field-bg.jpg');
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import type { HomeSportKey } from '@/utils/turfSports';

import StopDialog from '../recording/components/RecordingComponents/StopDialogue';
import { useCountdown } from '../recording/hooks/useCountdown';

/** Expo Router may pass params as string or string[]. */
function routeParamFirst(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return v.length ? String(v[0]) : undefined;
  return String(v);
}

function sessionSportFromParams(raw: unknown): HomeSportKey | null {
  const s = routeParamFirst(raw);
  if (s === 'pickleball' || s === 'padel' || s === 'cricket') return s;
  return null;
}

const ACCENT = '#4ade80';
const PAUSE_BG = '#374151';

function formatHMS(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

const DIAL_SIZE = 180;
const R = 78;
const BG = '#020617';
const CX = 90;
const CY = 90;
const CIRC = 2 * Math.PI * R;

/**
 * Web-parity active recording (`web/src/screens/RecordingActiveScreen.tsx` + CSS).
 * Keeps `useCountdown` + stop API flow.
 */
export default function MainRecordingScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const {
    ChoosenTimeInMinutes,
    Name,
    GroundLocation,
    Resume,
    remainingSeconds,
    turfId,
    cameraId,
    courtLabel,
    plannedDurationSec,
    sessionSport,
  } = useLocalSearchParams();

  const [turfDetails, setTurfDetails] = useState<Record<string, unknown>>({});
  const [highlightButtonCount, setHighlightButtonCount] = useState(0);
  const [storedVenue, setStoredVenue] = useState({ name: '', location: '' });
  const [storedCourtLabel, setStoredCourtLabel] = useState('');

  const totalSeconds = useMemo(() => {
    const resume = routeParamFirst(Resume);
    const remainingStr = routeParamFirst(remainingSeconds);
    const plannedStr = routeParamFirst(plannedDurationSec);
    const chosenStr = routeParamFirst(ChoosenTimeInMinutes);

    if (resume && remainingStr != null && remainingStr !== '') {
      const r = parseInt(remainingStr, 10);
      if (!Number.isNaN(r) && r > 0) return r;
    }
    const p =
      plannedStr != null && plannedStr !== '' ? parseInt(plannedStr, 10) : NaN;
    if (!Number.isNaN(p) && p > 0) return p;
    const m = parseInt(chosenStr ?? '60', 10);
    return (Number.isNaN(m) ? 60 : m) * 60;
  }, [Resume, remainingSeconds, plannedDurationSec, ChoosenTimeInMinutes]);

  const td = turfDetails as { data?: { name?: string }; name?: string };
  const venueName =
    td?.data?.name ??
    td?.name ??
    routeParamFirst(Name) ??
    (storedVenue.name || 'TGS Sports Arena');
  const venueAddress =
    routeParamFirst(GroundLocation) ??
    (storedVenue.location || 'Andheri West, Mumbai');

  const courtDisplayLabel = useMemo(() => {
    const raw = routeParamFirst(courtLabel)?.trim();
    if (raw) return raw;
    if (storedCourtLabel.trim()) return storedCourtLabel.trim();
    return 'Court';
  }, [courtLabel, storedCourtLabel]);

  const {
    timeLeft,
    isRunning,
    isPaused,
    start,
    stop,
    togglePause,
    adjustRemaining,
    stepAdjustSec,
    restoreTimer,
    loading,
    setShowStop,
    showStop,
    ModalComponent,
    activeRecordingSessionId,
  } = useCountdown(
    totalSeconds,
    routeParamFirst(turfId) ?? '',
    routeParamFirst(cameraId),
    sessionSportFromParams(sessionSport),
  );

  useEffect(() => {
    void (async () => {
      const [name, location, routeParamsRaw] = await Promise.all([
        SecureStore.getItemAsync(TIME_TURF_NAME),
        SecureStore.getItemAsync(TIME_GROUNDLOCATION),
        SecureStore.getItemAsync(RECORDING_ACTIVE_ROUTE_PARAMS_KEY),
      ]);
      setStoredVenue({
        name: name?.trim() ?? '',
        location: location?.trim() ?? '',
      });
      try {
        if (!routeParamsRaw?.trim()) return;
        const parsed = JSON.parse(routeParamsRaw) as Record<string, unknown>;
        const fromDisk = String(parsed?.courtLabel ?? '').trim();
        if (fromDisk) setStoredCourtLabel(fromDisk);
      } catch {
        /* ignore bad persisted payload */
      }
    })();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const tid = routeParamFirst(turfId);
      if (!tid) return;
      try {
        const resp = await axiosInstance.get(`/turfs/${tid}`);
        setTurfDetails(resp.data as Record<string, unknown>);
      } catch {
        /* 401 handled globally */
      }
    };
    void fetchData();
  }, [turfId]);

  /** Persist venue labels as soon as we know them (before timer reports `isRunning`). */
  useEffect(() => {
    if (!venueName && !venueAddress) return;
    void SecureStore.setItemAsync(TIME_TURF_NAME, venueName);
    void SecureStore.setItemAsync(TIME_GROUNDLOCATION, venueAddress);
  }, [venueName, venueAddress]);

  useEffect(() => {
    if (!isRunning || !activeRecordingSessionId) {
      setHighlightButtonCount(0);
      return;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const { count } =
          await getRecordingButtonHighlightCount(activeRecordingSessionId);
        if (!cancelled) setHighlightButtonCount(count);
      } catch {
        /* live session polling — transient failures are ignored */
      }
    };
    void poll();
    const intervalId = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [isRunning, activeRecordingSessionId]);

  useEffect(() => {
    if (!isRunning) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [isRunning]);

  /** Cold-killed app restores via Splash; disallow swipe-away from this card while recording. */
  useLayoutEffect(() => {
    try {
      navigation.setOptions({
        gestureEnabled: !isRunning,
        ...(Platform.OS === 'ios'
          ? { fullScreenGestureEnabled: !isRunning }
          : {}),
      });
    } catch {
      /* expo-router navigator options — best-effort */
    }
  }, [navigation, isRunning]);

  /** Persist routing context so Splash / resume can reopen this exact session. */
  useEffect(() => {
    const shouldPersist =
      routeParamFirst(Resume) === '1' ||
      (isRunning && Boolean(activeRecordingSessionId));
    if (!shouldPersist) return;
    const record = {
      Name: venueName,
      GroundLocation: venueAddress,
      turfId: routeParamFirst(turfId) ?? '',
      cameraId: routeParamFirst(cameraId) ?? '',
      courtLabel:
        routeParamFirst(courtLabel)?.trim() || courtDisplayLabel.trim() || '',
      ChoosenTimeInMinutes: routeParamFirst(ChoosenTimeInMinutes) ?? '',
      plannedDurationSec: routeParamFirst(plannedDurationSec) ?? '',
      sessionSport: routeParamFirst(sessionSport) ?? '',
      remainingSeconds: routeParamFirst(remainingSeconds) ?? '',
      Resume: '1',
    };
    void SecureStore.setItemAsync(
      RECORDING_ACTIVE_ROUTE_PARAMS_KEY,
      JSON.stringify(record),
    );
  }, [
    isRunning,
    activeRecordingSessionId,
    venueName,
    venueAddress,
    Resume,
    turfId,
    cameraId,
    courtLabel,
    ChoosenTimeInMinutes,
    plannedDurationSec,
    sessionSport,
    remainingSeconds,
    courtDisplayLabel,
  ]);

  useEffect(() => {
    if (Resume) {
      void restoreTimer();
    }
  }, [Resume, restoreTimer]);

  const handleStart = async () => {
    if (!isRunning && (await hasPersistedRecordingSession())) {
      Alert.alert(
        'Recording in progress',
        'Recording is already in progress. Please wait until the current session is completed.',
      );
      return;
    }
    await SecureStore.setItemAsync(TIME_GROUNDLOCATION, venueAddress);
    await SecureStore.setItemAsync(TIME_TURF_NAME, venueName);
    await SecureStore.setItemAsync(
      TIME_TOTAL,
      String(ChoosenTimeInMinutes ?? Math.round(totalSeconds / 60)),
    );
    await start();
  };

  const progress = plannedProgress(totalSeconds, timeLeft);

  const topBack = Math.max(8, insets.top);
  /** Card starts just under the back affordance (see layout annotation). */
  const scrollPadTop = insets.top + 50;
  const scrollPadBottom = Math.max(24, insets.bottom) + 16;

  return (
    <WebShell backgroundColor={WEB.profileBg}>
      <ImageBackground
        source={FIELD_BG_IMAGE}
        style={styles.page}
        imageStyle={styles.pageBgImage}
        resizeMode="cover"
      >
        <View pointerEvents="none" style={styles.pageOverlay} />
        <Pressable
          accessibilityLabel="Go back"
          onPress={() => {
            if (isRunning) setShowStop(true);
            else router.back();
          }}
          style={[styles.back, { top: topBack }]}
        >
          <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
            <Path
              d="M15 19l-7-7 7-7"
              stroke="#fff"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>

        <View
          style={[
            styles.screenBody,
            { paddingTop: scrollPadTop, paddingBottom: scrollPadBottom },
          ]}
        >
          <View style={styles.cardShell}>
            <View pointerEvents="none" style={styles.cardBackdrop} />
            <View style={[styles.card, styles.cardFlexFill]}>
              <View style={styles.cardTop}>
                <View style={styles.location}>
                  <View style={styles.pinWrap}>
                    <PinIcon />
                  </View>
                  <View style={styles.locText}>
                    <Text style={styles.locName}>{venueName}</Text>
                  </View>
                </View>

                <View style={styles.court}>
                  <GridIcon />
                  <Text style={styles.courtText}>{courtDisplayLabel}</Text>
                </View>

                <View style={styles.timerRow}>
                  {!isRunning ? (
                    <Pressable
                      style={styles.step}
                      onPress={() => void adjustRemaining(-stepAdjustSec)}
                      accessibilityLabel="Decrease remaining time"
                    >
                      <Text style={styles.stepTxt}>−</Text>
                    </Pressable>
                  ) : null}

                  <View style={styles.dialWrap}>
                    <Svg width={DIAL_SIZE} height={DIAL_SIZE} viewBox="0 0 180 180">
                      <Circle
                        cx={CX}
                        cy={CY}
                        r={R}
                        fill="none"
                        stroke="rgba(255,255,255,0.12)"
                        strokeWidth={10}
                      />
                      <Circle
                        cx={CX}
                        cy={CY}
                        r={R}
                        fill="none"
                        stroke={ACCENT}
                        strokeWidth={10}
                        strokeLinecap="round"
                        transform={`rotate(-90 ${CX} ${CY})`}
                        strokeDasharray={CIRC}
                        strokeDashoffset={CIRC * (1 - progress)}
                      />
                    </Svg>
                    <View style={styles.dialCenter}>
                      <Text style={styles.dialTime}>{formatHMS(timeLeft)}</Text>
                      {isRunning ? (
                        <View style={styles.recPill}>
                          <View style={styles.recDot} />
                          <Text style={styles.recPillText}>Recording</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {!isRunning ? (
                    <Pressable
                      style={styles.step}
                      onPress={() => void adjustRemaining(stepAdjustSec)}
                      accessibilityLabel="Increase remaining time"
                    >
                      <Text style={styles.stepTxt}>+</Text>
                    </Pressable>
                  ) : null}
                </View>

                {isRunning && highlightButtonCount > 0 ? (
                  <View style={styles.hlCounter}>
                    <Text style={styles.hlCounterTxt}>
                      Highlight taps · {highlightButtonCount}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.cardFlexSpacer} />

              {!isRunning ? (
                <Pressable style={styles.startBtn} onPress={() => void handleStart()}>
                  <PlaySmIcon />
                  <Text style={styles.startBtnText}>Start Recording</Text>
                </Pressable>
              ) : (
                <View style={styles.actions}>
                  <Pressable
                    style={[styles.btn, styles.btnPause]}
                    onPress={() => void togglePause()}
                  >
                    {isPaused ? <PlaySmIconSmall /> : <PauseIcon />}
                    <Text style={styles.btnText}>{isPaused ? 'Resume' : 'Pause'}</Text>
                  </Pressable>
                  <Pressable style={[styles.btn, styles.btnFinish]} onPress={() => setShowStop(true)}>
                    <StopIcon />
                    <Text style={styles.btnText}>Finish</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </View>

        <StopDialog
          visible={showStop}
          loading={loading}
          onConfirm={() => void stop()}
          onCancel={() => setShowStop(false)}
        />
        {loading ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={ACCENT} />
          </View>
        ) : null}
        {ModalComponent()}
      </ImageBackground>
    </WebShell>
  );
}

function plannedProgress(planned: number, remaining: number) {
  if (planned <= 0) return 0;
  return Math.min(1, Math.max(0, (planned - remaining) / planned));
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

function PlaySmIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="9" stroke="#fff" strokeWidth={1.5} />
      <Path fill="#fff" d="M9 7.5v9l7.5-4.5L9 7.5z" />
    </Svg>
  );
}

function PlaySmIconSmall() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="#fff">
      <Path d="M8 5v14l11-7z" />
    </Svg>
  );
}

function PauseIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="#fff">
      <Path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
    </Svg>
  );
}

function StopIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="#fff">
      <Path d="M6 6h12v12H6z" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: BG,
  },
  /** Match recording-time setup: greener field, card holds primary contrast. */
  pageBgImage: {
    opacity: 0.85,
  },
  /** Light wash everywhere so the field stays visible; strong dim is only under `cardShell`. */
  pageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 48, 32, 0.18)',
  },
  /** Fills viewport under back button (no outer vertical ScrollView). */
  screenBody: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  cardShell: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
    alignSelf: 'center',
    flexDirection: 'column',
  },
  cardBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 14, 10, 0.94)',
  },
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  blank: {
    flex: 1,
    backgroundColor: BG,
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
  cardTop: {
    flexShrink: 0,
  },
  /** Pushes primary actions toward the bottom of the card within the viewport. */
  cardFlexSpacer: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 8,
  },
  card: {
    paddingTop: 36,
    paddingHorizontal: 22,
    paddingBottom: 36,
    backgroundColor: 'rgba(16, 20, 24, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  cardFlexFill: {
    flex: 1,
    minHeight: 0,
  },
  location: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  pinWrap: { paddingTop: 2 },
  locText: { flex: 1, minWidth: 0 },
  locName: {
    fontFamily: FF.bold,
    fontSize: 17,
    letterSpacing: -0.34,
    color: '#fff',
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
    color: '#fff',
  },
  timerRow: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
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
  dialWrap: {
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  dialTime: {
    fontFamily: FF.bold,
    fontSize: 26,
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
    color: '#fff',
  },
  hlCounter: {
    marginTop: 14,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.32)',
  },
  hlCounterTxt: {
    fontFamily: FF.semiBold,
    fontSize: 13,
    letterSpacing: 0.2,
    color: ACCENT,
  },
  recPill: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: WEB.pillRadius,
    backgroundColor: 'rgba(127, 29, 29, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.25)',
  },
  recDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  recPillText: {
    fontFamily: FF.bold,
    fontSize: 11,
    letterSpacing: 0.5,
    color: '#fff',
  },
  startBtn: {
    marginTop: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: WEB.pillRadius,
    backgroundColor: ACCENT,
  },
  startBtnText: {
    fontFamily: FF.bold,
    fontSize: 16,
    color: '#fff',
  },
  actions: {
    marginTop: 0,
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  btnPause: {
    backgroundColor: PAUSE_BG,
  },
  btnFinish: {
    backgroundColor: ACCENT,
  },
  btnText: {
    fontFamily: FF.bold,
    fontSize: 15,
    color: '#fff',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
});
