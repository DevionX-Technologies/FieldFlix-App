import { GOOGLE_WEB_CLIENT_ID } from "@/data/constants";
import { Paths } from "@/data/paths";
import { useAppDispatch } from "@/store";
import { IUserSchema, setUserInRedux } from "@/store/slices/user";
import axiosInstance from "@/utils/axiosInstance";
import { requestAndRegisterFcmToken } from "@/utils/fcmTokenManager";
import {
  GoogleSignin,
  statusCodes,
  User,
} from "@react-native-google-signin/google-signin";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useState } from "react";
import { auth } from "../firebase";
interface UseGoogleSignInResult {
  loading: boolean;
  error: Error | null;
  user: User | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export function useGoogleSignIn(): UseGoogleSignInResult {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const dispatch = useAppDispatch();
  const router = useRouter();
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });
  }, []);

  // 2️⃣ Sign‐in function
  const signIn = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Always sign out first so that any previous session is cleared
      await GoogleSignin.signOut();

      const { data, type } = await GoogleSignin.signIn();
      if (type !== "success") {
        throw new Error("Google Sign-In was not successful");
      }

      const { idToken, user: googleUser } = data;
      if (!idToken) {
        throw new Error("No ID token returned by Google Sign-In");
      }

      // Use axiosInstance instead of raw axios
      const response = await axiosInstance.post<IUserSchema>(
        `/auth/google/mobile-login`,
        { idToken }
      );

      const userData = response.data;

      dispatch(setUserInRedux(userData));
      await SecureStore.setItemAsync("token", userData.token);

      // Firebase auth with Google credentials
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      await auth().signInWithCredential(googleCredential);

      await requestAndRegisterFcmToken();

      // Set user locally
      setUser({
        id: googleUser.id,
        name: googleUser.name,
        email: googleUser.email,
        photo: googleUser.photo,
        familyName: googleUser.familyName,
        givenName: googleUser.givenName,
      } as unknown as User);
    } catch (err: any) {
      if (
        err.code === statusCodes.SIGN_IN_CANCELLED ||
        err.code === statusCodes.IN_PROGRESS
      ) {
        // User cancelled or operation in progress—silently ignore
      } else {
        setError(err);
        console.error(
          "Google sign-in error:",
          err.response?.data || err.message
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // 3️⃣ Sign‐out helper if you ever need it
  const signOut = useCallback(async () => {
    try {
      await GoogleSignin.signOut();
      await auth().signOut();
      setUser(null);
      await SecureStore.deleteItemAsync("token");
      await SecureStore.deleteItemAsync("fcmToken");
      router.push(Paths.LoginScreen);
    } catch (err: any) {
      console.warn("Error during GoogleSignOut:", err);
      setUser(null);
      await SecureStore.deleteItemAsync("token");
      await SecureStore.deleteItemAsync("fcmToken");
      

      router.push(Paths.LoginScreen)
    }
  }, []);

  return { loading, error, user, signIn, signOut };
}
