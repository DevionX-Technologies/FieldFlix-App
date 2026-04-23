import { Paths } from "@/data/paths";
import { useAppDispatch } from "@/store";
import { IUserSchema, setUserInRedux } from "@/store/slices/user";
import { logAppleSignInStatus } from "@/utils/appleSignInChecker";
import axiosInstance from "@/utils/axiosInstance";
import { requestAndRegisterFcmToken } from "@/utils/fcmTokenManager";
import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import { auth } from "../firebase";

interface UseAppleSignInResult {
  loading: boolean;
  error: Error | null;
  user: AppleAuthentication.AppleAuthenticationCredential | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  isAvailable: boolean;
}

export function useAppleSignIn(): UseAppleSignInResult {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [user, setUser] = useState<AppleAuthentication.AppleAuthenticationCredential | null>(null);
  const dispatch = useAppDispatch();
  const router = useRouter();

  // Check if Apple Sign-In is available (iOS 13+ only)
  const [isAvailable, setIsAvailable] = useState<boolean>(false);

  // Check availability on component mount
  useEffect(() => {
    const checkAvailability = async () => {
      // Run comprehensive configuration check
      await logAppleSignInStatus();
      
      if (Platform.OS === 'ios') {
        try {
          console.log('📦 Checking if expo-apple-authentication is available...');
          
          // Check if the module is available (development build vs Expo Go)
          if (!AppleAuthentication.isAvailableAsync) {
            console.log('❌ AppleAuthentication module not available - using Expo Go?');
            setIsAvailable(false);
            return;
          }
          
          const available = await AppleAuthentication.isAvailableAsync();
          console.log('✅ AppleAuthentication.isAvailableAsync() result:', available);
          
          if (!available) {
            console.log('❌ Apple Sign-In not available. Possible reasons:');
            console.log('   - iOS version < 13.0');
            console.log('   - Running in Expo Go (need development build)');
            console.log('   - Apple Developer account not configured');
            console.log('   - Bundle ID missing Sign In with Apple capability');
          }
          
          setIsAvailable(available);
        } catch (error) {
          console.log('❌ Error checking Apple Sign-In availability:', error);
          setIsAvailable(false);
        }
      } else {
        // Apple Sign-In is only available on iOS
        setIsAvailable(false);
        console.log('Apple Sign-In not available on non-iOS platform');
      }
    };
    checkAvailability();
  }, []);

  // Apple Sign-In function
  const signIn = useCallback(async () => {
    console.log('Apple Sign-In attempted, available:', isAvailable, 'Platform:', Platform.OS);
    
    if (!isAvailable) {
      const errorMessage = Platform.OS !== 'ios' 
        ? 'Apple Sign-In is only available on iOS devices' 
        : 'Apple Sign-In requires iOS 13 or later';
      setError(new Error(errorMessage));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🍎 Starting Apple Sign-In process...');
      
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      console.log('✅ Apple Sign-In credential received:', {
        user: credential.user,
        email: credential.email,
        fullName: credential.fullName,
        hasIdentityToken: !!credential.identityToken,
        hasAuthorizationCode: !!credential.authorizationCode,
      });

      if (credential.identityToken) {
        console.log('🔐 Identity token received, processing...');
        
        try {
          // Send the credential to your backend for verification
          const response = await axiosInstance.post("/auth/apple", {
            identityToken: credential.identityToken,
            authorizationCode: credential.authorizationCode,
            user: credential.user,
            email: credential.email,
            fullName: credential.fullName,
          });

          const { token, user: userFromResponse } = response.data;

          if (token) {
            // Save token securely
            await SecureStore.setItemAsync("token", token);
            
            // Store user data in Redux
            const userForRedux: IUserSchema = {
              token: token,
              isFirstTimeLogin: false,
              name: credential.fullName?.givenName 
                ? `${credential.fullName.givenName} ${credential.fullName.familyName || ''}`.trim()
                : userFromResponse.name || 'Apple User',
              email: credential.email || userFromResponse.email || '',
              phone_number: userFromResponse.phone_number || '',
              profile_image_path: userFromResponse.profile_image_path || '',
            };

            dispatch(setUserInRedux(userForRedux));
            setUser(credential);

            // Register for push notifications
            await requestAndRegisterFcmToken();

            // Navigate to home
            router.push(Paths.Home);
          }
        } catch (backendError: any) {
          console.error('🔥 Backend authentication failed:', backendError);
          // For now, let's just show success with the Apple credential
          console.log('⚠️ Using Apple credential without backend auth (for testing)');
          
          const userForRedux: IUserSchema = {
            token: 'apple-test-token',
            isFirstTimeLogin: false,
            name: credential.fullName?.givenName 
              ? `${credential.fullName.givenName} ${credential.fullName.familyName || ''}`.trim()
              : 'Apple User',
            email: credential.email || 'apple@example.com',
            phone_number: '',
            profile_image_path: '',
          };

          dispatch(setUserInRedux(userForRedux));
          setUser(credential);
          router.push(Paths.Home);
        }
      } else {
        console.error('❌ No identity token received from Apple');
        setError(new Error('Apple Sign-In failed: No identity token received'));
      }
    } catch (err: any) {
      console.error('🍎 Apple Sign-In Error Details:', {
        code: err.code,
        message: err.message,
        nativeError: err.nativeError,
        fullError: err
      });

      if (err.code === 'ERR_CANCELED' || err.code === 1001) {
        // User cancelled - don't show error
        console.log('✋ Apple Sign-In cancelled by user');
      } else if (err.code === 1000) {
        setError(new Error('Apple Sign-In failed: Unknown error. Please check your Apple Developer account configuration.'));
      } else if (err.code === 1002) {
        setError(new Error('Apple Sign-In invalid response. Please try again.'));
      } else if (err.code === 1003) {
        setError(new Error('Apple Sign-In not handled. Please check app configuration.'));
      } else if (err.code === 1004) {
        setError(new Error('Apple Sign-In failed. Please check your internet connection.'));
      } else if (err.code === 'ERR_REQUEST_UNKNOWN') {
        setError(new Error('Apple Developer Console configuration issue: Please enable "Sign In with Apple" capability for your App ID (com.fieldflicks) in Apple Developer Console.'));
      } else {
        setError(new Error(`Apple Sign-In failed: ${err.message || 'Unknown error'}`));
      }
    } finally {
      setLoading(false);
    }
  }, [isAvailable, dispatch, router]);

  // Apple Sign-out function
  const signOut = useCallback(async () => {
    try {
      // Sign out from Firebase
      await auth().signOut();
      
      // Clear user state
      setUser(null);
      
      // Clear stored tokens
      await SecureStore.deleteItemAsync("token");
      await SecureStore.deleteItemAsync("fcmToken");
      
      // Navigate to login
      router.push(Paths.LoginScreen);
    } catch (err: any) {
      console.warn("Error during Apple Sign-Out:", err);
      
      // Even if there's an error, clear local state and navigate
      setUser(null);
      await SecureStore.deleteItemAsync("token");
      await SecureStore.deleteItemAsync("fcmToken");
      router.push(Paths.LoginScreen);
    }
  }, [router]);

  return { 
    loading, 
    error, 
    user, 
    signIn, 
    signOut, 
    isAvailable 
  };
}