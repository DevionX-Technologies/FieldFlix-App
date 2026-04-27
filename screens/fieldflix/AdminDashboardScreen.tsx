import { Paths } from '@/data/paths';
import { FF } from '@/screens/fieldflix/fonts';
import { WebShell } from '@/screens/fieldflix/WebShell';
import { WEB } from '@/screens/fieldflix/webDesign';
import { useIsAdminRole } from '@/hooks/useIsAdminRole';
import {
  addAdminByPhone,
  approveFlickShort,
  createFlickShort,
  getAdminFlickShorts,
  getAdminPhoneList,
  getAllUsers,
  getFieldflixApiErrorMessage,
  getRecordingById,
  removeAdminPhone,
  type AdminPhoneRow,
  type FlickShortDto,
} from '@/lib/fieldflix-api';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { isAdmin, isLoading: authLoading } = useIsAdminRole();

  const [userCount, setUserCount] = useState<number | null>(null);
  const [shorts, setShorts] = useState<FlickShortDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [recordingId, setRecordingId] = useState('');
  const [loadedLabel, setLoadedLabel] = useState<string | null>(null);
  const [muxOk, setMuxOk] = useState<boolean | null>(null);
  const [sport, setSport] = useState<'pickleball' | 'padel' | 'cricket'>('pickleball');
  const [aspect, setAspect] = useState<'9:16' | '16:9'>('9:16');
  const [title, setTitle] = useState('');
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadRecBusy, setLoadRecBusy] = useState(false);
  const [startSecStr, setStartSecStr] = useState('0');
  const [endSecStr, setEndSecStr] = useState('15');
  const [adminPhones, setAdminPhones] = useState<AdminPhoneRow[]>([]);
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);

  const load = useCallback(async () => {
    try {
      const [users, list, phones] = await Promise.all([
        getAllUsers(),
        getAdminFlickShorts(),
        getAdminPhoneList().catch(() => [] as AdminPhoneRow[]),
      ]);
      setUserCount(Array.isArray(users) ? users.length : 0);
      setShorts(list);
      setAdminPhones(phones);
    } catch (e) {
      Alert.alert('Error', getFieldflixApiErrorMessage(e, 'Failed to load admin data'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      router.replace(Paths.home);
      return;
    }
    void load();
  }, [authLoading, isAdmin, load, router]);

  const onLoadRecording = async () => {
    const id = recordingId.trim();
    if (!id) {
      Alert.alert('Recording', 'Enter a recording UUID');
      return;
    }
    setLoadRecBusy(true);
    setLoadedLabel(null);
    setMuxOk(null);
    try {
      const rec = (await getRecordingById(id)) as {
        id?: string;
        mux_playback_id?: string | null;
        turf?: { name?: string } | null;
        metadata?: { arena?: string } | null;
      };
      const name =
        rec.turf?.name ?? (rec.metadata as { arenaName?: string } | undefined)?.arenaName;
      setLoadedLabel(name ? `${name}` : 'Recording found');
      setMuxOk(!!rec.mux_playback_id);
      if (!rec.mux_playback_id) {
        Alert.alert(
          'Not ready',
          'This recording does not have a Mux playback id yet. Wait until processing completes.',
        );
      }
    } catch (e) {
      setLoadedLabel(null);
      setMuxOk(false);
      Alert.alert('Error', getFieldflixApiErrorMessage(e, 'Could not load recording'));
    } finally {
      setLoadRecBusy(false);
    }
  };

  const onCreate = async () => {
    const id = recordingId.trim();
    if (!id) {
      Alert.alert('Recording', 'Enter a recording UUID and load it');
      return;
    }
    if (muxOk === false) {
      Alert.alert('Recording', 'Recording must be stream-ready (Mux) before creating a FlickShort.');
      return;
    }
    const start = Number.parseFloat(String(startSecStr).replace(',', '.'));
    const end = Number.parseFloat(String(endSecStr).replace(',', '.'));
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      Alert.alert('Clip', 'Start and end must be valid numbers (seconds).');
      return;
    }
    if (end <= start) {
      Alert.alert('Clip', 'End time must be greater than start time.');
      return;
    }
    if (end - start > 15 + 1e-6) {
      Alert.alert('Clip', 'FlickShorts can be 15 seconds or less. Reduce the time window.');
      return;
    }
    setSubmitting(true);
    try {
      await createFlickShort({
        recordingId: id,
        sport,
        title: title.trim(),
        topText: topText.trim(),
        bottomText: bottomText.trim(),
        aspect,
        startSec: start,
        endSec: end,
      });
      setTitle('');
      setTopText('');
      setBottomText('');
      await load();
      Alert.alert('Created', 'FlickShort saved as pending. Approve it below to publish.');
    } catch (e) {
      Alert.alert('Error', getFieldflixApiErrorMessage(e, 'Create failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const onApprove = async (s: FlickShortDto) => {
    try {
      await approveFlickShort(s.id, true);
      await load();
    } catch (e) {
      Alert.alert('Error', getFieldflixApiErrorMessage(e, 'Approve failed'));
    }
  };

  if (authLoading || (!authLoading && !isAdmin)) {
    return (
      <WebShell backgroundColor={WEB.homeBg}>
        <View style={styles.center}>
          <ActivityIndicator color={WEB.greenBright} />
        </View>
      </WebShell>
    );
  }

  return (
    <WebShell backgroundColor={WEB.homeBg}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={28} color="rgba(255,255,255,0.85)" />
        </Pressable>
        <Text style={styles.topTitle}>Admin</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={WEB.greenBright}
          />
        }
      >
        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} color={WEB.greenBright} />
        ) : null}

        <Text style={styles.h2}>Overview</Text>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Total users (directory)</Text>
          <Text style={styles.cardValue}>
            {userCount != null ? String(userCount) : '—'}
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Analytics</Text>
          <Text style={styles.cardMuted}>
            Plays, retention, and revenue charts can plug in here. For now this card is a placeholder
            for your product analytics back end.
          </Text>
        </View>

        <Text style={styles.h2}>Admins</Text>
        <Text style={styles.p}>
          Add or remove extra admins by mobile number (last 10 digits are matched at login).{' '}
          <Text style={{ fontFamily: FF.semiBold, color: WEB.greenBright }}>
            9321538768
          </Text>{' '}
          is always a super-admin from code, even if removed from the list below.
        </Text>
        {adminPhones.map((row) => (
          <View key={row.id} style={styles.rowCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>…{row.phoneLast10}</Text>
              <Text style={styles.rowSub}>Added {new Date(row.createdAt).toLocaleString()}</Text>
            </View>
            <Pressable
              onPress={() => {
                Alert.alert('Remove admin', `Remove …${row.phoneLast10}?`, [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => {
                      void (async () => {
                        try {
                          await removeAdminPhone(row.phoneLast10);
                          await load();
                        } catch (e) {
                          Alert.alert('Error', getFieldflixApiErrorMessage(e, 'Remove failed'));
                        }
                      })();
                    },
                  },
                ]);
              }}
              style={styles.removePill}
            >
              <Text style={styles.removeTxt}>Remove</Text>
            </Pressable>
          </View>
        ))}
        <Text style={styles.label}>New admin phone</Text>
        <TextInput
          value={newAdminPhone}
          onChangeText={setNewAdminPhone}
          placeholder="e.g. 9198xxxxxxxx or +91…"
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={styles.input}
          keyboardType="phone-pad"
        />
        <Pressable
          onPress={() => {
            const raw = newAdminPhone.trim();
            if (!raw) {
              Alert.alert('Phone', 'Enter a number');
              return;
            }
            setAddingAdmin(true);
            void (async () => {
              try {
                await addAdminByPhone(raw);
                setNewAdminPhone('');
                await load();
                Alert.alert('Done', 'Admin access granted for that number.');
              } catch (e) {
                Alert.alert('Error', getFieldflixApiErrorMessage(e, 'Could not add admin'));
              } finally {
                setAddingAdmin(false);
              }
            })();
          }}
          style={[styles.btnSecondary, { marginTop: 8, alignSelf: 'flex-start' }]}
          disabled={addingAdmin}
        >
          {addingAdmin ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnSecondaryTxt}>Add admin</Text>
          )}
        </Pressable>

        <Text style={styles.h2}>Create FlickShort</Text>
        <Text style={styles.p}>
          Pull from any completed recording. You can add multiple FlickShorts from the same recording
          with different aspect ratios and copy.
        </Text>
        <Text style={styles.label}>Recording ID (UUID)</Text>
        <TextInput
          value={recordingId}
          onChangeText={setRecordingId}
          placeholder="Paste recording id"
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={styles.input}
          autoCapitalize="none"
        />
        <View style={styles.rowBtn}>
          <Pressable
            onPress={onLoadRecording}
            style={styles.btnSecondary}
            disabled={loadRecBusy}
          >
            {loadRecBusy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnSecondaryTxt}>Load recording</Text>
            )}
          </Pressable>
        </View>
        {loadedLabel ? <Text style={styles.okText}>{loadedLabel}</Text> : null}
        {muxOk === true ? <Text style={styles.okText}>Mux playback: ready</Text> : null}
        {muxOk === false ? <Text style={styles.warnText}>Mux playback: not ready</Text> : null}

        <Text style={styles.label}>Sport</Text>
        <View style={styles.chips}>
          {(
            [
              ['pickleball', 'Pickleball'],
              ['padel', 'Padel'],
              ['cricket', 'Cricket'],
            ] as const
          ).map(([k, label]) => (
            <Pressable
              key={k}
              onPress={() => setSport(k)}
              style={[styles.chip, sport === k && styles.chipOn]}
            >
              <Text style={[styles.chipTxt, sport === k && styles.chipTxtOn]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Format</Text>
        <View style={styles.chips}>
          {(
            [
              ['9:16', 'Mobile (9:16)'],
              ['16:9', 'Rectangular (16:9)'],
            ] as const
          ).map(([k, label]) => (
            <Pressable
              key={k}
              onPress={() => setAspect(k)}
              style={[styles.chip, aspect === k && styles.chipOn]}
            >
              <Text style={[styles.chipTxt, aspect === k && styles.chipTxtOn]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        {aspect === '16:9' ? (
          <Text style={styles.p}>
            16:9 uses black letterboxing; place copy in the top and bottom bands.
          </Text>
        ) : null}

        <Text style={styles.label}>Clip window (seconds, max 15s)</Text>
        <Text style={styles.p}>
          Playback loops between start and end on the source recording. The difference must be 15
          seconds or less.
        </Text>
        <View style={styles.rowTwo}>
          <View style={styles.halfField}>
            <Text style={styles.label}>Start (s)</Text>
            <TextInput
              value={startSecStr}
              onChangeText={setStartSecStr}
              placeholder="0"
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={styles.input}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.label}>End (s)</Text>
            <TextInput
              value={endSecStr}
              onChangeText={setEndSecStr}
              placeholder="15"
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={styles.input}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <Text style={styles.label}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Headline on the Flick"
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={styles.input}
        />
        <Text style={styles.label}>Top text{aspect === '9:16' ? ' (overlay)' : ' (top band)'}</Text>
        <TextInput
          value={topText}
          onChangeText={setTopText}
          placeholder="Optional"
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={[styles.input, styles.tallInput]}
          multiline
        />
        <Text style={styles.label}>Bottom text{aspect === '9:16' ? ' (overlay)' : ' (bottom band)'}</Text>
        <TextInput
          value={bottomText}
          onChangeText={setBottomText}
          placeholder="Optional"
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={[styles.input, styles.tallInput]}
          multiline
        />

        <Pressable
          onPress={onCreate}
          style={[styles.btnPrimary, submitting && { opacity: 0.6 }]}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#04130d" />
          ) : (
            <Text style={styles.btnPrimaryTxt}>Save as pending</Text>
          )}
        </Pressable>

        <Text style={styles.h2}>Pending & published</Text>
        {shorts.length === 0 ? (
          <Text style={styles.p}>No FlickShorts yet.</Text>
        ) : (
          shorts.map((s) => (
            <View key={s.id} style={styles.rowCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={2}>
                  {s.title || s.id}
                </Text>
                <Text style={styles.rowSub}>
                  {s.sport} · {s.aspect} ·{' '}
                  {typeof s.startSec === 'number' && typeof s.endSec === 'number'
                    ? `${s.startSec}–${s.endSec}s · `
                    : ''}
                  {s.approved ? 'Live' : 'Pending'}
                </Text>
              </View>
              {!s.approved ? (
                <Pressable onPress={() => onApprove(s)} style={styles.approvePill}>
                  <Text style={styles.approveTxt}>Approve</Text>
                </Pressable>
              ) : null}
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </WebShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FF.bold,
    fontSize: 18,
    color: WEB.white,
  },
  scroll: { padding: 16, paddingBottom: 48 },
  h2: {
    fontFamily: FF.bold,
    fontSize: 18,
    color: WEB.white,
    marginTop: 8,
    marginBottom: 10,
  },
  p: {
    fontFamily: FF.regular,
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 14,
    marginBottom: 10,
  },
  cardLabel: { fontFamily: FF.medium, color: 'rgba(255,255,255,0.65)', fontSize: 12 },
  cardValue: { fontFamily: FF.extraBold, fontSize: 28, color: WEB.greenBright, marginTop: 4 },
  cardMuted: { fontFamily: FF.regular, fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 6 },
  label: { fontFamily: FF.medium, fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 10 },
  input: {
    marginTop: 6,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: WEB.white,
    fontFamily: FF.regular,
  },
  tallInput: { minHeight: 64, textAlignVertical: 'top' },
  rowBtn: { marginTop: 8 },
  btnSecondary: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnSecondaryTxt: { color: '#fff', fontFamily: FF.semiBold },
  okText: { marginTop: 8, color: WEB.greenBright, fontFamily: FF.medium, fontSize: 13 },
  warnText: { marginTop: 8, color: '#f97316', fontFamily: FF.medium, fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  chipOn: { backgroundColor: 'rgba(34,197,94,0.2)', borderColor: WEB.greenBright },
  chipTxt: { fontFamily: FF.medium, fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  chipTxtOn: { color: WEB.greenBright },
  btnPrimary: {
    marginTop: 16,
    backgroundColor: WEB.greenBright,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnPrimaryTxt: { fontFamily: FF.bold, color: '#04130d', fontSize: 16 },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 8,
    gap: 8,
  },
  rowTitle: { fontFamily: FF.semiBold, color: '#fff', fontSize: 14 },
  rowSub: { fontFamily: FF.regular, color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 2 },
  approvePill: {
    backgroundColor: 'rgba(34,197,94,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  approveTxt: { color: WEB.greenBright, fontFamily: FF.semiBold, fontSize: 12 },
  rowTwo: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  halfField: { flex: 1, minWidth: 0 },
  removePill: {
    backgroundColor: 'rgba(244, 63, 94, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  removeTxt: { color: '#fb7185', fontFamily: FF.semiBold, fontSize: 12 },
});
