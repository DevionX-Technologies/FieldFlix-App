import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  AuthCredential,
  GoogleAuthProvider,
  getAuth,
  signInWithCredential,
  signOut,
} from 'firebase/auth';

/**
 * Web uses the Firebase JS SDK. Native uses `@react-native-firebase/*` (hooks/firebase.ts).
 * Override with EXPO_PUBLIC_FIREBASE_*; defaults match `google-services.json` / project setup.
 */
function webFirebaseOptions() {
  return {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? 'AIzaSyBXrXXoznaX02RV8j-nYTZTuPsmbUT87vU',
    authDomain:
      process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'fieldflicksproduction.firebaseapp.com',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'fieldflicksproduction',
    storageBucket:
      process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'fieldflicksproduction.firebasestorage.app',
    messagingSenderId:
      process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '350089393900',
    appId:
      process.env.EXPO_PUBLIC_FIREBASE_APP_ID ??
      '1:350089393900:android:7bda3c60ded47f948917c9',
  };
}

function getOrInitApp(): FirebaseApp {
  if (!getApps().length) {
    return initializeApp(webFirebaseOptions());
  }
  return getApp();
}

const firebaseApp = getOrInitApp();
const webAuth = getAuth(firebaseApp);

function authModule() {
  return {
    signOut: () => signOut(webAuth),
    signInWithCredential: (credential: AuthCredential) =>
      signInWithCredential(webAuth, credential),
  };
}

/** Same shape as default export from `@react-native-firebase/auth` used in hooks. */
const auth = Object.assign(authModule, { GoogleAuthProvider });

export { auth, firebaseApp };
