// src/screens/recording/hooks/useCountdown.ts
import { CustomModal } from "@/components/ui/CustomModal";
import {
  LAST_STOPPED_RECORDING_ID,
  RECORDING_CAMERA_ID,
  RECORDING_KEY,
  TIME_GROUNDLOCATION,
  TIME_LEFT_KEY,
  TIME_TURF_NAME,
  TURF_ID,
} from "@/data/constants";
import { Paths } from "@/data/paths";
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

/** Nest may return `existingRecordingId` on 409 so the client can stop the stuck row and retry. */
function extractConflictRecordingId(err: unknown): string | undefined {
  if (!axios.isAxiosError(err)) return undefined;
  const d = err.response?.data as Record<string, unknown> | undefined;
  if (!d) return undefined;
  if (typeof d.existingRecordingId === "string") return d.existingRecordingId;
  const m = d.message;
  if (m && typeof m === "object" && !Array.isArray(m) && "existingRecordingId" in m) {
    const id = (m as Record<string, unknown>).existingRecordingId;
    if (typeof id === "string") return id;
  }
  return undefined;
}

export function useCountdown(initialSeconds: number, turfId: string, cameraId?: string | string[]) {
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

  useEffect(() => {
    setTimeLeft(initialSeconds);
    timeLeftRef.current = initialSeconds;
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
  }, [initialSeconds]);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  const start = useCallback(async () => {
    const postStart = async () => {
      const tokenNew = await getToken();
      setToken(tokenNew);

      if (!tokenNew) {
        showModal("error", "Not signed in", "Please log in again.");
        return;
      }

      const decoded = jwtDecode<DecodedToken>(tokenNew);
      const uid = decoded.user_id ?? null;
      setUserId(uid);
      if (!uid) {
        showModal("error", "Not signed in", "Missing user id in token.");
        return;
      }
      const tid = Array.isArray(turfId) ? turfId[0] : turfId;
      if (tid == null || String(tid).trim() === "") {
        showModal(
          "error",
          "Invalid QR",
          "This QR is missing a turf. Scan a valid FieldFlicks court QR to start recording."
        );
        return;
      }
      const actualCameraId = Array.isArray(cameraId) ? cameraId[0] : cameraId || "27ce1af1-721a-421c-9223-3ddeda95f315";

      const payload = {
        userId: uid,
        cameraId: actualCameraId,
        metadata: {},
        turfId: String(tid).trim(),
      };

      console.log("📤 POST /recording/start API Called !!!!!", payload);
      console.log("🎥 Using cameraId from QR code:", actualCameraId);

      const resp = await axiosInstance.post<{
        id?: string;
        data?: { id?: string };
      }>("/recording/start", payload);
      console.log("✅ start response", resp.status, resp.data);

      const newId = resp.data?.id ?? resp.data?.data?.id;
      if (!newId) {
        throw new Error("No recording id in start response");
      }

      recordingIdRef.current = newId;
      setTimeLeft(initialSeconds);
      setIsPaused(false);
      const endMs = Date.now() + initialSeconds * 1000;
      await SecureStore.setItemAsync("end_time", String(endMs));
      setIsRunning(true);

      const nowIso = new Date().toISOString();
      await SecureStore.setItemAsync(
        RECORDING_KEY,
        JSON.stringify({ dateTime: nowIso })
      );
      await SecureStore.setItemAsync(TIME_LEFT_KEY, String(initialSeconds / 60));
      await SecureStore.setItemAsync(RECORDING_CAMERA_ID, newId.toString());
      await SecureStore.setItemAsync(TURF_ID, turfId.toString());
    };

    try {
      await postStart();
    } catch (err: unknown) {
      console.error("❌ start() error:", axios.isAxiosError(err) ? err.response?.data : err);

      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      if (status === 409) {
        const existingId = extractConflictRecordingId(err);
        if (existingId) {
          try {
            await axiosInstance.put(`/recording/stop/${existingId}`, {
              recordingId: existingId,
            });
            await postStart();
            return;
          } catch (stopErr) {
            console.error("❌ stop after 409 failed:", axios.isAxiosError(stopErr) ? stopErr.response?.data : stopErr);
            showModal(
              "error",
              "Could not clear previous session",
              axios.isAxiosError(stopErr)
                ? String(stopErr.response?.data?.message ?? stopErr.message)
                : "Try again in a moment or ask support to clear the camera session."
            );
            return;
          }
        }
        const raw = axios.isAxiosError(err) ? err.response?.data : undefined;
        const m = raw && typeof raw === "object" && "message" in raw ? (raw as { message: unknown }).message : undefined;
        const text =
          typeof m === "string"
            ? m
            : m && typeof m === "object" && m !== null && "message" in m
              ? String((m as { message: string }).message)
              : "Please stop the current recording before starting a new one.";
        showModal("error", "Recording in Progress", text);
      } else {
        const msg = axios.isAxiosError(err)
          ? String(err.response?.data?.message ?? err.message)
          : err instanceof Error
            ? err.message
            : "Unknown error";
        showModal("error", "Start failed", msg);
      }
    }
  }, [initialSeconds, turfId, cameraId]);

  const restoreTimer = async () => {
    const rawStart = await SecureStore.getItemAsync(RECORDING_KEY);
    const rawTimeLeft = await SecureStore.getItemAsync(TIME_LEFT_KEY);
    const cameraID = await SecureStore.getItemAsync(RECORDING_CAMERA_ID);
    const turfID = await SecureStore.getItemAsync(TURF_ID);

    recordingIdRef.current = cameraID ?? undefined;
    setTimeLeft(initialSeconds);
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
        SecureStore.deleteItemAsync(RECORDING_KEY),
        SecureStore.deleteItemAsync(TIME_LEFT_KEY),
        SecureStore.deleteItemAsync(TIME_TURF_NAME),
        SecureStore.deleteItemAsync(TIME_GROUNDLOCATION),
        SecureStore.deleteItemAsync(RECORDING_CAMERA_ID),
        SecureStore.deleteItemAsync(TURF_ID),
      ]);
      setLoading(false);
      
      // Delay navigation to allow user to see the success modal
      setTimeout(() => {
        navigation.push(Paths.recordings);
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
