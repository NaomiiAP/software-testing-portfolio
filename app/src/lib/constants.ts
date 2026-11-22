/**
 * Business constants for RailReserve.
 *
 * Every limit below is a documented requirement (see 01_Test_Plan/Test_Plan.md,
 * section "Requirements under test") and is the source of the boundary values
 * used in 02_Test_Case_Design.
 */

export type TravelClass = 'SL' | '3A' | '2A' | '1A';
export type Quota = 'GN' | 'TQ';
export type Gender = 'M' | 'F' | 'T';

export interface ClassInfo {
  label: string;
  /** Fare per kilometre in rupees. */
  ratePerKm: number;
  /** Minimum base fare in rupees (short journeys). */
  minFare: number;
  /** Air-conditioned classes attract GST. */
  ac: boolean;
  /** Flat cancellation charge per passenger for confirmed tickets. */
  cancellationCharge: number;
  /** Tatkal premium = 30% of base fare, clamped to [min, max]. */
  tatkalMin: number;
  tatkalMax: number;
  /** Coach prefix printed on the ticket, e.g. S3, B2, A1, H1. */
  coachPrefix: string;
  /** Berths per coach (used for berth numbering). */
  berthsPerCoach: number;
}

export const CLASS_INFO: Record<TravelClass, ClassInfo> = {
  SL: { label: 'Sleeper (SL)', ratePerKm: 0.6, minFare: 120, ac: false, cancellationCharge: 120, tatkalMin: 100, tatkalMax: 200, coachPrefix: 'S', berthsPerCoach: 72 },
  '3A': { label: 'AC 3 Tier (3A)', ratePerKm: 1.5, minFare: 300, ac: true, cancellationCharge: 180, tatkalMin: 300, tatkalMax: 400, coachPrefix: 'B', berthsPerCoach: 64 },
  '2A': { label: 'AC 2 Tier (2A)', ratePerKm: 2.2, minFare: 450, ac: true, cancellationCharge: 200, tatkalMin: 400, tatkalMax: 500, coachPrefix: 'A', berthsPerCoach: 46 },
  '1A': { label: 'AC First Class (1A)', ratePerKm: 3.6, minFare: 800, ac: true, cancellationCharge: 240, tatkalMin: 400, tatkalMax: 500, coachPrefix: 'H', berthsPerCoach: 24 },
};

export const CLASS_ORDER: TravelClass[] = ['SL', '3A', '2A', '1A'];

export const QUOTA_LABEL: Record<Quota, string> = {
  GN: 'General',
  TQ: 'Tatkal',
};

export const GENDER_LABEL: Record<Gender, string> = {
  M: 'Male',
  F: 'Female',
  T: 'Transgender',
};

// ---- Booking limits -------------------------------------------------------
export const MIN_PASSENGERS = 1;
export const MAX_PASSENGERS = 6;
/** Advance Reservation Period: tickets can be booked from today up to today + 120 days. */
export const ADVANCE_BOOKING_DAYS = 120;

// ---- Passenger limits -----------------------------------------------------
export const NAME_MIN_LENGTH = 3;
export const NAME_MAX_LENGTH = 40;
export const AGE_MIN = 1;
export const AGE_MAX = 120;

// ---- Concession ages ------------------------------------------------------
/** Children below this age travel free and are not allotted a berth. */
export const CHILD_FREE_BELOW_AGE = 5;
/** Children aged CHILD_FREE_BELOW_AGE .. CHILD_MAX_AGE pay half fare (General quota). */
export const CHILD_MAX_AGE = 11;
export const SENIOR_FEMALE_AGE = 58;
export const SENIOR_MALE_AGE = 60;
export const CHILD_CONCESSION = 0.5;
export const SENIOR_FEMALE_CONCESSION = 0.5;
export const SENIOR_MALE_CONCESSION = 0.4;

// ---- Charges --------------------------------------------------------------
export const TATKAL_RATE = 0.3;
export const GST_RATE = 0.05;
/** Non-refundable convenience fee charged once per booking. */
export const CONVENIENCE_FEE = 20;
/** Clerkage deducted per passenger when cancelling RAC / waitlisted tickets. */
export const CLERKAGE_PER_PASSENGER = 60;

// ---- Cancellation windows (hours before departure) ------------------------
export const REFUND_FLAT_ABOVE_HOURS = 48;
export const REFUND_25_ABOVE_HOURS = 12;
export const REFUND_50_ABOVE_HOURS = 4;
/** RAC/WL tickets can be cancelled until 30 minutes before departure. */
export const RAC_WL_CANCEL_MIN_HOURS = 0.5;
/** The reservation chart is prepared 4 hours before departure. */
export const CHART_PREPARATION_HOURS = 4;

// ---- Login ----------------------------------------------------------------
export const MAX_LOGIN_ATTEMPTS = 3;
export const LOCKOUT_MINUTES = 15;
