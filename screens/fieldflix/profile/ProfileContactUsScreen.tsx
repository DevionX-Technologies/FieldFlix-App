import { FF } from '@/screens/fieldflix/fonts';
import { WebShell } from '@/screens/fieldflix/WebShell';
import { WEB } from '@/screens/fieldflix/webDesign';
import { BackHeader } from '@/screens/fieldflix/profile/BackHeader';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PG = '#22c55e';
const PG_SOFT = '#4ade80';
const MUTED = 'rgba(255,255,255,0.55)';

const ISSUES = [
  { id: 'bug' as const, label: 'Report a Bug' },
  { id: 'feature' as const, label: 'Suggest a Feature' },
  { id: 'general' as const, label: 'General Query' },
];

/** Mirrors `web/src/screens/ProfileContactUsScreen.tsx`. */
export default function FieldflixProfileContactUsScreen() {
  const insets = useSafeAreaInsets();
  const [issue, setIssue] = useState<(typeof ISSUES)[number]['id']>('bug');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [description, setDescription] = useState('');

  return (
    <WebShell backgroundColor={WEB.profileBg}>
      <View style={styles.flex}>
        <BackHeader title="Contact Support" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.scroll, { paddingBottom: 40 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.tagline}>We&apos;re here to help you anytime</Text>

            <View style={styles.labelRow}>
              <MaterialCommunityIcons name="tag-outline" size={15} color={PG_SOFT} />
              <Text style={styles.labelText}>Issue Type</Text>
            </View>

            {ISSUES.map((row) => {
              const active = issue === row.id;
              return (
                <Pressable
                  key={row.id}
                  onPress={() => setIssue(row.id)}
                  style={[styles.issueRow, active && styles.issueRowActive]}
                >
                  <Text style={[styles.issueText, active && styles.issueTextActive]}>{row.label}</Text>
                  {active ? <MaterialCommunityIcons name="check-circle" size={18} color={PG} /> : null}
                </Pressable>
              );
            })}

            <View style={[styles.labelRow, { marginTop: 28 }]}>
              <MaterialCommunityIcons name="account-circle-outline" size={16} color={PG_SOFT} />
              <Text style={styles.labelText}>Your Details</Text>
            </View>

            <View style={styles.field}>
              <MaterialCommunityIcons name="account-outline" size={20} color="rgba(255,255,255,0.4)" />
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Full Name"
                placeholderTextColor="rgba(255,255,255,0.3)"
                style={styles.fieldInput}
              />
            </View>

            <View style={styles.field}>
              <MaterialCommunityIcons name="phone-outline" size={18} color="rgba(255,255,255,0.4)" />
              <TextInput
                value={mobile}
                onChangeText={(v) => setMobile(v.replace(/\D/g, '').slice(0, 15))}
                placeholder="Mobile Number"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="phone-pad"
                style={styles.fieldInput}
              />
            </View>

            <View style={[styles.field, styles.fieldTall]}>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Describe your issue"
                placeholderTextColor="rgba(255,255,255,0.3)"
                multiline
                numberOfLines={4}
                style={[styles.fieldInput, styles.fieldInputTall]}
                textAlignVertical="top"
              />
            </View>

            <Pressable style={styles.sendBtn}>
              <LinearGradient
                colors={[PG_SOFT, PG]}
                style={[StyleSheet.absoluteFill, { borderRadius: 999 }]}
              />
              <Text style={styles.sendText}>Send Message</Text>
            </Pressable>

            <Text style={styles.foot}>We usually respond within 24 hours</Text>
            <Text style={styles.or}>Or contact us directly</Text>
            <Pressable onPress={() => Linking.openURL('mailto:support@fieldflix.com')}>
              <Text style={styles.email}>support@fieldflix.com</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </WebShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  tagline: {
    fontFamily: FF.regular,
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  labelText: {
    fontFamily: FF.semiBold,
    fontSize: 13,
    color: WEB.white,
  },
  issueRow: {
    minHeight: 52,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(12,18,24,0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  issueRowActive: {
    borderColor: PG,
    backgroundColor: 'rgba(20,83,45,0.4)',
  },
  issueText: {
    fontFamily: FF.medium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.82)',
  },
  issueTextActive: {
    color: WEB.white,
    fontFamily: FF.semiBold,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(5,10,15,0.75)',
    marginBottom: 12,
  },
  fieldTall: {
    alignItems: 'flex-start',
    paddingVertical: 14,
    minHeight: 110,
  },
  fieldInput: {
    flex: 1,
    fontFamily: FF.regular,
    fontSize: 15,
    color: WEB.white,
    paddingVertical: 0,
  },
  fieldInputTall: {
    minHeight: 80,
    paddingVertical: 0,
    textAlignVertical: 'top',
  },
  sendBtn: {
    marginTop: 8,
    height: 54,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: PG,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  sendText: {
    fontFamily: FF.bold,
    fontSize: 16,
    color: WEB.white,
  },
  foot: {
    marginTop: 18,
    textAlign: 'center',
    fontFamily: FF.regular,
    fontSize: 12,
    color: MUTED,
  },
  or: {
    marginTop: 16,
    textAlign: 'center',
    fontFamily: FF.regular,
    fontSize: 12,
    color: MUTED,
  },
  email: {
    marginTop: 6,
    textAlign: 'center',
    fontFamily: FF.bold,
    fontSize: 14,
    color: PG_SOFT,
  },
});
