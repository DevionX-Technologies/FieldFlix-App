// src/components/ProfileAvatar.tsx
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import React from "react";
import { Image } from "react-native";

interface ProfileAvatarProps {
  fullName: string;
  email: string;
}

export default function ProfileAvatar({ fullName, email, imageUrl }: ProfileAvatarProps & { imageUrl?: string }) {
  return (
    <HStack className="items-center space-x-4">
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: 120, height: 120, borderRadius: 60 }}
          className="w-20 h-20 rounded-full bg-cover bg-center"
          resizeMode="cover"
          alt={`${fullName}'s profile picture`}
        />
      ) : (
        <Box
          className="w-20 h-20 rounded-full bg-[#2A2A38] items-center justify-center"
          style={{ width: 120, height: 120, backgroundColor: "#2A2A38" }}
        >
          <Text size="4xl" bold className="text-white">
            {fullName.charAt(0).toUpperCase()}
          </Text>
        </Box>
      )}
      <VStack className="ml-4">
        <Text size="xl" bold className="text-white">
          {fullName}
        </Text>
        <Text size="sm" className="text-app-secondaryColor">
          {email}
        </Text>
      </VStack>
    </HStack>
  );
}