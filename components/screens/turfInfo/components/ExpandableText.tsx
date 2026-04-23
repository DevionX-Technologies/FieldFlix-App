import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import React, { useCallback, useState } from 'react';
import { LayoutAnimation, Platform, Pressable, TextProps, UIManager } from 'react-native';

interface ExpandableTextProps extends TextProps {
  children: string;
  numberOfLines?: number;
}

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

/**
 * A reusable expandable text component.
 * Only requires the text as children and optional numberOfLines.
 */
const ExpandableText: React.FC<ExpandableTextProps> = ({
  children,
  numberOfLines = 3,
  ...textProps
}) => {
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => !prev);
  }, []);

  return (
    <Box>
      <Text
        {...textProps}
        numberOfLines={expanded ? undefined : numberOfLines}
        size="md"
        className="text-app-secondaryColor"
      >
        {children}
      </Text>
      <Pressable onPress={toggleExpanded}>
        <Text size="sm" className="text-primary-500 mt-1">
          {expanded ? 'Read less' : 'Read more'}
        </Text>
      </Pressable>
    </Box>
  );
};

export default ExpandableText;
