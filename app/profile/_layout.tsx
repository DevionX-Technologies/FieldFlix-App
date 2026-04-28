import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: Platform.select({
          ios: "ios_from_right",
          android: "simple_push",
          default: "simple_push",
        }),
        animationDuration: Platform.select({
          ios: 340,
          android: 280,
          default: 280,
        }),
        animationTypeForReplace: "push",
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        animationMatchesGesture: true,
        customAnimationOnGesture: true,
        presentation: "card",
        contentStyle: { backgroundColor: "#000000" },
      }}
    />
  );
}
