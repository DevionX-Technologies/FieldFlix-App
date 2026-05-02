import type { ImageSourcePropType } from "react-native";

/** Venue hero shots copied from repo `Venue Images/` → `assets/venues/`. */
const VENUE_ASSETS = {
  pickleflow: require("@/assets/venues/pickleflow-social.jpeg"),
  pickpad: require("@/assets/venues/pickpad-by-aim-sports.png"),
  padelArena: require("@/assets/venues/tsg-padel-arena.png"),
  eskay: require("@/assets/venues/tsg-eskay-resort.png"),
  balkanji: require("@/assets/venues/tsg-balkanji-bari.png"),
} as const;

export type VenueImageKey = keyof typeof VENUE_ASSETS;

/**
 * Infer which bundled image matches API turf.name (handles duplicate wording, pipes, etc.).
 * Botanical Gardens has no asset yet → null (caller uses fallback).
 */
export function venueImageKeyForTurfName(name: string): VenueImageKey | null {
  const n = String(name).toLowerCase();
  if (n.includes("pickleflow")) return "pickleflow";
  if (n.includes("pickpad")) return "pickpad";
  if (n.includes("padel arena") || (n.includes("tsg") && n.includes("padel"))) {
    return "padelArena";
  }
  if (n.includes("eskay")) return "eskay";
  if (
    n.includes("balkanji") ||
    n.includes("santacruz") ||
    (n.includes("global sports") && n.includes("pickleball"))
  ) {
    return "balkanji";
  }
  return null;
}

export function venueImageForTurfName(name: string): ImageSourcePropType | null {
  const k = venueImageKeyForTurfName(name);
  return k ? VENUE_ASSETS[k] : null;
}
