// src/screens/recording/components/StartStopButtons.tsx
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { useResponsiveDesign } from "@/hooks/useResponsiveDesign";
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
  const { font } = useResponsiveDesign();
  
  if (!isRunning) {
    return (
      <Pressable onPress={onStart} className="w-full">
        <LinearGradient
          colors={["#B6FC00", "#55DB26"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="w-full py-4 items-center justify-center"
          style={{ borderRadius: 30 }}
        >
          <Box className="flex-row items-center justify-center">
            <FontAwesome name="play" size={18} color="#000" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: font.lg }} bold className="text-typography-50">
              Start Recording
            </Text>
          </Box>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onRequestStop}>
      <Box className="w-full py-4 bg-red-600 rounded-full items-center justify-center">
        <Box className="flex-row items-center justify-center">
          <FontAwesome name="stop-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={{ fontSize: font.lg }} bold className="text-white">
            Stop
          </Text>
        </Box>
      </Box>
    </Pressable>
  );
}