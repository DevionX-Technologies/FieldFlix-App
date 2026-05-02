/** In-memory log for QR → recording start (copy-friendly JSON). Not persisted. */

export type RecordingFlowDebugEntry = {
  at: string;
  phase: string;
  detail: unknown;
};

const MAX_ENTRIES = 80;
const entries: RecordingFlowDebugEntry[] = [];

export function clearRecordingFlowDebug(): void {
  entries.length = 0;
}

export function logRecordingFlowDebug(phase: string, detail: unknown): void {
  entries.push({
    at: new Date().toISOString(),
    phase,
    detail,
  });
  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }
  // eslint-disable-next-line no-console
  console.log(`[recording-flow] ${phase}`, detail);
}

export function getRecordingFlowDebugExport(): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      hint: 'Paste this for support. Redact token if sharing publicly.',
      entries,
    },
    null,
    2,
  );
}

export function getRecordingFlowDebugEntryCount(): number {
  return entries.length;
}
