// src/screens/recording/components/RecordingHeader.tsx
import CloseIcon from "@/components/assets/icons/cross.svg";
import { Box } from "@/components/ui/box";
import {
  RECORDING_KEY,
  TIME_GROUNDLOCATION,
  TIME_LEFT_KEY,
  TIME_TURF_NAME,
} from "@/data/constants";
import { Paths } from "@/data/paths";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React from "react";
import { Pressable } from "react-native";
type Props = {};

export default function RecordingHeader({ handleConfirmStop, isRunning }: any) {
  const router = useRouter();
  const onCloseClick = async () => {


    if (isRunning) {
      handleConfirmStop();
    } else {
      await SecureStore.deleteItemAsync(RECORDING_KEY);
      await SecureStore.deleteItemAsync(TIME_LEFT_KEY);
      await SecureStore.deleteItemAsync(TIME_TURF_NAME);
      await SecureStore.deleteItemAsync(TIME_GROUNDLOCATION);
      router.push(Paths.home);
    }
  };
  return (
    <Box className="absolute top-4 right-4 z-10">
      <Pressable onPress={() => onCloseClick()}>
        <CloseIcon width={12} height={24} fill="#fff" />
      </Pressable>
    </Box>
  );
}
