import { FF } from '@/screens/fieldflix/fonts';
import { getAccountType, setAccountType } from '@/lib/fieldflix-account-type';
import { WebShell } from '@/screens/fieldflix/WebShell';
import { WEB } from '@/screens/fieldflix/webDesign';
import { BackHeader } from '@/screens/fieldflix/profile/BackHeader';
import { ToggleSwitch } from '@/screens/fieldflix/profile/ToggleSwitch';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SWITCH_ON = '#22c55e';

const APP_SETTINGS_KEY = 'fieldflix_app_settings_v1';

type AppSettingsSnapshot = {
  showStats: boolean;
  showLocation: boolean;
  dataTracking: boolean;
};

/** Mirrors `web/src/screens/ProfileAppSettingsScreen.tsx` — toggles persist in AsyncStorage. */
export default function FieldflixProfileAppSettingsScreen() {
  const insets = useSafeAreaInsets();
  const [visibility, setVisibility] = useState({
    publicProfile: false,
    showStats: false,
    showLocation: false,
  });
  const [dataTracking, setDataTracking] = useState(false);
  const settingsReady = useRef(false);

  // Hydrate public profile (SecureStore) + other toggles (AsyncStorage).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [v, raw] = await Promise.all([getAccountType(), AsyncStorage.getItem(APP_SETTINGS_KEY)]);
      if (cancelled) return;
      if (v) {
        setVisibility((s) => ({ ...s, publicProfile: v === 'public' }));
      }
      if (raw) {
        try {
          const p = JSON.parse(raw) as Partial<AppSettingsSnapshot>;
          setVisibility((s) => ({
            ...s,
            showStats: typeof p.showStats === 'boolean' ? p.showStats : s.showStats,
            showLocation: typeof p.showLocation === 'boolean' ? p.showLocation : s.showLocation,
          }));
          if (typeof p.dataTracking === 'boolean') setDataTracking(p.dataTracking);
        } catch {
          /* ignore */
        }
      }
      if (cancelled) return;
      settingsReady.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!settingsReady.current) return;
    void (async () => {
      const snap: AppSettingsSnapshot = {
        showStats: visibility.showStats,
        showLocation: visibility.showLocation,
        dataTracking,
      };
      try {
        await AsyncStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(snap));
      } catch {
        /* ignore */
      }
    })();
  }, [visibility.showStats, visibility.showLocation, dataTracking]);

  const onTogglePublic = (v: boolean) => {
    setVisibility((s) => ({ ...s, publicProfile: v }));
    void setAccountType(v ? 'public' : 'private');
  };

  return (
    <WebShell backgroundColor={WEB.profileBg}>
      <View style={styles.flex}>
        <BackHeader title="App Settings" />
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scroll, { paddingBottom: 40 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <MaterialCommunityIcons name="eye-outline" size={16} color="#4ade80" />
              <Text style={styles.sectionLabel}>Profile Visibility</Text>
            </View>
            <ToggleRow
              label="Public Profile"
              value={visibility.publicProfile}
              onChange={onTogglePublic}
            />
            <ToggleRow
              label="Show Stats to Others"
              value={visibility.showStats}
              onChange={(v) => setVisibility((s) => ({ ...s, showStats: v }))}
            />
            <ToggleRow
              label="Show Location"
              value={visibility.showLocation}
              onChange={(v) => setVisibility((s) => ({ ...s, showLocation: v }))}
            />
          </View>

          <View style={styles.rule} />

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <MaterialCommunityIcons name="database-outline" size={16} color="#4ade80" />
              <Text style={styles.sectionLabel}>Data & Permissions</Text>
            </View>
            <ToggleRow label="Allow Data Tracking" value={dataTracking} onChange={setDataTracking} />
            <ActionRow label="Download My Data" onPress={() => {}} />
            <ActionRow label="Clear App Data" onPress={() => {}} />
          </View>
        </ScrollView>
      </View>
    </WebShell>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <ToggleSwitch checked={value} onChange={onChange} onColor={SWITCH_ON} />
    </View>
  );
}

function ActionRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.actionRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <MaterialCommunityIcons name="chevron-right" size={20} color="rgba(255,255,255,0.5)" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  section: {
    paddingVertical: 8,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    marginBottom: 14,
  },
  sectionLabel: {
    fontFamily: FF.semiBold,
    fontSize: 13,
    color: WEB.white,
  },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  actionRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  rowLabel: {
    flex: 1,
    fontFamily: FF.regular,
    fontSize: 15,
    color: 'rgba(255,255,255,0.88)',
  },
  rule: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 12,
  },
});
