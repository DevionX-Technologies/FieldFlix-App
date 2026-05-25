import type { ImageSourcePropType } from "react-native";

/** Venue hero shots copied from repo `Venue Images/` → `assets/venues/`. */
const VENUE_ASSETS = {
  pickleflow: require("@/assets/venues/pickleflow-social.jpeg"),
  pickpad: require("@/assets/venues/pickpad-by-aim-sports.png"),
  padelArena: require("@/assets/venues/tsg-padel-arena.png"),
  eskay: require("@/assets/venues/tsg-eskay-resort.png"),
  balkanji: require("@/assets/venues/tsg-balkanji-bari.png"),
  /** Santacruz West cricket hero. Basename avoids clashing drawables (png/jpg normalize to same Android drawable name). */
  tsgSantacruzCricket: require("@/assets/venues/tsg-cricket-santacruz-west-hero.jpg"),
  /** Botanical Gardens hero — uses a hyphenated, lowercase filename in
   *  `assets/venues/` so Metro reliably bundles it (paths with spaces and
   *  underscores in the original name silently fail static asset resolution
   *  on some Metro versions and the image renders blank). */
  botanical: require("@/assets/venues/tsg-botanical-gardens.jpeg"),
} as const;

export type VenueImageKey = keyof typeof VENUE_ASSETS;

/**
 * Infer which bundled image matches API turf.name (handles duplicate wording, pipes, etc.).
 */
export function venueImageKeyForTurfName(name: string): VenueImageKey | null {
  const n = String(name).toLowerCase();
  if (n.includes("pickleflow")) return "pickleflow";
  if (n.includes("pickpad")) return "pickpad";
  // Match Botanical first — its name also contains "pickleball" so we'd lose
  // it to other branches that include the word otherwise.
  if (n.includes("botanical")) return "botanical";
  if (n.includes("padel arena") || (n.includes("tsg") && n.includes("padel"))) {
    return "padelArena";
  }
  // TSG cricket at Santacruz West — explicit hero; must run before legacy
  // `santacruz` → Balkanji handling for mismatched spreadsheet rows.
  if (n.includes("tsg") && n.includes("santacruz")) return "tsgSantacruzCricket";
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
