import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
export const registerPushNotifications = async (): Promise<string | null> => {
  if (!Device.isDevice) {
    console.warn("❌ Must use physical device for push notifications");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("❌ Notification permission not granted");
    return null;
  }
  const tokenData = await Notifications.getExpoPushTokenAsync();

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  return tokenData.data;
};
