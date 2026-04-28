import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { BASE_URL } from "@/data/constants";
import "@/global.css";
import { useCustomModal } from "@/hooks/useCustomModal";
import { store } from "@/store";
import { ThemeProvider } from "@/theme";
import { canUseReactNativeFirebase } from "@/utils/canUseReactNativeFirebase";
import { setupFcmTokenRefreshListener } from "@/utils/fcmTokenManager";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_800ExtraBold_Italic,
  useFonts,
} from "@expo-google-fonts/inter";
import Entypo from "@expo/vector-icons/Entypo";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Font from "expo-font";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { Slot, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Provider as ReduxProvider } from "react-redux";
SplashScreen.preventAutoHideAsync();

if (typeof __DEV__ !== "undefined" && __DEV__) {
  // Check Metro/Logcat: must match a URL your phone can open (firewall, same LAN, or adb reverse)
  // eslint-disable-next-line no-console
  console.log(`[FieldFlicks] API BASE_URL: ${BASE_URL}`);
}

/**
 * Routes an FCM payload to the right in-app screen. Supports
 * `RECORDING_COMPLETE` taps which deep-link to the per-recording highlights view.
 */
function handleFcmTap(
  remoteMessage: any,
  router: { push: (h: any) => void },
): void {
  try {
    const data = remoteMessage?.data ?? {};
    const action = String(
      data?.click_action ?? data?.notification_type ?? "",
    ).toUpperCase();
    if (action === "RECORDING_COMPLETE") {
      const recordingId =
        data?.recordingId ?? data?.recording_id ?? data?.id ?? null;
      if (recordingId) {
        router.push({
          pathname: "/highlights/[id]",
          params: { id: String(recordingId) },
        });
      } else {
        router.push("/recordings");
      }
    }
  } catch (err) {
    console.warn("Failed to route FCM tap:", err);
  }
}

type FirebaseMessagingModule = {
  (): {
    onMessage: (cb: (remoteMessage: any) => void) => () => void;
    getInitialNotification: () => Promise<any>;
    onNotificationOpenedApp: (cb: (remoteMessage: any) => void) => () => void;
    setBackgroundMessageHandler: (
      cb: (remoteMessage: any) => Promise<void>,
    ) => void;
  };
};

const canUseExpoNotificationsInCurrentRuntime =
  Constants.appOwnership !== "expo" &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

if (canUseExpoNotificationsInCurrentRuntime) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
export default function RootLayout() {
  const { showModal, ModalComponent } = useCustomModal();
  const router = useRouter();

  const [interLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_800ExtraBold_Italic,
  });

  // Startup routing is handled by `app/index` (splash) → /home or /login

  useEffect(() => {
    const checkTokenAndSetupListener = async () => {
      try {
        const token = await SecureStore.getItemAsync("token");
        console.log("SecureStore token:", token);

        if (token) {
          setupFcmTokenRefreshListener();
        } else {
        }
      } catch (error) {}
    };
    checkTokenAndSetupListener();
  }, []);

  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (!canUseExpoNotificationsInCurrentRuntime) {
      return;
    }

    // Foreground notification
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("🔔 Notification Received:", notification);
      });

    // When user taps notification (Expo / FCM payload).
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("📲 Notification Response:", response);
        try {
          const data: any =
            response?.notification?.request?.content?.data ?? {};
          const action = String(
            data?.click_action ?? data?.notification_type ?? "",
          ).toUpperCase();
          if (action === "RECORDING_COMPLETE") {
            const recordingId =
              data?.recordingId ?? data?.recording_id ?? data?.id ?? null;
            if (recordingId) {
              router.push({
                pathname: "/highlights/[id]",
                params: { id: String(recordingId) },
              });
            } else {
              router.push("/recordings");
            }
          }
        } catch (err) {
          console.warn("Failed to route notification tap:", err);
        }
      });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(
          notificationListener.current,
        );
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  // notification commented
  // useEffect(() => {
  //   registerForPushNotificationsAsync().then((token) => {
  //     console.log("Expo Push Token:", token);
  //     setExpoPushToken(token);
  //   });

  //   // Foreground notification
  //   notificationListener.current =
  //     Notifications.addNotificationReceivedListener((notification) => {
  //       console.log("Notification Received in foreground:", notification);
  //     });

  //   // When user taps the notification
  //   responseListener.current =
  //     Notifications.addNotificationResponseReceivedListener((response) => {
  //       console.log("Notification tapped:", response);
  //     });

  //   return () => {
  //     Notifications.removeNotificationSubscription(
  //       notificationListener.current
  //     );
  //     Notifications.removeNotificationSubscription(responseListener.current);
  //   };
  // }, []);

  useEffect(() => {
    async function prepare() {
      try {
        await Font.loadAsync(Entypo.font);
      } catch (e) {
        console.warn(e);
      }
      if (interLoaded) {
        await SplashScreen.hideAsync();
      }
    }

    void prepare();
  }, [interLoaded]);

  // Deep link handling
  useEffect(() => {
    const handleDeepLink = (url: string) => {
      console.log("Deep link received:", url);

      // New shared-media link format used by createShareLink/APP_BASE_URL.
      // Matches both `fieldflicks://shared/media/<token>` and
      // `https://fieldflix.app/shared/media/<token>` (from APP_BASE_URL).
      const sharedMediaMatch = url.match(/shared\/media\/([^?&/]+)/);
      if (sharedMediaMatch) {
        const token = sharedMediaMatch[1];
        router.push({
          pathname: "/shared/media/[token]",
          params: { token },
        });
        return;
      }

      // Legacy in-app share path — keep for backwards compatibility.
      if (url.includes("shared-recording")) {
        const recordingIdMatch = url.match(/shared-recording\/([^?&]+)/);
        if (recordingIdMatch) {
          const recordingId = recordingIdMatch[1];
          router.push({
            pathname: "/shared-recording/[recordingId]",
            params: { recordingId },
          });
        }
      }
    };

    // Handle initial URL when app is opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Handle subsequent deep links when app is already running
    const subscription = Linking.addEventListener("url", (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription?.remove();
    };
  }, [router]);

  useEffect(() => {
    if (!canUseReactNativeFirebase()) {
      return;
    }
    let messaging: FirebaseMessagingModule;
    try {
      messaging = require("@react-native-firebase/messaging")
        .default as FirebaseMessagingModule;
    } catch (e) {
      console.warn("Firebase messaging module unavailable:", e);
      return;
    }
    const unsubs: (() => void)[] = [];
    try {
      unsubs.push(
        messaging().onMessage(async (remoteMessage) => {
          showModal(
            "info",
            remoteMessage.notification?.title ?? "",
            remoteMessage.notification?.body ?? "",
          );
        }),
      );

      // Cold-start: app opened by tapping a notification.
      try {
        messaging()
          .getInitialNotification()
          .then((remoteMessage) => {
            if (remoteMessage) handleFcmTap(remoteMessage, router);
          })
          .catch(() => {});
      } catch {
        // ignore
      }

      // Foreground/background tap.
      try {
        unsubs.push(
          messaging().onNotificationOpenedApp((remoteMessage) =>
            handleFcmTap(remoteMessage, router),
          ),
        );
      } catch {
        // ignore
      }

      messaging().setBackgroundMessageHandler(async (remoteMessage) => {
        console.log("Background message:", remoteMessage);
      });
    } catch (e) {
      console.warn("Firebase messaging not initialized:", e);
    }
    return () => unsubs.forEach((u) => u?.());
  }, [showModal, router]);

  return (
    <GluestackUIProvider mode="dark">
      <ReduxProvider store={store}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1, backgroundColor: "#000000" }}>
            <ThemeProvider>
              <StatusBar barStyle="light-content" />
              <Slot />
              <ModalComponent />
            </ThemeProvider>
          </SafeAreaView>
        </GestureHandlerRootView>
      </ReduxProvider>
    </GluestackUIProvider>
  );
}

// async function registerForPushNotificationsAsync() {
//   let token;
//   if (Constants.isDevice) {
//     const { status: existingStatus } = await Notifications.getPermissionsAsync();
//     let finalStatus = existingStatus;

//     if (existingStatus !== 'granted') {
//       const { status } = await Notifications.requestPermissionsAsync();
//       finalStatus = status;
//     }

//     if (finalStatus !== 'granted') {
//       // alert('Failed to get push token for push notification!');
//       return;
//     }

//     token = (await Notifications.getExpoPushTokenAsync()).data;
//   } else {
//     // alert('Must use physical device for Push Notifications');
//   }

//   if (Platform.OS === 'android') {
//     await Notifications.setNotificationChannelAsync('default', {
//       name: 'default',
//       importance: Notifications.AndroidImportance.MAX,
//       vibrationPattern: [0, 250, 250, 250],
//       lightColor: '#FF231F7C',
//     });
//   }

//   return token;
// }
