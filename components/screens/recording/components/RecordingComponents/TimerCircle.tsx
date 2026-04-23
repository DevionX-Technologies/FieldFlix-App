// src/screens/recording/components/TimerCircle.tsx

import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useResponsiveDesign } from "@/hooks/useResponsiveDesign";
import React from "react";
import { AnimatedCircularProgress } from "react-native-circular-progress";

export interface TimerCircleProps {
  /**
   * timeLeft may be negative, zero, or positive.
   * A positive value means "time remaining."
   * A negative value means "overrun," i.e. time past the end.
   */
  timeLeft: number; // in seconds (can be negative)
  totalSeconds: number; // in seconds (assumed > 0)
  isRunning: boolean; // whether the countdown is continuing
}

export default function TimerCircle({
  timeLeft,
  totalSeconds,
  isRunning,
}: TimerCircleProps) {
  const { font, device } = useResponsiveDesign();
  
  /**
   * Formats any integer number of seconds (positive or negative)
   * into "[-]HH:MM:SS". When negative, we prefix with "−".
   */
  const formatTime = (seconds: number) => {
    const sign = seconds < 0 ? "-" : "";
    const absSecs = Math.abs(seconds);
    const h = Math.floor(absSecs / 3600);
    const m = Math.floor((absSecs % 3600) / 60);
    const s = absSecs % 60;
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    const ss = String(s).padStart(2, "0");
    return `${sign}${hh}:${mm}:${ss}`;
  };

  // Compute how "full" the circle should be.
  // Once timeLeft ≤ 0, we want 100%.
  let rawFillPercent = ((totalSeconds - timeLeft) / totalSeconds) * 100;
  if (rawFillPercent < 0) rawFillPercent = 0;
  if (rawFillPercent > 100) rawFillPercent = 100;

  // Responsive circle size based on device
  const circleSize = device.isSmall ? 250 : device.isMedium ? 280 : 320;
  const circleWidth = device.isSmall ? 5 : 6;

  return (
    <Box className="items-center justify-center">
      <AnimatedCircularProgress
        size={circleSize}
        width={circleWidth}
        fill={rawFillPercent}
        tintColor="#11EA3A"
        backgroundColor="#3d5875"
        lineCap="round"
        rotation={0}
      >
        {() => (
          <VStack className="items-center justify-center">
            {timeLeft < 0 && (
              <Text 
                style={{ fontSize: font.lg }} 
                className="mb-4 text-center text-white"
              >
                Elapsed Time {formatTime(totalSeconds)}
              </Text>
            )}
            <Text 
              style={{ fontSize: device.isSmall ? font.custom(32) : font.custom(48) }} 
              bold 
              className="text-center text-white"
            >
              {formatTime(timeLeft)}
            </Text>
            {isRunning && (
              <Text 
                style={{ fontSize: font.sm }} 
                className="mt-3 text-center text-red-400"
              >
                🔴 Recording
              </Text>
            )}
          </VStack>
        )}
      </AnimatedCircularProgress>
    </Box>
  );
}