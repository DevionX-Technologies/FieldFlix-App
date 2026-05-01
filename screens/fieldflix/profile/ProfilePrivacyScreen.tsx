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

  const policySections = [
    {
      title: 'Privacy Policy',
      paragraphs: [
        `This Privacy Policy ("Policy") describes the policies and procedures on the collection, use, disclosure, and protection of your information when you use our website located at www.fieldflicks.com, or the FieldFlicks mobile application (collectively, "Platform") made available by FieldFlicks ("FieldFlicks," "we," "us" and "our"), having its registered office at Flat No. 502, Ann Abode Condominiums, St. Martin's Road, Bandra (West), Mumbai - 400 050, Maharashtra.`,
        `The terms "you" and "your" refer to the user of the Platform. The term "Services" refers to any services offered by FieldFlicks whether on the Platform or otherwise.`,
        `Please read this Policy before using the FieldFlicks Platform or submitting any personal information to FieldFlicks. This Policy is a part of and incorporated within, and is to be read along with, the Terms of Use.`,
      ],
    },
    {
      title: 'Your Consent',
      paragraphs: [
        `By using the Platform and the Services, you agree and consent to the collection, transfer, use, storage, disclosure and sharing of your information as described and collected by us in accordance with this Policy. If you do not agree with the Policy, please do not use, or access the Platform.`,
      ],
    },
    {
      title: 'Policy Changes',
      paragraphs: [
        `We may occasionally update this Policy and such changes will be posted on this page. If we make any significant changes to this Policy, we will endeavour to provide you with reasonable notice of such changes, such as via prominent notice on the Platform or to your email address on record and where required by applicable law, we will obtain your consent. To the extent permitted under the applicable law, your continued use of our Services after we publish or send a notice about our changes to this Policy shall constitute your consent to the updated Policy.`,
      ],
    },
    {
      title: 'Links To Other Websites',
      paragraphs: [
        `The Platform may contain links to other websites. Any personal information about you collected whilst visiting such websites is not governed by this Policy. FieldFlicks shall not be responsible for and has no control over the practices and content of any website accessed using the links contained on the Platform. This Policy shall not apply to any information you may disclose to any of our service providers/service personnel which we do not require you to disclose to us or any of our service providers under this Policy.`,
      ],
    },
    {
      title: 'Information We Collect From You',
      paragraphs: [
        `Device Information: In order to improve your app experience and lend stability to our services to you, we may collect information or employ third party plugins that collect information about the devices you use to access our Services, including the hardware models, operating systems and versions, software, file names and versions, preferred languages, unique device identifiers, advertising identifiers, serial numbers, device motion information, mobile network information, installed applications on device and phone state. Analytics companies may use mobile device IDs to track your usage of the Platform.`,
        `With regard to each of your visits to the Platform, we may collect and analyze communication records with us, location information (including GPS/IP based), usage and preference information, ad and pixel interaction data, transaction information, and stored metadata/files where permissions are provided.`,
        `If you permit access, the app may use photos/videos/audio metadata, contacts/address book, and calendar details for service features described in this Policy. If you are a turf partner or advertising partner, we may additionally record call/SMS details, location and address details related to service delivery.`,
      ],
    },
    {
      title: 'Information You Provide',
      paragraphs: [
        `This includes information submitted when you create/update your account (name, email, phone number, credentials, address, payment info, DOB, profile picture), provide content, use services, contact support, participate in promotions/surveys, enable contacts/calendar features, report issues, or submit partner/KYC details.`,
      ],
    },
    {
      title: 'Information We Receive From Other Sources',
      paragraphs: [
        `We may receive information about you from third parties including users, partners (ad partners, analytics providers, search information providers), affiliates, and social sign-in providers. If you connect social accounts, you consent to our collection/storage/use of information made available through those interfaces as per this Policy.`,
      ],
    },
    {
      title: 'Cookies',
      paragraphs: [
        `Our Platform and trusted partners may use cookies, pixel tags, web beacons, SDKs, mobile IDs and similar technologies for authentication, preferences, analytics, advertising effectiveness, and understanding usage trends.`,
        `To modify cookie settings, use your browser/device settings. By using our Services with cookie-enabled settings, you consent to such usage. Please refer to our Cookie Policy for more details and choices.`,
      ],
    },
    {
      title: 'Uses Of Your Information',
      paragraphs: [
        `We use collected information to provide, personalize, maintain and improve services; fulfill contracts; secure and administer the Platform; provide support; process transactions; conduct analytics/research; support interactive features; deliver and measure advertising; and conduct academic research where applicable.`,
        `We may combine third-party data with information collected directly by us. We may also anonymize/de-identify data, and use/disclose aggregated or de-identified data without limitation as permitted by law.`,
      ],
    },
    {
      title: 'Disclosure And Distribution Of Your Information',
      paragraphs: [
        `We may share information with service providers, merchants, academic partners, and other users where necessary to provide Services.`,
        `We may disclose information for legal compliance, fraud prevention, rights protection, safety, and dispute resolution.`,
        `We may work with advertisers and ad networks that use tracking technologies for ad delivery and measurement. Opt-out options for interest-based ads may be available on supported third-party networks.`,
        `We may also share information to fulfill the purpose for which you provided it, or where you are notified and provide consent.`,
      ],
    },
    {
      title: 'Data Security Precautions',
      paragraphs: [
        `We implement appropriate technical and organizational safeguards. Certain sensitive data protections may involve vault/tokenization and PCI-compliant payment service providers. Please do not share full card details through unsecured channels.`,
        `No transmission over the internet is completely secure; however, once information is received, we use strict physical, electronic, and procedural safeguards to reduce unauthorized access.`,
      ],
    },
    {
      title: 'Opt-Out',
      paragraphs: [
        `By signing up, you may receive service emails/SMS. You may manage commercial communication preferences, but certain administrative/service/legal notices may still be sent.`,
        `To withdraw consent or request deletion, contact info@fieldflicks.com. We may take up to 5 business days to process requests, and certain processing may continue where required by law.`,
      ],
    },
    {
      title: 'Community Guidelines',
      paragraphs: [
        `FieldFlicks supports a diverse and safe community. By using the Platform, you agree to our Community Guidelines and Terms of Use.`,
        `Illegal activity, hate content, credible threats, harassment, sexual content involving minors, and other prohibited conduct may lead to content removal, account suspension, or additional restrictions.`,
        `Users are encouraged to report violations through built-in reporting options with as much detail as possible.`,
      ],
    },
    {
      title: 'Grievance Officer And Platform Security',
      paragraphs: [
        `If you have queries related to processing/usage of information, email info@fieldflicks.in.`,
        `Grievance Officer Address: FieldFlicks Grievance Officer, Flat No. 502, Ann Abode Condominiums, St. Martin's Road, Bandra (West), Mumbai - 400 050, Maharashtra.`,
        `To report abuse or policy violations, email info@fieldflicks.com.`,
      ],
    },
  ] as const;

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

          {policySections.map((section, idx) => (
            <View key={`${section.title}-${idx}`} style={styles.sectionCard}>
              <View style={styles.sectionHead}>
                <MaterialCommunityIcons
                  name={idx === 0 ? 'shield-lock-outline' : 'file-document-outline'}
                  size={20}
                  color="#4ade80"
                />
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              <View style={styles.copy}>
                {section.paragraphs.map((p, i) => (
                  <Text key={`${section.title}-${i}`} style={styles.paragraph}>
                    {p}
                  </Text>
                ))}
              </View>
            </View>
          ))}
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
  paragraph: {
    fontFamily: FF.regular,
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.78)',
  },
});
