// src/screens/recording/hooks/usePhoneAuth.ts

import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { useCallback, useState } from "react";

export function usePhoneAuth() {
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [confirmation, setConfirmation] = useState<
    FirebaseAuthTypes.ConfirmationResult | null
  >(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * call this to send an SMS code to `phoneNumber`
   */
  const sendVerification = useCallback(async () => {
    if (!phoneNumber) {
      setError(new Error("Please enter a valid phone number."));
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const confirm = await auth.signInWithPhoneNumber(phoneNumber);
      setConfirmation(confirm);
      setVerificationId(confirm.verificationId);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [phoneNumber]);

  /**
   * call this with the code the user received via SMS
   */
  const confirmCode = useCallback(
    async (code: string) => {
      if (!confirmation) {
        setError(new Error("No confirmation object found."));
        return null;
      }
      setLoading(true);
      setError(null);
      try {
        const userCredential = await confirmation.confirm(code);
        return userCredential; // you can inspect userCredential.user.phoneNumber etc.
      } catch (e) {
        setError(e as Error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [confirmation]
  );

  /**
   * reset everything (go back to “enter phone number” screen)
   */
  const reset = useCallback(() => {
    setPhoneNumber("");
    setVerificationCode("");
    setVerificationId(null);
    setConfirmation(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    phoneNumber,
    setPhoneNumber,
    verificationCode,
    setVerificationCode,
    verificationId,
    confirmation,
    loading,
    error,
    sendVerification,
    confirmCode,
    reset,
  };
}