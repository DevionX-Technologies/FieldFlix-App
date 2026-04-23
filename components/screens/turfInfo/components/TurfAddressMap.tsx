import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface Props {
  location: { type: string; coordinates: [number, number] };
  address: string;
  phone: string;
}

export default function TurfAddressMap({ location, address, phone }: Props) {
  return (
    <VStack space="md" className="px-4 py-6">
      <Text size="2xl" bold>Address</Text>
      <HStack className="justify-between bg-app-cardBackgroundColor rounded-xl p-4">
        <VStack space="xs" className="w-[60%] mt-2">
          <Text size="md" className="text-app-secondaryColor">{address}</Text>
          <Text size="md" className="mt-2">📞 {phone}</Text>
        </VStack>
        <Box style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: location.coordinates[0],
              longitude: location.coordinates[1],
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            <Marker
              coordinate={{
                latitude: location.coordinates[0],
                longitude: location.coordinates[1],
              }}
            />
          </MapView>
        </Box>
      </HStack>
    </VStack>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    width: '35%',
    height: SCREEN_HEIGHT * 0.15,
    borderRadius: 16,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
});