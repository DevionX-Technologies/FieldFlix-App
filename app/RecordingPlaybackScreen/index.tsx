import { SharedRecordingsTab } from "@/components/screens/video-player/components";
import MyRecordingsTab from "@/components/screens/video-player/components/MyRecordingsTab";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { useResponsiveDesign } from "@/hooks/useResponsiveDesign";
import { useSharedRecordings } from "@/hooks/useSharedRecordings";
import { useAppSelector } from "@/store";
import { Ionicons } from "@expo/vector-icons";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { TouchableOpacity } from "react-native";
const Tab = createMaterialTopTabNavigator();

export default function RecordingPlaybackScreen() {
  const { font } = useResponsiveDesign();
  const { recordings } = useAppSelector((state) => state.recording);
  const { sharedRecordings } = useSharedRecordings();
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();

  const handleBackPress = () => {
    router.back();
  };

  return (
    <Box className="pt-10" style={{ flex: 1, backgroundColor: "#0C0C11" }}>
      <Box className="flex-row items-center mb-4 pl-3">
        <TouchableOpacity
          onPress={handleBackPress}
          className="mr-3 p-2"
          style={{ marginLeft: -8 }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={{ fontSize: font.xxxl }} className="text-bold text-white">
          Recordings
        </Text>
      </Box>
      <Tab.Navigator
        initialRouteName={tab === 'shared' ? 'Shared Recordings' : 'My Recordings'}
        screenOptions={{
          tabBarStyle: { backgroundColor: "#0C0C11" },
          tabBarIndicatorStyle: { backgroundColor: "rgb(85,219,38)" },
          tabBarLabelStyle: { color: "#fff", fontWeight: "bold" },
        }}
      >
        <Tab.Screen
          name="My Recordings"
          component={MyRecordingsTab}
          options={{
            tabBarLabel: `My Recordings (${recordings?.length || 0})`,
          }}
        />
        <Tab.Screen
          name="Shared Recordings"
          component={SharedRecordingsTab}
          options={{
            tabBarLabel: `Shared Recordings (${sharedRecordings?.length || 0})`,
          }}
        />
      </Tab.Navigator>
    </Box>
  );
}
