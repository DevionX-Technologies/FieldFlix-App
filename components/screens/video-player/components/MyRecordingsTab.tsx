import { useAppDispatch } from "@/store";
import { setRecording } from "@/store/slices/recording";
import axiosInstance from "@/utils/axiosInstance";
import React, { useEffect } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Recording } from "../type";
import { extractMuxStreamId } from "../VideoPlayerScreen";
import VideoCard from "./VideoCard";
import { VideoCardSkeleton } from "./VideoCardSkeleton";

export default function MyRecordingsTab() {
  const [recordings, setRecordings] = React.useState<Recording[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const dispatch = useAppDispatch();

  const SKELETON_COUNT = 8; // Number of skeleton cards to show while loading

  useEffect(() => {
    const fetchRecordings = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get<Recording[]>(
          "/recording/my-recordings"
        );
        const list = Array.isArray(response.data) ? response.data : [];
        setRecordings(list);
        dispatch(setRecording(list));
      } catch (error: any) {
        console.error(
          "Error fetching recordings:",
          error.response?.data || error.message
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRecordings();
  }, [dispatch]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {loading ? (
        // Show skeleton loading components
        <>
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <VideoCardSkeleton key={`skeleton-${index}`} />
          ))}
        </>
      ) : (
        // Show actual recordings
        recordings.map((item, idx) => (
          <VideoCard
            key={idx}
            playbackUrl={item.mux_media_url}
            thumbnailUrl={`https://image.mux.com/${extractMuxStreamId(
              item.mux_media_url
            )}/thumbnail.png?width=214&height=121&time=2`}
            date={new Date(item.updated_at)}
            title={
              "Rec Date: " +
              new Date(item.updated_at).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })
            }
            linkUrl={""}
            status={item.status}
            recordingId={item.id}
            updated_at={item.updated_at}
            turfName={item?.turf?.name}
            location={item?.turf?.location}
            recordingHighlights={item.recordingHighlights}
            assetId={item.mux_asset_id}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#0C0C11",
  },
  detailsText: {
    color: "#fff",
    fontSize: 16,
    marginVertical: 8,
    alignSelf: "center",
  },
});
