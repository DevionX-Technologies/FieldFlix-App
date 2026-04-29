import {
  TIME_GROUNDLOCATION,
  TIME_TOTAL,
  TIME_TURF_NAME,
} from '@/data/constants';
import { FF } from '@/screens/fieldflix/fonts';
import { WEB } from '@/screens/fieldflix/webDesign';
import { WebShell } from '@/screens/fieldflix/WebShell';
import axiosInstance from '@/utils/axiosInstance';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import StopDialog from '../recording/components/RecordingComponents/StopDialogue';
import { useCountdown } from '../recording/hooks/useCountdown';

const ACCENT = '#4ade80';
const PAUSE_BG = '#374151';
const MUTED = '#a1a1aa';

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
  const insets = useSafeAreaInsets();
  const {
    ChoosenTimeInMinutes,
    Name,
    GroundLocation,
    Resume,
    remainingSeconds,
    turfId,
    cameraId,
    plannedDurationSec,
    scanned,
  } = useLocalSearchParams<{
    ChoosenTimeInMinutes?: string;
    Name?: string;
    GroundLocation?: string;
    Resume?: string;
    remainingSeconds?: string;
    turfId?: string;
    cameraId?: string;
    plannedDurationSec?: string;
    scanned?: string;
  }>();

  const [turfDetails, setTurfDetails] = useState<Record<string, unknown>>({});

  const totalSeconds = useMemo(() => {
    if (Resume && remainingSeconds != null) {
      const r = parseInt(String(remainingSeconds), 10);
      if (!isNaN(r) && r > 0) return r;
    }
    const p = plannedDurationSec ? parseInt(String(plannedDurationSec), 10) : NaN;
    if (!isNaN(p) && p > 0) return p;
    const m = parseInt(String(ChoosenTimeInMinutes ?? '60'), 10);
    return (isNaN(m) ? 60 : m) * 60;
  }, [Resume, remainingSeconds, plannedDurationSec, ChoosenTimeInMinutes]);

  const td = turfDetails as { data?: { name?: string }; name?: string };
  const venueName = td?.data?.name ?? td?.name ?? Name?.toString() ?? 'TGS Sports Arena';
  const venueAddress = GroundLocation?.toString() || 'Andheri West, Mumbai';
  const scannedText = scanned?.toString().trim() || '';

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
  } = useCountdown(totalSeconds, turfId?.toString() ?? '', cameraId);

  useEffect(() => {
    const fetchData = async () => {
      if (!turfId) return;
      try {
        const resp = await axiosInstance.get(`/turfs/${turfId}`);
        setTurfDetails(resp.data as Record<string, unknown>);
      } catch {
        /* 401 handled globally */
      }
    };
    void fetchData();
  }, [turfId]);

  useEffect(() => {
    if (!isRunning) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [isRunning]);

  useEffect(() => {
    if (Resume) {
      void restoreTimer();
    }
  }, [Resume, restoreTimer]);

  const handleStart = async () => {
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
  const padTop = Math.max(52, insets.top + 44);
  const padBottom = Math.max(28, insets.bottom);

  return (
    <WebShell backgroundColor={WEB.profileBg}>
      <View style={styles.page}>
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

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: padTop, paddingBottom: padBottom }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.location}>
              <View style={styles.pinWrap}>
                <PinIcon />
              </View>
              <View style={styles.locText}>
                <Text style={styles.locName}>{venueName}</Text>
                <Text style={styles.locAddr}>{venueAddress}</Text>
                {scannedText ? (
                  <Text style={styles.locQr} numberOfLines={3}>
                    {scannedText.length > 40 ? `${scannedText.slice(0, 37)}…` : scannedText}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.court}>
              <GridIcon />
              <Text style={styles.courtText}>Court 1</Text>
            </View>

            <View style={styles.timerRow}>
              <Pressable
                style={styles.step}
                onPress={() => void adjustRemaining(-stepAdjustSec)}
                disabled={!isRunning}
              >
                <Text style={styles.stepTxt}>−</Text>
              </Pressable>

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

              <Pressable
                style={styles.step}
                onPress={() => void adjustRemaining(stepAdjustSec)}
                disabled={!isRunning}
              >
                <Text style={styles.stepTxt}>+</Text>
              </Pressable>
            </View>

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
        </ScrollView>

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
        {ModalComponent}
      </View>
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
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
    color: 'rgba(161, 161, 170, 0.95)',
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
    marginTop: 24,
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
    marginTop: 22,
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
