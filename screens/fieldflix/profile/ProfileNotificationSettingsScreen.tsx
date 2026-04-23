import { FF } from '@/screens/fieldflix/fonts';
import { WebShell } from '@/screens/fieldflix/WebShell';
import { WEB } from '@/screens/fieldflix/webDesign';
import { BackHeader } from '@/screens/fieldflix/profile/BackHeader';
import { ToggleSwitch } from '@/screens/fieldflix/profile/ToggleSwitch';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SWITCH_ON = '#22c55e';
const MUTED = 'rgba(255,255,255,0.65)';

type SectionRow = {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
};

/** Mirrors `web/src/screens/ProfileNotificationSettingsScreen.tsx`. */
export default function FieldflixProfileNotificationSettingsScreen() {
  const insets = useSafeAreaInsets();

  const [activity, setActivity] = useState({
    matchAlerts: true,
    performance: false,
    weekly: false,
    email: false,
    push: false,
  });
  const [schedule, setSchedule] = useState({
    quietHours: true,
    snooze: false,
  });
  const [personalization, setPersonalization] = useState({
    matchAlerts: false,
    performance: false,
    weekly: true,
    email: false,
    push: false,
  });
  const [insights, setInsights] = useState({
    weekly: false,
    monthly: false,
    milestone: false,
  });

  const activityRows: SectionRow[] = [
    { label: 'Match Alerts', value: activity.matchAlerts, onChange: (v) => setActivity((s) => ({ ...s, matchAlerts: v })) },
    { label: 'Performance Updates', value: activity.performance, onChange: (v) => setActivity((s) => ({ ...s, performance: v })) },
    { label: 'Weekly Summary', value: activity.weekly, onChange: (v) => setActivity((s) => ({ ...s, weekly: v })) },
    { label: 'Email Notifications', value: activity.email, onChange: (v) => setActivity((s) => ({ ...s, email: v })) },
    { label: 'Push Notifications', value: activity.push, onChange: (v) => setActivity((s) => ({ ...s, push: v })) },
  ];
  const scheduleRows: SectionRow[] = [
    { label: 'Quiet Hours', value: schedule.quietHours, onChange: (v) => setSchedule((s) => ({ ...s, quietHours: v })) },
    { label: 'Snooze Notification', value: schedule.snooze, onChange: (v) => setSchedule((s) => ({ ...s, snooze: v })) },
  ];
  const personalRows: SectionRow[] = [
    { label: 'Match Alerts', value: personalization.matchAlerts, onChange: (v) => setPersonalization((s) => ({ ...s, matchAlerts: v })) },
    { label: 'Performance Updates', value: personalization.performance, onChange: (v) => setPersonalization((s) => ({ ...s, performance: v })) },
    { label: 'Weekly Summary', value: personalization.weekly, onChange: (v) => setPersonalization((s) => ({ ...s, weekly: v })) },
    { label: 'Email Notifications', value: personalization.email, onChange: (v) => setPersonalization((s) => ({ ...s, email: v })) },
    { label: 'Push Notifications', value: personalization.push, onChange: (v) => setPersonalization((s) => ({ ...s, push: v })) },
  ];
  const insightRows: SectionRow[] = [
    { label: 'Weekly Summary', value: insights.weekly, onChange: (v) => setInsights((s) => ({ ...s, weekly: v })) },
    { label: 'Monthly Performance Report', value: insights.monthly, onChange: (v) => setInsights((s) => ({ ...s, monthly: v })) },
    { label: 'Milestone Alerts', value: insights.milestone, onChange: (v) => setInsights((s) => ({ ...s, milestone: v })) },
  ];

  return (
    <WebShell backgroundColor={WEB.profileBg}>
      <View style={styles.flex}>
        <BackHeader title="Notifications" />

        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scroll, { paddingBottom: 40 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          <Section iconName="bell-ring-outline" label="Activity Notifications" rows={activityRows} />
          <Rule />
          <Section iconName="clock-outline" label="Schedule & Control" rows={scheduleRows} />
          <Rule />
          <Section iconName="tune-variant" label="Personalization" rows={personalRows} />
          <Rule />
          <Section iconName="chart-line" label="Insights & Reports" rows={insightRows} />
          <Rule />

          <View style={styles.previewWrap}>
            <View style={styles.previewHeader}>
              <MaterialCommunityIcons name="bell-outline" size={14} color="#4ade80" />
              <Text style={styles.previewHeaderText}>Preview Notification</Text>
            </View>
            <LinearGradient
              colors={['#0b2e1a', '#07211a', '#041612']}
              style={styles.previewCard}
            >
              <View style={styles.previewInner}>
                <View style={styles.previewIcon}>
                  <MaterialCommunityIcons name="soccer" size={20} color="#22c55e" />
                </View>
                <View style={styles.previewBody}>
                  <View style={styles.previewTop}>
                    <Text style={styles.previewTitle}>Team Alert</Text>
                    <Text style={styles.previewTime}>5m</Text>
                  </View>
                  <Text style={styles.previewText}>
                    Your favorite team kicks off in 30 minutes!{'\n'}Get ready for the match!
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        </ScrollView>
      </View>
    </WebShell>
  );
}

function Section({
  iconName,
  label,
  rows,
}: {
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  rows: SectionRow[];
}) {
  return (
    <View style={styles.block}>
      <View style={styles.sectionHead}>
        <MaterialCommunityIcons name={iconName} size={16} color="#4ade80" />
        <Text style={styles.sectionLabel}>{label}</Text>
      </View>
      {rows.map((r) => (
        <View key={r.label} style={styles.row}>
          <Text style={styles.rowLabel}>{r.label}</Text>
          <ToggleSwitch checked={r.value} onChange={r.onChange} onColor={SWITCH_ON} />
        </View>
      ))}
    </View>
  );
}

function Rule() {
  return <View style={styles.rule} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  block: {
    paddingVertical: 8,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    marginBottom: 12,
  },
  sectionLabel: {
    fontFamily: FF.semiBold,
    fontSize: 13,
    color: WEB.white,
    letterSpacing: 0.2,
  },
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
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
  previewWrap: {
    marginTop: 8,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  previewHeaderText: {
    fontFamily: FF.semiBold,
    fontSize: 13,
    color: WEB.white,
  },
  previewCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  previewInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  previewIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(34,197,94,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBody: {
    flex: 1,
    minWidth: 0,
  },
  previewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewTitle: {
    fontFamily: FF.bold,
    fontSize: 15,
    color: WEB.white,
  },
  previewTime: {
    fontFamily: FF.regular,
    fontSize: 12,
    color: MUTED,
  },
  previewText: {
    marginTop: 4,
    fontFamily: FF.regular,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.75)',
  },
});
