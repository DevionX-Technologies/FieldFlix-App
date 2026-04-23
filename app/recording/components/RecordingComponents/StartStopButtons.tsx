// src/screens/recording/components/StartStopButtons.tsx
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable } from "react-native";

export interface StartStopButtonsProps {
  isRunning: boolean;
  onStart: () => void;
  onRequestStop: () => void;
}

export default function StartStopButtons({ isRunning, onStart, onRequestStop }: StartStopButtonsProps) {
  if (!isRunning) {
    return (
      <Pressable onPress={onStart} className="w-full" style={{ width: '100%' }}>
        <LinearGradient
          colors={["#B6FC00", "#55DB26"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="w-full py-4 items-center justify-center"
          style={{ borderRadius: 30, width: '100%' }}
        >
          <Box className="flex-row items-center justify-center pl-10 pr-10">
            <FontAwesome name="play" size={18} color="#000" style={{ marginRight: 8 }} />
            <Text size="lg" bold className="text-typography-50">
              Start Recording
            </Text>
          </Box>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onRequestStop} className="w-full" style={{ width: '100%' }}>
      <Box className="w-full py-4 bg-red-600 rounded-full items-center justify-center" style={{ width: '100%' }}>
        <Box className="flex-row items-center justify-center pl-10 pr-10">
          <FontAwesome name="stop-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text size="lg" bold className="text-white">
            Stop
          </Text>
        </Box>
      </Box>
    </Pressable>
  );
}