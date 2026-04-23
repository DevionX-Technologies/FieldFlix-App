import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import React from "react";
import { ChipItem, ChipList } from "./ChipList";

interface Props {
  items: ChipItem[];
}

export default function TurfAmenities({ items }: Props) {
  return (
    <VStack space="md" className="px-4 py-6">
      <Text size="2xl" bold>
        Amenities
      </Text>
      <ChipList items={items} />
    </VStack>
  );
}
