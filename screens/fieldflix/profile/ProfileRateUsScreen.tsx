import { FF } from '@/screens/fieldflix/fonts';
import { WebShell } from '@/screens/fieldflix/WebShell';
import { WEB } from '@/screens/fieldflix/webDesign';
import { BackHeader } from '@/screens/fieldflix/profile/BackHeader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PG = '#22c55e';
const PG_SOFT = '#4ade80';
const RATE_SUBMIT_KEY = '@fieldflicks/rate_us_submitted_v1';
const PLAY_STORE =
  'https://play.google.com/store/apps/details?id=com.fieldflicks';

/** Mirrors `web/src/screens/ProfileRateUsScreen.tsx`. */
export default function FieldflixProfileRateUsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(RATE_SUBMIT_KEY).then((v) => {
      setSubmitted(v === '1');
      setHydrated(true);
    });
  }, []);

  const onSubmit = useCallback(async () => {
    if (rating < 1) {
      Alert.alert('Rating', 'Tap the stars to choose a rating first.');
      return;
    }
    setSubmitting(true);
    try {
      await AsyncStorage.setItem(RATE_SUBMIT_KEY, '1');
      setSubmitted(true);
      if (Platform.OS === 'android') {
        const can = await Linking.canOpenURL(PLAY_STORE).catch(() => false);
        if (can) await Linking.openURL(PLAY_STORE);
      }
      Alert.alert(
        'Thank you',
        `You rated ${rating} star${rating === 1 ? '' : 's'}. We really appreciate it.`,
      );
    } catch {
      Alert.alert('Thanks', 'We could not open the store, but your rating was noted.');
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }, [rating]);

  return (
    <WebShell backgroundColor={WEB.profileBg}>
      <View style={styles.flex}>
        <BackHeader title="Rate Us" />
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: 40 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(34,197,94,0.25)', 'rgba(20,83,45,0.3)', 'rgba(2,6,23,0.85)']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.title}>Enjoying the App?</Text>
            <View style={styles.stars} accessibilityLabel="Star rating">
              {[1, 2, 3, 4, 5].map((n) => {
                const on = n <= rating;
                return (
                  <Pressable
                    key={n}
                    onPress={() => !submitted && setRating(n)}
                    style={styles.starBtn}
                    accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}
                    disabled={submitted || !hydrated}
                  >
                    <MaterialCommunityIcons
                      name={on ? 'star' : 'star-outline'}
                      size={36}
                      color={on ? '#facc15' : 'rgba(255,255,255,0.3)'}
                    />
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.sub}>Your feedback helps us improve</Text>

            {submitted ? (
              <Text style={styles.status}>
                Status: submitted — thanks for rating FieldFlicks.
              </Text>
            ) : !hydrated ? (
              <ActivityIndicator style={{ marginTop: 14 }} color={PG_SOFT} />
            ) : null}

            <Pressable
              style={[styles.submit, (submitted || submitting) && styles.submitDisabled]}
              onPress={() => void onSubmit()}
              disabled={submitted || submitting || !hydrated}
            >
              <LinearGradient
                pointerEvents="none"
                colors={[PG_SOFT, PG]}
                style={[StyleSheet.absoluteFill, { borderRadius: 999 }]}
              />
              <Text style={styles.submitText}>
                {submitting ? 'Submitting…' : submitted ? 'Submitted' : 'Submit Review'}
              </Text>
            </Pressable>
            <Pressable style={styles.later} onPress={() => router.back()}>
              <Text style={styles.laterText}>Maybe Later</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </WebShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.24)',
    backgroundColor: 'rgba(10,17,26,0.82)',
    paddingHorizontal: 18,
    paddingVertical: 20,
    overflow: 'hidden',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 6,
  },
  title: {
    fontFamily: FF.bold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.25,
    color: WEB.white,
    textAlign: 'center',
  },
  stars: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
  },
  starBtn: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  sub: {
    marginTop: 14,
    fontFamily: FF.regular,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(226,232,240,0.84)',
    textAlign: 'center',
  },
  status: {
    marginTop: 12,
    fontFamily: FF.semiBold,
    fontSize: 13,
    lineHeight: 18,
    color: PG_SOFT,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  submit: {
    marginTop: 22,
    alignSelf: 'stretch',
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    shadowColor: PG,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  submitDisabled: {
    opacity: 0.55,
  },
  submitText: {
    fontFamily: FF.bold,
    fontSize: 15,
    letterSpacing: 0.2,
    color: WEB.white,
  },
  later: {
    marginTop: 10,
    paddingVertical: 10,
  },
  laterText: {
    fontFamily: FF.semiBold,
    fontSize: 13,
    color: 'rgba(203,213,225,0.74)',
    textAlign: 'center',
  },
});
