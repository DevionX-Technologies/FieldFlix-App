/** Parse `turfs.sports_supported` from API (array or Postgres-style string). */

export type HomeSportKey = 'pickleball' | 'padel' | 'cricket';

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
): boolean {
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
export function summarizeTurfSportsLine(raw: unknown): string | null {
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

/** FieldFlix sports this venue advertises, fixed order (for pickers + filters). */
export function fieldflixHomeSportsFromSupported(raw: unknown): HomeSportKey[] {
  const tokens = coerceSportsSupported(raw).map(normalizeToken);
  const out: HomeSportKey[] = [];
  if (tokens.some((t) => t.includes('pickle'))) out.push('pickleball');
  if (tokens.some((t) => t.includes('paddle'))) out.push('padel');
  if (tokens.some((t) => t.includes('cricket'))) out.push('cricket');
  return out;
}
