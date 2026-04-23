// API base — override with EXPO_PUBLIC_BASE_URL in `.env`. LAN example: http://192.168.x.x:8000. Emulator: http://10.0.2.2:8000
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
  process.env.EXPO_PUBLIC_BASE_URL ?? "https://cheerful-apparent-hound.ngrok-free.app",
);

export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
  "350089393900-28gotib243itoj4tlt1tmklcoctjisoa.apps.googleusercontent.com";
export const RECORDING_KEY = "recordingStartData";
export const TIME_LEFT_KEY = "recordingTimeLeft";
export const TIME_TURF_NAME = "turfName";
export const TIME_GROUNDLOCATION = "groundLocation";
export const RECORDING_CAMERA_ID = "recordingCameraID";
export const TIME_TOTAL = "totalTime";
export const TURF_ID = "turfId";

export const TOKEN_KEY = 'fcmToken';

// Mux API Credentials
export const MUX_TOKEN_ID =
  process.env.EXPO_PUBLIC_MUX_TOKEN_ID ?? "efca5899-c144-49d0-94c1-58ce78bf0e67";
export const MUX_TOKEN_SECRET =
  process.env.EXPO_PUBLIC_MUX_TOKEN_SECRET ??
  "vJtihoRHmdjLMl8HjctQC9p7exv4R2wf4GSUlmG0G8FBb0+xm16IXxnk86A211A1bbSWerH8F6y";