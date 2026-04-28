/**
 * Local raster assets copied from `web/public` + `web/Playsport_images`
 * (same references as `web/src/screens/*`).
 */
export const BG = {
  /** Login — `web` `/image5.png` */
  login: require("@/assets/fieldflix-web/image517.png"),
  /** Signup — `/image15.jpeg` */
  signup: require("@/assets/fieldflix-web/image151.png"),
  /** OTP — `/image16.png` */
  otp: require("@/assets/fieldflix-web/image16.png"),
  /**
   * Account type — atmospheric photo only (no baked-in UI).
   * Do not use `account-type-screen-bg.png` (Codia WbbpwTXP1K): that asset is a full-screen
   * composite with logo/cards/text as pixels; layering RN on top duplicates the whole UI.
   */
  accountType: require("@/assets/fieldflix-web/image16_playsport.jpeg"),
  /** Home hero — `Playsport_images/image8.jpeg` (`image8_playsport.jpeg` is the same asset kept alongside for your layout). */
  homeHero: require("@/assets/fieldflix-web/image8.jpeg"),
  /** Sessions card — `image7.jpg` */
  sessionCard: require("@/assets/fieldflix-web/image7.jpg"),
  /** Arena / recording thumbs — `image9.jpg` */
  arena: require("@/assets/fieldflix-web/image9.jpg"),
} as const;
