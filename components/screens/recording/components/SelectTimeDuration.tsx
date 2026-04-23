// src/components/SelectTimeDuration.tsx

import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { useNavigation } from "expo-router";
import React from "react";
import { Pressable } from "react-native";
export interface SelectTimeDurationProps {
  durations: number[];
  onSelectDuration: (duration: number) => void;
  selectedDuration: number;
}

const SelectTimeDuration: React.FC<SelectTimeDurationProps> = ({
  durations,
  onSelectDuration,
  selectedDuration,
}) => {
    const navigation =
      useNavigation();
  return (
    <Box className="bg-app-cardBackgroundColor rounded-lg pt-7 pb-8 justify-center items-center">

      <Text size="xl" bold className="mb-4">
        Time Duration
      </Text>

      <Box className="flex-row flex-wrap justify-center">
        {durations.map((duration, index) => {
          const isSelected = selectedDuration === duration;
          return (
            <Pressable
              key={duration}
              onPress={() => onSelectDuration(duration)}
              style={{
                width: "30%",
              }}
            >
              <Box
                className={[
                  "px-4 py-2 rounded-lg border m-1 bg-app-baseColor flex items-center justify-center",
                  isSelected
                    ? "border-success-500  bg-app-baseColor"
                    : "border-border-300 bg-app-cardBackgroundColor",
                ].join(" ")}
                style={{ borderColor: isSelected ? "#55DB26" : "white" }}
              >
                <Text
                  size="md"
                  className={isSelected ? "font-bold text-black" : ""}
                >
                  {duration >= 60
                    ? `${(duration / 60).toFixed(1).replace(/\.0$/, "")} hr${
                        duration >= 120 ? "s" : ""
                      }`
                    : `${duration} min`}
                </Text>
              </Box>
            </Pressable>
          );
        })}
      </Box>
    </Box>
  );
};

export default SelectTimeDuration;
