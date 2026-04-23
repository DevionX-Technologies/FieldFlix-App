// src/components/ProfileHeader.tsx
import ArrowLeftIcon from "@/components/assets//icons/go-back-button.svg";
import { HStack } from "@/components/ui/hstack";
import { Paths } from "@/data/paths";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable } from "react-native";


export default function ProfileHeader() {
  const router = useRouter()

  return (
    <HStack
      className="items-center justify-between px-4 pt-12 pb-4"
      style={{ paddingTop: Platform.OS === "ios" ? 50 : 20 }}
    >
      <Pressable onPress={() => router.push(Paths.Home)}>
        <ArrowLeftIcon width={24} height={24} />
      </Pressable>
    </HStack>
  );
}
