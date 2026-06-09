import { submitHighlightAsFlickShort } from '@/lib/fieldflix-api';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const ACCENT = '#22C55E';
const MUTED = '#94a3b8';
const SHEET_BG = '#0f172a';

interface Props {
  visible: boolean;
  onClose: () => void;
  highlightId: string | null;
  /**
   * Optional pre-filled default for the title input (e.g. recording title +
   * Highlight #N). Empty → the placeholder text is shown.
   */
  defaultTitle?: string;
}

/**
 * "Submit this highlight to FlickShorts" bottom sheet.
 *
 * Submission flow:
 *   1. User taps the 3-dot on a highlight card → this sheet opens.
 *   2. User picks a title and (optional) top / bottom overlay text.
 *   3. Submit → `POST /flick-shorts/from-highlight/:id` with the body.
 *   4. Backend creates an unapproved FlickShort row and queues it for admin
 *      review. Confirmation toast on success.
 *
 * Notes:
 *   - The vertical 9:16 framing with black bars top/bottom is handled by
 *     the existing FlickShorts player component when this short eventually
 *     appears in the public feed — no extra work needed here.
 *   - We deliberately don't expose `startSec` / `endSec` here. The backend
 *     derives the 15s window from the highlight's button-click timestamp;
 *     letting the user fiddle with frame numbers would complicate the UX
 *     for very little gain. A future "trim" affordance can live on top.
 */
export const SubmitToFlickShortSheet: React.FC<Props> = ({
  visible,
  onClose,
  highlightId,
  defaultTitle,
}) => {
  const [title, setTitle] = useState('');
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<
    | { kind: 'idle' }
    | { kind: 'success'; message: string }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' });

  useEffect(() => {
    if (visible) {
      // Fresh state every time the sheet re-opens. Saves the user from
      // resubmitting the same title twice by accident.
      setTitle(defaultTitle ?? '');
      setTopText('');
      setBottomText('');
      setSubmitting(false);
      setFeedback({ kind: 'idle' });
    }
  }, [visible, defaultTitle]);

  const onSubmit = useCallback(async () => {
    const cleanTitle = title.trim();
    if (!highlightId || !cleanTitle) {
      setFeedback({ kind: 'error', message: 'A title is required.' });
      return;
    }
    setSubmitting(true);
    setFeedback({ kind: 'idle' });
    try {
      await submitHighlightAsFlickShort(highlightId, {
        title: cleanTitle,
        topText: topText.trim() || undefined,
        bottomText: bottomText.trim() || undefined,
      });
      setFeedback({
        kind: 'success',
        message:
          "Submitted! An admin will review your FlickShort and approve it soon.",
      });
    } catch (err) {
      const detail =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Try again in a moment.';
      setFeedback({
        kind: 'error',
        message: `Could not submit. ${detail}`,
      });
    } finally {
      setSubmitting(false);
    }
  }, [highlightId, title, topText, bottomText]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.scrim} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Ionicons name="film-outline" size={20} color={ACCENT} />
            <Text style={styles.heading}>Submit to FlickShorts</Text>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={MUTED} />
            </Pressable>
          </View>
          <Text style={styles.subhead}>
            Your highlight will appear in the public feed once an admin
            approves it. Black bars above and below get added automatically.
          </Text>

          <Text style={styles.label}>Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="My monster smash"
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={styles.input}
            maxLength={120}
            editable={!submitting && feedback.kind !== 'success'}
          />

          <Text style={styles.label}>Top caption (optional)</Text>
          <TextInput
            value={topText}
            onChangeText={setTopText}
            placeholder="Game point"
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={styles.input}
            maxLength={80}
            editable={!submitting && feedback.kind !== 'success'}
          />

          <Text style={styles.label}>Bottom caption (optional)</Text>
          <TextInput
            value={bottomText}
            onChangeText={setBottomText}
            placeholder="Eskay Resort · Court 1"
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={styles.input}
            maxLength={80}
            editable={!submitting && feedback.kind !== 'success'}
          />

          {feedback.kind === 'error' ? (
            <View style={[styles.feedback, styles.feedbackError]}>
              <Ionicons name="alert-circle" size={16} color="#fda4af" />
              <Text style={styles.feedbackText}>{feedback.message}</Text>
            </View>
          ) : null}
          {feedback.kind === 'success' ? (
            <View style={[styles.feedback, styles.feedbackOk]}>
              <Ionicons name="checkmark-circle" size={16} color="#86efac" />
              <Text style={styles.feedbackText}>{feedback.message}</Text>
            </View>
          ) : null}

          {feedback.kind === 'success' ? (
            <Pressable style={styles.submitBtn} onPress={onClose}>
              <Text style={styles.submitText}>Done</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[
                styles.submitBtn,
                (!title.trim() || submitting) && styles.submitBtnDisabled,
              ]}
              disabled={!title.trim() || submitting}
              onPress={onSubmit}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="send" size={14} color="#fff" />
                  <Text style={styles.submitText}>Submit to FlickShorts</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: SHEET_BG,
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  heading: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
    flex: 1,
  },
  closeBtn: { padding: 4 },
  subhead: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  label: {
    color: MUTED,
    fontSize: 11,
    letterSpacing: 0.6,
    marginTop: 10,
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    color: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    fontSize: 14,
  },
  feedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 14,
  },
  feedbackError: {
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderColor: 'rgba(248,113,113,0.35)',
    borderWidth: 1,
  },
  feedbackOk: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderColor: 'rgba(34,197,94,0.35)',
    borderWidth: 1,
  },
  feedbackText: {
    color: '#fff',
    fontSize: 12,
    flex: 1,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 18,
  },
  submitBtnDisabled: {
    opacity: 0.55,
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.3,
  },
});
