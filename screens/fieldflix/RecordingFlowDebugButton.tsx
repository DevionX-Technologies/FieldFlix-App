import { FF } from '@/screens/fieldflix/fonts';
import {
  clearRecordingFlowDebug,
  getRecordingFlowDebugEntryCount,
  getRecordingFlowDebugExport,
} from '@/utils/recordingFlowDebug';
import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MUTED = '#9ca3af';
const ACCENT = '#4ade80';

export function RecordingFlowDebugButton() {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const text = useMemo(() => getRecordingFlowDebugExport(), [open, refresh]);
  const n = useMemo(() => getRecordingFlowDebugEntryCount(), [open, refresh]);

  const bump = useCallback(() => setRefresh((x) => x + 1), []);

  const onCopy = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(getRecordingFlowDebugExport());
      Alert.alert('Copied', 'Recording debug JSON copied to clipboard.');
    } catch {
      Alert.alert('Copy failed', 'Could not copy to the clipboard.');
    }
    bump();
  }, [bump]);

  const onClear = useCallback(() => {
    clearRecordingFlowDebug();
    bump();
    setOpen(false);
  }, [bump]);

  return (
    <>
      <Pressable
        onPress={() => {
          bump();
          setOpen(true);
        }}
        accessibilityLabel="Open recording debug log"
        style={styles.pill}
        hitSlop={8}
      >
        <Text style={styles.pillText}>
          Debug log{n > 0 ? ` (${n})` : ''}
        </Text>
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <View
            style={[styles.sheet, { paddingBottom: Math.max(16, insets.bottom + 12) }]}
          >
          <Text style={styles.title}>Recording flow debug</Text>
          <Text style={styles.sub}>
            QR payload, turf fetch, and /recording/start request/response. Copy and send to
            support.
          </Text>
          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            <Text selectable style={styles.mono}>
              {text}
            </Text>
          </ScrollView>
          <View style={styles.row}>
            <Pressable style={[styles.btn, styles.btnGhost]} onPress={onClear}>
              <Text style={styles.btnGhostTxt}>Clear log</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onCopy}>
              <Text style={styles.btnPrimaryTxt}>Copy JSON</Text>
            </Pressable>
          </View>
          <Pressable onPress={() => setOpen(false)} style={styles.close}>
            <Text style={styles.closeTxt}>Close</Text>
          </Pressable>
        </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'center',
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  pillText: {
    fontFamily: FF.semiBold,
    fontSize: 13,
    color: MUTED,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    marginTop: 'auto',
    maxHeight: '88%',
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  title: {
    fontFamily: FF.bold,
    fontSize: 18,
    color: '#fff',
    marginBottom: 6,
  },
  sub: {
    fontFamily: FF.regular,
    fontSize: 13,
    color: MUTED,
    marginBottom: 12,
    lineHeight: 18,
  },
  scroll: {
    maxHeight: 420,
    marginBottom: 12,
    backgroundColor: '#020617',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 12,
  },
  mono: {
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 16,
    color: '#e2e8f0',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'stretch',
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: ACCENT,
  },
  btnPrimaryTxt: {
    fontFamily: FF.bold,
    fontSize: 15,
    color: '#052e16',
  },
  btnGhost: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'transparent',
  },
  btnGhostTxt: {
    fontFamily: FF.semiBold,
    fontSize: 14,
    color: '#e2e8f0',
  },
  close: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
  closeTxt: {
    fontFamily: FF.semiBold,
    fontSize: 14,
    color: MUTED,
  },
});
