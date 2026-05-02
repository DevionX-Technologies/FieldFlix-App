import type {
  FulfilledThemeConfiguration,
  Variant,
} from "@/theme/types/config";
import type { ComponentTheme, Theme } from "@/theme/types/theme";

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  RECORDING_KEY,
  RECORDING_QR_CAMERA_ID,
  TIME_GROUNDLOCATION,
  TIME_TOTAL,
  TIME_TURF_NAME,
  TURF_ID,
} from "@/data/constants";
import { Paths } from "@/data/paths";
import {
  generateBackgrounds,
  staticBackgroundStyles,
} from "@/theme/backgrounds";
import {
  generateBorderColors,
  generateBorderRadius,
  generateBorderWidths,
  staticBorderStyles,
} from "@/theme/borders";
import componentsGenerator from "@/theme/components";
import {
  generateFontColors,
  generateFontSizes,
  staticFontStyles,
} from "@/theme/fonts";
import { generateGutters, staticGutterStyles } from "@/theme/gutters";
import layout from "@/theme/layout";
import generateConfig from "@/theme/ThemeProvider/generateConfig";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";

type Context = Theme & {
  changeTheme: (variant: Variant) => void;
};

export const ThemeContext = createContext<Context | undefined>(undefined);

function ThemeProvider({ children }: { children: React.ReactNode }) {
  // ✅ Hardcoded variant — no storage
  const [variant, setVariant] = useState<Variant>("default");
  const router = useRouter();

  useEffect(() => {
    async function checkToken() {
      const rawStart = await SecureStore.getItemAsync(RECORDING_KEY);
      const totalTime = await SecureStore.getItemAsync(TIME_TOTAL);
      const Name = await SecureStore.getItemAsync(TIME_TURF_NAME);
      const GroundLocation = await SecureStore.getItemAsync(
        TIME_GROUNDLOCATION
      );
      const turfId = await SecureStore.getItemAsync(TURF_ID);
      const qrCameraId = await SecureStore.getItemAsync(RECORDING_QR_CAMERA_ID);
      const endTimeStr = await SecureStore.getItemAsync("end_time");

      if (!rawStart || !totalTime) return;

      let remainingSeconds = 0;
      if (endTimeStr) {
        const endMs = parseInt(endTimeStr, 10);
        if (Number.isFinite(endMs)) {
          remainingSeconds = Math.max(0, Math.floor((endMs - Date.now()) / 1000));
        }
      } else {
        const totalTimeInSeconds = parseInt(totalTime, 10) * 60;
        const { dateTime } = JSON.parse(rawStart) as { dateTime: string };
        const whenStarted = new Date(dateTime);
        const now = new Date();
        const secondsPassed = (now.getTime() - whenStarted.getTime()) / 1000;
        remainingSeconds = Math.max(totalTimeInSeconds - secondsPassed, 0);
      }

      const totalTimeInMinutes = parseInt(totalTime, 10);
      const plannedSec = Number.isFinite(totalTimeInMinutes)
        ? totalTimeInMinutes * 60
        : 3600;

      if (remainingSeconds > 0) {
        router.push({
          pathname: Paths.MainRecordingScreen,
          params: {
            Name: Name ?? "",
            GroundLocation: GroundLocation ?? "",
            ChoosenTimeInMinutes: String(totalTimeInMinutes || 60),
            plannedDurationSec: String(plannedSec),
            remainingSeconds: String(Math.floor(remainingSeconds)),
            Resume: "true",
            turfId: turfId ?? "",
            ...(qrCameraId ? { cameraId: qrCameraId } : {}),
          },
        });
      }
    }
    checkToken();
  }, [router]);

  const changeTheme = useCallback((nextVariant: Variant) => {
    setVariant(nextVariant);
    // no storage.set
  }, []);

  const fullConfig = useMemo(() => {
    return generateConfig(variant) satisfies FulfilledThemeConfiguration;
  }, [variant]);

  const fonts = useMemo(() => {
    return {
      ...generateFontSizes(),
      ...generateFontColors(fullConfig),
      ...staticFontStyles,
    };
  }, [fullConfig]);

  const backgrounds = useMemo(() => {
    return {
      ...generateBackgrounds(fullConfig),
      ...staticBackgroundStyles,
    };
  }, [fullConfig]);

  const gutters = useMemo(() => {
    return {
      ...generateGutters(fullConfig),
      ...staticGutterStyles,
    };
  }, [fullConfig]);

  const borders = useMemo(() => {
    return {
      ...generateBorderColors(fullConfig),
      ...generateBorderRadius(),
      ...generateBorderWidths(),
      ...staticBorderStyles,
    };
  }, [fullConfig]);

  const navigationTheme = useMemo(() => {
    return {
      dark: variant === "dark",
      colors: fullConfig.navigationColors,
    };
  }, [variant, fullConfig.navigationColors]);

  const theme = useMemo(() => {
    return {
      colors: fullConfig.colors,
      variant,
      gutters,
      layout,
      fonts,
      backgrounds,
      borders,
    } satisfies ComponentTheme;
  }, [variant, fonts, backgrounds, borders, fullConfig.colors, gutters]);

  const components = useMemo(() => {
    return componentsGenerator(theme);
  }, [theme]);

  const value = useMemo(() => {
    return { ...theme, components, navigationTheme, changeTheme };
  }, [theme, components, navigationTheme, changeTheme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export default ThemeProvider;
