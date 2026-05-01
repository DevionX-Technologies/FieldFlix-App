// src/screens/recording/types.ts

export interface GeoLocation {
  type: string;
  coordinates: [number, number]; // [longitude, latitude]
}

export interface Turf {
  id: string;
  name: string;
  description: string;
  size_length: number | null;
  size_width: number | null;
  surface_type: string[];
  sports_supported: string[];
  geo_location: GeoLocation;
  address_line: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  location: string;
  hourly_rate: string;
  opening_time: string;
  closing_time: string;
  max_capacity: number | null;
  is_active: boolean;
  contact_phone: string;
  contact_email: string | null;
  cancellation_policy: string;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface CameraInfo {
  id: string;
  name: string;
  turfId: string;
}

export interface RecordingHighlight {
  id: string;
  recordingId?: string;
  button_click_timestamp: string; // ISO timestamp
  source_asset_id?: string;
  asset_id: string | null;
  /** Allow clip_created rows from Highlights API JSON. */
  status: string;
  failed_message: string | null;
  playback_id: string | null;
  mux_public_playback_url: string | null;
  createdAt?: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp
  likesCount?: number;
  likes_count?: number;
  viewerLiked?: boolean;
  viewerSaved?: boolean;
}

export interface SharedRecording {
  // Add properties as needed when schema is available
  id: string;
  [key: string]: any;
}

export interface Recording {
  id: string;
  userId: string;
  turfId: string;
  cameraId: string;
  startTime: string; // ISO timestamp
  endTime: string | null; // ISO timestamp
  s3Path: string | null;
  raspberryPiRecordingId: string;
  status: "ready" | "processing" | "failed";
  updated_at: string; // ISO timestamp
  metadata: Record<string, any>;
  is_favorite: boolean;
  share_token: string | null;
  mux_asset_id: string;
  mux_playback_id: string;
  mux_media_url: string;
  camera: CameraInfo;
  sharedRecordings: SharedRecording[];
  recordingHighlights: RecordingHighlight[];
  turf: Turf;
}

// API Response interfaces
export interface MyRecordingsApiResponse {
  success: boolean;
  data: Recording[];
  message?: string;
}