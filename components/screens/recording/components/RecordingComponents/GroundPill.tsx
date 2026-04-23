// src/screens/recording/components/GroundPill.tsx
import { default as FieldIcon } from "@/components/assets/icons/football.svg";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";

export interface GroundPillProps {
  turfLocation: string;
  groundNumber: string;
}

export default function GroundPill({ turfLocation, groundNumber }: GroundPillProps) {
  return (
    <Box className="items-center">
      <LinearGradient
        colors={["#006818", "#006818"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="px-6 py-2 rounded-full flex-row items-center"
        style={{ borderRadius: 30 }}
      >
        <FieldIcon width={16} height={16} fill="#B6FC00" className="mr-2" />
        <Text size="md" className="ml-3 text-[#55DB26]">
          Ground number {groundNumber}
        </Text>
      </LinearGradient>
    </Box>
  );
}