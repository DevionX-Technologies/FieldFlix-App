// src/screens/recording/hooks/useCountdown.ts
import { CustomModal } from "@/components/ui/CustomModal";
import {
  LAST_STOPPED_RECORDING_ID,
  RECORDING_CAMERA_ID,
  RECORDING_KEY,
  RECORDING_QR_CAMERA_ID,
  TIME_GROUNDLOCATION,
  TIME_LEFT_KEY,
  TIME_TURF_NAME,
  TURF_ID,
} from "@/data/constants";
import { Paths } from "@/data/paths";
import { FIELD_FLIX_SESSION_SPORT_METADATA_KEY } from "@/utils/recordingDisplay";
import { logRecordingFlowDebug } from "@/utils/recordingFlowDebug";
import { presentEventNotification } from "@/utils/presentEventNotification";
import type { HomeSportKey } from "@/utils/turfSports";
import axiosInstance from "@/utils/axiosInstance";
import axios from "axios";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { jwtDecode } from "jwt-decode";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

type DecodedToken = { user_id?: string };

async function getToken(): Promise<string | null> {
  return await SecureStore.getItemAsync("token");
}

const STEP_ADJUST_SEC = 5 * 60;

/** Backend failed to reach the venue Pi after retries (`RecordingService.startRecording`). */
function isVenueCameraUnreachableError(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false;
  const status = err.response?.status;
  if (status !== 500 && status !== 503) return false;
  const data = err.response?.data as Record<string, unknown> | undefined;
  const msg =
    typeof data?.message === "string"
      ? data.message
      : typeof err.response?.data === "object" &&
          err.response?.data !== null &&
          "message" in err.response.data
        ? String((err.response.data as { message?: string }).message ?? "")
        : "";
  const lower = msg.toLowerCase();
  return (
    lower.includes("failed to start recording after") ||
    lower.includes("failed to obtain raspberry pi recording id")
  );
}

function remainingSecondsFromEndMs(endMs: number): number {
  return Math.max(0, Math.floor((endMs - Date.now()) / 1000));
}

export function useCountdown(
  initialSeconds: number,
  turfId: string,
  cameraId?: string | string[],
  sessionSport?: HomeSportKey | null,
) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>(undefined);
  const timeLeftRef = useRef(initialSeconds);
  const recordingIdRef = useRef<string | undefined>(undefined);
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [showStop, setShowStop] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    type: 'info' as 'info' | 'success' | 'error' | 'loading',
    title: '',
    message: '',
  });

  const navigation = useRouter();

  // Helper function to show custom modal
  const showModal = (type: 'info' | 'success' | 'error' | 'loading', title: string, message: string) => {
    setModalConfig({ type, title, message });
    setModalVisible(true);
  };

  const hideModal = () => {
    setModalVisible(false);
  };

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const tokenNew = await getToken();
        setToken(tokenNew);
        if (tokenNew) {
          const decoded = jwtDecode<DecodedToken>(tokenNew);
          setUserId(decoded.user_id ?? null);
        }
      } catch (err) {
        console.error("Error decoding token:", err);
      }
    };

    fetchToken();
  }, []);

  /** Sync planned duration vs active session — do not wipe an in-progress timer on remount. */
  useEffect(() => {
    let cancelled = false;
    async function sync() {
      const tidRaw = Array.isArray(turfId) ? turfId[0] : turfId;
      const tid = String(tidRaw ?? "").trim();
      const endStr = await SecureStore.getItemAsync("end_time");
      const rk = await SecureStore.getItemAsync(RECORDING_KEY);
      const storedTurf = (await SecureStore.getItemAsync(TURF_ID))?.trim() ?? "";
      const storedQrCam =
        (await SecureStore.getItemAsync(RECORDING_QR_CAMERA_ID))?.trim() ?? "";
      const camFromRoute = Array.isArray(cameraId) ? cameraId[0] : cameraId;
      const routeCam =
        camFromRoute != null && String(camFromRoute).trim() !== ""
          ? String(camFromRoute).trim()
          : "";

      let activeLocal = false;
      if (tid && rk && endStr && storedTurf === tid) {
        const endMs = parseInt(endStr, 10);
        const rem =
          Number.isFinite(endMs) && endMs > Date.now()
            ? remainingSecondsFromEndMs(endMs)
            : 0;
        if (rem > 0) {
          // Require an explicit QR camera match when persisted — do not hydrate when
          // `cameraId` is still missing from the route (avoids attaching stale timers).
          if (storedQrCam) {
            activeLocal = Boolean(routeCam) && storedQrCam === routeCam;
          } else {
            activeLocal = true;
          }
        }
      }

      if (cancelled) return;

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }

      if (activeLocal && endStr) {
        const endMs = parseInt(endStr, 10);
        const remaining = remainingSecondsFromEndMs(endMs);
        const recRowId = await SecureStore.getItemAsync(RECORDING_CAMERA_ID);
        if (remaining > 0 && recRowId) {
          recordingIdRef.current = recRowId;
          setTimeLeft(remaining);
          timeLeftRef.current = remaining;
          setIsPaused(false);
          setIsRunning(true);
          return;
        }
      }

      setTimeLeft(initialSeconds);
      timeLeftRef.current = initialSeconds;
      setIsRunning(false);
    }

    void sync();
    return () => {
      cancelled = true;
    };
  }, [initialSeconds, turfId, cameraId]);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  const start = useCallback(async () => {
    const postStart = async () => {
      const tokenNew = await getToken();
      setToken(tokenNew);

      if (!tokenNew) {
        logRecordingFlowDebug("recording_start_blocked", { reason: "no_bearer_token" });
        showModal("error", "Not signed in", "Please log in again.");
        return;
      }

      const decoded = jwtDecode<DecodedToken>(tokenNew);
      const uid = decoded.user_id ?? null;
      setUserId(uid);
      if (!uid) {
        logRecordingFlowDebug("recording_start_blocked", {
          reason: "jwt_missing_user_id",
          jwtKeys: decoded && typeof decoded === "object" ? Object.keys(decoded) : [],
        });
        showModal("error", "Not signed in", "Missing user id in token.");
        return;
      }
      const tid = Array.isArray(turfId) ? turfId[0] : turfId;
      if (tid == null || String(tid).trim() === "") {
        logRecordingFlowDebug("recording_start_blocked", {
          reason: "missing_turfId",
          turfIdRaw: turfId,
        });
        showModal(
          "error",
          "Invalid QR",
          "This QR is missing a turf. Scan a valid FieldFlicks court QR to start recording."
        );
        return;
      }
      const camFromRoute = Array.isArray(cameraId) ? cameraId[0] : cameraId;
      const camTrim =
        camFromRoute != null && String(camFromRoute).trim() !== ""
          ? String(camFromRoute).trim()
          : "";
      const FALLBACK_CAMERA = "27ce1af1-721a-421c-9223-3ddeda95f315";
      const actualCameraId = camTrim || FALLBACK_CAMERA;
      const usedDefaultCameraFallback = !camTrim;

      const meta =
        sessionSport === "pickleball" || sessionSport === "padel" || sessionSport === "cricket"
          ? { [FIELD_FLIX_SESSION_SPORT_METADATA_KEY]: sessionSport }
          : {};

      const payload = {
        userId: uid,
        cameraId: actualCameraId,
        metadata: meta,
        turfId: String(tid).trim(),
      };

      logRecordingFlowDebug("recording_start_request", {
        endpoint: "POST /recording/start",
        payload,
        jwtUserId: uid,
        cameraIdFromRoute: camFromRoute ?? null,
        effectiveCameraId: actualCameraId,
        usedDefaultCameraFallback,
        sessionSport: sessionSport ?? null,
      });

      console.log("📤 POST /recording/start API Called !!!!!", payload);
      console.log("🎥 Using cameraId from QR code:", actualCameraId);

      const resp = await axiosInstance.post<{
        id?: string;
        data?: { id?: string };
      }>("/recording/start", payload);
      console.log("✅ start response", resp.status, resp.data);

      const newId = resp.data?.id ?? resp.data?.data?.id;
      if (!newId) {
        logRecordingFlowDebug("recording_start_bad_response", {
          httpStatus: resp.status,
          body: resp.data,
        });
        throw new Error("No recording id in start response");
      }

      logRecordingFlowDebug("recording_start_ok", {
        httpStatus: resp.status,
        recordingId: newId,
        responseBody: resp.data,
      });

      recordingIdRef.current = newId;
      setTimeLeft(initialSeconds);
      setIsPaused(false);
      const endMs = Date.now() + initialSeconds * 1000;
      await SecureStore.setItemAsync("end_time", String(endMs));
      setIsRunning(true);

      try {
        await presentEventNotification({
          title: "Recording started",
          body: "Your session is live. We will notify you when processing finishes.",
          notificationType: "LOCAL_RECORDING_START",
          data: { recordingId: String(newId) },
        });
      } catch (e) {
        console.warn("Recording start notification failed:", e);
      }

      // Mirror the stop flow: alongside the system notification, surface an in-app
      // pop-up so the user gets immediate visual confirmation regardless of OS
      // notification permissions or focus state.
      showModal(
        "success",
        "Recording Started",
        "Your session is live. We'll notify you when processing finishes."
      );

      const nowIso = new Date().toISOString();
      await SecureStore.setItemAsync(
        RECORDING_KEY,
        JSON.stringify({ dateTime: nowIso })
      );
      await SecureStore.setItemAsync(TIME_LEFT_KEY, String(initialSeconds / 60));
      await SecureStore.setItemAsync(RECORDING_CAMERA_ID, newId.toString());
      await SecureStore.setItemAsync(TURF_ID, turfId.toString());
      await SecureStore.setItemAsync(RECORDING_QR_CAMERA_ID, actualCameraId);
    };

    setLoading(true);
    try {
      await postStart();
    } catch (err: unknown) {
      console.error("❌ start() error:", axios.isAxiosError(err) ? err.response?.data : err);

      logRecordingFlowDebug("recording_start_error", {
        status: axios.isAxiosError(err) ? err.response?.status : undefined,
        responseData: axios.isAxiosError(err) ? err.response?.data : undefined,
        message: err instanceof Error ? err.message : String(err),
      });

      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      if (status === 409) {
        showModal(
          "error",
          "Session already active",
          "This camera already has a recording in progress — often your own unfinished session elsewhere in the app. Finish that session first, or wait if someone else is using this court. We won't start another session automatically.",
        );
      } else if (isVenueCameraUnreachableError(err)) {
        showModal(
          "error",
          "Camera unavailable",
          "Currently our camera is unreachable. Please try again in some time.",
        );
      } else {
        const msg = axios.isAxiosError(err)
          ? String(err.response?.data?.message ?? err.message)
          : err instanceof Error
            ? err.message
            : "Unknown error";
        showModal("error", "Start failed", msg);
      }
    } finally {
      setLoading(false);
    }
  }, [initialSeconds, turfId, cameraId, sessionSport]);

  const restoreTimer = async () => {
    const cameraID = await SecureStore.getItemAsync(RECORDING_CAMERA_ID);

    recordingIdRef.current = cameraID ?? undefined;
    const endStr = await SecureStore.getItemAsync("end_time");
    if (endStr) {
      const endMs = parseInt(endStr, 10);
      const remaining = remainingSecondsFromEndMs(endMs);
      if (remaining > 0) {
        setTimeLeft(remaining);
        timeLeftRef.current = remaining;
      } else {
        setTimeLeft(initialSeconds);
        timeLeftRef.current = initialSeconds;
      }
    } else {
      setTimeLeft(initialSeconds);
      timeLeftRef.current = initialSeconds;
    }
    setIsPaused(false);
    setIsRunning(true);
  };
  const isStoppingRef = useRef(false);
  const stop = useCallback(async () => {
    if (isStoppingRef.current) {
      console.warn("Already stopping, skipping...");
      return;
    }
    isStoppingRef.current = true;

    const id = recordingIdRef.current;
    setShowStop(false);
    setLoading(true);

    if (!id) {
      console.warn("stop() called before start()");
      isStoppingRef.current = false;
      return;
    }

    setIsRunning(false);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }

    setTimeLeft(initialSeconds);

    try {
      console.log("PUT /recording/stop", { recordingId: id });

      await axiosInstance.put(`/recording/stop/${id}`, { recordingId: id });

      try {
        await presentEventNotification({
          title: "Recording stopped",
          body: "Your video is processing. We will alert you when it is ready to watch.",
          notificationType: "LOCAL_RECORDING_STOP",
          data: { recordingId: String(id) },
        });
      } catch (e) {
        console.warn("Recording stop notification failed:", e);
      }

      showModal(
        "success",
        "Recording Stopped",
        "Your recording has been successfully stopped. You would be able to view it in your recordings list in a few minutes."
      );

      console.log("recording stopped!");

      // Persist the most recently stopped recording so RecordingsScreen can poll
      // for the Mux source.ready event and surface an in-app "ready" toast.
      try {
        await SecureStore.setItemAsync(LAST_STOPPED_RECORDING_ID, String(id));
      } catch {
        // SecureStore can fail on Android emulators without a keystore — ignore.
      }

      await Promise.all([
        SecureStore.deleteItemAsync("end_time"),
        SecureStore.deleteItemAsync(RECORDING_KEY),
        SecureStore.deleteItemAsync(TIME_LEFT_KEY),
        SecureStore.deleteItemAsync(TIME_TURF_NAME),
        SecureStore.deleteItemAsync(TIME_GROUNDLOCATION),
        SecureStore.deleteItemAsync(RECORDING_CAMERA_ID),
        SecureStore.deleteItemAsync(TURF_ID),
        SecureStore.deleteItemAsync(RECORDING_QR_CAMERA_ID),
      ]);
      setLoading(false);
      
      // Delay navigation to allow user to see the success modal
      setTimeout(() => {
        navigation.replace(Paths.sessions as never);
      }, 2000);
    } catch (err: any) {
      console.error("❌ stop() error:", err.response?.data || err.message);
      showModal("error", "Stop failed", err.response?.data?.message || err.message);
    } finally {
      isStoppingRef.current = false; // Allow retry if needed
      setLoading(false);
    }
  }, [initialSeconds, navigation]);
  //   useEffect(() => {
  //   if (!isRunning) return;

  //   intervalRef.current = setInterval(() => {
  //     setTimeLeft((prevTimeLeft) => {
  //       const newTimeLeft = prevTimeLeft - 1;
  //       const newtimeLeftLocal = newTimeLeft / 60;
  //       // Save to SecureStore asynchronously
  //       SecureStore.setItemAsync(TIME_LEFT_KEY, newtimeLeftLocal.toString());

  //       return newTimeLeft;
  //     });
  //   }, 1000);

  //   return () => {
  //     if (intervalRef.current) {
  //       clearInterval(intervalRef.current);
  //     }
  //   };
  // }, [isRunning]);

  useEffect(() => {
    if (!isRunning || isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
      return;
    }

    const tick = async () => {
      const endTimeStr = await SecureStore.getItemAsync("end_time");
      if (!endTimeStr) return;
      const endTime = parseInt(endTimeStr, 10);
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsRunning(false);
        await emptyALLlocalStorage();
        stop();
      }
    };

    void tick();
    intervalRef.current = setInterval(() => {
      void tick();
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    };
  }, [isRunning, isPaused]);

  const togglePause = useCallback(async () => {
    if (!isRunning) return;
    if (!isPaused) {
      const endTimeStr = await SecureStore.getItemAsync("end_time");
      if (endTimeStr) {
        const rem = Math.max(0, Math.floor((parseInt(endTimeStr, 10) - Date.now()) / 1000));
        setTimeLeft(rem);
      }
      await SecureStore.deleteItemAsync("end_time");
      setIsPaused(true);
    } else {
      const rem = timeLeftRef.current;
      await SecureStore.setItemAsync("end_time", String(Date.now() + rem * 1000));
      setIsPaused(false);
    }
  }, [isRunning, isPaused]);

  const adjustRemaining = useCallback(
    async (deltaSec: number) => {
      setTimeLeft((r) => {
        const next = Math.min(initialSeconds, Math.max(0, r + deltaSec));
        if (isRunning && !isPaused) {
          void SecureStore.setItemAsync("end_time", String(Date.now() + next * 1000));
        }
        return next;
      });
    },
    [initialSeconds, isRunning, isPaused],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      async (nextState) => {
        console.log("nextState ", nextState);
        if (nextState === "active") {
          const endTimeStr = await SecureStore.getItemAsync("end_time");
          if (endTimeStr) {
            const endTime = parseInt(endTimeStr, 10);
            const now = Date.now();
            const newTimeLeft = Math.max(0, Math.floor((endTime - now) / 1000));

            setTimeLeft(newTimeLeft);
            console.log("newTimeLeft ", newTimeLeft);
            if (newTimeLeft > 0) {
              setIsRunning(true);
            } else {
              setIsRunning(false);
              await emptyALLlocalStorage();
              stop();
            }
          }
        }
      }
    );

    return () => subscription.remove();
  }, []);

  const emptyALLlocalStorage = async () => {
    await SecureStore.deleteItemAsync("end_time");
    await SecureStore.deleteItemAsync(RECORDING_KEY);
    await SecureStore.deleteItemAsync(TIME_LEFT_KEY);
    await SecureStore.deleteItemAsync(TIME_TURF_NAME);
    await SecureStore.deleteItemAsync(TIME_GROUNDLOCATION);
    await SecureStore.deleteItemAsync(RECORDING_CAMERA_ID);
    await SecureStore.deleteItemAsync(TURF_ID);
    await SecureStore.deleteItemAsync(RECORDING_QR_CAMERA_ID);
  };

  return {
    timeLeft,
    isRunning,
    isPaused,
    start,
    stop,
    togglePause,
    adjustRemaining,
    stepAdjustSec: STEP_ADJUST_SEC,
    restoreTimer,
    showStop,
    loading,
    setShowStop,
    // Modal props
    modalVisible,
    modalConfig,
    hideModal,
    // Modal component for easy integration
    ModalComponent: () => (
      <CustomModal
        visible={modalVisible}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        onClose={hideModal}
      />
    ),
  };
}
