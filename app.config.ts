import { ExpoConfig } from 'expo/config';

/** Matches `extra.eas.projectId` — EAS Update (OTA) manifest host. */
const EAS_PROJECT_ID = "841b5004-b805-4954-bb29-65fa21eace8e";

/** Keep in sync across `version`, bare `ios`/Android native update config, and `eas update`. Bare workflow requires a string (no `policy`). */
const APP_VERSION = "1.1.9";

const config: ExpoConfig = {
  name: "FieldFlicks",
  slug: "fieldflicks-mobile-latest",
  version: APP_VERSION,
  runtimeVersion: APP_VERSION,
  updates: {
    enabled: true,
    checkAutomatically: "ON_LOAD",
    fallbackToCacheTimeout: 0,
    url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
  },
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "fieldflicks",
  userInterfaceStyle: "automatic",
  newArchEnabled: false,  // Disable New Architecture due to react-native-razorpay incompatibility
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.fieldflicks",
    googleServicesFile: "./GoogleService-Info.plist",
    usesAppleSignIn: true,
    infoPlist: {
      GMSApiKey: "AIzaSyCr-EoENqIoMq9ftiQKsuNUpWNUEHtM0d4",
      NSCameraUsageDescription: "FieldFlicks needs access to your camera so you can scan QR codes and capture photos directly in the app.",
      NSMicrophoneUsageDescription: "FieldFlicks needs access to your microphone so you can record audio when capturing videos.",
      NSPhotoLibraryUsageDescription: "FieldFlicks needs access to your photo library so you can upload a profile picture and share images from your device.",
      NSPhotoLibraryAddUsageDescription: "FieldFlicks needs permission to save photos and videos to your library after you capture or edit them.",
      NSLocationWhenInUseUsageDescription: "FieldFlicks uses your location to show your city on the home screen and list nearby sports arenas.",
      NSLocationAlwaysAndWhenInUseUsageDescription: "FieldFlicks may need continuous location access to support background location features.",
      NSContactsUsageDescription: "FieldFlicks can access your contacts so you can invite friends and share content easily.",
      NSCalendarsUsageDescription: "FieldFlicks can access your calendar to help schedule and manage important events.",
      NSRemindersUsageDescription: "FieldFlicks can access your reminders so you can track and manage tasks directly from the app.",
      NSBluetoothAlwaysUsageDescription: "FieldFlicks may use Bluetooth to connect with nearby devices for sharing or syncing features.",
      NSMotionUsageDescription: "FieldFlicks may use motion and fitness data to enhance activity tracking features."
    },
    buildNumber: "13"
  },
  android: {
    softwareKeyboardLayoutMode: "resize",
    adaptiveIcon: {
      foregroundImage: "./assets/images/icon.png",
      backgroundColor: "#ffffff"
    },
    edgeToEdgeEnabled: true,
    permissions: [
      "android.permission.CAMERA",
      "android.permission.RECORD_AUDIO",
      "com.google.android.gms.permission.AD_ID"
    ],
    package: "com.fieldflicks",
    googleServicesFile: "./google-services.json",
    versionCode: 40,
    usesCleartextTraffic: true,
    config: {
      googleMaps: {
        apiKey: "AIzaSyCr-EoENqIoMq9ftiQKsuNUpWNUEHtM0d4"
      }
    }
  },
  splash: {
    image: "./assets/images/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png"
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff"
      }
    ],
    [
      "expo-camera",
      {
        cameraPermission: "Allow $(PRODUCT_NAME) to access your camera",
        microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone",
        recordAudioAndroid: true
      }
    ],
    "@react-native-firebase/app",
    "@react-native-firebase/auth", 
    "@react-native-firebase/messaging",
    // "@react-native-firebase/crashlytics", // Temporarily disabled for development
    [
      "expo-build-properties",
      {
        ios: {
          /** Required for @react-native-firebase on iOS; keep in sync with `ios/Podfile.properties.json`. */
          useFrameworks: "static",
        },
        android: {
          enableHermes: false, // Disable Hermes temporarily
          // Required for http://<LAN-IP>:8000 — default manifest omits cleartext without this.
          usesCleartextTraffic: true,
        }
      }
    ],
    // "./plugins/withFirebaseGradle.android.js", // Temporarily disabled for development
    [
      "expo-video",
      {
        supportsBackgroundPlayback: true,
        supportsPictureInPicture: true
      }
    ],
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission: "Allow $(PRODUCT_NAME) to use your location."
      }
    ],
    "expo-mail-composer",
    "expo-secure-store",
    [
      "@react-native-google-signin/google-signin"
    ],
    "expo-apple-authentication",
    "expo-web-browser",
    // Our custom Razorpay plugin
    [
      "./plugins/withRazorpay.js",
      {
        merchantId: "RQbGJa98EUfITd"
      }
    ]
  ],
  experiments: {
    typedRoutes: true
  },
  extra: {
    router: {},
    eas: {
      projectId: EAS_PROJECT_ID,
    },
  },
};

module.exports = config;