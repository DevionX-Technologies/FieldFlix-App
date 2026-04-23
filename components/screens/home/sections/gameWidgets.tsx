import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useAppDispatch, useAppSelector } from "@/store";
import { setActiveSports } from "@/store/slices/home";
import React from "react";
import { Image, Pressable, ScrollView } from "react-native";
export const GameWidgets: React.FC = ({}) => {
  const { activeSport } = useAppSelector((state) => state.home);
  const dispatch = useAppDispatch();
  const isActive = (sport: string) => activeSport === sport;

  const getBoxStyle = (sport: string) => {
    return {
      position: "absolute",
      width: 90,
      height: 60,
      top: 35,
      borderRadius: 10,
      zIndex: 0,
      backgroundColor: isActive(sport) ? "rgba(27,30,44,1)" : "transparent",
      borderRightWidth: isActive(sport) ? 1 : 2,
      borderBottomWidth: isActive(sport) ? 1 : 2,
      borderLeftWidth: isActive(sport) ? 0 : 2,
      borderColor: isActive(sport)
        ? "rgba(85, 219, 38, 1)"
        : "rgba(27,30,44,1)",
    };
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Box>
        <HStack space="2xl">
          <Pressable onPress={() => dispatch(setActiveSports("Pickle"))}>
            <Box>
              <Box style={getBoxStyle("Pickle")} />
              <VStack className="items-center">
                <Image
                  source={require("@/components/assets/icons/widgets/pickle-ball.png")}
                  style={{ width: 90, height: 95, borderRadius: 8 }}
                  resizeMode="contain"
                />
                <Text
                  size="md"
                  style={{ position: "relative", top: -28 }}
                  color="white"
                >
                  Pickleball
                </Text>
              </VStack>
            </Box>
          </Pressable>
          {/* Paddle */}
          <Pressable onPress={() => dispatch(setActiveSports("Paddle"))}>
            <Box>
              <Box style={getBoxStyle("Paddle")} />
              <VStack className="items-center">
                 <Image
                  source={require("@/components/assets/icons/widgets/paddle-ball.png")}
                  style={{ width: 90, height: 95, borderRadius: 8 }}
                  resizeMode="contain"
                />
                <Text style={{ position: "relative", top: -28 }} size="md">
                  Padel
                </Text>
              </VStack>
            </Box>
          </Pressable>
        </HStack>
      </Box>
    </ScrollView>
  );
};

export default GameWidgets;
