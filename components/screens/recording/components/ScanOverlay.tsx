import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import React from "react";
import { Dimensions, Platform } from "react-native";

export default function ScanOverlay() {
  const { width } = Dimensions.get("window");
  const boxSize = width * 0.75;

  return (
    <Box 
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'column',
      }}
    >
      <Box style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', flex: 1 }} />
      <Box style={{ flexDirection: 'row', height: boxSize }}>
        <Box style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', flex: 1 }} />
        <Box
          style={{
            width: boxSize,
            height: boxSize,
            borderWidth: 2,
            borderColor: 'rgb(85, 219, 38)', // app-baseColor
          }}
        />
        <Box style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', flex: 1 }} />
      </Box>
      <Box style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', flex: 1 }} />
      <Box
        style={{
          position: 'absolute',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          bottom: Platform.OS === "ios" ? 40 : 80,
        }}
      >
        <Text 
          size="lg"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 4,
          }}
        >
          Align QR code inside the box to scan
        </Text>
      </Box>
    </Box>
  );
}
