import { Card } from "@/components/ui/card";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { createShareLink } from "@/lib/fieldflix-api";
import { buildHighlightsAppLink } from "@/utils/highlightsAppLink";
import { shareHighlightAsMp4File } from "@/utils/shareHighlightClip";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  View
} from "react-native";
import { RecordingHighlight } from "../type";
import { formatDate, getStatusColor } from "../utils/formatters";
import { getThumbnailUrl } from "../utils/thumbnailUtils";
import { SubmitToFlickShortSheet } from "./SubmitToFlickShortSheet";

interface HighlightCardProps {
  highlight: RecordingHighlight;
  index: number;
  isActive: boolean;
  onPress: (highlight: RecordingHighlight, index: number) => void;
  isMainVideo?: boolean;
  mainVideoTitle?: string;
  /** Real recording UUID for sharing the full match (not the placeholder `original` row id). */
  shareRecordingId?: string | null;
  /** Per-recording unlock / plan gate — same truth as Highlights hero share. */
  allowShare?: boolean;
}

export const HighlightCard: React.FC<HighlightCardProps> = ({
  highlight,
  index,
  isActive,
  onPress,
  isMainVideo = false,
  mainVideoTitle,
  shareRecordingId = null,
  allowShare = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({
    type: 'info' as 'info' | 'success' | 'error' | 'loading',
    title: '',
    message: '',
    showCloseButton: true
  });
  /** "Submit to FlickShorts" sheet, opened from the 3-dot menu on this card. */
  const [submitSheetOpen, setSubmitSheetOpen] = useState(false);

  const showCustomAlert = (type: 'info' | 'success' | 'error' | 'loading', title: string, message: string, showCloseButton = true) => {
    setModalContent({ type, title, message, showCloseButton });
    setModalVisible(true);
  };

  const hideCustomAlert = () => {
    setModalVisible(false);
  };
  const handlePress = () => {
    if (highlight.mux_public_playback_url) {
      onPress(highlight, index);
    } else {
    }
  };

  // Determine if this highlight can be played
  const canPlay = highlight.mux_public_playback_url;
  const hid = String(highlight.id ?? '');
  const isFlickShort = hid.startsWith('flick-');
  const recordingIdForLink =
    (shareRecordingId && String(shareRecordingId).trim()) ||
    (highlight as { recording_id?: string }).recording_id ||
    (highlight as { recordingId?: string }).recordingId ||
    null;
  const showShare =
    allowShare &&
    canPlay &&
    !isFlickShort &&
    (isMainVideo
      ? Boolean(recordingIdForLink && recordingIdForLink !== 'original')
      : true);

  return (
    <>
      {/* Custom Alert Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={hideCustomAlert}
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIcon, styles[`${modalContent.type}Icon`]]}>
                {modalContent.type === 'loading' && (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                )}
                {modalContent.type === 'success' && (
                  <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                )}
                {modalContent.type === 'error' && (
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                )}
                {modalContent.type === 'info' && (
                  <Ionicons name="information" size={24} color="#FFFFFF" />
                )}
              </View>
              <Text style={styles.modalTitle}>{modalContent.title}</Text>
            </View>
            
            <Text style={styles.modalMessage}>{modalContent.message}</Text>
            
            {modalContent.showCloseButton && modalContent.type !== 'loading' && (
              <Pressable 
                style={styles.modalButton}
                onPress={hideCustomAlert}
              >
                <Text style={styles.modalButtonText}>Got it</Text>
              </Pressable>
            )}
          </Animated.View>
        </View>
      </Modal>

      <Card 
        className="rounded-lg px-4 py-5"
        style={[
          isActive && styles.activeCard
        ]}
      >
      <Pressable
        onPress={() => {
          handlePress();
        }}
        style={({ pressed }) => [
          {
            opacity: pressed ? 0.8 : 1.0,
            backgroundColor: canPlay ? undefined : "rgba(229, 14, 14, 0.1)",
          },
        ]}
      >
        <HStack className="items-start w-full">
          {/* Thumbnail Section */}
          <View style={styles.thumbnailContainer}>
            {canPlay ? (
              <View
                style={[
                  styles.thumbnailWrapper,
                  isActive && styles.activeThumbnail,
                ]}
              >
                {getThumbnailUrl(highlight.mux_public_playback_url!) ? (
                  <Image
                    source={{
                      uri:
                        getThumbnailUrl(highlight.mux_public_playback_url!) ||
                        "",
                    }}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                    onError={(error) =>
                      console.log(
                        `Highlight ${index + 1} thumbnail load error:`,
                        error
                      )
                    }
                    onLoad={() =>
                      console.log(
                        `Highlight ${index + 1} thumbnail loaded successfully`
                      )
                    }
                  />
                ) : (
                  <View style={styles.fallbackThumbnail}>
                    <Ionicons name="videocam" size={24} color="#666" />
                  </View>
                )}
                <View style={styles.thumbnailOverlay}>
                  <Ionicons
                    name="play-circle"
                    size={20}
                    className="mb-2"
                    color="rgba(255,255,255,0.9)"
                  />
                </View>
                {isActive && (
                  <View style={styles.activeIndicator}>
                    <Text style={styles.activeText}>NOW PLAYING</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.processingThumbnail}>
                {highlight.status === "processing" ? (
                  <>
                    <ActivityIndicator size="small" color="#FF9800" />
                    <Text style={styles.processingText}>Processing...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="alert-circle" size={24} color="#F44336" />
                    <Text style={styles.failedText}>Failed</Text>
                  </>
                )}
              </View>
            )}
          </View>

          {/* Content Section */}
          <VStack className="flex-1 pl-4" style={{ flexShrink: 1 }}>
            <HStack className="items-center justify-between mb-2">
              <HStack className="items-center flex-1" style={{ flexShrink: 1 }}>
                <Text 
                  style={[
                    styles.highlightTitle,
                    isMainVideo && styles.mainVenueTitle,
                    isActive && styles.activeTitle
                  ]}
                  numberOfLines={1}
                >
                  {isMainVideo ? (mainVideoTitle || "Original Recording") : `Highlight #${index + 1}`}
                </Text>
              </HStack>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(highlight.status) },
                ]}
              >
                <Text style={styles.statusText}>
                  {isMainVideo ? "ORIGINAL" : highlight.status.toUpperCase()}
                </Text>
              </View>
              {/* 3-dot menu — only on real, playable highlights owned by the
                  viewer. Hidden for the "original recording" row and for any
                  card that's already a FlickShort. */}
              {!isMainVideo && !isFlickShort && canPlay ? (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    setSubmitSheetOpen(true);
                  }}
                  hitSlop={10}
                  style={styles.moreBtn}
                  accessibilityRole="button"
                  accessibilityLabel="More options for this highlight"
                >
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={18}
                    color="#cbd5e1"
                  />
                </Pressable>
              ) : null}
            </HStack>

            <Text 
              style={[
                styles.highlightTime,
                isActive && styles.activeTime
              ]}
            >
              {isMainVideo 
                ? "Full recording video" 
                : String(highlight.id ?? "").startsWith("flick-")
                  ? "15s clip"
                  : formatDate(highlight.button_click_timestamp)
              }
            </Text>
            {showShare && isMainVideo && (
              <Pressable
                style={styles.shareButton}
                onPress={async () => {
                  try {
                    let shareUrl: string | null = null;
                    const rid = String(recordingIdForLink);
                    if (rid) {
                      try {
                        const { shareableLink } = await createShareLink(rid);
                        shareUrl = shareableLink;
                      } catch {
                        shareUrl = buildHighlightsAppLink(rid);
                      }
                    }
                    if (!shareUrl) {
                      showCustomAlert(
                        'error',
                        'Share unavailable',
                        'Could not generate a shareable link. Please try again.',
                      );
                      return;
                    }
                    await Share.share({
                      message: `Watch my full match on FieldFlicks: ${shareUrl}`,
                      url: shareUrl,
                      title: 'FieldFlicks',
                    });
                  } catch (error) {
                    console.error('Error sharing:', error);
                    showCustomAlert(
                      'error',
                      'Share failed',
                      'Something went wrong. Please try again.',
                    );
                  }
                }}
              >
                <Ionicons name="share" size={16} color="#FFFFFF" />
                <Text style={styles.shareButtonText}>Share full match</Text>
              </Pressable>
            )}

            {showShare && !isMainVideo && (
              <Pressable
                style={styles.shareButton}
                onPress={async () => {
                  try {
                    showCustomAlert(
                      'loading',
                      'Preparing highlight',
                      'Getting your MP4 ready to share…',
                      false,
                    );
                    const clipId = String(highlight.id ?? '').trim();
                    if (!clipId || clipId === 'main-video') {
                      hideCustomAlert();
                      showCustomAlert(
                        'error',
                        'Share unavailable',
                        'This clip cannot be shared. Open the recording from Highlights and try again.',
                      );
                      return;
                    }
                    const result = await shareHighlightAsMp4File(clipId);
                    hideCustomAlert();
                    if (!result.ok) {
                      showCustomAlert(
                        'error',
                        'Could not share',
                        result.message,
                      );
                    }
                  } catch (error) {
                    console.error('Error sharing highlight:', error);
                    hideCustomAlert();
                    showCustomAlert(
                      'error',
                      'Share failed',
                      'Something went wrong. Please try again.',
                    );
                  }
                }}
              >
                <Ionicons name="share" size={16} color="#FFFFFF" />
                <Text style={styles.shareButtonText}>Share highlight</Text>
              </Pressable>
            )}

            {!isMainVideo && highlight.status === "failed" && highlight.failed_message && (
              <Text style={styles.errorMessage}>
                Error: {highlight.failed_message}
              </Text>
            )}

            {!canPlay && (
              <Text style={styles.notPlayableText}>
                {highlight.status === "processing" &&
                  "Processing - will be available soon"}
              </Text>
            )}
          </VStack>
        </HStack>
      </Pressable>
    </Card>
      <SubmitToFlickShortSheet
        visible={submitSheetOpen}
        onClose={() => setSubmitSheetOpen(false)}
        highlightId={hid && hid !== 'main-video' ? hid : null}
        defaultTitle={
          mainVideoTitle ? `${mainVideoTitle} – Highlight #${index + 1}` : ''
        }
      />
    </>
  );
};

const styles = StyleSheet.create({
  activeCard: {
    borderWidth: 2,
    borderColor: "#22C55E",
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    shadowColor: "#22C55E",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  thumbnailContainer: {
    width: 80,
    height: 70,
  },
  thumbnailWrapper: {
    position: "relative",
    borderRadius: 8,
    overflow: "hidden",
    width: "100%",
    height: "100%",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  thumbnailOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  activeThumbnail: {
    borderWidth: 2,
    borderColor: "#22C55E",
  },
  activeIndicator: {
    position: "absolute",
    bottom: 2,
    left: 2,
    right: 2,
    backgroundColor: "#22C55E",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    shadowColor: "#22C55E",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 3,
  },
  activeText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  fallbackThumbnail: {
    width: "100%",
    height: "100%",
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  processingThumbnail: {
    width: "100%",
    height: "100%",
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  processingText: {
    fontSize: 10,
    color: "#FF9800",
    marginTop: 4,
    textAlign: "center",
  },
  failedText: {
    fontSize: 10,
    color: "#F44336",
    marginTop: 4,
    textAlign: "center",
  },
  highlightTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  mainVenueTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  activeTitle: {
    color: "#22C55E",
    fontWeight: "700",
  },
  highlightTime: {
    fontSize: 14,
    color: "#888",
    marginBottom: 8,
  },
  activeTime: {
    color: "#86EFAC",
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  moreBtn: {
    marginLeft: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  errorMessage: {
    fontSize: 12,
    color: "#F44336",
    marginTop: 4,
  },
  notPlayableText: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
    fontStyle: "italic",
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#22C55E",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    marginTop: 8,
    shadowColor: "#22C55E",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 0,
    alignSelf: "flex-start",
  },
  shareButtonText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
    marginLeft: 6,
    letterSpacing: 0.2,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: "#1C1C1E",
    borderRadius: 20,
    padding: 24,
    minWidth: 280,
    maxWidth: 320,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  modalIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  loadingIcon: {
    backgroundColor: "#22C55E",
  },
  successIcon: {
    backgroundColor: "#34C759",
  },
  errorIcon: {
    backgroundColor: "#FF3B30",
  },
  infoIcon: {
    backgroundColor: "#FF9500",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  modalMessage: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: "#22C55E",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
    shadowColor: "#22C55E",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
  },
});
