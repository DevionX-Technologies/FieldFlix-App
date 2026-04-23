import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { Paths } from "@/data/paths";
import { useRouter } from "expo-router";
import React from "react";
import { Dimensions, Image, Pressable, ScrollView, ViewStyle } from "react-native";


const screenWidth = Dimensions.get("window").width;

export interface Turf {
  image: any;
  name: string;
  location: string;
  description: string;
}

interface CardCarouselProps {
  items: Turf[];
  cardWidth?: number;
  cardMarginRight?: number;
  imageHeight?: number;
}

export const CardCarousel: React.FC<CardCarouselProps> = ({
  items,
  cardWidth = screenWidth * 0.5,
  cardMarginRight = 16,
  imageHeight = screenWidth * 0.3,
}) => {
  const router = useRouter();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 0 }}
    >
      {items.map((turf, index) => {
        const cleanedTurf = {
          ...turf,
          amenitiesList: turf.amenitiesList?.map(({ active, key, label,iconKey }) => ({ active, key, label,iconKey })),
        };

        return (
          <Pressable
            onPress={() => {
              router.push({
                pathname: Paths.TurfDetailsScreen,
                params: {
                  turf: JSON.stringify(cleanedTurf),
                },
              });
            }}
            key={index}
          >
            <Card
              key={index}
              size="lg"
              className="bg-app-cardBackgroundColor p-2"
              style={
                {
                  width: cardWidth,
                  height: 240, // Slightly increased height to accommodate text
                  marginRight: cardMarginRight,
                  borderRadius: 10,
                } as ViewStyle
              }
            >
              <VStack className="flex-1 justify-between">
                <Image
                  source={turf.image}
                  resizeMode="cover"
                  style={{
                    width: "100%",
                    height: imageHeight,
                    borderRadius: 10,
                  }}
                />
                <VStack className="pl-2 pr-2 pt-2 pb-2 flex-1">
                  <Heading size="md" className="mb-1" numberOfLines={2} ellipsizeMode="tail">
                    {turf.name}
                  </Heading>
                  <Heading size="sm" className="mb-2 text-app-secondaryColor" numberOfLines={1} ellipsizeMode="tail">
                    {turf.location}
                  </Heading>
                  <Text size="sm" className="text-app-secondaryColor flex-1" numberOfLines={2} ellipsizeMode="tail">
                    {turf.description}
                  </Text>
                </VStack>
              </VStack>
            </Card>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

export default CardCarousel;
