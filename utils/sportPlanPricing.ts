/**
 * Recording unlock pricing — hourly rate, billed in 30-minute blocks.
 * Must stay aligned with `FieldFlix-Backend-clean/src/utils/recording-pricing.ts`.
 *
 * • Minimum session is 30 min; each block is billed at the half-hourly rate.
 * • Pickleball ₹100 / Padel ₹125 / Cricket ₹150 per 30 min (cricket unlock free for now).
 * • Hourly reference rates: ₹200 / ₹250 / ₹300.
 * • Amount is based on the timer selected at session start (not early stop).
 * • GST 18% is applied on top of the pre-tax base.
 */

export const GST_RATE = 0.18 as const;

/** Hourly rate in INR (pre-GST) per sport. */
export const SPORT_HOURLY_RATE_INR = {
  cricket: 300,
  pickleball: 200,
  padel: 250,
} as const;

export type SportPlanPricingId = keyof typeof SPORT_HOURLY_RATE_INR;

/** Pre-GST price for one 30-min block (cricket unlock free for now). */
export const SPORT_PLAN_BASE_INR = {
  cricket: 0,
  pickleball: SPORT_HOURLY_RATE_INR.pickleball / 2,
  padel: SPORT_HOURLY_RATE_INR.padel / 2,
} as const;

export const HALF_HOUR_SEC = 30 * 60;

/** Number of 30-minute blocks (minimum 1). Duration should already be a 30-min step from the timer UI. */
export function halfHourBlocksFromDuration(plannedDurationSec: number): number {
  const sec = Math.max(HALF_HOUR_SEC, Math.floor(plannedDurationSec));
  return Math.max(1, Math.round(sec / HALF_HOUR_SEC));
}

/** Pre-tax unlock total for a planned session length. Cricket is free for now. */
export function recordingUnlockBaseInr(
  plan: SportPlanPricingId,
  plannedDurationSec: number,
): number {
  if (plan === 'cricket') return 0;
  const halfHourRate = SPORT_HOURLY_RATE_INR[plan] / 2;
  const blocks = halfHourBlocksFromDuration(plannedDurationSec);
  return Math.round(blocks * halfHourRate);
}

export function sportPricingTotalFromBase(baseInr: number): number {
  if (baseInr <= 0) return 0;
  return Math.round(baseInr * (1 + GST_RATE));
}

export function sportPricingGstFromBase(baseInr: number): number {
  return sportPricingTotalFromBase(baseInr) - baseInr;
}

/** Default quote for a 30-minute session (used when recording metadata has no planned duration). */
export function sportPricingTotalAfterGst(
  plan: SportPlanPricingId,
  plannedDurationSec: number = HALF_HOUR_SEC,
): number {
  return sportPricingTotalFromBase(
    recordingUnlockBaseInr(plan, plannedDurationSec),
  );
}

export function sportPricingGstAmount(
  plan: SportPlanPricingId,
  plannedDurationSec: number = HALF_HOUR_SEC,
): number {
  const base = recordingUnlockBaseInr(plan, plannedDurationSec);
  return sportPricingGstFromBase(base);
}

export function formatPlannedDurationLabel(plannedDurationSec: number): string {
  const blocks = halfHourBlocksFromDuration(plannedDurationSec);
  const mins = blocks * 30;
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}
