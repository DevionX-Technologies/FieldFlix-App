import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type HomeHeaderProps = {
  locationLabel?: string;
  cityName?: string;
  notificationCount?: number;
};

const HomeHeader = ({
  locationLabel = 'Your Location',
  cityName = 'Mumbai, India',
  notificationCount = 0,
}: HomeHeaderProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <View style={styles.leftSection}>
        <View style={styles.locationRow}>
          <Ionicons name="navigate" size={14} color="#00C853" />
          <Text style={styles.locationLabel}>{locationLabel}</Text>
        </View>
        <Text style={styles.cityName} numberOfLines={1}>
          {cityName}
        </Text>
      </View>

      <View style={styles.rightSection}>
        <TouchableOpacity activeOpacity={0.7} style={styles.iconButton}>
          <View style={styles.bellWrap}>
            <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
            {notificationCount > 0 ? <View style={styles.badgeDot} /> : null}
          </View>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7} style={styles.iconButton}>
          <Ionicons name="person-circle-outline" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flex: 1,
    justifyContent: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  locationLabel: {
    fontSize: 11,
    lineHeight: 14,
    color: '#888888',
    fontWeight: '400',
  },
  cityName: {
    fontSize: 16,
    lineHeight: 22,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginLeft: 16,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellWrap: {
    position: 'relative',
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
});

export default HomeHeader;
