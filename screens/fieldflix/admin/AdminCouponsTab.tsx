import { FF } from '@/screens/fieldflix/fonts';
import { WEB } from '@/screens/fieldflix/webDesign';
import {
  adminCreateCoupon,
  adminDeleteCoupon,
  adminListCoupons,
  adminListRedemptions,
  adminUpdateCoupon,
  type AdminCoupon,
} from '@/lib/fieldflix-api';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

/**
 * Admin → Coupons tab.
 *
 * Three sections stacked in one tab:
 *   1. Coupon list + "+ New" CTA — create, edit (label / discount /
 *      maxRecordings / validity / enabled), delete.
 *   2. Recent redemptions — last 30, newest first.
 *
 * Auto-assign rules are managed inline on the Coupons row (via the side
 * menu) to keep the layout breathable on a mobile screen.
 */
export function AdminCouponsTab() {
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<AdminCoupon> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cs, rs] = await Promise.all([
        adminListCoupons(),
        adminListRedemptions(30).catch(() => [] as unknown[]),
      ]);
      setCoupons(cs);
      setRedemptions(Array.isArray(rs) ? (rs as any[]) : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onCreate = useCallback(() => {
    setEditing({
      code: '',
      label: '',
      discountPercent: 10,
      maxRecordings: 1,
      startsAt: null,
      expiresAt: null,
      enabled: true,
    });
  }, []);

  const onEdit = useCallback((c: AdminCoupon) => {
    setEditing(c);
  }, []);

  const onSave = useCallback(async () => {
    if (!editing) return;
    if (
      !editing.code?.trim() ||
      !editing.label?.trim() ||
      !editing.discountPercent ||
      editing.discountPercent < 1 ||
      editing.discountPercent > 100 ||
      !editing.maxRecordings ||
      editing.maxRecordings < 1
    ) {
      Alert.alert('Invalid', 'Fill code, label, 1–100% discount, and ≥1 uses.');
      return;
    }
    setSaving(true);
    try {
      if ((editing as AdminCoupon).id) {
        await adminUpdateCoupon((editing as AdminCoupon).id, editing);
      } else {
        await adminCreateCoupon({
          code: editing.code as string,
          label: editing.label as string,
          discountPercent: editing.discountPercent as number,
          maxRecordings: editing.maxRecordings as number,
          startsAt: editing.startsAt ?? undefined,
          expiresAt: editing.expiresAt ?? undefined,
          enabled: editing.enabled,
        });
      }
      setEditing(null);
      await load();
    } catch (err) {
      Alert.alert(
        'Save failed',
        (err && (err as any).message) || 'Could not save coupon.',
      );
    } finally {
      setSaving(false);
    }
  }, [editing, load]);

  const onDelete = useCallback(
    async (c: AdminCoupon) => {
      Alert.alert('Delete coupon', `Delete ${c.code}? This can't be undone.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminDeleteCoupon(c.id);
              await load();
            } catch {
              Alert.alert('Failed', 'Could not delete coupon.');
            }
          },
        },
      ]);
    },
    [load],
  );

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={WEB.greenBright} />
      </View>
    );
  }

  return (
    <View style={{ gap: 14 }}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <MaterialCommunityIcons
            name="ticket-percent"
            size={18}
            color={WEB.greenBright}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>Discounts</Text>
            <Text style={styles.title}>Coupons</Text>
            <Text style={styles.subtitle}>
              Issue percentage-based discounts that users redeem at unlock.
            </Text>
          </View>
          <Pressable style={styles.newBtn} onPress={onCreate}>
            <MaterialCommunityIcons name="plus" size={16} color="#04130d" />
            <Text style={styles.newBtnText}>New</Text>
          </Pressable>
        </View>

        {coupons.length === 0 ? (
          <Text style={styles.empty}>
            No coupons yet. Create one to start handing out discounts.
          </Text>
        ) : (
          coupons.map((c) => (
            <View key={c.id} style={styles.couponRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.codeRow}>
                  <Text style={styles.code}>{c.code}</Text>
                  <Text style={styles.pct}>{c.discountPercent}% OFF</Text>
                  {!c.enabled ? (
                    <Text style={styles.disabledChip}>DISABLED</Text>
                  ) : null}
                </View>
                <Text style={styles.couponLabel} numberOfLines={2}>
                  {c.label}
                </Text>
                <Text style={styles.couponMeta}>
                  {c.maxRecordings} use
                  {c.maxRecordings === 1 ? '' : 's'} per assignment ·{' '}
                  {c.expiresAt
                    ? `expires ${new Date(c.expiresAt).toLocaleDateString()}`
                    : 'no expiry'}
                </Text>
              </View>
              <Pressable style={styles.editBtn} onPress={() => onEdit(c)}>
                <MaterialCommunityIcons
                  name="pencil"
                  size={14}
                  color={WEB.white}
                />
              </Pressable>
              <Pressable style={styles.deleteBtn} onPress={() => onDelete(c)}>
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={14}
                  color="#fb7185"
                />
              </Pressable>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.headerRow}>
          <MaterialCommunityIcons
            name="history"
            size={18}
            color={WEB.greenBright}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>Activity</Text>
            <Text style={styles.title}>Recent redemptions</Text>
          </View>
        </View>
        {redemptions.length === 0 ? (
          <Text style={styles.empty}>No redemptions yet.</Text>
        ) : (
          redemptions.map((r: any) => (
            <View key={r?.id} style={styles.redemptionRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.redemptionWho} numberOfLines={1}>
                  {r?.user?.name ?? r?.userId?.slice(0, 8) ?? 'User'}
                </Text>
                <Text style={styles.redemptionWhen}>
                  {r?.createdAt
                    ? new Date(r.createdAt).toLocaleString()
                    : ''}{' '}
                  · {r?.coupon?.code ?? ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.redemptionStrike}>
                  ₹{r?.basePriceInr}
                </Text>
                <Text style={styles.redemptionFinal}>
                  ₹{r?.discountedPriceInr}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      <Modal
        visible={!!editing}
        transparent
        animationType="slide"
        onRequestClose={() => setEditing(null)}
      >
        <View style={styles.modalScrim}>
          <View style={styles.modalCard}>
            <ScrollView>
              <Text style={styles.modalTitle}>
                {(editing as AdminCoupon)?.id ? 'Edit coupon' : 'New coupon'}
              </Text>

              <Field label="Code">
                <TextInput
                  value={editing?.code ?? ''}
                  onChangeText={(v) =>
                    setEditing((e) => ({ ...e, code: v.toUpperCase() }))
                  }
                  placeholder="GAMEON25"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  style={styles.input}
                  autoCapitalize="characters"
                  maxLength={30}
                />
              </Field>

              <Field label="Label">
                <TextInput
                  value={editing?.label ?? ''}
                  onChangeText={(v) =>
                    setEditing((e) => ({ ...e, label: v }))
                  }
                  placeholder="Top-3 weekly winners"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  style={styles.input}
                  maxLength={200}
                />
              </Field>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Field label="Discount %">
                    <TextInput
                      value={String(editing?.discountPercent ?? '')}
                      onChangeText={(v) =>
                        setEditing((e) => ({
                          ...e,
                          discountPercent: Number(v.replace(/[^0-9]/g, '')) || 0,
                        }))
                      }
                      keyboardType="number-pad"
                      style={styles.input}
                    />
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Max uses per user">
                    <TextInput
                      value={String(editing?.maxRecordings ?? '')}
                      onChangeText={(v) =>
                        setEditing((e) => ({
                          ...e,
                          maxRecordings: Number(v.replace(/[^0-9]/g, '')) || 0,
                        }))
                      }
                      keyboardType="number-pad"
                      style={styles.input}
                    />
                  </Field>
                </View>
              </View>

              <Field label="Starts at (ISO, optional)">
                <TextInput
                  value={editing?.startsAt ?? ''}
                  onChangeText={(v) =>
                    setEditing((e) => ({ ...e, startsAt: v || null }))
                  }
                  placeholder="2026-06-01T00:00:00Z"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  style={styles.input}
                  autoCapitalize="none"
                />
              </Field>

              <Field label="Expires at (ISO, optional)">
                <TextInput
                  value={editing?.expiresAt ?? ''}
                  onChangeText={(v) =>
                    setEditing((e) => ({ ...e, expiresAt: v || null }))
                  }
                  placeholder="2026-12-31T23:59:59Z"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  style={styles.input}
                  autoCapitalize="none"
                />
              </Field>

              <View style={styles.enabledRow}>
                <Text style={styles.fieldLabel}>Enabled</Text>
                <Switch
                  value={editing?.enabled ?? true}
                  onValueChange={(v) =>
                    setEditing((e) => ({ ...e, enabled: v }))
                  }
                  trackColor={{ false: '#374151', true: WEB.greenBright }}
                  thumbColor="#fff"
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setEditing(null)}
                disabled={saving}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, saving && { opacity: 0.55 }]}
                onPress={() => void onSave()}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#04130d" />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
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
    gap: 12,
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
    marginTop: 4,
    lineHeight: 17,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: WEB.greenBright,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  newBtnText: {
    color: '#04130d',
    fontFamily: FF.bold,
    fontSize: 12,
  },
  empty: {
    color: 'rgba(255,255,255,0.55)',
    fontFamily: FF.regular,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
  },
  couponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 12,
    padding: 12,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  code: {
    color: WEB.white,
    fontFamily: FF.bold,
    fontSize: 14,
    letterSpacing: 1.2,
  },
  pct: {
    color: WEB.greenBright,
    fontFamily: FF.bold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  disabledChip: {
    color: '#fb7185',
    backgroundColor: 'rgba(244,63,94,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontFamily: FF.bold,
    fontSize: 9,
    borderRadius: 4,
    letterSpacing: 0.5,
  },
  couponLabel: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: FF.semiBold,
    fontSize: 12,
    marginTop: 4,
  },
  couponMeta: {
    color: 'rgba(255,255,255,0.45)',
    fontFamily: FF.regular,
    fontSize: 11,
    marginTop: 2,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(244,63,94,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  redemptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 10,
    padding: 10,
    gap: 10,
  },
  redemptionWho: {
    color: WEB.white,
    fontFamily: FF.semiBold,
    fontSize: 13,
  },
  redemptionWhen: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: FF.regular,
    fontSize: 11,
    marginTop: 2,
  },
  redemptionStrike: {
    color: 'rgba(255,255,255,0.45)',
    textDecorationLine: 'line-through',
    fontSize: 11,
    fontFamily: FF.semiBold,
  },
  redemptionFinal: {
    color: WEB.greenBright,
    fontFamily: FF.bold,
    fontSize: 14,
  },
  modalScrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '85%',
  },
  modalTitle: {
    color: WEB.white,
    fontFamily: FF.bold,
    fontSize: 18,
    marginBottom: 4,
  },
  fieldLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontFamily: FF.semiBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 10,
    color: WEB.white,
    fontFamily: FF.semiBold,
    fontSize: 13,
  },
  enabledRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: 'rgba(255,255,255,0.75)',
    fontFamily: FF.semiBold,
    fontSize: 13,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: WEB.greenBright,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#04130d',
    fontFamily: FF.bold,
    fontSize: 13,
  },
});
