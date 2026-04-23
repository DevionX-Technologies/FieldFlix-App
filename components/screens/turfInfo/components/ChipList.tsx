// src/components/ui/ChipList.tsx

import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { ClockIcon, TurfIcon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import React from 'react';
import { Pressable } from 'react-native';

export interface ChipItem {
  key: string;
  label: string;
  icon: React.ReactElement;     // e.g. <ClockIcon />
  active?: boolean;             // green border/text when true
  onPress?: () => void;   
  iconKey?: string;      // optional tap handler
}

interface ChipListProps {
  items: ChipItem[];
}


const iconMap: Record<string, React.ElementType> = {
  clock: ClockIcon,
  turf: TurfIcon,
  // Add more mappings here
};
/**
 * Renders a wrap-layout of pill-shaped “chips” with icon + label.
 * Active chips get a green border/text; inactive chips are white/outline.
 */
export const ChipList: React.FC<ChipListProps> = ({ items }) => {
  return (
    <Box className="flex flex-row flex-wrap">
      {items?.map((item) => {
        const Container: any = item.onPress ? Pressable : Box;
        const borderColor = item.active ? 'border-success-500' : 'border-typography-50';
        const borderWidth = item.active ? 'border-2' : 'border';

        // Resolve icon component from map
        const IconComponent = item.iconKey ? iconMap[item.iconKey] : null;

        console.log("IconComponent ", IconComponent)
        console.log("item ", item)

        return (
          <Container
            key={item.key}
            onPress={item.onPress}
            className={`mr-2 mb-2 rounded-full px-4 py-2 ${borderWidth} ${borderColor}`}
          >
            <HStack space="xs" className="items-center">
              {IconComponent && (
                <IconComponent
                  width={16}
                  height={16}
                  fill={item.active ? '#B6FC00' : '#FFFFFF'}
                />
              )}
              <Text size="sm" className="text-app-baseColor">
                {item.label}
              </Text>
            </HStack>
          </Container>
        );
      })}
    </Box>
  );
};
export default ChipList;

// const iconMap = {
//   "clock": ClockIcon,
//   "turf":TurfIcon
//   // Add more mappings if needed
// };