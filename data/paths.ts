/**
 * Routes aligned with web `App.tsx` (+ legacy aliases for existing modules).
 * Prefer `Paths.home`, `Paths.login`, etc.
 */
export const Paths = {
  root: '/',
  login: '/login',
  signup: '/signup',
  otp: '/otp',
  accountType: '/account-type',
  home: '/home',
  sessions: '/sessions',
  notifications: '/notifications',
  scan: '/scan',
  recordingTime: '/recording-time',
  recordingActive: '/recording-active',
  flixshorts: '/flixshorts',
  recordings: '/recordings',
  /**
   * Expo Router file route is `app/highlights/[id]/index.tsx` — the pathname must
   * include the dynamic segment, e.g. `router.push({ pathname: Paths.highlights, params: { id } })`.
   */
  highlights: '/highlights/[id]',
  /** Matches `app/shared/media/[token]/index.tsx` — use `params: { token }`. */
  sharedMedia: '/shared/media/[token]',
  profile: '/profile',
  profileNotificationSettings: '/profile/notification-settings',
  profileAppSettings: '/profile/app-settings',
  profilePrivacy: '/profile/privacy',
  profilePremium: '/profile/premium',
  profilePaymentHistory: '/profile/payment-history',
  profileRateUs: '/profile/rate-us',
  profileContactUs: '/profile/contact-us',

  /** @deprecated use Paths.home */
  Home: '/home',
  /** @deprecated use Paths.login */
  LoginScreen: '/login',
  /** @deprecated use Paths.scan */
  QRCodeScreen: '/scan',
  /** @deprecated use Paths.notifications */
  NotificationScreen: '/notifications',
  /** @deprecated use Paths.profile */
  ProfileScreen: '/profile',
  /** @deprecated use Paths.recordingTime */
  SelectTimeDurationScreen: '/recording-time',
  /** @deprecated use Paths.recordingActive */
  MainRecordingScreen: '/recording-active',
  VideoRecording: '/VideoRecording',
  RecordingPlaybackScreen: '/RecordingPlaybackScreen',
  /** Legacy — turf detail route removed; open sessions list */
  TurfDetailsScreen: '/sessions',
  TermsAndConditions: '/home',
  Location: '/home',
  ViewSavedRecording: '/RecordingPlaybackScreen',
  ShareRecording: '/share-recording',
} as const;

export type PathKey = keyof typeof Paths;
