import { requireOptionalNativeModule } from "expo-modules-core";

/**
 * Values mirror expo-screen-orientation OrientationLock so we never import that
 * package at module load (that import calls requireNativeModule and crashes when
 * the native binary predates the dependency — common after OTA-only deploys).
 */
const OrientationLock = {
  DEFAULT: 0,
  PORTRAIT_UP: 3,
} as const;

type ExpoScreenOrientationNative = {
  lockAsync?: (orientationLock: number) => Promise<void>;
};

const native =
  requireOptionalNativeModule<ExpoScreenOrientationNative>(
    "ExpoScreenOrientation",
  );

/** Same behavior as expo-screen-orientation unlockAsync() → lock(DEFAULT). */
export async function safeUnlockOrientations(): Promise<void> {
  if (!native?.lockAsync) return;
  try {
    await native.lockAsync(OrientationLock.DEFAULT);
  } catch {
    /* tablet / emulator / policy */
  }
}

export async function safeLockPortraitUp(): Promise<void> {
  if (!native?.lockAsync) return;
  try {
    await native.lockAsync(OrientationLock.PORTRAIT_UP);
  } catch {
    /* tablet / emulator */
  }
}
