import { z } from 'zod';

export const turfFilterSchema = z.object({
    page: z.number(),
    limit: z.number().default(10),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
});

export type TurfFilter = z.infer<typeof turfFilterSchema>;

// Define Turf Schema
const TurfSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    size_length: z.string(),
    size_width: z.string(),
    surface_type: z.array(z.string()),
    sports_supported: z.array(z.string()),
    geo_location: z.object({
        type: z.string(),
        coordinates: z.tuple([z.number(), z.number()])
    }),
    address_line: z.string(),
    city: z.string(),
    state: z.string(),
    postal_code: z.string(),
    country: z.string(),
    hourly_rate: z.string(),
    opening_time: z.string(),
    closing_time: z.string(),
    max_capacity: z.number(),
    is_active: z.boolean(),
    contact_phone: z.string(),
    contact_email: z.string(),
    cancellation_policy: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    amenities: z.object({
        id: z.string(),
        turf_id: z.string(),
        has_parking: z.boolean(),
        has_changing_room: z.boolean(),
        has_washroom: z.boolean(),
        has_drinking_water: z.boolean(),
        has_first_aid: z.boolean(),
        has_floodlights: z.boolean(),
        has_equipment_rental: z.boolean(),
        has_refreshments: z.boolean(),
        has_wifi: z.boolean(),
        has_seating_area: z.boolean(),
        has_artificial_turf: z.boolean(),
        has_corporate_event: z.boolean(),
        has_rental_equipment: z.boolean(),
        has_ball_boy: z.boolean(),
        has_warm_up_area: z.boolean(),
        created_at: z.string(),
        updated_at: z.string()
    }),
    turfImages: z.array(z.object({
        id: z.string(),
        turf_id: z.string(),
        file_name: z.string(),
        content_type: z.string(),
        file_size: z.string(),
        image_url: z.string(),
        bucket_name: z.string(),
        is_turf_profile: z.boolean(),
        created_at: z.string(),
        updated_at: z.string(),
    })).optional(),
});

// Define the Meta Schema for Pagination
const MetaSchema = z.object({
    totalItems: z.number(),
    itemCount: z.number(),
    itemsPerPage: z.number(),
    totalPages: z.number(),
    currentPage: z.number(),
});

// Define the API Response Schema
const TurfListResponseSchema = z.object({
    items: z.array(TurfSchema),
    meta: MetaSchema
});

export { TurfListResponseSchema, TurfSchema };

export type Turf = z.infer<typeof TurfSchema>;
export type TurfListResponseSchemas = z.infer<typeof TurfListResponseSchema>;


export const qrCodeDataSchema = z.object({
  GroundNumber: z.string().nullable().default(null),
  GroundLocation : z.string().nullable().default(null),
  GroundDescription: z.string().nullable().default(null),
  Name: z.string().nullable().default(null),
  Size: z.string().nullable().default(null),
});

export type QrCodeDataSchema = z.infer<typeof qrCodeDataSchema>;

export const fileDataSchema = z.object({
    FilePath: z.string(),
    FileName: z.string(),
});

export type FileDataSchema = z.infer<typeof fileDataSchema>;

export const recordingStartDataSchema = z.object({
    dateTime: z.string(),
    qrcodeData: qrCodeDataSchema,
    duration: z.string()
});

export type RecordingStartDataSchema = z.infer<typeof recordingStartDataSchema>;