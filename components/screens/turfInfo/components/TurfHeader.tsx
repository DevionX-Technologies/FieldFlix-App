import HomeIcon from '@/components/assets/icons/backicon.svg';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import React from 'react';
import { Pressable, View } from 'react-native';

interface Props {
  name: string;
  onBack: () => void;
}

export default function TurfHeader({ name, onBack }: Props) {
  return (
    <HStack className="items-center justify-between px-4 py-3 bg-app-headerBackgroundColor">
      <Pressable onPress={onBack}>
        <HomeIcon width={24} height={24} fill="#fff" />
      </Pressable>
      <Text size="xl" bold className="mt-2">
        {name}
      </Text>
      <View style={{ width: 24 }} />
    </HStack>
  );
}