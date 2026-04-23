import { FF } from '@/screens/fieldflix/fonts';
import { WebShell } from '@/screens/fieldflix/WebShell';
import { WEB } from '@/screens/fieldflix/webDesign';
import { BackHeader } from '@/screens/fieldflix/profile/BackHeader';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Mirrors `web/src/screens/ProfilePrivacyScreen.tsx`. */
export default function FieldflixProfilePrivacyScreen() {
  const insets = useSafeAreaInsets();

  const privacyBody = [
    'We take your privacy seriously and are committed to safeguarding your personal information. The data we collect is used responsibly to enhance our services and provide a personalized experience while using the app.',
    'We collect only the necessary information, such as your name, activity within the app, and usage patterns. This data helps us improve our features, optimize performance, and deliver content that is relevant to you.',
    'Your information is protected using advanced security measures to prevent unauthorized access or misuse. You can access, update, or request the deletion of your data at any time through your account settings.',
  ];

  const policyBody = [
    'By using our app, you agree to follow our terms and conditions, ensuring that the platform is used responsibly and in accordance with applicable guidelines.',
    'We do not sell, rent, or misuse your personal data.',
    'Trusted third-party services may be utilized to support certain features, each of which adhere to strict privacy and security standards.',
    'Our policy may be updated periodically to reflect changes in legislation or for security enhancements. We encourage you to review this page from time to time to stay informed about how we protect your personal information.',
  ];

  return (
    <WebShell backgroundColor={WEB.profileBg}>
      <View style={styles.flex}>
        <BackHeader title="Privacy & Policy" />
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scroll, { paddingBottom: 40 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sectionHead}>
            <MaterialCommunityIcons name="shield-lock-outline" size={22} color="#4ade80" />
            <Text style={styles.sectionTitle}>Privacy</Text>
          </View>
          <View style={styles.copy}>
            {privacyBody.map((p, i) => (
              <Text key={i} style={styles.paragraph}>
                {p}
              </Text>
            ))}
          </View>

          <View style={styles.divider} />

          <View style={styles.sectionHead}>
            <MaterialCommunityIcons name="file-document-outline" size={20} color="#4ade80" />
            <Text style={styles.sectionTitle}>Policy</Text>
          </View>
          <View style={styles.copy}>
            {policyBody.map((p, i) => (
              <Text key={i} style={styles.paragraph}>
                {p}
              </Text>
            ))}
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
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: FF.bold,
    fontSize: 20,
    letterSpacing: -0.2,
    color: WEB.white,
  },
  copy: {
    gap: 12,
  },
  paragraph: {
    fontFamily: FF.regular,
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.78)',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 24,
  },
});
