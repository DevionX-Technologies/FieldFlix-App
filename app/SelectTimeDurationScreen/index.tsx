import FieldflixRecordingTimeScreen from '@/screens/fieldflix/RecordingTimeScreen';
import { useLocalSearchParams } from 'expo-router';

function one(v?: string | string[]): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

/**
 * Web-parity duration picker (`web/src/screens/RecordingTimeScreen.tsx`).
 * QR scan passes: Name, GroundLocation, Size, turfId, cameraId, GroundDescription.
 */
export default function SelectTimeDurationScreen() {
  const p = useLocalSearchParams<{
    Name?: string | string[];
    GroundLocation?: string | string[];
    turfId?: string | string[];
    cameraId?: string | string[];
    GroundDescription?: string | string[];
    GroundNumber?: string | string[];
  }>();

  return (
    <FieldflixRecordingTimeScreen
      params={{
        Name: one(p.Name),
        GroundLocation: one(p.GroundLocation),
        turfId: one(p.turfId),
        cameraId: one(p.cameraId),
        GroundDescription: one(p.GroundDescription),
        GroundNumber: one(p.GroundNumber),
      }}
    />
  );
}
