import { FF } from '@/screens/fieldflix/fonts';
import { WebShell } from '@/screens/fieldflix/WebShell';
import { WEB } from '@/screens/fieldflix/webDesign';
import { BackHeader } from '@/screens/fieldflix/profile/BackHeader';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PG = '#22c55e';
const PG_SOFT = '#4ade80';

/** Mirrors `web/src/screens/ProfileRateUsScreen.tsx`. */
export default function FieldflixProfileRateUsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(0);

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
                    onPress={() => setRating(n)}
                    style={styles.starBtn}
                    accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}
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

            <Pressable style={styles.submit}>
              <LinearGradient
                colors={[PG_SOFT, PG]}
                style={[StyleSheet.absoluteFill, { borderRadius: 999 }]}
              />
              <Text style={styles.submitText}>Submit Review</Text>
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
    paddingTop: 32,
  },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.4)',
    padding: 28,
    overflow: 'hidden',
    alignItems: 'center',
  },
  title: {
    fontFamily: FF.bold,
    fontSize: 22,
    color: WEB.white,
    textAlign: 'center',
  },
  stars: {
    marginTop: 24,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  starBtn: {
    padding: 6,
  },
  sub: {
    marginTop: 18,
    fontFamily: FF.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
  },
  submit: {
    marginTop: 28,
    alignSelf: 'stretch',
    height: 54,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: PG,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  submitText: {
    fontFamily: FF.bold,
    fontSize: 16,
    color: WEB.white,
  },
  later: {
    marginTop: 12,
    paddingVertical: 12,
  },
  laterText: {
    fontFamily: FF.semiBold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
  },
});
