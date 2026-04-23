// src/screens/recording/components/StopDialog.tsx
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import React from "react";
import { ActivityIndicator, Modal, Pressable } from "react-native";

export interface StopDialogProps {
  visible: boolean;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function StopDialog({ visible, loading, onConfirm, onCancel }: StopDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Box className="flex-1 bg-black/50 items-center justify-center">
        <Box className="bg-app-cardBackgroundColor p-6 rounded-xl w-11/12">
          <Text size="md" className="mb-4">
            Do you really want to stop the recording?
          </Text>
          {loading ? (
            <ActivityIndicator size="small" color="#B6FC00" />
          ) : (
            <HStack space="md" className="justify-end">
              <Pressable onPress={onConfirm}>
                <Text size="md" bold className="text-app-baseColor mr-2">
                  Yes
                </Text>
              </Pressable>
              <Pressable onPress={onCancel}>
                <Text size="md" className="">
                  Cancel
                </Text>
              </Pressable>
            </HStack>
          )}
        </Box>
      </Box>
    </Modal>
  );
}