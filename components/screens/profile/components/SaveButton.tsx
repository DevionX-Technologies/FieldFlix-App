// src/components/SaveButton.tsx
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import React from "react";
import { Pressable } from "react-native";

interface SaveButtonProps {
  isDirty: boolean;
  onSave: () => void;
}

export default function SaveButton({ isDirty, onSave }: SaveButtonProps) {
  return (
    <Pressable disabled={!isDirty} onPress={onSave}>
      <Box
        className={`w-full py-4 rounded-full items-center justify-center ${
          isDirty ? "bg-app-baseColor" : "bg-gray-600"
        }`}
      >
        <Text size="lg" bold className={`${isDirty ? "text-black" : "text-gray-400"}`}>
          Save
        </Text>
      </Box>
    </Pressable>
  );
}