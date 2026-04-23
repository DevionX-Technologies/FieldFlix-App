// src/screens/recording/components/RecordingHeader.tsx
import CloseIcon from "@/components/assets/icons/cross.svg";
import { Box } from "@/components/ui/box";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import { Pressable } from "react-native";

type Props = {
};

export default function RecordingHeader(_: Props) {
  const navigation =
    useNavigation<NativeStackNavigationProp<any, any>>();

  return (
    <Box className="absolute top-4 right-4 z-10">
      <Pressable onPress={() => navigation.goBack()}>
        <CloseIcon width={12} height={24} fill="#fff" />
      </Pressable>
    </Box>
  );
}