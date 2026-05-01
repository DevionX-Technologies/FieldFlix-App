import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Alert, Linking, Pressable, StyleSheet, View } from "react-native";
import { RecordingHighlight } from "../type";
import { HighlightCard } from "./HighlightCard";

interface HighlightListProps {
  recordingHighlights: RecordingHighlight[];
  activeHighlightIndex: number | null;
  onHighlightPress: (highlight: RecordingHighlight, index: number) => void;
  originalVideoSource: string;
  filename?: string;
  onMainVideoPress: () => void;
}

// Email functionality constants
const ADMIN_EMAIL = "admin@fieldflicks.com";
const EMAIL_TEMPLATES = {
  FAILED_HIGHLIGHTS: {
    subject: (count: number) => `${count} Failed Highlight${count === 1 ? '' : 's'} - Processing Issue`,
    body: (highlights: RecordingHighlight[]) => {
      const highlightDetails = highlights.map((h, index) => 
        `Highlight #${index + 1}:\n` +
        `- Asset ID: ${h.asset_id || 'N/A'}\n` +
        `- Source Asset ID: ${h.source_asset_id}\n` +
        `- Recording ID: ${h.recordingId}\n` +
        `- Failed Message: ${h.failed_message || 'No specific error message'}\n` +
        `- Timestamp: ${h.button_click_timestamp}\n`
      ).join('\n');
      
      return `Hello Admin,\n\nThe following highlight${highlights.length === 1 ? '' : 's'} failed to process:\n\n${highlightDetails}\nPlease investigate the processing issues.\n\nThank you.`;
    }
  }
};

// Email utility function
const sendFailedHighlightsEmail = async (failedHighlights: RecordingHighlight[]) => {
  const emailData = {
    subject: EMAIL_TEMPLATES.FAILED_HIGHLIGHTS.subject(failedHighlights.length),
    body: EMAIL_TEMPLATES.FAILED_HIGHLIGHTS.body(failedHighlights)
  };
  
  const mailtoLink = `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(
    emailData.subject
  )}&body=${encodeURIComponent(emailData.body)}`;

  try {
    const supported = await Linking.canOpenURL(mailtoLink);
    if (supported) {
      await Linking.openURL(mailtoLink);
      console.log("Failed highlights email opened in email client.");
    } else {
      console.error("Cannot open email client for failed highlights.");
      Alert.alert("Error", "Cannot open email client.");
    }
  } catch (error) {
    console.error("Error opening email client for failed highlights:", error);
    Alert.alert(
      "Error",
      "An error occurred while trying to open the email client."
    );
  }
};

export const HighlightList: React.FC<HighlightListProps> = ({
  recordingHighlights,
  activeHighlightIndex,
  onHighlightPress,
  originalVideoSource,
  filename = "Original Recording",
  onMainVideoPress,
}) => {
  // Create a main video highlight object for the original recording
  const mainVideoHighlight: RecordingHighlight = {
    id: "main-video",
    recordingId: "original",
    button_click_timestamp: new Date().toISOString(),
    source_asset_id: "original",
    asset_id: null,
    status: "ready",
    failed_message: null,
    playback_id: null,
    mux_public_playback_url: originalVideoSource,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Combine main video with highlights
  const allHighlights = [mainVideoHighlight, ...recordingHighlights];
  
  // Filter highlights by status
  const playableHighlights = allHighlights.filter((highlight) => {
    if (highlight.id === "main-video") return true;
    const st = String(highlight.status ?? "").toLowerCase();
    return st === "ready" || st === "clip_created" || st === "processing";
  });
  
  const failedHighlights = recordingHighlights.filter(highlight => 
    highlight.status === "failed"
  );

  if (recordingHighlights.length === 0) {
    return (
      <View style={styles.highlightsSection}>
        <View style={styles.noHighlightsContainer}>
          <Ionicons name="star-outline" size={48} color="#666" />
          <Text style={styles.noHighlightsText}>No highlights found</Text>
          <Text style={styles.noHighlightsSubText}>
            Highlights will appear here when they are created during recording
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.highlightsSection}>
      <Text style={styles.subSectionTitle}>
        Videos ({playableHighlights.length})
      </Text>
      <VStack space="md">
        {playableHighlights.map((highlight, index) => {
          // Handle main video differently
          const isMainVideo = highlight.id === "main-video";
          
          // For display purposes, we need to calculate the original highlight index
          // from the recordingHighlights array (not the filtered playableHighlights)
          let originalHighlightIndex = -1;
          if (!isMainVideo) {
            originalHighlightIndex = recordingHighlights.findIndex(h => h.id === highlight.id);
          }
          
          const displayIndex = isMainVideo ? -1 : originalHighlightIndex;
          const isActive = isMainVideo 
            ? activeHighlightIndex === null 
            : activeHighlightIndex === originalHighlightIndex;

          return (
            <HighlightCard
              key={highlight.id}
              highlight={highlight}
              index={displayIndex}
              isActive={isActive}
              onPress={(h, i) => {
                if (isMainVideo) {
                  onMainVideoPress();
                } else {
                  onHighlightPress(h, i);
                }
              }}
              isMainVideo={isMainVideo}
              mainVideoTitle={filename}
            />
          );
        })}
      </VStack>
      
      {/* Show failed highlights as text summary */}
      {failedHighlights.length > 0 && (
        <View style={styles.failedSection}>
          <Text style={styles.failedTitle}>
            {failedHighlights.length} Failed Video{failedHighlights.length === 1 ? '' : 's'}
          </Text>
          <Text style={styles.failedDescription}>
            Some highlights could not be processed due to technical issues.
          </Text>
          
          {/* Email Admin Button */}
          <Pressable 
            style={styles.emailButton}
            onPress={() => sendFailedHighlightsEmail(failedHighlights)}
          >
            <Ionicons name="mail" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.emailButtonText}>Email Admin</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  highlightsSection: {
    marginTop: 24,
  },
  subSectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  noHighlightsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  noHighlightsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#888",
    textAlign: "center",
    marginTop: 16,
  },
  noHighlightsSubText: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  failedSection: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "rgba(244, 67, 54, 0.1)",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#F44336",
  },
  failedTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F44336",
    marginBottom: 4,
  },
  failedDescription: {
    fontSize: 12,
    color: "#B71C1C",
    lineHeight: 16,
    marginBottom: 12,
  },
  emailButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F44336",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  emailButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});