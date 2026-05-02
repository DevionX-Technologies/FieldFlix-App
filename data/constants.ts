

// API base — override with EXPO_PUBLIC_BASE_URL in `.env`. Default is production; for local dev set e.g. http://192.168.x.x:8000.
// For ngrok: use https://YOUR_SUBDOMAIN.ngrok-free.app with NO :8000 (ngrok edge is :443; :8000 will fail with ERR_NETWORK).

function normalizeApiBaseUrl(raw: string): string {
  const s = raw.trim().replace(/\/+$/, "");
  if (!s) return raw;
  try {
    const u = new URL(s);
    if (u.hostname.includes("ngrok") && (u.port === "8000" || u.port === "80")) {
      u.port = "";
      return u.toString().replace(/\/+$/, "");
    }
  } catch {
    /* ignore */
  }
  return s;
}

export const BASE_URL = normalizeApiBaseUrl(
  process.env.EXPO_PUBLIC_BASE_URL ?? "https://api.devionx.com",
);

export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
  "350089393900-28gotib243itoj4tlt1tmklcoctjisoa.apps.googleusercontent.com";
export const RECORDING_KEY = "recordingStartData";
export const TIME_LEFT_KEY = "recordingTimeLeft";
export const TIME_TURF_NAME = "turfName";
export const TIME_GROUNDLOCATION = "groundLocation";
export const RECORDING_CAMERA_ID = "recordingCameraID";
/** Camera UUID from the QR for the session in progress (vs `RECORDING_CAMERA_ID` = recording row id). */
export const RECORDING_QR_CAMERA_ID = "fieldflix-recording-qr-camera-id";
export const TIME_TOTAL = "totalTime";
export const TURF_ID = "turfId";
/** SecureStore key tracking the most recently stopped recording — drives the post-stop "ready" toast on Recordings. */
export const LAST_STOPPED_RECORDING_ID = "fieldflicks-last-stopped-recording-id";

export const TOKEN_KEY = 'fcmToken';

/** Razorpay publishable key (Dashboard → API keys) — used by native Checkout only; never the secret. */
export const RAZORPAY_KEY_ID =
  process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? "";

// Mux API Credentials
export const MUX_TOKEN_ID =
  process.env.EXPO_PUBLIC_MUX_TOKEN_ID ?? "efca5899-c144-49d0-94c1-58ce78bf0e67";
export const MUX_TOKEN_SECRET =
  process.env.EXPO_PUBLIC_MUX_TOKEN_SECRET ??
  "vJtihoRHmdjLMl8HjctQC9p7exv4R2wf4GSUlmG0G8FBb0+xm16IXxnk86A211A1bbSWerH8F6y";