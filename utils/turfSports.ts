/** Parse `turfs.sports_supported` from API (array or Postgres-style string). */

export type HomeSportKey = 'pickleball' | 'padel' | 'cricket';

/** Balkanji Bari venues: Pickleball-only in FieldFlix (matches backend `isOperationalBalkanjiVenueName`). */
export function turfNameIsOperationalBalkanjiVenue(
  name: string | null | undefined,
): boolean {
  return typeof name === 'string' && name.toLowerCase().includes('balkanji');
}

function normalizeToken(raw: string): string {
  return String(raw).toLowerCase().replace(/_/g, ' ').trim();
}

export function coerceSportsSupported(raw: unknown): string[] {
  if (raw == null || raw === '') return [];
  if (Array.isArray(raw)) return raw.map((x) => String(x)).filter(Boolean);
  const s = String(raw).trim();
  if (s.startsWith('{') || s.startsWith('(')) {
    return s
      .replace(/^[{(]/, '')
      .replace(/[)}]$/, '')
      .split(',')
      .map((x) => x.replace(/"/g, '').trim())
      .filter(Boolean);
  }
  return [s];
}

/** Overlap semantics aligned with Postgres `&&` filter for FieldFlix sports. */
export function turfSupportsHomeSport(
  sportsSupportedRaw: unknown,
  key: HomeSportKey,
  turfDisplayName?: string | null,
): boolean {
  if (turfNameIsOperationalBalkanjiVenue(turfDisplayName)) {
    if (key === 'pickleball') return true;
    if (key === 'padel') return false;
    if (key === 'cricket') return false;
    return false;
  }
  const tokens = coerceSportsSupported(sportsSupportedRaw).map(normalizeToken);
  const hasPickle = tokens.some((t) => t.includes('pickle'));
  const hasPaddle = tokens.some((t) => t.includes('paddle'));
  const hasCricket = tokens.some((t) => t.includes('cricket'));
  if (key === 'pickleball') return hasPickle;
  if (key === 'padel') return hasPaddle;
  if (key === 'cricket') return hasCricket;
  return false;
}

/** One-line subtitle for arena cards (FieldFlix-relevant labels only). */
export function summarizeTurfSportsLine(
  raw: unknown,
  turfDisplayName?: string | null,
): string | null {
  if (turfNameIsOperationalBalkanjiVenue(turfDisplayName)) return 'Pickleball';
  const labels = new Set<string>();
  for (const t of coerceSportsSupported(raw).map(normalizeToken)) {
    if (t.includes('pickle')) labels.add('Pickleball');
    else if (t.includes('paddle')) labels.add('Padel');
    else if (t.includes('cricket')) labels.add('Cricket');
  }
  if (labels.size === 0) return null;
  return [...labels].join(' · ');
}

export function homeSportToApiEnum(sport: HomeSportKey): string {
  if (sport === 'padel') return 'Paddle';
  if (sport === 'cricket') return 'Cricket';
  return 'Pickleball';
}

/**
 * Parses `turf.sports_supported` exactly as stored (no Balkanji name rewrite).
 *
 * Used for Sessions + Highlights unlock tier when **`fieldflix_session_sport`** metadata is
 * missing, so tiers stay aligned with `PaymentService.unlockTierAndAmounts` and historic
 * rows that still carry **Cricket** in Postgres keep cricket pricing — **without requiring a DB migration**.
 *
 * Homepage / turf discovery continues to use `fieldflixHomeSportsFromSupported` with venue name so
 * Balkanji arenas present as pickleball-going-forward.
 */
export function fieldflixHomeSportsKeysFromStoredTurfSports(
  raw: unknown,
): HomeSportKey[] {
  const tokens = coerceSportsSupported(raw).map(normalizeToken);
  const out: HomeSportKey[] = [];
  if (tokens.some((t) => t.includes('pickle'))) out.push('pickleball');
  if (tokens.some((t) => t.includes('paddle'))) out.push('padel');
  if (tokens.some((t) => t.includes('cricket'))) out.push('cricket');
  return out;
}

/**
 * Sports to expose in venue pickers / home discovery. Applies operational Balkanji → pickleball-only
 * when `turfDisplayName` matches (legacy DB arrays may still list Cricket — see
 * `fieldflixHomeSportsKeysFromStoredTurfSports` for pricing/session truth).
 */
export function fieldflixHomeSportsFromSupported(
  raw: unknown,
  turfDisplayName?: string | null,
): HomeSportKey[] {
  if (turfNameIsOperationalBalkanjiVenue(turfDisplayName)) {
    return ['pickleball'];
  }
  const tokens = coerceSportsSupported(raw).map(normalizeToken);
  const out: HomeSportKey[] = [];
  if (tokens.some((t) => t.includes('pickle'))) out.push('pickleball');
  if (tokens.some((t) => t.includes('paddle'))) out.push('padel');
  if (tokens.some((t) => t.includes('cricket'))) out.push('cricket');
  return out;
}
