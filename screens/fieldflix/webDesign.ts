/** Pixel specs from `web/src` App shell + screens (max width 402px). */

export const WEB_MAX_WIDTH = 402;

export const WEB = {
  shellBg: '#020617',
  splashBg: '#000000',
  homeBg: '#020617',
  sessionsBg: '#020617',
  profileBg: '#020617',
  navBarBg: '#020A18',

  green: '#22C55E',
  greenBright: '#4ade80',
  greenDark: '#16a34a',
  greenForest: '#14532d',
  accentSoft: '#22c55e',
  accountAccent: '#39d353',

  muted: '#94a3b8',
  white: '#ffffff',

  // Login / Signup card
  cardMaxW: 420,
  cardRadius: 32,
  cardBorder: 'rgba(34, 197, 94, 0.65)',
  cardBg: 'rgba(5, 12, 30, 0.45)',
  cardShadow: 'rgba(34, 197, 94, 0.1)',
  inputHeight: 58,
  inputBorder: 'rgba(255, 255, 255, 0.12)',
  inputBg: 'rgba(0,0,0,0.5)',
  btnPrimaryH: 58,
  subtitleLogin: 'rgba(255, 255, 255, 0.6)',

  // Headlines (Inter Tight italic on web → Inter 800 italic in RN)
  heroTitleSize: 48,
  heroTitleWeight: '800' as const,
  subtitleSize: 17,

  // OTP
  otpBoxW: 50,
  otpBoxH: 60,
  otpBoxRadius: 10,
  otpTitle: 36,
  verifyBtnH: 56,

  // Account type
  accountCardH: 236,
  accountCardRadius: 40,
  continueH: 54,
  logoH: 56,
  logoHSm: 60,

  /** Pill buttons / chips — must match inner `LinearGradient` on Android */
  pillRadius: 999,
  /** Profile top card — gradient + border */
  profileCardRadius: 24,
  /** Recordings shared list cards */
  recordingsSharedCardRadius: 16,

  // Home
  headerBorder: 'rgba(255,255,255,0.08)',
  headerPx: 20,
  headerPb: 24,
  headerPt: 24,
  heroMinH: 320,
  heroRadius: 20,
  arenaCardW: 280,
  sportTile: 128,
  sportTileRadius: 20,
  bottomNavRadius: 24,
  bottomNavBg: '#020A18',
  fabSize: 60,
  fabQr: 32,
  navIconCircle: 44,

  // Recording time (recordingTimeScreen.css)
  rtAccent: '#4ade80',
  rtMuted: '#9ca3af',
  rtBackSize: 44,
  rtCardMaxW: 360,
  rtCardRadius: 28,
  rtCardPad: { t: 24, x: 20, b: 22 },
} as const;
