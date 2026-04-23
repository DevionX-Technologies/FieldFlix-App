import { JSX } from "react";

// Define interface for each individual image in turfImages array
export interface TurfImage {
  image: string; // URL or asset path for the image
  name: string; // Name of the turf
  location: string; // Turf's location
  description: string; // Description of the turf
}

// Define interface for amenities
interface Amenity {
  key: string;
  label: string;
  icon: JSX.Element; // Assuming icon is a JSX element (like from react-icons or any custom icon)
  active: boolean; // Whether the amenity is active or available
}

// Define interface for geo location
interface GeoLocation {
  coordinates: [number, number]; // Latitude and Longitude
  type: string; // Type of location (should be "Point")
}

// Define the main turf data interface
export interface TurfData {
  name: string;
  description: string;
  turfImages: TurfImage[];
  amenitiesList: Amenity[];
  geo_location: GeoLocation;
  address_line: string;
  contact_phone: string;
  opening_time: string;
  closing_time: string;
}