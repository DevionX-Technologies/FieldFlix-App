import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { BASE_URL } from "@/data/constants";
import { Paths } from "@/data/paths";
import "@/global.css";
import { useCustomModal } from "@/hooks/useCustomModal";
import { store } from "@/store";
import { ThemeProvider } from "@/theme";
import { canUseReactNativeFirebase } from "@/utils/canUseReactNativeFirebase";
import { setupFcmTokenRefreshListener } from "@/utils/fcmTokenManager";
import { routeFromNotificationData } from "@/utils/notificationRouting";
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
import { Stack, usePathname, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import {
    AppState,
    BackHandler,
    Modal,
    Platform,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
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
 * Routes an FCM / notification payload to the right in-app screen.
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
  const { ModalComponent, showModal } = useCustomModal();
  const router = useRouter();
  const pathname = usePathname();
  const [exitConfirmVisible, setExitConfirmVisible] = useState(false);

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
        await Notifications.requestPermissionsAsync();
        const token = await SecureStore.getItemAsync("token");
        console.log("SecureStore token:", token);

        if (token) {
          setupFcmTokenRefreshListener();
        } else {
        }
      } catch (error) {}
    };
    void checkTokenAndSetupListener();
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
          const data: unknown =
            response?.notification?.request?.content?.data ?? {};
          routeFromNotificationData(data, router);
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
  }, [router]);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const onHardwareBackPress = () => {
      // Keep default back behavior throughout nested screens.
      // Only intercept at top-level destinations where Android would exit the app.
      const topLevelExitPaths = new Set([
        Paths.home,
        Paths.login,
        Paths.signup,
      ]);
      if (!topLevelExitPaths.has(pathname)) {
        return false;
      }

      setExitConfirmVisible(true);
      return true;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onHardwareBackPress,
    );

    return () => subscription.remove();
  }, [pathname]);

  useEffect(() => {
    const publicRoutes = new Set([
      Paths.root,
      Paths.login,
      Paths.signup,
      Paths.otp,
    ]);

    const isPublicRoute =
      publicRoutes.has(pathname) ||
      pathname.startsWith("/shared/media/") ||
      pathname.startsWith("/shared-recording/");

    const onAppStateChange = async (state: string) => {
      if (state !== "active") return;
      if (isPublicRoute) return;

      const token = await SecureStore.getItemAsync("token");
      if (!token) {
        router.replace(Paths.login);
      }
    };

    const subscription = AppState.addEventListener("change", onAppStateChange);
    return () => subscription.remove();
  }, [pathname, router]);

  return (
    <GluestackUIProvider mode="dark">
      <ReduxProvider store={store}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1, backgroundColor: "#000000" }}>
            <ThemeProvider>
              <StatusBar barStyle="light-content" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: Platform.select({
                    ios: "ios_from_right",
                    android: "simple_push",
                    default: "simple_push",
                  }),
                  animationDuration: Platform.select({
                    ios: 340,
                    android: 280,
                    default: 280,
                  }),
                  animationTypeForReplace: "push",
                  gestureEnabled: true,
                  fullScreenGestureEnabled: true,
                  animationMatchesGesture: true,
                  customAnimationOnGesture: true,
                  presentation: "card",
                  contentStyle: { backgroundColor: "#000000" },
                }}
              />
              <ModalComponent />
              <Modal
                transparent
                animationType="fade"
                visible={exitConfirmVisible}
                onRequestClose={() => setExitConfirmVisible(false)}
              >
                <View style={styles.confirmOverlay}>
                  <View style={styles.confirmCard}>
                    <Text style={styles.confirmTitle}>Exit App</Text>
                    <Text style={styles.confirmMessage}>
                      Are you sure you want to exit?
                    </Text>
                    <View style={styles.confirmActions}>
                      <Pressable
                        style={styles.confirmCancelBtn}
                        onPress={() => setExitConfirmVisible(false)}
                      >
                        <Text style={styles.confirmCancelText}>Cancel</Text>
                      </Pressable>
                      <Pressable
                        style={styles.confirmLogoutBtn}
                        onPress={() => {
                          setExitConfirmVisible(false);
                          BackHandler.exitApp();
                        }}
                      >
                        <Text style={styles.confirmLogoutText}>Exit</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </Modal>
            </ThemeProvider>
          </SafeAreaView>
        </GestureHandlerRootView>
      </ReduxProvider>
    </GluestackUIProvider>
  );
}

const styles = StyleSheet.create({
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(13,21,31,0.98)",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
  },
  confirmTitle: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  confirmMessage: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: "#94a3b8",
  },
  confirmActions: {
    marginTop: 18,
    flexDirection: "row",
    gap: 10,
  },
  confirmCancelBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmCancelText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  confirmLogoutBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(248,113,113,0.45)",
    backgroundColor: "rgba(127,29,29,0.38)",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmLogoutText: {
    fontSize: 14,
    color: "#FCA5A5",
    fontWeight: "700",
  },
});
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
