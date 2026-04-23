import app from '@react-native-firebase/app';
import authModule from '@react-native-firebase/auth';
import { canUseReactNativeFirebase } from '@/utils/canUseReactNativeFirebase';

function getFirebaseAppInstance() {
  if (!canUseReactNativeFirebase()) {
    return null;
  }
  try {
    return app.app();
  } catch {
    return null;
  }
}

const firebaseApp = getFirebaseAppInstance();

function auth() {
  if (!firebaseApp) {
    return {
      signOut: async () => {},
      signInWithCredential: async () => {
        throw new Error(
          'Firebase Auth needs a development build with native Firebase (not available in Expo Go).'
        );
      },
    } as ReturnType<typeof authModule>;
  }
  return authModule();
}

const authExport = Object.assign(auth, {
  GoogleAuthProvider: authModule.GoogleAuthProvider,
}) as typeof authModule;

export { authExport as auth, firebaseApp };
