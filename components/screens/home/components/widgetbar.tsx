import HomeIcon from "@/components/assets/icons/home.svg";
import RecordingIcon from "@/components/assets/icons/recordings.svg";
import ProfileIcon from "@/components/assets/icons/user.svg";
import RecordingButtonIcon from "@/components/assets/icons/videoCamera.svg";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Paths } from "@/data/paths";
import { useRouter } from "expo-router";
import { Pressable } from "react-native";
type RootStackParamList = {
  Home: undefined;
  Recording: undefined;
  Profile: undefined;
  MainRecordingScreen: undefined;
  ViewSavedRecording: undefined;
  TurfDetailsScreen: undefined;
  QRCodeScreen: undefined;
  RecordingPlaybackScreen: undefined;
  ProfileScreen: undefined;
  VideoRecording: undefined;
};


export default function WidgetNavigationBar() {
  // const navigation =
  //   useNavigation<NativeStackNavigationProp<RootStackParamList>>();

     const router = useRouter();

 
  return (
    <Box className="bg-app-widgetColor rounded-full py-4 px-6">
      <HStack space="md" className="justify-between items-center mx-2">
        {/* Home */}
        <Pressable onPress={() => router.push(Paths.Home)}>
          <Box className="flex flex-col items-center">
            <HomeIcon width={24} height={24} />
            <Text size="md" >Home</Text>
          </Box>
        </Pressable>

        {/* Recordings */}
        <Pressable onPress={() => router.push(Paths.RecordingPlaybackScreen)}>
          <Box className="flex flex-col items-center">
            <RecordingIcon width={24} height={24} />
            <Text size="md" >Recordings</Text>
          </Box>
        </Pressable>

        {/* Profile */}
        <Pressable onPress={() => router.push(Paths.ProfileScreen)}>
          <Box className="flex flex-col items-center">
            <ProfileIcon width={28} height={28} />
            <Text size="md" >Profile</Text>
          </Box>
        </Pressable>

        {/* Floating Record Button */}
        <Box className="relative top-[-16px]">
          <Pressable onPress={() => router.push(Paths.QRCodeScreen)}>
            <LinearGradient
              colors={["#B6FC00", "#55DB26"]}
              start={{ x: 0.17, y: 0.83 }}
              end={{ x: 0.83, y: 0.17 }}
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                alignItems: "center",
                justifyContent: "center",
              }}
              className="-mt-[25px] z-10"
            >
              <RecordingButtonIcon
                width={32}
                height={32}
                fill="#000"
                stroke="#000"
              />
            </LinearGradient>
          </Pressable>
        </Box>
      </HStack>
    </Box>
  );
}