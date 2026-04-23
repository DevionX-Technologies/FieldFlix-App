import ShareIcon from "@/components/assets/icons/share-icon.svg";
import { Box } from "@/components/ui/box";
import { Card } from "@/components/ui/card";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Paths } from "@/data/paths";
import { useAppSelector } from "@/store";
import { generateShareableRecordingURL, getShareMessage } from "@/utils/deepLinking";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Share,
  View,
} from "react-native";
import { Recording } from "../../video-player/type";
import { extractMuxStreamId } from "../../video-player/VideoPlayerScreen";

const screenWidth = Dimensions.get("window").width;

interface CardCarouselProps {
  items: Recording[];
  cardWidth?: number;
  cardMarginRight?: number;
  imageHeight?: number;
}

export const RecordingCard: React.FC<CardCarouselProps> = ({
  items,
  cardWidth = screenWidth - 30,
  cardMarginRight = 16,
  imageHeight = screenWidth * 0.42,
}) => {
  const router = useRouter();
  const {
    email: userEmail,
    phone_number: userPhone,
    name: userName,
  } = useAppSelector((state) => state.user);

  const sendMailToAdmin = async (turf: any) => {
    // Ensure we have critical information, fallback gracefully
    const recordingId = turf.recordingId || "Unknown Recording ID";
    const recordingTime = turf.updated_at
      ? new Date(turf.updated_at).toLocaleString("en-GB", {
          dateStyle: "short",
          timeStyle: "medium",
        })
      : "N/A";

    const subject = `Failed Recording Report - ID: ${recordingId}`;
    const body = `Hello Admin,

The following recording has failed and requires investigation:

RECORDING DETAILS:
• Recording ID: ${recordingId}
• Recording Time: ${recordingTime}
• Turf Name: ${turf.name || "N/A"}
• Location: ${turf.location || "N/A"}

USER DETAILS:
• User Name: ${userName || "N/A"}
• User Email: ${userEmail || "N/A"}
• User Phone: ${userPhone || "N/A"}

Please investigate this issue and take appropriate action.

Thank you for your attention to this matter.

---
This email was automatically generated from the FieldFlicks mobile app.`;

    // Construct the mailto link
    const mailtoLink = `mailto:admin@fieldflicks.com?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    console.log("Sending admin email with user details:", {
      recordingId,
      userEmail,
      userPhone,
      userName,
    });

    try {
      // Attempt to open the email client with pre-filled information
      const supported = await Linking.canOpenURL(mailtoLink);
      console.log("Email client supported:", supported);

      if (supported) {
        console.log("Opening email client...");
        await Linking.openURL(mailtoLink);
        console.log("Mail opened in email client successfully.");
        Alert.alert(
          "Success",
          "Email client opened successfully! Please send the email to notify admin."
        );
      } else {
        console.error("Cannot open email client.");
        Alert.alert(
          "Email Client Not Found",
          "No email app is installed on this device. Please install Gmail, Apple Mail, or another email app to report this issue."
        );
      }
    } catch (error) {
      console.error("Error opening email client:", error);
      Alert.alert("Error", `Failed to open email client. Error: ${error}`);
    }
  };

  const handleShare = async (playbackUrl: string, recordingId?: string) => {
    try {
      // Generate shareable deep link URL instead of using direct Mux URL
      const shareableUrl = recordingId 
        ? generateShareableRecordingURL(recordingId, playbackUrl)
        : playbackUrl; // Fallback to original URL if no recordingId
      
      const shareMessage = recordingId 
        ? getShareMessage(recordingId)
        : "Here's a video I recorded: ";
        
      // First copy to clipboard
      await Clipboard.setString(shareableUrl);
      
      // Then open share dialog
      const result = await Share.share({
        title: "Check out this game recording!",
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
      Alert.alert("Share Error", "Failed to share the video");
    }
  };
  
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 0 }}
    >
      {items.map((turf, index) => {
        const cleanedTurf = {
          ...turf,
          amenitiesList: turf.amenitiesList?.map(({ active, key, label }) => ({
            active,
            key,
            label,
          })),
        };

        const startTime = new Date(turf.startTime);
        const updatedAt = new Date(turf.endTime);

        const durationInMs = updatedAt - startTime;

        return (
          <HStack key={index} className="items-start">
            {turf.mux_media_url ? (
              <Pressable
                onPress={() => {
                  // @ts-ignore
                  router.push({
                    pathname: Paths.VideoRecording,
                    params: {
                      source: turf.mux_media_url,
                      recordingHighlights: JSON.stringify((turf as any).recordingHighlights || []),
                    },
                  });
                }}
              >
                <Card
                  key={index}
                  size="lg"
                  className="bg-app-cardBackgroundColor p-0"
                  style={{
                    width: cardWidth,
                    marginRight: cardMarginRight,
                    borderRadius: 10,
                    overflow: "hidden",
                  }}
                >
                  {}
                  <View style={{ position: "relative" }}>
                    <Image
                      source={{
                        uri: `https://image.mux.com/${extractMuxStreamId(
                          turf.mux_media_url
                        )}/thumbnail.png?width=214&height=121&time=2`,
                      }}
                      resizeMode="cover"
                      style={{
                        width: "100%",
                        height: imageHeight,
                      }}
                    />

                    <View
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.25)", // dark overlay
                      }}
                    />

                    <View
                      style={{
                        position: "absolute",
                        top: 10,
                        left: 10,
                        backgroundColor: "white",
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 20,
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#000",
                          textTransform: "capitalize",
                        }}
                      >
                        {turf.status}
                      </Text>
                    </View>

                    <View
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        backgroundColor: "#000",
                        opacity: 0.7,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 20,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: "#fff" }}>
                        🕒{" "}
                        {turf?.updated_at
                          ? new Date(turf?.updated_at).toLocaleDateString(
                              "en-GB",
                              {
                                dateStyle: "short",
                              }
                            )
                          : "N/A"}
                      </Text>
                    </View>

                    <View
                      style={{
                        position: "absolute",
                        bottom: 10,
                        left: 10,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "bold",
                          color: "#fff",
                        }}
                      >
                        {(turf as any).name}
                      </Text>
                      <Text style={{ fontSize: 14, color: "#fff" }}>
                        {(turf as any).location}
                      </Text>
                      
                      {/* Highlights Count */}
                      {(turf as any).recordingHighlights && (turf as any).recordingHighlights.length > 0 && (
                        <View style={{ 
                          flexDirection: 'row', 
                          alignItems: 'center', 
                          marginTop: 4,
                          backgroundColor: 'rgba(85, 219, 38, 0.2)',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 10,
                          alignSelf: 'flex-start'
                        }}>
                          <Text style={{ 
                            fontSize: 12, 
                            color: '#55DB26',
                            fontWeight: '600'
                          }}>
                            🏆 {(turf as any).recordingHighlights.length} Highlight{(turf as any).recordingHighlights.length === 1 ? '' : 's'}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Share Icon - Bottom Right */}
                    {turf.mux_media_url && (
                      <Pressable
                        onPress={() => handleShare(turf.mux_media_url, turf.id)}
                        style={{
                          position: "absolute",
                          bottom: 10,
                          right: 10,
                          backgroundColor: "rgba(0, 0, 0, 0.6)",
                          borderRadius: 20,
                          padding: 8,
                          width: 36,
                          height: 36,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <ShareIcon width={20} height={20} fill="#FFFFFF" />
                      </Pressable>
                    )}
                  </View>
                </Card>
              </Pressable>
            ) : (
              <Card
                key={index}
                size="lg"
                className="bg-app-cardBackgroundColor p-0"
                style={{
                  width: cardWidth,
                  marginRight: cardMarginRight,
                  borderRadius: 10,
                  overflow: "hidden",
                }}
              >
                <Box
                  style={{
                    borderColor: "rgba(255, 255, 255, 0.2)",
                    borderWidth: 1,
                    borderRadius: 8,
                    position: "relative",
                  }}
                  className="flex-1 items-center justify-center bg-app-backgroundColor"
                >
                  {turf.status === "failed" ? (
                    <Box className="flex-1 items-center justify-center mt-10">
                      <Text
                        style={{ fontSize: 12, color: "#fff" }}
                        className="p-4 text-center"
                      >
                        Failed Processing, please contact administrator
                      </Text>
                      <HStack space="md">
                        <Text size="sm" bold>Rec Time:</Text>
                        <Text size="sm">
                          {turf.updated_at
                            ? new Date(turf.updated_at).toLocaleTimeString(
                                "en-GB",
                                {
                                  timeStyle: "medium",
                                }
                              )
                            : "N/A"}
                        </Text>
                      </HStack>
                      <Box className="mt-4 items-center justify-center w-full mb-5">
                        <Pressable
                          onPress={() => sendMailToAdmin(turf)}
                          className="bg-app-baseColor rounded-md px-4 py-1 w-full "
                        >
                          <Text className="text-white text-center">
                            Send Details to Admins
                          </Text>
                        </Pressable>
                      </Box>
                    </Box>
                  ) : (
                    <Box
                      className="flex-1 items-center justify-center"
                      style={{
                        height: imageHeight,
                      }}
                    >
                      <Box className="items-center justify-center w-full">
                        <ActivityIndicator size="large" color="white" />
                        <Text
                          style={{
                            fontSize: 14,
                            color: "#fff",
                          }}
                        >
                          {" "}
                          Processing video...
                        </Text>
                      </Box>
                    </Box>
                  )}

                  <View
                    style={{
                      position: "absolute",
                      top: 10,
                      left: 10,
                      backgroundColor: "white",
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 20,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#000",
                        textTransform: "capitalize",
                      }}
                    >
                      {beautifyStatus(turf.status)}
                    </Text>
                  </View>

                  <View
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      backgroundColor: "#000",
                      opacity: 0.7,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 20,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: "#fff" }}>
                      🕒{" "}
                      {turf?.updated_at
                        ? new Date(turf?.updated_at).toLocaleDateString(
                            "en-GB",
                            {
                              dateStyle: "short",
                            }
                          )
                        : "N/A"}
                    </Text>
                  </View>
                </Box>
              </Card>
            )}
          </HStack>
        );
      })}
    </ScrollView>
  );
};

export default RecordingCard;

// function formatDuration(ms) {
//   const totalSeconds = Math.floor(ms / 1000);
//   const milliseconds = ms % 1000;

//   const hours = Math.floor(totalSeconds / 3600);
//   const minutes = Math.floor((totalSeconds % 3600) / 60);
//   const seconds = totalSeconds % 60;

//   // Format with leading zeros
//   const h = hours.toString().padStart(2, "0");
//   const m = minutes.toString().padStart(2, "0");
//   const s = seconds.toString().padStart(2, "0");
//   const msStr = milliseconds.toString().padStart(3, "0");

//   if (hours > 0) {
//     return `${h}:${m}:${s}.${msStr}`;
//   } else {
//     return `${m}:${s}.${msStr}`;
//   }
// }

function beautifyStatus(status: string) {
  return status
    .replace(/_/g, " ") // Replace underscores with space
    .replace(/\b\w/g, (c) => c.toUpperCase()); // Capitalize each word
}
