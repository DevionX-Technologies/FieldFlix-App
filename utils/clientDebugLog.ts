const MAX_ENTRIES = 250;

type DebugEntry = {
  ts: string;
  tag: string;
  message: string;
};

const buffer: DebugEntry[] = [];

function stringify(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function pushClientDebugLog(tag: string, message: string, meta?: unknown): void {
  const suffix = meta == null ? '' : ` | ${stringify(meta)}`;
  const entry: DebugEntry = {
    ts: new Date().toISOString(),
    tag,
    message: `${message}${suffix}`,
  };
  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) buffer.splice(0, buffer.length - MAX_ENTRIES);
  // Keep this visible for adb logcat + Metro while still preserving in-app logs.
  // eslint-disable-next-line no-console
  console.log(`[${entry.tag}] ${entry.message}`);
}

export function getClientDebugLogText(): string {
  if (buffer.length === 0) return 'No client debug logs yet.';
  return buffer.map((e) => `${e.ts} [${e.tag}] ${e.message}`).join('\n');
}

export function clearClientDebugLog(): void {
  buffer.length = 0;
}
