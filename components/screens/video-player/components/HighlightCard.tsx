import { Card } from "@/components/ui/card";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import axiosInstance from "@/utils/axiosInstance";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Clipboard,
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

interface HighlightCardProps {
  highlight: RecordingHighlight;
  index: number;
  isActive: boolean;
  onPress: (highlight: RecordingHighlight, index: number) => void;
  isMainVideo?: boolean;
  mainVideoTitle?: string;
}

export const HighlightCard: React.FC<HighlightCardProps> = ({
  highlight,
  index,
  isActive,
  onPress,
  isMainVideo = false,
  mainVideoTitle,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({
    type: 'info' as 'info' | 'success' | 'error' | 'loading',
    title: '',
    message: '',
    showCloseButton: true
  });

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

  const downloadVideo = async (signedUrl: string, highlightId: string) => {
    try {
      // Create filename for temporary download
      const fileName = `fieldflicks_highlight.mp4`;
      const fileUri = FileSystem.documentDirectory + fileName;

      console.log('Starting download from:', signedUrl);
      console.log('Temporary file location:', fileUri);

      // Download the file temporarily
      const downloadResult = await FileSystem.downloadAsync(signedUrl, fileUri);
      
      if (downloadResult.status === 200) {
        console.log('Download completed:', downloadResult.uri);
        
        // Try to share the video
        await shareVideo(downloadResult.uri);
        
        // Clean up temporary file after sharing
        try {
          await FileSystem.deleteAsync(downloadResult.uri);
          console.log('Temporary file cleaned up');
        } catch (cleanupError) {
          console.warn('Failed to clean up temporary file:', cleanupError);
        }
      } else {
        throw new Error(`Download failed with status: ${downloadResult.status}`);
      }
    } catch (error) {
      console.error('Error downloading video:', error);
      showCustomAlert("error", "Download Failed", "Failed to prepare video for sharing. Please check your connection and try again.");
    }
  };

  const shareVideo = async (videoUri: string) => {
    try {
      // Check if Expo sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        // Copy text to clipboard for easy pasting
        Clipboard.setString('Here is the recording by FieldFlicks');
        
        // Share the video file with a helpful dialog title
        await Sharing.shareAsync(videoUri, {
          mimeType: 'video/mp4',
          dialogTitle: 'FieldFlicks recording (Text copied to clipboard!)'
        });
        
        hideCustomAlert();
      } else {
        showCustomAlert("error", "Share Error", "Sharing is not available on this device");
      }
    } catch (error) {
      console.error('Error sharing video:', error);
      showCustomAlert("error", "Share Failed", "Failed to share video. Please try again.");
    }
  };

  // Determine if this highlight can be played
  const canPlay = highlight.mux_public_playback_url;

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
            </HStack>

            <Text 
              style={[
                styles.highlightTime,
                isActive && styles.activeTime
              ]}
            >
              {isMainVideo 
                ? "Full recording video" 
                : formatDate(highlight.button_click_timestamp)
              }
            </Text>
            {canPlay && !isMainVideo && (
              <Pressable
                style={styles.shareButton}
                onPress={async () => {
                  try {
                    // Share directly with available playback URL to avoid processing failures.
                    const playbackUrl =
                      highlight.mux_public_playback_url ||
                      (highlight.playback_id
                        ? `https://stream.mux.com/${highlight.playback_id}.m3u8`
                        : null);
                    if (!playbackUrl) {
                      showCustomAlert("error", "Share unavailable", "No playable URL found for this highlight.");
                      return;
                    }
                    await Share.share({
                      message: `Watch this highlight on FieldFlicks: ${playbackUrl}`,
                      url: playbackUrl,
                      title: "FieldFlicks Highlight",
                    });
                  } catch (error) {
                    console.error('Error sharing highlight:', error);
                    showCustomAlert("error", "Share Failed", "Failed to share highlight. Please try again.");
                  }
                }}
              >
                <Ionicons name="share" size={16} color="#FFFFFF" />
                <Text style={styles.shareButtonText}>Share Video</Text>
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
    </>
  );
};

const styles = StyleSheet.create({
  activeCard: {
    borderWidth: 2,
    borderColor: "#007AFF",
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    shadowColor: "#007AFF",
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
    borderColor: "#007AFF",
  },
  activeIndicator: {
    position: "absolute",
    bottom: 2,
    left: 2,
    right: 2,
    backgroundColor: "#007AFF",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    shadowColor: "#007AFF",
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
  activeTitle: {
    color: "#007AFF",
    fontWeight: "700",
  },
  highlightTime: {
    fontSize: 14,
    color: "#888",
    marginBottom: 8,
  },
  activeTime: {
    color: "#66B3FF",
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
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
    backgroundColor: "#007AFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    marginTop: 8,
    shadowColor: "#007AFF",
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
    backgroundColor: "#007AFF",
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
    backgroundColor: "#007AFF",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
    shadowColor: "#007AFF",
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
