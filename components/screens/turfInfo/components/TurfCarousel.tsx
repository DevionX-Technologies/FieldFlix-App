// src/components/turf/TurfCarousel.tsx

import React, { useRef } from 'react';
import { Dimensions, Image, ImageSourcePropType, StyleSheet, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import Carousel, { ICarouselInstance, Pagination } from 'react-native-reanimated-carousel';

const { width } = Dimensions.get('window');

interface Props {
  /** Can be an array of remote URLs (string) or local assets (require() => number) */
  images?: (string | ImageSourcePropType)[];
  /** Fallback local assets if `images` is empty */
  fallbackAssets?: ImageSourcePropType[];
}

export default function TurfCarousel({ images = [], fallbackAssets = [] }: Props) {
  // Use `images` if provided, otherwise fall back to local assets
  const data = images.length > 0 ? images : fallbackAssets;
  const carouselRef = useRef<ICarouselInstance>(null);
  const progress    = useSharedValue(0);

  // Keep items that are either a string (URI) or a local asset (number/object)
  const filteredData = data.filter(
    (item): item is string | ImageSourcePropType => 
      typeof item === 'string' || typeof item === 'number'
  );

  return (
    <View className="mt-4">
      <Carousel
        ref={carouselRef}
        loop
        width={width}
        height={width * 0.6}
        data={filteredData}
        onProgressChange={progress}
        renderItem={({ item }) => {
          // If it's a string, treat it as { uri: string }. Otherwise it's a local asset.
          const source = typeof item === 'string' 
            ? { uri: item } 
            : (item as ImageSourcePropType);

          return (
            <Image
              source={source}
              style={styles.image}
              resizeMode="cover"
            />
          );
        }}
      />
      <Pagination.Basic
        progress={progress}
        data={filteredData}
        size={16}
        dotStyle={styles.dot}
        activeDotStyle={styles.activeDot}
        containerStyle={styles.pagination}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', height: '100%' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  pagination: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
});