import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import React from 'react';
import ExpandableText from './ExpandableText';

interface Props {
  text: string;
}

export default function TurfDescription({ text }: Props) {
  return (
    <VStack space="md" className="px-4 py-6">
      <Text size="2xl" bold>Description</Text>
      <ExpandableText numberOfLines={2}>
        {text}
      </ExpandableText>
    </VStack>
  );
}