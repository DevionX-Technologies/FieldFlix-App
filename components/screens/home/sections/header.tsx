import ArrowLeftIcon from "@/components/assets//icons/go-back-button.svg";
import {
  default as HeadPhoneIcon,
  default as PhoneIcon,
} from "@/components/assets/icons/headphone.svg";
import LocationIcon from "@/components/assets/icons/location.svg";
import NotificationIcon from "@/components/assets/icons/notification.svg";
import EmailIcon from "@/components/assets/icons/share-icon.svg";
import { Actionsheet, ActionsheetContent } from "@/components/ui/actionsheet";
import { Box } from "@/components/ui/box";
import { Divider } from "@/components/ui/divider";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { Paths } from "@/data/paths";
import { useResponsiveDesign } from "@/hooks/useResponsiveDesign";
import { useAppDispatch, useAppSelector } from "@/store";
import { fetchNotificationCount, setAddress } from "@/store/slices/home";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { goBack } from "expo-router/build/global-state/routing";
import React, { useEffect, useState } from "react";
import { Linking, Pressable, TouchableOpacity } from "react-native";
export interface HeaderProps {
  location: string | boolean;
  onChangeLocation?: () => void;
  onNotificationsPress?: () => void;
  onSupportPress?: () => void;
}

/**
 * A top header bar with location, change link, notification, support, and avatar.
 */
export const Header: React.FC<HeaderProps> = ({ location: showLocation }) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { font } = useResponsiveDesign();
  const { address, notificationCount } = useAppSelector((state) => state.home);
  
  function changeLocationHandler() {
    console.log("🔍 changeLocationHandler called - navigating to map screen");
    // Always navigate to the map screen - let the map screen handle location
    router.push(Paths.Location);
  }
  function onNotificationsPressHandler() {
    // @ts-ignore
    router.push(Paths.NotificationScreen);
  }

  const [showActionsheet, setShowActionsheet] = React.useState(false);
  const handleClose = () => setShowActionsheet(false);

  const [location, setLocation] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<any>(null);

  useEffect(() => {
    dispatch(fetchNotificationCount());
  }, []);

  // Debug: Log address changes
  useEffect(() => {
    console.log('📍 Header - Address updated:', address);
    if (address) {
      console.log('📍 Address keys:', Object.keys(address));
      console.log('📍 Street:', address.street);
      console.log('📍 Subregion:', address.subregion);
      console.log('📍 City:', address.city);
      console.log('📍 Name:', address.name);
    }
  }, [address]);


  useEffect(() => {
    if (
      !address ||
      Object.keys(address).length === 0 ||
      !location ||
      Object.keys(location).length === 0
    ) {
      fetchLocation();
    }
  }, [address, location]);

  const fetchLocation = async () => {
    try {
      console.log('📍 Requesting location permissions...');
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log('📍 Location permission denied');
        setErrorMsg("Permission to access location was denied");
        return;
      }

      console.log('📍 Getting current position...');
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
      console.log('📍 Current location:', loc.coords);

      console.log('📍 Reverse geocoding...');
      let reverseGeocode = await Location.reverseGeocodeAsync(loc.coords);
      console.log('📍 Reverse geocode result:', reverseGeocode);
      
      if (reverseGeocode.length > 0) {
        console.log('📍 Setting address to:', reverseGeocode[0]);
        dispatch(setAddress(reverseGeocode[0]));
      }
    } catch (error: any) {
      console.log('📍 Error fetching location:', error);
      setErrorMsg("Error fetching location: " + (error?.message || 'Unknown error'));
    }
  };

  return (
    <Box
      className={`w-full flex flex-row items-center justify-between ${
        showLocation ? "py-5" : "py-6"
      } px-4`}
    >
      {/* Left: Location */}
      {showLocation ? (
        <TouchableOpacity 
          onPress={changeLocationHandler}
          style={{
            flex: 1,
            paddingVertical: 4,
            paddingHorizontal: 4,
          }}
          activeOpacity={0.7}
        >
          <HStack space="sm" className="items-center">
            <LocationIcon width={24} height={24} />
            <VStack>
              {(address?.street || address?.subregion || address?.city || address?.name) && (
                <Text style={{ fontSize: font.xl }} bold>
                  {address?.street || address?.subregion || address?.city || address?.name || ""}
                </Text>
              )}

              <Text className="text-app-baseColor" style={{ fontSize: font.sm }}>
                Explore nearby venues
              </Text>
            </VStack>
          </HStack>
        </TouchableOpacity>
      ) : (
        <Pressable onPress={goBack}>
          <HStack space="sm" className="items-center">
            <ArrowLeftIcon width={24} height={24} />
          </HStack>
        </Pressable>
      )}

      {/* Right: Actions */}
      <HStack space="xl" className="items-center">
        <Pressable onPress={onNotificationsPressHandler}>
          <Box className="relative">
            <NotificationIcon width={24} height={24} />

            {notificationCount === 0 ? (
                 <Box className="absolute top-0 right-0  h-2 bg-success-500 rounded-full" />
            ) : (
              <Box className="absolute -top-1 -right-1 bg-success-500 rounded-full min-w-[18px] h-[18px] px-1 items-center justify-center">
                <Text className="text-white text-xs font-bold">
                  {notificationCount > 99 ? "99+" : notificationCount}
                </Text>
              </Box>
            )}
          </Box>
        </Pressable>

        <Pressable onPress={() => setShowActionsheet(!showActionsheet)}>
          <HeadPhoneIcon width={24} height={24} />
        </Pressable>
      </HStack>

      <Actionsheet isOpen={showActionsheet} onClose={handleClose}>
        <ActionsheetContent
          className=""
          style={{ backgroundColor: "white", borderRadius: 0, padding: 30 }}
        >
          <VStack className="pt-4">
            <HStack space="lg">
              <PhoneIcon />
              <Pressable onPress={() => Linking.openURL("tel:+917977113822")}>
                <Text size="xl" style={{ fontWeight: "bold", color: "black" }}>
                  +91 7021970138
                </Text>
              </Pressable>
            </HStack>
            <Divider style={{ marginVertical: 10 }} />
            <Pressable
              onPress={() => Linking.openURL("mailto:admin@fieldflicks.com")}
            >
              <HStack space="lg">
                <EmailIcon />
                <Text size="xl" style={{ fontWeight: "bold", color: "black" }}>
                  admin@fieldflicks.com
                </Text>
              </HStack>
            </Pressable>
          </VStack>
        </ActionsheetContent>
      </Actionsheet>
    </Box>
  );
};

export default Header;
