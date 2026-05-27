import type { Camera } from '@/lib/fieldflix-api';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function compactText(v: unknown): string {
  return String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Physical court index from `/cameras` — use `court_number` from the venue (DB-backed).
 */
export function explicitCourtNumberFromCamera(
  cam: Pick<Camera, 'court_number'>,
): number | null {
  const raw = cam.court_number;
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return null;
  }
  const n = Number(String(raw).trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * Human-readable court line for QR / venue UI (`Court N` or description), when we have camera metadata.
 */
export function courtDisplayLabelFromCamera(cam: Camera | null | undefined): string | null {
  if (!cam) return null;
  const n = explicitCourtNumberFromCamera(cam);
  if (n != null) return `Court ${n}`;
  const rawStr = compactText(
    cam.court_number != null ? String(cam.court_number) : '',
  );
  if (rawStr) {
    if (/^court\b/i.test(rawStr)) return rawStr;
    return `Court ${rawStr}`;
  }
  const camName = compactText(cam.name ?? '');
  if (camName && !UUID_RE.test(camName)) {
    const m = camName.match(/(\d+)/);
    if (m) return `Court ${m[1]}`;
    return camName;
  }
  return null;
}

/** QR payload may still use legacy keys (`groundNumber`) — UI always speaks in terms of court. */
export function normalizeGroundLabelFromQr(
  groundNumber?: string | null,
  groundDescription?: string | null,
): string {
  const rawNumber = String(groundNumber ?? '').trim();
  const rawDesc = String(groundDescription ?? '').trim();
  const source = rawNumber || rawDesc;
  if (!source) return 'Court';
  let normalized = source.replace(/\s+/g, ' ').trim();
  if (/^ground\b/i.test(normalized)) {
    normalized = normalized.replace(/^ground\b/i, 'Court').replace(/\s+/g, ' ').trim();
  }
  if (/^court\b/i.test(normalized)) {
    return normalized;
  }
  return `Court ${normalized}`;
}

/** Resolve label for recording setup using venue cameras API, then QR fallbacks. */
export function resolveCourtLabelForRecordingSession(
  cameras: Camera[],
  cameraId: string | undefined | null,
  qrGroundNumber?: string | null,
  qrGroundDescription?: string | null,
): string {
  const id = String(cameraId ?? '').trim();
  if (id && cameras.length > 0) {
    const cam = cameras.find((c) => String(c.id) === id);
    const fromCam = courtDisplayLabelFromCamera(cam ?? null);
    if (fromCam) return fromCam;
  }
  return normalizeGroundLabelFromQr(qrGroundNumber, qrGroundDescription);
}
