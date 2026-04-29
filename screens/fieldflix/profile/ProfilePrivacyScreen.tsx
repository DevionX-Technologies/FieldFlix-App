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
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={styles.heroIconWrap}>
                <MaterialCommunityIcons name="shield-check-outline" size={18} color="#86efac" />
              </View>
              <Text style={styles.heroTitle}>Your data, protected by design</Text>
            </View>
            <Text style={styles.heroBody}>
              We collect only what is required to run your experience, keep your account secure,
              and improve product quality.
            </Text>
            <Text style={styles.heroMeta}>Last updated: Apr 2026</Text>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHead}>
              <MaterialCommunityIcons name="shield-lock-outline" size={20} color="#4ade80" />
              <Text style={styles.sectionTitle}>Privacy</Text>
            </View>
            <View style={styles.copy}>
              {privacyBody.map((p, i) => (
                <View key={i} style={styles.pointRow}>
                  <View style={styles.pointDot} />
                  <Text style={styles.paragraph}>{p}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHead}>
              <MaterialCommunityIcons name="file-document-outline" size={20} color="#4ade80" />
              <Text style={styles.sectionTitle}>Policy</Text>
            </View>
            <View style={styles.copy}>
              {policyBody.map((p, i) => (
                <View key={i} style={styles.pointRow}>
                  <View style={styles.pointDot} />
                  <Text style={styles.paragraph}>{p}</Text>
                </View>
              ))}
            </View>
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
    gap: 14,
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.25)',
    backgroundColor: 'rgba(6,18,14,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.28)',
  },
  heroTitle: {
    flex: 1,
    fontFamily: FF.bold,
    fontSize: 15,
    color: WEB.white,
    letterSpacing: -0.1,
  },
  heroBody: {
    fontFamily: FF.regular,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(226,232,240,0.86)',
  },
  heroMeta: {
    fontFamily: FF.medium,
    fontSize: 12,
    color: 'rgba(148,163,184,0.95)',
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(15,23,42,0.62)',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: FF.bold,
    fontSize: 17,
    letterSpacing: -0.1,
    color: WEB.white,
  },
  copy: {
    gap: 10,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  pointDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    backgroundColor: 'rgba(74,222,128,0.9)',
  },
  paragraph: {
    flex: 1,
    fontFamily: FF.regular,
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.78)',
  },
});
