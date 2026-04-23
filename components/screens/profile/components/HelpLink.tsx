// src/components/HelpLink.tsx
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import React from "react";
import { Linking, Pressable } from "react-native";

export default function HelpLink() {
  return (
    <HStack className="justify-center mt-2">
      <Text size="sm" className="text-app-secondaryColor">
        Need Help?{" "}
      </Text>
      <Pressable
        onPress={() => Linking.openURL("mailto:admin@fieldflicks.com")}
      >
        <Text size="sm" className="text-app-baseColor font-semibold">
          Contact us
        </Text>
      </Pressable>
    </HStack>
  );
}
