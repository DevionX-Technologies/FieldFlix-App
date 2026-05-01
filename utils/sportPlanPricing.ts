/**
 * Sport plan base prices and GST — must stay in sync with:
 * • `POST /payments/plan/create-order` (`FieldFlix-Backend-clean` createPlanOrder)
 * • Highlights unlock sheet (`screens/fieldflix/HighlightsScreen.tsx`)
 * • Premium plan cards (`screens/fieldflix/profile/ProfilePremiumScreen.tsx`)
 */
export const GST_RATE = 0.18 as const;

/** Pre-tax base in INR (checkout total = round(base × (1 + GST_RATE))). */
export const SPORT_PLAN_BASE_INR = {
  cricket: 0,
  pickleball: 200,
  padel: 250,
} as const;

export type SportPlanPricingId = keyof typeof SPORT_PLAN_BASE_INR;

export function sportPricingTotalAfterGst(plan: SportPlanPricingId): number {
  const base = SPORT_PLAN_BASE_INR[plan];
  return Math.round(base * (1 + GST_RATE));
}

export function sportPricingGstAmount(plan: SportPlanPricingId): number {
  return sportPricingTotalAfterGst(plan) - SPORT_PLAN_BASE_INR[plan];
}
