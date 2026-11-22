/**
 * Input validation rules.
 *
 * Convention: every validator returns `null` when the input is valid, or a
 * user-facing error message when it is not. The messages are asserted
 * verbatim by the unit and Selenium tests, so change them with care.
 */
import {
  ADVANCE_BOOKING_DAYS,
  AGE_MAX,
  AGE_MIN,
  MAX_PASSENGERS,
  MIN_PASSENGERS,
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
  type Gender,
  type Quota,
} from './constants';
import { daysBetween, isValidISODate } from './dates';

export type ValidationError = string | null;

export const MESSAGES = {
  fromRequired: 'Please select the source station',
  toRequired: 'Please select the destination station',
  sameStations: 'Source and destination cannot be the same',
  dateRequired: 'Please select a journey date',
  dateInvalid: 'Journey date is not a valid date',
  datePast: 'Journey date cannot be in the past',
  dateTooFar: `Bookings open only ${ADVANCE_BOOKING_DAYS} days in advance`,
  tatkalWindow: 'Tatkal tickets can be booked only one day before the journey date',
  passengerCount: `A booking must have between ${MIN_PASSENGERS} and ${MAX_PASSENGERS} passengers`,
  nameRequired: 'Passenger name is required',
  nameLength: `Name must be ${NAME_MIN_LENGTH}-${NAME_MAX_LENGTH} characters`,
  nameChars: 'Name may contain only letters, spaces and dots',
  ageRequired: 'Age is required',
  ageWhole: 'Age must be a whole number',
  ageRange: `Age must be between ${AGE_MIN} and ${AGE_MAX}`,
  genderRequired: 'Please select a gender',
  pnrRequired: 'Please enter a PNR number',
  pnrDigits: 'PNR must contain only digits',
  pnrLength: 'PNR must be exactly 10 digits',
  mobile: 'Enter a valid 10-digit Indian mobile number',
  email: 'Enter a valid email address',
  username: 'Username must be 4-15 characters: letters, digits or _, starting with a letter',
  passwordLength: 'Password must be 8-20 characters',
  passwordStrength: 'Password needs an uppercase letter, a lowercase letter, a digit and a special character',
  passwordMismatch: 'Passwords do not match',
  upi: 'Enter a valid UPI ID (e.g. name@bank)',
  cardNumber: 'Enter a valid 16-digit card number',
  cardExpiry: 'Card expiry must be a future month in MM/YY format',
  cvv: 'CVV must be 3 digits',
} as const;

// ---------------------------------------------------------------- Journey
export function validateStations(from: string, to: string): ValidationError {
  if (!from) return MESSAGES.fromRequired;
  if (!to) return MESSAGES.toRequired;
  if (from === to) return MESSAGES.sameStations;
  return null;
}

/** `today` is injected so the rule is testable without mocking the clock. */
export function validateJourneyDate(date: string, today: string): ValidationError {
  if (!date) return MESSAGES.dateRequired;
  if (!isValidISODate(date)) return MESSAGES.dateInvalid;
  const offset = daysBetween(today, date);
  if (offset < 0) return MESSAGES.datePast;
  if (offset > ADVANCE_BOOKING_DAYS) return MESSAGES.dateTooFar;
  return null;
}

/** Tatkal quota opens one day before the journey (journey date must be tomorrow). */
export function validateQuota(quota: Quota, date: string, today: string): ValidationError {
  if (quota === 'TQ' && daysBetween(today, date) !== 1) return MESSAGES.tatkalWindow;
  return null;
}

export function validatePassengerCount(count: number): ValidationError {
  if (!Number.isInteger(count) || count < MIN_PASSENGERS || count > MAX_PASSENGERS) {
    return MESSAGES.passengerCount;
  }
  return null;
}

// ---------------------------------------------------------------- Passenger
const NAME_PATTERN = /^[A-Za-z][A-Za-z .]*$/;

export function validateName(raw: string): ValidationError {
  const name = raw.trim();
  if (name.length === 0) return MESSAGES.nameRequired;
  if (name.length < NAME_MIN_LENGTH || name.length > NAME_MAX_LENGTH) return MESSAGES.nameLength;
  if (!NAME_PATTERN.test(name)) return MESSAGES.nameChars;
  return null;
}

export function validateAge(raw: string | number): ValidationError {
  const text = String(raw).trim();
  if (text === '') return MESSAGES.ageRequired;
  if (!/^\d+$/.test(text)) return MESSAGES.ageWhole;
  const age = Number(text);
  if (age < AGE_MIN || age > AGE_MAX) return MESSAGES.ageRange;
  return null;
}

export function validateGender(g: string): ValidationError {
  return g === 'M' || g === 'F' || g === 'T' ? null : MESSAGES.genderRequired;
}

export interface PassengerForm {
  name: string;
  age: string;
  gender: Gender | '';
}

export interface PassengerErrors {
  name?: string;
  age?: string;
  gender?: string;
}

export function validatePassenger(p: PassengerForm): PassengerErrors {
  const errors: PassengerErrors = {};
  const name = validateName(p.name);
  const age = validateAge(p.age);
  const gender = validateGender(p.gender);
  if (name) errors.name = name;
  if (age) errors.age = age;
  if (gender) errors.gender = gender;
  return errors;
}

// ---------------------------------------------------------------- PNR
export function validatePNR(raw: string): ValidationError {
  const pnr = raw.trim();
  if (pnr === '') return MESSAGES.pnrRequired;
  if (!/^\d+$/.test(pnr)) return MESSAGES.pnrDigits;
  if (pnr.length !== 10) return MESSAGES.pnrLength;
  return null;
}

// ---------------------------------------------------------------- Contact / account
export function validateMobile(raw: string): ValidationError {
  return /^[6-9]\d{9}$/.test(raw.trim()) ? null : MESSAGES.mobile;
}

export function validateEmail(raw: string): ValidationError {
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(raw.trim())
    ? null
    : MESSAGES.email;
}

export function validateUsername(raw: string): ValidationError {
  return /^[A-Za-z][A-Za-z0-9_]{3,14}$/.test(raw) ? null : MESSAGES.username;
}

export function validatePassword(pw: string): ValidationError {
  if (pw.length < 8 || pw.length > 20) return MESSAGES.passwordLength;
  const strong = /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw) && /[^A-Za-z0-9]/.test(pw);
  return strong ? null : MESSAGES.passwordStrength;
}

// ---------------------------------------------------------------- Payment
export function validateUpiId(raw: string): ValidationError {
  return /^[A-Za-z0-9._-]{2,256}@[A-Za-z]{2,64}$/.test(raw.trim()) ? null : MESSAGES.upi;
}

/** Luhn (mod 10) checksum used by all major card networks. */
export function luhnValid(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

export function validateCardNumber(raw: string): ValidationError {
  const digits = raw.replace(/[\s-]/g, '');
  if (!/^\d{16}$/.test(digits)) return MESSAGES.cardNumber;
  return luhnValid(digits) ? null : MESSAGES.cardNumber;
}

/** `today` is injected (YYYY-MM-DD). A card is valid through the last day of its expiry month. */
export function validateCardExpiry(raw: string, today: string): ValidationError {
  const m = /^(\d{2})\/(\d{2})$/.exec(raw.trim());
  if (!m) return MESSAGES.cardExpiry;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return MESSAGES.cardExpiry;
  const [ty, tm] = today.split('-').map(Number);
  if (year < ty || (year === ty && month < tm)) return MESSAGES.cardExpiry;
  return null;
}

export function validateCvv(raw: string): ValidationError {
  return /^\d{3}$/.test(raw) ? null : MESSAGES.cvv;
}
