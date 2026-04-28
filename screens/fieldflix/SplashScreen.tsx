import { Paths } from "@/data/paths";
import { WebShell } from "@/screens/fieldflix/WebShell";
import { WEB } from "@/screens/fieldflix/webDesign";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect } from "react";
import { Image, View } from "react-native";

const WORD_LOGO = require("@/assets/fieldflix-web/fieldflix_word_logo.jpeg");

/** Mirrors `web/src/screens/SplashScreen.tsx` — centered wordmark on black, 402px column. */
export default function FieldflixSplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(async () => {
      const token = await SecureStore.getItemAsync("token");
      if (token) {
        router.replace(Paths.home);
      } else {
        router.replace(Paths.login);
      }
    }, 2500);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <WebShell backgroundColor={WEB.splashBg}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Image
          source={WORD_LOGO}
          resizeMode="contain"
          style={{ width: "90%", maxWidth: 360, height: 76 }}
          accessibilityLabel="FieldFlix"
        />
      </View>
    </WebShell>
  );
}
