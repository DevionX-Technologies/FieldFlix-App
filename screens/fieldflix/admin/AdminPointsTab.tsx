import { FF } from '@/screens/fieldflix/fonts';
import { WEB } from '@/screens/fieldflix/webDesign';
import {
  getPointConfigs,
  updatePointConfig,
  type PointConfigRow,
  type PointEventTypeStr,
} from '@/lib/fieldflix-api';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

/**
 * Admin → Points tab.
 *
 * Lets the admin tune the per-event point values (and toggle each event on
 * or off). Changes write to `point_configs` and take effect for the next
 * award; existing PointEvent rows are NOT rewritten (we snapshot the value
 * at award time so history is stable).
 *
 * Layout intentionally matches the existing admin "card + row" style in
 * `AdminDashboardScreen` so it doesn't feel grafted on.
 */
export function AdminPointsTab() {
  const [rows, setRows] = useState<PointConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingType, setSavingType] = useState<PointEventTypeStr | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getPointConfigs();
      setRows(list);
      const d: Record<string, string> = {};
      for (const r of list) d[r.eventType] = String(r.points);
      setDrafts(d);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSave = useCallback(
    async (row: PointConfigRow) => {
      const next = Number(drafts[row.eventType] ?? row.points);
      if (!Number.isFinite(next) || next < 0) return;
      setSavingType(row.eventType);
      try {
        const updated = await updatePointConfig(row.eventType, {
          points: Math.floor(next),
        });
        setRows((prev) =>
          prev.map((r) =>
            r.eventType === updated.eventType ? { ...r, ...updated } : r,
          ),
        );
      } finally {
        setSavingType(null);
      }
    },
    [drafts],
  );

  const onToggleEnabled = useCallback(
    async (row: PointConfigRow) => {
      setSavingType(row.eventType);
      try {
        const updated = await updatePointConfig(row.eventType, {
          enabled: !row.enabled,
        });
        setRows((prev) =>
          prev.map((r) =>
            r.eventType === updated.eventType ? { ...r, ...updated } : r,
          ),
        );
      } finally {
        setSavingType(null);
      }
    },
    [],
  );

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={WEB.greenBright} />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <MaterialCommunityIcons
          name="lightning-bolt"
          size={18}
          color={WEB.greenBright}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>Gamification</Text>
          <Text style={styles.title}>Point values</Text>
          <Text style={styles.subtitle}>
            Adjust how many points each activity awards. Changes apply to
            future events only.
          </Text>
        </View>
      </View>

      {rows.map((row) => {
        const isSaving = savingType === row.eventType;
        return (
          <View key={row.eventType} style={styles.row}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text style={styles.rowSub}>{row.eventType}</Text>
            </View>
            <View style={styles.pointsInputWrap}>
              <TextInput
                value={drafts[row.eventType] ?? String(row.points)}
                onChangeText={(v) =>
                  setDrafts((d) => ({
                    ...d,
                    [row.eventType]: v.replace(/[^0-9]/g, ''),
                  }))
                }
                keyboardType="number-pad"
                style={styles.pointsInput}
              />
              <Text style={styles.pointsInputSuffix}>pts</Text>
            </View>
            <Pressable
              onPress={() => void onToggleEnabled(row)}
              disabled={isSaving}
              style={[
                styles.toggleBtn,
                row.enabled ? styles.toggleOn : styles.toggleOff,
              ]}
            >
              <Text
                style={[
                  styles.toggleText,
                  { color: row.enabled ? '#04130d' : 'rgba(255,255,255,0.65)' },
                ]}
              >
                {row.enabled ? 'ON' : 'OFF'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => void onSave(row)}
              disabled={
                isSaving ||
                Number(drafts[row.eventType] ?? row.points) === row.points
              }
              style={styles.saveBtn}
            >
              {isSaving ? (
                <ActivityIndicator color="#04130d" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  eyebrow: {
    color: WEB.greenBright,
    fontFamily: FF.bold,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: WEB.white,
    fontFamily: FF.bold,
    fontSize: 18,
    marginTop: 2,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.55)',
    fontFamily: FF.regular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 12,
  },
  rowLabel: {
    color: WEB.white,
    fontFamily: FF.semiBold,
    fontSize: 13,
  },
  rowSub: {
    color: 'rgba(255,255,255,0.45)',
    fontFamily: FF.regular,
    fontSize: 10,
  },
  pointsInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pointsInput: {
    color: WEB.white,
    fontFamily: FF.semiBold,
    fontSize: 13,
    minWidth: 32,
    textAlign: 'center',
    padding: 0,
  },
  pointsInputSuffix: {
    color: 'rgba(255,255,255,0.55)',
    fontFamily: FF.semiBold,
    fontSize: 11,
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  toggleOn: {
    backgroundColor: WEB.greenBright,
    borderColor: WEB.greenBright,
  },
  toggleOff: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  toggleText: {
    fontFamily: FF.bold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  saveBtn: {
    backgroundColor: WEB.greenBright,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 60,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#04130d',
    fontFamily: FF.bold,
    fontSize: 12,
  },
});
