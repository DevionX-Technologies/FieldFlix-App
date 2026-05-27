#!/usr/bin/env node
/**
 * Fail fast before EAS Update if this checkout still has the legacy FlickShorts empty copy,
 * or if the coming-soon component file is missing (common when syncing only one TSX file).
 *
 * Run from the app root (same directory as package.json):
 *   node scripts/verify-flickshorts-coming-soon.mjs
 *
 * Then publish OTA from THIS directory only (not a sibling clone).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const screenPath = path.join(root, 'screens/fieldflix/FlixShortsScreen.tsx');
const emptyPath = path.join(
  root,
  'components/fieldflix/FlickShortsComingSoonEmpty.tsx',
);

const problems = [];

if (!fs.existsSync(screenPath)) {
  problems.push(`Missing screen: ${path.relative(root, screenPath)}`);
} else {
  const screen = fs.readFileSync(screenPath, 'utf8');
  if (screen.includes('No FlickShorts in this filter yet')) {
    problems.push(
      'screens/fieldflix/FlixShortsScreen.tsx still contains legacy empty-state copy',
    );
  }
  if (
    !screen.includes('FlickShortsComingSoonEmpty') &&
    !screen.includes('Coming soon')
  ) {
    problems.push(
      'screens/fieldflix/FlixShortsScreen.tsx has no FlickShortsComingSoonEmpty / Coming soon',
    );
  }
}

if (!fs.existsSync(emptyPath)) {
  problems.push(
    `Missing component (copy from repo): ${path.relative(root, emptyPath)}`,
  );
} else {
  const empty = fs.readFileSync(emptyPath, 'utf8');
  if (
    !empty.includes('export function FlickShortsComingSoonEmpty') ||
    !empty.includes('Coming soon')
  ) {
    problems.push('FlickShortsComingSoonEmpty.tsx looks incomplete');
  }
}

if (problems.length) {
  console.error('[verify-flickshorts-coming-soon] FAILED:\n');
  for (const p of problems) console.error(' -', p);
  console.error(
    '\nPublish OTA only from the FieldFlix-App directory that contains these files (e.g. frontend/FieldFlix-App in this repo).\n',
  );
  process.exit(1);
}

console.log(
  '[verify-flickshorts-coming-soon] OK — FlickShorts coming-soon empty state present',
);
