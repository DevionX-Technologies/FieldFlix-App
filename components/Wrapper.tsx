// src/App.tsx (or wherever your navigator sits)
import { Paths } from '@/data/paths';
import { useGoogleSignIn } from '@/hooks/login/useGoogleSignIn';
import { Slot, useRouter } from 'expo-router';
import React, { useEffect } from "react";
import { ActivityIndicator, View } from 'react-native';


export default function Wrapper() {
  const { loading, user } = useGoogleSignIn();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace(Paths.Home); // Go to home
      } else {
        router.replace(Paths.LoginScreen); // Go to login
      }
    }
  }, [loading, user]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0C11' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return <Slot />; // Will be replaced after routing
}