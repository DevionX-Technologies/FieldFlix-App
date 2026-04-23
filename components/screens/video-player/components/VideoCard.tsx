import CalendarIcon from "@/components/assets/icons/calendar.svg";
import ShareIcon from "@/components/assets/icons/share-icon.svg";
import { Box } from "@/components/ui/box";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { Paths } from "@/data/paths";
import { useResponsiveDesign } from "@/hooks/useResponsiveDesign";
import { useAppSelector } from "@/store";
import { generateShareableRecordingURL, getShareMessage } from "@/utils/deepLinking";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  Share,
} from "react-native";
import { useVideoDuration } from "../hooks/useVideoDuration";
import { RecordingHighlight } from "../type";
import { formatVideoDuration } from "../utils/videoDuration";
import TimeCard from "./TimeCard";

// Types
interface VideoCardProps {
  thumbnailUrl: string;
  date: Date;
  title: string;
  linkUrl: string;
  linkText?: string;
  playbackUrl: string;
  status?: "processing" | "ready" | "failed";
  recordingId?: string;
  updated_at?: string;
  turfName?: string;
  location?: string;
  recordingHighlights?: RecordingHighlight[];
  assetId?: string;
}

// Constants
const ADMIN_EMAIL = "admin@fieldflicks.com";
const EMAIL_TEMPLATES = {
  FAILED_RECORDING: {
    subject: (recordingId: string) => `Failed Recording Report - ID: ${recordingId}`,
    body: (recordingId: string, recordingTime: string, userInfo: { name?: string; email?: string; phone?: string }) => 
      `Hello Admin,

The following recording has failed and requires investigation:

RECORDING DETAILS:
• Recording ID: ${recordingId}
• Recording Time: ${recordingTime}

USER DETAILS:
• User Name: ${userInfo.name || "N/A"}
• User Email: ${userInfo.email || "N/A"}
• User Phone: ${userInfo.phone || "N/A"}

Please investigate this issue and take appropriate action.

Thank you for your attention to this matter.

---
This email was automatically generated from the FieldFlicks mobile app.`
  }
};

// Utility Functions
const formatCustomDate = (isoDateStr: string): string => {
  const date = new Date(isoDateStr);
  const options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
  };

  const datePart = date.toLocaleDateString("en-US", options);
  let hours: number = date.getHours();
  const minutes: string = date.getMinutes().toString().padStart(2, "0");
  const ampm: string = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const timePart = `${hours.toString().padStart(2, "0")}:${minutes} ${ampm}`;

  return `${datePart} | ${timePart}`;
};

const createEmailData = (recordingId: string, updated_at: string, userInfo: { name?: string; email?: string; phone?: string }) => {
  const recordingTime = new Date(updated_at).toLocaleString("en-GB", {
    dateStyle: "short",
    timeStyle: "medium",
  });
  
  return {
    subject: EMAIL_TEMPLATES.FAILED_RECORDING.subject(recordingId),
    body: EMAIL_TEMPLATES.FAILED_RECORDING.body(recordingId, recordingTime, userInfo)
  };
};

// Custom Hooks
const useVideoCardActions = () => {
  const router = useRouter();
  const { email: userEmail, phone_number: userPhone, name: userName } = useAppSelector((state) => state.user);

  const handleVideoPress = useCallback((playbackUrl: string, thumbnailUrl: string, recordingHighlights?: RecordingHighlight[]) => {
    // @ts-ignore
    router.push({
      pathname: Paths.VideoRecording,
      params: {
        source: playbackUrl,
        recordingHighlights: recordingHighlights ? JSON.stringify(recordingHighlights) : undefined,
      },
    });
  }, [router]);

  const handleShare = useCallback(async (playbackUrl: string, recordingId?: string) => {
    try {
      // Generate shareable deep link URL instead of using direct Mux URL
      const shareableUrl = recordingId 
        ? generateShareableRecordingURL(recordingId, playbackUrl)
        : playbackUrl; // Fallback to original URL if no recordingId
      
      const shareMessage = recordingId 
        ? getShareMessage(recordingId)
        : "Here's a video I recorded for the game: ";

      const result = await Share.share({
        title: "Check this out!",
        message: `${shareMessage}${shareableUrl}`,
        url: shareableUrl,
      });

      if (result.action === Share.sharedAction) {
        console.log("Shared successfully");
      } else if (result.action === Share.dismissedAction) {
        console.log("Share dismissed");
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  }, []);

  const handleShareWithCopy = useCallback(async (playbackUrl: string, recordingId?: string) => {
    // Generate shareable deep link URL for clipboard
    const shareableUrl = recordingId 
      ? generateShareableRecordingURL(recordingId, playbackUrl)
      : playbackUrl; // Fallback to original URL if no recordingId
      
    await Clipboard.setString(shareableUrl);
    await handleShare(playbackUrl, recordingId);
  }, [handleShare]);

  const sendMailToAdmin = useCallback(async (recordingId?: string, updated_at?: string) => {
    if (!recordingId || !updated_at) {
      console.log("Missing recordingId or updated_at:", { recordingId, updated_at });
      Alert.alert("Error", "Missing recording information");
      return;
    }

    const userInfo = { name: userName, email: userEmail, phone: userPhone };
    console.log("Sending mail with:", { recordingId, updated_at, userInfo });
    
    const emailData = createEmailData(recordingId, updated_at, userInfo);
    console.log("Email data created:", emailData);
    
    const mailtoLink = `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(
      emailData.subject
    )}&body=${encodeURIComponent(emailData.body)}`;
    
    console.log("Mailto link:", mailtoLink);

    try {
      const supported = await Linking.canOpenURL(mailtoLink);
      console.log("Email client supported:", supported);
      
      if (supported) {
        console.log("Opening email client...");
        await Linking.openURL(mailtoLink);
        console.log("Mail opened in email client.");
        Alert.alert("Success", "Email client opened successfully! Please send the email to notify admin.");
      } else {
        console.error("Cannot open email client.");
        Alert.alert(
          "Email Client Not Found", 
          "No email app is installed on this device. Please install Gmail, Apple Mail, or another email app to report this issue."
        );
      }
    } catch (error) {
      console.error("Error opening email client:", error);
      Alert.alert(
        "Error",
        `An error occurred while trying to open the email client: ${error}`
      );
    }
  }, [userName, userEmail, userPhone]);

  return {
    handleVideoPress,
    handleShare,
    handleShareWithCopy,
    sendMailToAdmin
  };
};

// Component Subcomponents
const VideoThumbnail: React.FC<{
  thumbnailUrl: string;
  onShare: () => void;
  duration?: number | null;
  durationLoading?: boolean;
}> = ({ thumbnailUrl, onShare, duration, durationLoading }) => {
  const { font } = useResponsiveDesign();
  
  return (
    <Box style={{ position: "relative", width: 170, height: 120 }}>
      <Image
        source={{ uri: thumbnailUrl }}
        style={{ width: 170, height: 120, borderRadius: 8 }}
        resizeMode="cover"
      />
      
      {/* Share icon overlay on top right */}
      <Pressable 
        onPress={onShare}
        style={{ 
          position: "absolute", 
          top: 8, 
          right: 8,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          borderRadius: 20,
          padding: 8,
          width: 36,
          height: 36,
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <ShareIcon width={20} height={20} fill="#FFFFFF" />
      </Pressable>
      
      {/* Duration overlay on bottom left */}
      <Box style={{ position: "absolute", bottom: 8, left: 8 }}>
        {durationLoading ? (
          <Box className="bg-black/70 rounded px-1.5 py-0.5">
            <Text 
              className="text-white font-medium"
              style={{ fontSize: font.xs }}
            >
              ...
            </Text>
          </Box>
        ) : duration ? (
          <Box className="bg-black/70 rounded px-1.5 py-0.5">
            <Text 
              className="text-white font-medium"
              style={{ fontSize: font.xs }}
            >
              {formatVideoDuration(duration)}
            </Text>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
};

const ProcessingPlaceholder: React.FC<{ 
  status?: string;
  duration?: number | null;
  durationLoading?: boolean;
}> = ({ status, duration, durationLoading }) => {
  const { font } = useResponsiveDesign();
  
  return (
    <Box
      style={{
        borderColor: "rgba(255, 255, 255, 0.2)",
        borderWidth: 1,
        borderRadius: 8,
        width: 170,
        height: 120,
        position: "relative",
      }}
      className="items-center justify-center bg-app-backgroundColor"
    >
      {/* Duration overlay for processing videos */}
      {(duration || durationLoading) && (
        <Box style={{ position: "absolute", bottom: 8, left: 8, zIndex: 1 }}>
          {durationLoading ? (
            <Box className="bg-black/70 rounded px-1.5 py-0.5">
              <Text 
                className="text-white font-medium"
                style={{ fontSize: font.xs }}
              >
                ...
              </Text>
            </Box>
          ) : duration ? (
            <Box className="bg-black/70 rounded px-1.5 py-0.5">
              <Text 
                className="text-white font-medium"
                style={{ fontSize: font.xs }}
              >
                {formatVideoDuration(duration)}
              </Text>
            </Box>
          ) : null}
        </Box>
      )}
      
      {status === "failed" ? (
        <Box className="flex-1 items-center justify-center px-2">
          <Text 
            className="text-center text-white"
            style={{ fontSize: font.xs }}
          >
            Failed Processing
          </Text>
        </Box>
      ) : (
        <Box className="items-center justify-center">
          <ActivityIndicator size="small" color="white" />
          <Text 
            className="text-white mt-1"
            style={{ fontSize: font.xs }}
          >
            Processing...
          </Text>
        </Box>
      )}
    </Box>
  );
};

const FailedRecordingContent: React.FC<{
  updated_at?: string;
  onSendMail: () => void;
}> = ({ updated_at, onSendMail }) => {
  const { font } = useResponsiveDesign();
  
  return (
    <Box className="flex-1 justify-start">
      <Heading 
        className="mb-2 text-white" 
        numberOfLines={2}
        style={{ fontSize: font.md }}
      >
        Rec Date:{" "}
        {updated_at
          ? new Date(updated_at).toLocaleDateString("en-GB", {
              dateStyle: "short",
            })
          : "N/A"}
      </Heading>
      
      <HStack space="md" className="mb-2">
        <Text 
          className="text-white"
          style={{ fontSize: font.sm }}
        >
          Rec Time:
        </Text>
        <Text 
          className="text-white"
          style={{ fontSize: font.sm }}
        >
          {updated_at
            ? new Date(updated_at).toLocaleTimeString("en-GB", {
                timeStyle: "medium",
              })
            : "N/A"}
        </Text>
      </HStack>
      
      <Box className="mt-2 w-full">
        <Pressable
          onPress={(e) => {
            e?.stopPropagation?.();
            onSendMail();
          }}
          className="bg-app-baseColor rounded-md px-3 py-2 w-full"
        >
          <Text 
            className="text-white text-center"
            style={{ fontSize: font.sm }}
          >
            Send Details to Admin
          </Text>
        </Pressable>
      </Box>
    </Box>
  );
};

const SuccessfulRecordingContent: React.FC<{
  turfName?: string;
  location?: string;
  updated_at?: string;
  recordingHighlights?: RecordingHighlight[];
}> = ({ turfName, location, updated_at, recordingHighlights }) => {
  const { font } = useResponsiveDesign();
  
  return (
    <VStack className="flex-1 justify-start" space="xs">
      <Heading 
        className="text-white" 
        numberOfLines={2}
        style={{ fontSize: font.md }}
      >
        {turfName}
      </Heading>
      
      {location && (
        <Text 
          className="text-white/80" 
          numberOfLines={1}
          style={{ fontSize: font.sm }}
        >
          📍 {location}
        </Text>
      )}

      <HStack space="sm" className="items-center mt-1">
        <CalendarIcon
          width={14}
          height={14}
          className="bg-app-baseColor"
        />
        <TimeCard>
          {updated_at ? formatCustomDate(updated_at) : "N/A"}
        </TimeCard>
      </HStack>
      
      {recordingHighlights && recordingHighlights.length > 0 && (
        <HStack space="xs" className="items-center mt-2 flex-wrap">
          <Text 
            className="text-app-baseColor font-medium"
            style={{ fontSize: font.xs }}
          >
            🏆 {recordingHighlights.length} Highlights
          </Text>
          {recordingHighlights.slice(0, 3).map((highlight, index) => (
            <Box 
              key={index}
              className="bg-app-baseColor/20 px-2 py-1 rounded-full"
            >
              <Text 
                className="text-app-baseColor font-medium"
                style={{ fontSize: font.xs }}
                numberOfLines={1}
              >
                #{index + 1}
              </Text>
            </Box>
          ))}
          {recordingHighlights.length > 3 && (
            <Box className="bg-white/10 px-2 py-1 rounded-full">
              <Text 
                className="text-white/80"
                style={{ fontSize: font.xs }}
              >
                +{recordingHighlights.length - 3}
              </Text>
            </Box>
          )}
        </HStack>
      )}
    </VStack>
  );
};

// Main Component
export default function VideoCard({
  thumbnailUrl,
  date,
  title,
  playbackUrl,
  status,
  recordingId,
  updated_at,
  turfName,
  location,
  recordingHighlights,
  assetId
}: VideoCardProps) {
  const {
    handleVideoPress,
    handleShareWithCopy,
    sendMailToAdmin
  } = useVideoCardActions();

  // Fetch video duration using the custom hook with caching
  const { duration, loading: durationLoading } = useVideoDuration(assetId, recordingId);

  const handleVideoClick = useCallback(() => {
    handleVideoPress(playbackUrl, thumbnailUrl, recordingHighlights);
  }, [handleVideoPress, playbackUrl, thumbnailUrl, recordingHighlights]);

  const handleShareClick = useCallback(() => {
    handleShareWithCopy(playbackUrl, recordingId);
  }, [handleShareWithCopy, playbackUrl, recordingId]);

  const handleAdminMailClick = useCallback(() => {
    sendMailToAdmin(recordingId, updated_at);
  }, [sendMailToAdmin, recordingId, updated_at]);

  return (
    <Card className="rounded-lg px-4 py-4 mb-4 bg-card-background">
      <Pressable onPress={playbackUrl ? handleVideoClick : undefined}>
        <HStack className="items-start w-full" space="md">
          {playbackUrl ? (
            <VideoThumbnail
              thumbnailUrl={thumbnailUrl}
              onShare={handleShareClick}
              duration={duration}
              durationLoading={durationLoading}
            />
          ) : (
            <ProcessingPlaceholder 
              status={status}
              duration={duration}
              durationLoading={durationLoading}
            />
          )}

          <VStack
            className="flex-1 justify-start"
            style={{ 
              flexShrink: 1,
              minWidth: 0, // Allow content to shrink
              paddingLeft: 4 // Add a bit more spacing from thumbnail
            }}
          >
            {status === "failed" ? (
              <FailedRecordingContent
                updated_at={updated_at}
                onSendMail={handleAdminMailClick}
              />
            ) : (
              <SuccessfulRecordingContent
                turfName={turfName}
                location={location}
                updated_at={updated_at}
                recordingHighlights={recordingHighlights}
              />
            )}
          </VStack>
        </HStack>
      </Pressable>
    </Card>
  );
}
