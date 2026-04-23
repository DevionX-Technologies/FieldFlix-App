import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import React from "react";
import { Dimensions, Platform } from "react-native";

export default function ScanOverlay() {
  const { width } = Dimensions.get("window");
  const boxSize = width * 0.75;

  return (
    <Box className="absolute inset-0 flex flex-col">
      <Box className="bg-black/60 flex-1" />
      <Box className="flex-row" style={{ height: boxSize }}>
        <Box className="bg-black/60 flex-1" />
        <Box
          className="border-2 border-app-baseColor"
          style={{
            width: boxSize,
            height: boxSize,
          }}
        />
        <Box className="bg-black/60 flex-1" />
      </Box>
      <Box className="bg-black/60 flex-1" />
      <Box
        className={`absolute w-full items-center ${
          Platform.OS === "ios" ? "bottom-10" : "bottom-20"
        }`}
      >
        <Text className="bg-black/60 px-4 py-2 rounded" size="lg">
          Align QR code inside the box to scan
        </Text>
      </Box>
    </Box>
  );
}
