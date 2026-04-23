import { Paths } from '@/data/paths';
import {
  getFieldflixApiErrorMessage,
  getMyProfile,
  getMyRecordings,
  getSharedWithMe,
  patchUser,
  uploadProfilePicture,
  type FieldflixUser,
} from '@/lib/fieldflix-api';
import { FF } from '@/screens/fieldflix/fonts';
import { WebShell } from '@/screens/fieldflix/WebShell';
import { WEB } from '@/screens/fieldflix/webDesign';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

const PG = '#4ade80';
const PGF = '#14532d';
const MUTED = '#94a3b8';
const RED = '#ff5252';

type ProfileVM = {
  name: string;
  email: string;
  phone: string;
  initials: string;
  avatarUrl: string | null;
  plan: string;
  sessions: number;
  flickshorts: number;
  shared: number;
  about: string[];
  loading: boolean;
};

function initialsFromName(name: string | null | undefined): string {
  if (!name) return 'FF';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const joined = parts.map((p) => p[0] ?? '').join('');
  return joined.toUpperCase() || 'FF';
}

function formatPhone(raw: string | null | undefined): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return `+91 ${digits.slice(2)}`;
  if (digits.length === 10) return `+91 ${digits}`;
  return raw.startsWith('+') ? raw : `+${digits}`;
}

export default function FieldflixProfileScreen() {
  const router = useRouter();
  const [vm, setVm] = useState<ProfileVM>({
    name: '',
    email: '',
    phone: '',
    initials: 'FF',
    avatarUrl: null,
    plan: 'Player',
    sessions: 0,
    flickshorts: 0,
    shared: 0,
    about: [],
    loading: true,
  });

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftPhone, setDraftPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const token = await SecureStore.getItemAsync('token');

    if (!token) {
      setVm((v) => ({ ...v, loading: false }));
      return;
    }

    let user: FieldflixUser | null = null;
    let myCount = 0;
    let sharedCount = 0;
    try {
      const [u, my, sh] = await Promise.all([
        getMyProfile(token),
        getMyRecordings().catch(() => [] as unknown[]),
        getSharedWithMe().catch(() => [] as unknown[]),
      ]);
      user = u;
      myCount = Array.isArray(my) ? my.length : 0;
      sharedCount = Array.isArray(sh) ? sh.length : 0;
    } catch (e) {
      console.warn('profile load failed:', getFieldflixApiErrorMessage(e, 'profile'));
    }

    const name = user?.name ?? '';
    setVm({
      name,
      email: user?.email ?? '',
      phone: formatPhone(user?.phone_number),
      initials: initialsFromName(name),
      avatarUrl: user?.profile_image_path ?? null,
      plan: 'Player',
      sessions: myCount,
      flickshorts: 0,
      shared: sharedCount,
      about: [],
      loading: false,
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const logout = async () => {
    await SecureStore.deleteItemAsync('token');
    router.replace(Paths.login);
  };

  const onDelete = () => {
    Alert.alert('Delete account', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {} },
    ]);
  };

  const onStartEdit = () => {
    setDraftName(vm.name);
    setDraftPhone(vm.phone.replace(/\s+/g, ''));
    setEditing(true);
  };

  const onCancelEdit = () => {
    setEditing(false);
    setDraftName('');
    setDraftPhone('');
  };

  const onSaveEdit = async () => {
    const patch: Record<string, unknown> = {};
    const trimmedName = draftName.trim();
    const trimmedPhone = draftPhone.trim();
    if (trimmedName && trimmedName !== vm.name) patch.name = trimmedName;
    if (trimmedPhone && trimmedPhone !== vm.phone.replace(/\s+/g, '')) {
      patch.phone_number = trimmedPhone;
    }
    if (Object.keys(patch).length === 0) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await patchUser(patch);
      await load();
      setEditing(false);
    } catch (e) {
      Alert.alert('Could not save', getFieldflixApiErrorMessage(e, 'Failed to update profile'));
    } finally {
      setSaving(false);
    }
  };

  const onPickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Please allow photo library access to change your picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const mime = asset.mimeType ?? (asset.uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
    if (!mime.includes('jpeg') && !mime.includes('png')) {
      Alert.alert('Unsupported', 'Please pick a JPEG or PNG image.');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadProfilePicture({
        uri: asset.uri,
        name: asset.fileName ?? undefined,
        mimeType: mime,
      });
      if (url) {
        setVm((v) => ({ ...v, avatarUrl: url }));
      } else {
        await load();
      }
    } catch (e) {
      Alert.alert('Upload failed', getFieldflixApiErrorMessage(e, 'Failed to upload photo'));
    } finally {
      setUploading(false);
    }
  };

  const aboutLines = useMemo(() => vm.about, [vm.about]);

  return (
    <WebShell backgroundColor={WEB.profileBg}>
      <View style={styles.flex}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Back to home"
            onPress={() => router.push(Paths.home)}
            style={styles.backFab}
          >
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path
                d="M15 19l-7-7 7-7"
                stroke="#fff"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollInner}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient
            colors={['#111c27', '#0a1016', '#020617']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[styles.profileCard, { borderRadius: WEB.profileCardRadius }]}
          >
            <View style={styles.cardTop}>
              <View style={styles.avatarWrap}>
                <View style={styles.avatar}>
                  {vm.loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : vm.avatarUrl ? (
                    <Image source={{ uri: vm.avatarUrl }} style={styles.avatarImg} />
                  ) : (
                    <Text style={styles.avatarText}>{vm.initials}</Text>
                  )}
                  {uploading ? (
                    <View style={styles.uploadDim}>
                      <ActivityIndicator color="#fff" />
                    </View>
                  ) : null}
                </View>
                <Pressable
                  onPress={onPickPhoto}
                  disabled={uploading}
                  style={styles.camBtn}
                  accessibilityLabel="Change profile photo"
                  hitSlop={8}
                >
                  <MaterialCommunityIcons name="camera" size={16} color="#000" />
                </Pressable>
              </View>
              <View style={styles.meta}>
                <Text style={styles.name}>{vm.name || 'FieldFlicks player'}</Text>
                <Text style={styles.email} numberOfLines={1}>
                  {vm.email || '—'}
                </Text>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>{vm.plan}</Text>
                </View>
              </View>
            </View>

            <View style={styles.stats}>
              <View style={styles.stat}>
                <Text style={styles.statVal}>{vm.sessions}</Text>
                <Text style={styles.statLbl}>Sessions</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statVal, { color: PG }]}>{vm.flickshorts}</Text>
                <Text style={styles.statLbl}>Flickshorts</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statVal}>{vm.shared}</Text>
                <Text style={styles.statLbl}>Shared</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Personal Details</Text>
              {editing ? (
                <View style={styles.editActions}>
                  <Pressable onPress={onCancelEdit} disabled={saving} hitSlop={8}>
                    <Text style={[styles.editAction, { color: MUTED }]}>Cancel</Text>
                  </Pressable>
                  <Pressable onPress={onSaveEdit} disabled={saving} hitSlop={8}>
                    {saving ? (
                      <ActivityIndicator color={PG} />
                    ) : (
                      <Text style={styles.editAction}>Save</Text>
                    )}
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={onStartEdit} hitSlop={8}>
                  <Text style={styles.edit}>Edit</Text>
                </Pressable>
              )}
            </View>

            {editing ? (
              <>
                <EditField
                  label="Full Name"
                  value={draftName}
                  onChangeText={setDraftName}
                  icon="account"
                  placeholder="Your name"
                />
                <EditField
                  label="Mobile Number"
                  value={draftPhone}
                  onChangeText={setDraftPhone}
                  icon="phone"
                  placeholder="+91 ..."
                  keyboardType="phone-pad"
                />
                <DetailField
                  label="Email Address"
                  value={vm.email || 'Not set'}
                  icon="email"
                />
              </>
            ) : (
              <>
                <DetailField
                  label="Full Name"
                  value={vm.name || (vm.loading ? 'Loading…' : 'Not set')}
                  icon="account"
                />
                <DetailField
                  label="Mobile Number"
                  value={vm.phone || (vm.loading ? 'Loading…' : 'Not set')}
                  icon="phone"
                />
                <DetailField
                  label="Email Address"
                  value={vm.email || (vm.loading ? 'Loading…' : 'Not set')}
                  icon="email"
                />
              </>
            )}

            {aboutLines.length > 0 ? (
              <>
                <Text style={styles.aboutHead}>About Me</Text>
                <View style={styles.aboutBox}>
                  {aboutLines.map((line) => (
                    <View key={line} style={styles.aboutLine}>
                      <View style={styles.bullet} />
                      <Text style={styles.aboutText}>{line}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Settings</Text>
            </View>
            <View style={styles.settingsGap}>
              <SettingsRow
                title="Notifications"
                subtitle="Manage your alerts"
                icon="bell-outline"
                onPress={() => router.push(Paths.profileNotificationSettings)}
              />
              <SettingsRow
                title="App Settings"
                subtitle="Control your data"
                icon="cog-outline"
                onPress={() => router.push(Paths.profileAppSettings)}
              />
              <SettingsRow
                title="Premium"
                subtitle="Upgrade your plan"
                icon="crown-outline"
                onPress={() => router.push(Paths.profilePremium)}
              />
              <SettingsRow
                title="Payment History"
                subtitle="View all transactions."
                icon="wallet-outline"
                onPress={() => router.push(Paths.profilePaymentHistory)}
              />
              <SettingsRow
                title="Privacy & Policy"
                subtitle="Safe, secure, and transparent"
                icon="shield-check-outline"
                onPress={() => router.push(Paths.profilePrivacy)}
              />
              <SettingsRow
                title="Rate Us"
                subtitle="Share your feedback"
                icon="star-outline"
                onPress={() => router.push(Paths.profileRateUs)}
              />
            </View>
          </View>

          <View style={styles.help}>
            <View style={styles.helpIcon}>
              <MaterialCommunityIcons name="help-circle-outline" size={18} color={PG} />
            </View>
            <Text style={styles.helpText}>Need help?</Text>
            <Pressable onPress={() => router.push(Paths.profileContactUs)} hitSlop={8}>
              <Text style={styles.helpLink}>Contact Us</Text>
            </Pressable>
          </View>

          <Pressable style={styles.logout} onPress={logout}>
            <MaterialCommunityIcons name="logout" size={20} color={RED} />
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>

          <Pressable style={styles.delete} onPress={onDelete}>
            <MaterialCommunityIcons name="delete-outline" size={18} color={RED} />
            <Text style={styles.deleteText}>Delete Account</Text>
          </Pressable>
        </ScrollView>
      </View>
    </WebShell>
  );
}

function DetailField({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldRow}>
        <View style={styles.fieldIcon}>
          <MaterialCommunityIcons name={icon} size={18} color={PG} />
        </View>
        <Text style={styles.fieldValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function EditField({
  label,
  value,
  onChangeText,
  icon,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldRow}>
        <View style={styles.fieldIcon}>
          <MaterialCommunityIcons name={icon} size={18} color={PG} />
        </View>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.35)"
          keyboardType={keyboardType ?? 'default'}
          style={styles.fieldInput}
          autoCapitalize="words"
        />
      </View>
    </View>
  );
}

function SettingsRow({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.setRow}>
      <View style={styles.setIcon}>
        <MaterialCommunityIcons name={icon} size={18} color={PG} />
      </View>
      <View style={styles.setText}>
        <Text style={styles.setTitle}>{title}</Text>
        <Text style={styles.setSub}>{subtitle}</Text>
      </View>
      <Text style={styles.chev}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
    paddingTop: 10,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  backFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PGF,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FF.bold,
    fontSize: 22,
    letterSpacing: -0.5,
    color: WEB.white,
    paddingHorizontal: 8,
  },
  headerSpacer: { width: 44 },
  scroll: { flex: 1 },
  scrollInner: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 56,
    width: '100%',
  },
  profileCard: {
    borderRadius: WEB.profileCardRadius,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.35)',
    padding: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 12,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'rgba(74, 222, 128, 0.6)',
    backgroundColor: PGF,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  uploadDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: FF.bold, fontSize: 22, color: WEB.white },
  camBtn: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#020617',
    backgroundColor: PG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { flex: 1, alignItems: 'center' },
  name: {
    fontFamily: FF.bold,
    fontSize: 19,
    color: WEB.white,
    textAlign: 'center',
    width: '100%',
  },
  email: {
    marginTop: 6,
    fontFamily: FF.regular,
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    width: '100%',
  },
  pill: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: PGF,
  },
  pillText: {
    fontFamily: FF.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: PG,
    textTransform: 'uppercase',
  },
  stats: {
    marginTop: 28,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 24,
  },
  stat: { flex: 1, alignItems: 'center' },
  statVal: {
    fontFamily: FF.bold,
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    color: WEB.white,
  },
  statLbl: {
    marginTop: 10,
    fontFamily: FF.semiBold,
    fontSize: 10,
    letterSpacing: 2,
    color: MUTED,
    textTransform: 'uppercase',
  },
  section: { marginTop: 48, width: '100%' },
  sectionHead: {
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: FF.bold,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: WEB.white,
  },
  edit: { fontFamily: FF.semiBold, fontSize: 13, color: PG },
  editActions: { flexDirection: 'row', gap: 18, alignItems: 'center' },
  editAction: { fontFamily: FF.semiBold, fontSize: 13, color: PG },
  field: { marginBottom: 28 },
  fieldLabel: {
    marginBottom: 10,
    fontFamily: FF.semiBold,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: MUTED,
  },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  fieldIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PGF,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldValue: {
    flex: 1,
    fontFamily: FF.medium,
    fontSize: 15,
    color: WEB.white,
  },
  fieldInput: {
    flex: 1,
    fontFamily: FF.medium,
    fontSize: 15,
    color: WEB.white,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.35)',
    backgroundColor: 'rgba(2,6,23,0.6)',
  },
  aboutHead: {
    marginBottom: 10,
    marginTop: 8,
    fontFamily: FF.semiBold,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: MUTED,
  },
  aboutBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.28)',
    backgroundColor: 'rgba(2, 6, 23, 0.6)',
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  aboutLine: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  bullet: {
    marginTop: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PG,
  },
  aboutText: {
    flex: 1,
    fontFamily: FF.regular,
    fontSize: 14,
    lineHeight: 23,
    color: WEB.white,
  },
  settingsGap: { gap: 14 },
  setRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(12, 18, 24, 0.9)',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  setIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PGF,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setText: { flex: 1, minWidth: 0 },
  setTitle: { fontFamily: FF.semiBold, fontSize: 15, color: WEB.white },
  setSub: { marginTop: 4, fontFamily: FF.regular, fontSize: 12, color: MUTED },
  chev: { fontSize: 18, color: 'rgba(255,255,255,0.25)' },
  help: {
    marginTop: 48,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  helpIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpText: { fontFamily: FF.regular, fontSize: 15, color: WEB.white },
  helpLink: { fontFamily: FF.semiBold, fontSize: 15, color: PG },
  logout: {
    marginTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(127, 29, 29, 0.5)',
    backgroundColor: 'rgba(80, 30, 30, 0.55)',
    paddingVertical: 18,
  },
  logoutText: { fontFamily: FF.bold, fontSize: 16, color: RED },
  delete: {
    marginTop: 32,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  deleteText: { fontFamily: FF.medium, fontSize: 15, color: RED },
});
