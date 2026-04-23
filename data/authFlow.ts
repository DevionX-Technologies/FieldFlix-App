/**
 * Indexed onboarding (4 core screens you specified, then account type).
 * Routes: `app/index.tsx`, `LoginScreen`, `OtpScreen`, `SignUpScreen`, `AccountTypeScreen`.
 */
export const AUTH_FLOW_STEPS = [
  {
    index: 1,
    name: "Logo",
    path: "/" as const,
    screenFile: "app/index.tsx",
    contents: "FIELD FLICKS logo + wordmark, primary button: Let’s Get Started",
  },
  {
    index: 2,
    name: "Get OTP",
    path: "/LoginScreen" as const,
    screenFile: "app/LoginScreen/index.tsx",
    contents: "Level Up / Your Game / subtitle; green card: phone + Get OTP; Sign up link",
  },
  {
    index: 3,
    name: "Verify OTP",
    path: "/OtpScreen" as const,
    screenFile: "app/OtpScreen/index.tsx",
    contents: "Enter OTP + masked phone; 6 boxes; timer; Verify OTP; Resend OTP",
  },
  {
    index: 4,
    name: "Create your account",
    path: "/SignUpScreen" as const,
    screenFile: "app/SignUpScreen/index.tsx",
    contents: "Full Name + mobile (or locked phone after step 3); Get OTP or Continue",
  },
  {
    index: 5,
    name: "Account type (after profile)",
    path: "/AccountTypeScreen" as const,
    screenFile: "app/AccountTypeScreen/index.tsx",
    contents: "Public vs Private; Continue → Home",
  },
] as const;
