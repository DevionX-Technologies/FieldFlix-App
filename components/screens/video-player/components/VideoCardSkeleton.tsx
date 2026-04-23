import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import React, { useEffect, useRef } from "react";
import { Animated } from "react-native";

export const VideoCardSkeleton: React.FC = () => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );

    shimmerAnimation.start();

    return () => {
      shimmerAnimation.stop();
    };
  }, [animatedValue]);

  const shimmerColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255, 255, 255, 0.1)", "rgba(255, 255, 255, 0.3)"],
  });

  const SkeletonBox: React.FC<{
    width: number | string;
    height: number;
    style?: any;
  }> = ({ width, height, style }) => (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: shimmerColor,
          borderRadius: 8,
        },
        style,
      ]}
    />
  );

  return (
    <VStack space="md" className="p-4">
      <HStack space="md" className="items-center">
        <SkeletonBox width="45%" height={120} />
        <VStack>
          <SkeletonBox width={150} height={16} style={{ marginBottom: 20 }} />
          <SkeletonBox width="60%" height={14} style={{ marginBottom: 10 }} />

          <SkeletonBox width="40%" height={14} />
        </VStack>
      </HStack>
    </VStack>
  );
};