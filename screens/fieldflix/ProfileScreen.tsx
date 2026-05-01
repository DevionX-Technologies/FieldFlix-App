import { Paths } from "@/data/paths";
import { navigateBackOrHome } from "@/utils/navigateBackOrHome";
import {
  getFieldflixApiErrorMessage,
  getMyProfile,
  getMyRecordings,
  getSharedWithMe,
  patchUser,
  uploadProfilePicture,
  type FieldflixUser,
} from "@/lib/fieldflix-api";
import { FieldflixScreenHeader } from "@/screens/fieldflix/FieldflixScreenHeader";
import { WebShell } from "@/screens/fieldflix/WebShell";
import { FF } from "@/screens/fieldflix/fonts";
import { WEB } from "@/screens/fieldflix/webDesign";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const PG = "#4ade80";
const PGF = "#14532d";
const MUTED = "#94a3b8";
const RED = "#ff5252";

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
  if (!name) return "FF";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const joined = parts.map((p) => p[0] ?? "").join("");
  return joined.toUpperCase() || "FF";
}

function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91"))
    return `+91 ${digits.slice(2)}`;
  if (digits.length === 10) return `+91 ${digits}`;
  return raw.startsWith("+") ? raw : `+${digits}`;
}

export default function FieldflixProfileScreen() {
  const router = useRouter();
  const [vm, setVm] = useState<ProfileVM>({
    name: "",
    email: "",
    phone: "",
    initials: "FF",
    avatarUrl: null,
    plan: "Player",
    sessions: 0,
    flickshorts: 0,
    shared: 0,
    about: [],
    loading: true,
  });

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftPhone, setDraftPhone] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  const load = useCallback(async () => {
    const token = await SecureStore.getItemAsync("token");

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
      console.warn(
        "profile load failed:",
        getFieldflixApiErrorMessage(e, "profile"),
      );
    }

    const name = user?.name ?? "";
    setVm({
      name,
      email: user?.email ?? "",
      phone: formatPhone(user?.phone_number),
      initials: initialsFromName(name),
      avatarUrl: user?.profile_image_path ?? null,
      plan: "Player",
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

  const performLogout = async () => {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync("token"),
        SecureStore.deleteItemAsync("fcmToken"),
      ]);
      router.replace(Paths.login);
    } catch {
      Alert.alert("Logout failed", "Please try again.");
    }
  };

  const logout = () => {
    setLogoutConfirmVisible(true);
  };

  const onDelete = () => {
    setDeleteConfirmVisible(true);
  };

  const onStartEdit = () => {
    setDraftName(vm.name);
    setDraftPhone(vm.phone.replace(/\s+/g, ""));
    setDraftEmail(vm.email ?? "");
    setEditing(true);
  };

  const onCancelEdit = () => {
    setEditing(false);
    setDraftName("");
    setDraftPhone("");
    setDraftEmail("");
  };

  const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

  const onSaveEdit = async () => {
    const patch: Record<string, unknown> = {};
    const trimmedName = draftName.trim();
    const trimmedPhone = draftPhone.trim();
    const trimmedEmail = draftEmail.trim();
    const prevEmail = (vm.email ?? "").trim();
    if (trimmedName && trimmedName !== vm.name) patch.name = trimmedName;
    if (trimmedPhone && trimmedPhone !== vm.phone.replace(/\s+/g, "")) {
      patch.phone_number = trimmedPhone;
    }
    if (trimmedEmail !== prevEmail) {
      if (trimmedEmail) {
        if (!isValidEmail(trimmedEmail)) {
          Alert.alert("Invalid email", "Please enter a valid email address.");
          return;
        }
        patch.email = trimmedEmail;
      } else {
        patch.email = null;
      }
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
      Alert.alert(
        "Could not save",
        getFieldflixApiErrorMessage(e, "Failed to update profile"),
      );
    } finally {
      setSaving(false);
    }
  };

  const onPickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Permission required",
        "Please allow photo library access to change your picture.",
      );
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
    const mime =
      asset.mimeType ??
      (asset.uri.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg");
    if (!mime.includes("jpeg") && !mime.includes("png")) {
      Alert.alert("Unsupported", "Please pick a JPEG or PNG image.");
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
      Alert.alert(
        "Upload failed",
        getFieldflixApiErrorMessage(e, "Failed to upload photo"),
      );
    } finally {
      setUploading(false);
    }
  };

  const aboutLines = useMemo(() => vm.about, [vm.about]);

  return (
    <WebShell backgroundColor={WEB.profileBg}>
      <View style={styles.flex}>
        <FieldflixScreenHeader
          title="Profile"
          onBack={() => navigateBackOrHome(router)}
          backAccessibilityLabel="Back to home"
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollInner}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient
            colors={["#111c27", "#0a1016", "#020617"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[
              styles.profileCard,
              { borderRadius: WEB.profileCardRadius },
            ]}
          >
            <View style={styles.cardTop}>
              <View style={styles.avatarShadow}>
                <View style={styles.avatarWrap}>
                  <View style={styles.avatar}>
                    {vm.loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : vm.avatarUrl ? (
                      <Image
                        source={{ uri: vm.avatarUrl }}
                        style={styles.avatarImg}
                      />
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
                    style={[styles.camBtn, uploading && styles.camBtnDisabled]}
                    accessibilityLabel="Change profile photo"
                    hitSlop={8}
                  >
                    <MaterialCommunityIcons
                      name="camera"
                      size={17}
                      color="#020617"
                    />
                  </Pressable>
                </View>
              </View>
              <View style={styles.meta}>
                <Text
                  style={styles.name}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {vm.name || "FieldFlicks player"}
                </Text>
                <Text style={styles.email} numberOfLines={1}>
                  {vm.email || "—"}
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
                <Text style={[styles.statVal, { color: PG }]}>
                  {vm.flickshorts}
                </Text>
                <Text style={styles.statLbl}>Flickshorts</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statVal}>{vm.shared}</Text>
                <Text style={styles.statLbl}>Shared</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.section}>
            <View style={styles.personalHead}>
              <View style={styles.personalHeadTitle}>
                <View style={styles.personalAccent} />
                <Text style={styles.sectionTitle}>Personal Details</Text>
              </View>
              {editing ? (
                <View style={styles.editActions}>
                  <Pressable
                    onPress={onCancelEdit}
                    disabled={saving}
                    hitSlop={8}
                    style={styles.editChipMuted}
                  >
                    <Text style={styles.editChipMutedText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={onSaveEdit}
                    disabled={saving}
                    hitSlop={8}
                    style={[
                      styles.editChipPrimary,
                      saving && styles.editChipDisabled,
                    ]}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.editChipPrimaryText}>Save</Text>
                    )}
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={onStartEdit}
                  hitSlop={8}
                  style={styles.editChip}
                  accessibilityRole="button"
                >
                  <MaterialCommunityIcons
                    name="pencil-outline"
                    size={14}
                    color={PG}
                  />
                  <Text style={styles.editChipText}>Edit</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.personalCard}>
              {editing ? (
                <>
                  <EditField
                    label="Full Name"
                    value={draftName}
                    onChangeText={setDraftName}
                    icon="account"
                    placeholder="Your name"
                    isGrouped
                    showDivider
                  />
                  <EditField
                    label="Mobile Number"
                    value={draftPhone}
                    onChangeText={setDraftPhone}
                    icon="phone"
                    placeholder="+91 ..."
                    keyboardType="phone-pad"
                    isGrouped
                    showDivider
                  />
                  <EditField
                    label="Email Address"
                    value={draftEmail}
                    onChangeText={setDraftEmail}
                    icon="email"
                    placeholder="you@example.com"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    isGrouped
                    showDivider={false}
                  />
                </>
              ) : (
                <>
                  <DetailField
                    label="Full Name"
                    value={vm.name || (vm.loading ? "Loading…" : "Not set")}
                    icon="account"
                    isGrouped
                    showDivider
                  />
                  <DetailField
                    label="Mobile Number"
                    value={vm.phone || (vm.loading ? "Loading…" : "Not set")}
                    icon="phone"
                    isGrouped
                    showDivider
                  />
                  <DetailField
                    label="Email Address"
                    value={vm.email || (vm.loading ? "Loading…" : "Not set")}
                    icon="email"
                    isGrouped
                    showDivider={false}
                  />
                </>
              )}
            </View>

            {aboutLines.length > 0 ? (
              <View style={styles.personalAboutSpacer}>
                <Text style={styles.aboutHead}>About Me</Text>
                <View style={styles.aboutBox}>
                  {aboutLines.map((line) => (
                    <View key={line} style={styles.aboutLine}>
                      <View style={styles.bullet} />
                      <Text style={styles.aboutText}>{line}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>

          <View style={styles.section}>
            <View style={styles.personalHead}>
              <View style={styles.personalHeadTitle}>
                <View style={styles.personalAccent} />
                <Text style={styles.sectionTitle}>Settings</Text>
              </View>
            </View>
            <View style={styles.settingsCard}>
              <SettingsRow
                title="Notifications"
                subtitle="Manage your alerts"
                icon="bell-outline"
                onPress={() => router.push(Paths.profileNotificationSettings)}
                showDivider
              />
              <SettingsRow
                title="App Settings"
                subtitle="Control your data"
                icon="cog-outline"
                onPress={() => router.push(Paths.profileAppSettings)}
                showDivider
              />
              {/* <SettingsRow
                title="Premium"
                subtitle="Upgrade your plan"
                icon="crown-outline"
                onPress={() => router.push(Paths.profilePremium)}
                showDivider
              /> */}
              <SettingsRow
                title="Payment History"
                subtitle="View all transactions."
                icon="wallet-outline"
                onPress={() => router.push(Paths.profilePaymentHistory)}
                showDivider
              />
              <SettingsRow
                title="Privacy & Policy"
                subtitle="Safe, secure, and transparent"
                icon="shield-check-outline"
                onPress={() => router.push(Paths.profilePrivacy)}
                showDivider
              />
              <SettingsRow
                title="Rate Us"
                subtitle="Share your feedback"
                icon="star-outline"
                onPress={() => router.push(Paths.profileRateUs)}
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.personalHead}>
              <View style={styles.personalHeadTitle}>
                <View style={styles.personalAccent} />
                <Text style={styles.sectionTitle}>Need Help</Text>
              </View>
            </View>
            <View style={styles.helpCard}>
              <View style={styles.helpLead}>
                <View style={styles.helpIcon}>
                  <MaterialCommunityIcons
                    name="help-circle-outline"
                    size={18}
                    color={PG}
                  />
                </View>
                <View style={styles.helpCopy}>
                  <Text style={styles.helpText}>Need help?</Text>
                  <Text style={styles.helpSub}>
                    Get quick support from our team.
                  </Text>
                </View>
              </View>
              <Pressable
                style={styles.helpAction}
                onPress={() => router.push(Paths.profileContactUs)}
                hitSlop={8}
              >
                <Text style={styles.helpLink}>Contact Us</Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={18}
                  color={PG}
                />
              </Pressable>
            </View>
          </View>

          <Pressable style={styles.logout} onPress={logout}>
            <View style={styles.logoutLeft}>
              <View style={styles.logoutIconWrap}>
                <MaterialCommunityIcons name="logout" size={18} color={RED} />
              </View>
              <Text style={styles.logoutText}>Logout</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color="rgba(248,113,113,0.9)"
            />
          </Pressable>

          <Pressable style={styles.delete} onPress={onDelete}>
            <MaterialCommunityIcons
              name="delete-outline"
              size={16}
              color="rgba(252,165,165,0.95)"
            />
            <Text style={styles.deleteText}>Delete Account</Text>
          </Pressable>
        </ScrollView>
      </View>
      <Modal
        transparent
        animationType="fade"
        visible={logoutConfirmVisible}
        onRequestClose={() => setLogoutConfirmVisible(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Logout</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to logout?
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                style={styles.confirmCancelBtn}
                onPress={() => setLogoutConfirmVisible(false)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.confirmLogoutBtn}
                onPress={() => {
                  setLogoutConfirmVisible(false);
                  void performLogout();
                }}
              >
                <Text style={styles.confirmLogoutText}>Logout</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        transparent
        animationType="fade"
        visible={deleteConfirmVisible}
        onRequestClose={() => setDeleteConfirmVisible(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Delete Account</Text>
            <Text style={styles.confirmMessage}>
              This action cannot be undone. Are you sure you want to continue?
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                style={styles.confirmCancelBtn}
                onPress={() => setDeleteConfirmVisible(false)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.confirmLogoutBtn}
                onPress={() => setDeleteConfirmVisible(false)}
              >
                <Text style={styles.confirmLogoutText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </WebShell>
  );
}

function DetailField({
  label,
  value,
  icon,
  isGrouped = false,
  showDivider = false,
}: {
  label: string;
  value: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  isGrouped?: boolean;
  showDivider?: boolean;
}) {
  return (
    <View
      style={[
        isGrouped ? styles.personalFieldGroup : styles.field,
        isGrouped && showDivider ? styles.fieldGroupDivider : undefined,
      ]}
    >
      <Text style={[styles.fieldLabel, isGrouped && styles.fieldLabelGrouped]}>
        {label}
      </Text>
      <View style={[styles.fieldRow, isGrouped && styles.fieldRowGrouped]}>
        <View style={styles.fieldIcon}>
          <MaterialCommunityIcons name={icon} size={18} color={PG} />
        </View>
        <Text
          style={[styles.fieldValue, isGrouped && styles.fieldValueGrouped]}
          numberOfLines={2}
        >
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
  editable = true,
  autoCapitalize = "words",
  isGrouped = false,
  showDivider = false,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  placeholder?: string;
  keyboardType?: "default" | "phone-pad" | "email-address";
  editable?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  isGrouped?: boolean;
  showDivider?: boolean;
}) {
  return (
    <View
      style={[
        isGrouped ? styles.personalFieldGroup : styles.field,
        isGrouped && showDivider ? styles.fieldGroupDivider : undefined,
      ]}
    >
      <Text style={[styles.fieldLabel, isGrouped && styles.fieldLabelGrouped]}>
        {label}
      </Text>
      <View style={styles.fieldRow}>
        <View style={styles.fieldIcon}>
          <MaterialCommunityIcons name={icon} size={18} color={PG} />
        </View>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.35)"
          keyboardType={keyboardType ?? "default"}
          style={[
            styles.fieldInput,
            isGrouped && styles.fieldInputGrouped,
            !editable && styles.fieldInputReadonly,
          ]}
          autoCapitalize={autoCapitalize}
          editable={editable}
          selectTextOnFocus={editable}
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
  showDivider = false,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  showDivider?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.setRow, showDivider ? styles.setRowDivider : undefined]}
      android_ripple={{ color: "rgba(255,255,255,0.06)" }}
    >
      <View style={styles.setIcon}>
        <MaterialCommunityIcons name={icon} size={18} color={PG} />
      </View>
      <View style={styles.setText}>
        <Text style={styles.setTitle}>{title}</Text>
        <Text style={styles.setSub}>{subtitle}</Text>
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={20}
        color="rgba(255,255,255,0.35)"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollInner: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 56,
    width: "100%",
  },
  profileCard: {
    borderRadius: WEB.profileCardRadius,
    borderWidth: 1,
    borderColor: "rgba(74, 222, 128, 0.35)",
    padding: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 12,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    minHeight: 96,
  },
  avatarShadow: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
  },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: "rgba(74, 222, 128, 0.45)",
    backgroundColor: PGF,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },
  uploadDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: FF.bold, fontSize: 26, color: WEB.white },
  camBtn: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    borderColor: "#0a1016",
    backgroundColor: PG,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  camBtnDisabled: { opacity: 0.7 },
  meta: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    alignSelf: "stretch",
    alignItems: "flex-start",
    paddingVertical: 2,
  },
  name: {
    fontFamily: FF.bold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
    color: WEB.white,
    textAlign: "left",
    width: "100%",
    ...Platform.select({
      android: { includeFontPadding: false },
      default: {},
    }),
  },
  email: {
    marginTop: 5,
    fontFamily: FF.regular,
    fontSize: 13,
    lineHeight: 18,
    color: MUTED,
    textAlign: "left",
    width: "100%",
  },
  pill: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(20, 83, 45, 0.65)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(74, 222, 128, 0.35)",
  },
  pillText: {
    fontFamily: FF.bold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: PG,
    textTransform: "uppercase",
  },
  stats: {
    marginTop: 28,
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    paddingTop: 24,
  },
  stat: { flex: 1, alignItems: "center" },
  statVal: {
    fontFamily: FF.bold,
    fontSize: 22,
    fontVariant: ["tabular-nums"],
    color: WEB.white,
  },
  statLbl: {
    marginTop: 10,
    fontFamily: FF.semiBold,
    fontSize: 10,
    letterSpacing: 2,
    color: MUTED,
    textTransform: "uppercase",
  },
  section: { marginTop: 48, width: "100%" },
  sectionHead: {
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontFamily: FF.bold,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: WEB.white,
  },
  personalHead: {
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  personalHeadTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  personalAccent: {
    width: 3,
    height: 16,
    borderRadius: 2,
    backgroundColor: PG,
  },
  editActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  editChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(74, 222, 128, 0.35)",
    backgroundColor: "rgba(74, 222, 128, 0.08)",
  },
  editChipText: { fontFamily: FF.semiBold, fontSize: 13, color: PG },
  editChipMuted: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  editChipMutedText: { fontFamily: FF.semiBold, fontSize: 13, color: MUTED },
  editChipPrimary: {
    minWidth: 78,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PG,
  },
  editChipDisabled: { opacity: 0.55 },
  editChipPrimaryText: {
    fontFamily: FF.bold,
    fontSize: 13,
    color: "#020617",
  },
  personalCard: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(13,21,31,0.72)",
  },
  personalAboutSpacer: { marginTop: 20, width: "100%" },
  personalFieldGroup: {
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  fieldGroupDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  fieldLabelGrouped: {
    marginBottom: 8,
    letterSpacing: 1.2,
  },
  fieldValueGrouped: {
    lineHeight: 21,
    minWidth: 0,
  },
  fieldInputGrouped: {
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(74, 222, 128, 0.28)",
    backgroundColor: "rgba(2,6,23,0.82)",
    paddingHorizontal: 14,
  },
  field: { marginBottom: 28 },
  fieldLabel: {
    marginBottom: 10,
    fontFamily: FF.semiBold,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: MUTED,
  },
  fieldRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  fieldRowGrouped: { alignItems: "center" },
  fieldIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PGF,
    alignItems: "center",
    justifyContent: "center",
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
    borderColor: "rgba(74, 222, 128, 0.35)",
    backgroundColor: "rgba(2,6,23,0.6)",
  },
  fieldInputReadonly: {
    color: "rgba(255,255,255,0.72)",
    borderColor: "rgba(100, 116, 139, 0.45)",
  },
  aboutHead: {
    marginBottom: 12,
    fontFamily: FF.semiBold,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: MUTED,
  },
  aboutBox: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(13,21,31,0.55)",
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  aboutLine: { flexDirection: "row", gap: 16, marginBottom: 16 },
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
  settingsCard: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(13,21,31,0.65)",
  },
  setRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  setRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  setIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(74, 222, 128, 0.25)",
    backgroundColor: "rgba(20, 83, 45, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  setText: { flex: 1, minWidth: 0, paddingRight: 8 },
  setTitle: {
    fontFamily: FF.semiBold,
    fontSize: 15,
    lineHeight: 20,
    color: WEB.white,
  },
  setSub: {
    marginTop: 4,
    fontFamily: FF.regular,
    fontSize: 12,
    lineHeight: 17,
    color: MUTED,
  },
  helpCard: {
    marginTop: 0,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(13,21,31,0.65)",
    padding: 14,
    gap: 12,
  },
  helpLead: { flexDirection: "row", alignItems: "center", gap: 12 },
  helpIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(74, 222, 128, 0.25)",
    backgroundColor: "rgba(20, 83, 45, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  helpCopy: { flex: 1, minWidth: 0 },
  helpText: { fontFamily: FF.semiBold, fontSize: 15, color: WEB.white },
  helpSub: {
    marginTop: 2,
    fontFamily: FF.regular,
    fontSize: 12,
    lineHeight: 17,
    color: MUTED,
  },
  helpAction: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(74, 222, 128, 0.35)",
    backgroundColor: "rgba(74, 222, 128, 0.08)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  helpLink: { fontFamily: FF.semiBold, fontSize: 14, color: PG },
  logout: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(248,113,113,0.45)",
    backgroundColor: "rgba(127,29,29,0.35)",
    minHeight: 56,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  logoutLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoutIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(248,113,113,0.5)",
    backgroundColor: "rgba(127,29,29,0.45)",
  },
  logoutText: {
    fontFamily: FF.bold,
    fontSize: 15,
    letterSpacing: 0.2,
    color: "#FCA5A5",
  },
  delete: {
    marginTop: 10,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(248,113,113,0.3)",
    backgroundColor: "rgba(127,29,29,0.15)",
    minHeight: 44,
    paddingHorizontal: 12,
  },
  deleteText: {
    fontFamily: FF.semiBold,
    fontSize: 14,
    color: "#FCA5A5",
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(13,21,31,0.98)",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
  },
  confirmTitle: {
    fontFamily: FF.bold,
    fontSize: 18,
    color: WEB.white,
  },
  confirmMessage: {
    marginTop: 8,
    fontFamily: FF.regular,
    fontSize: 13,
    lineHeight: 19,
    color: MUTED,
  },
  confirmActions: {
    marginTop: 18,
    flexDirection: "row",
    gap: 10,
  },
  confirmCancelBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmCancelText: {
    fontFamily: FF.semiBold,
    fontSize: 14,
    color: WEB.white,
  },
  confirmLogoutBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(248,113,113,0.45)",
    backgroundColor: "rgba(127,29,29,0.38)",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmLogoutText: {
    fontFamily: FF.bold,
    fontSize: 14,
    color: "#FCA5A5",
  },
});
