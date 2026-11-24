/**
 * Equivalence Partitioning - input validation.
 * Design: 02_Test_Case_Design/01_Equivalence_Partitioning.md
 * One representative value per valid / invalid partition.
 */
import { describe, expect, it } from 'vitest';
import {
  MESSAGES,
  validateAge,
  validateCardExpiry,
  validateCardNumber,
  validateCvv,
  validateEmail,
  validateGender,
  validateJourneyDate,
  validateMobile,
  validateName,
  validatePassenger,
  validatePassengerCount,
  validatePassword,
  validatePNR,
  validateQuota,
  validateStations,
  validateUpiId,
  validateUsername,
} from '@app/lib/validation';

const TODAY = '2026-01-05';

describe('Passenger name (EP)', () => {
  it.each([
    { id: 'TC_EP_NAME_01', input: 'Asha Rao', expected: null, partition: 'valid: letters and spaces' },
    { id: 'TC_EP_NAME_02', input: 'S. Kumar', expected: null, partition: 'valid: with dot' },
    { id: 'TC_EP_NAME_03', input: '', expected: MESSAGES.nameRequired, partition: 'invalid: empty' },
    { id: 'TC_EP_NAME_04', input: '   ', expected: MESSAGES.nameRequired, partition: 'invalid: whitespace only' },
    { id: 'TC_EP_NAME_05', input: 'Al', expected: MESSAGES.nameLength, partition: 'invalid: too short' },
    { id: 'TC_EP_NAME_06', input: 'A'.repeat(45), expected: MESSAGES.nameLength, partition: 'invalid: too long' },
    { id: 'TC_EP_NAME_07', input: 'Ravi2', expected: MESSAGES.nameChars, partition: 'invalid: contains digit' },
    { id: 'TC_EP_NAME_08', input: 'Ravi@Rao', expected: MESSAGES.nameChars, partition: 'invalid: special character' },
    { id: 'TC_EP_NAME_09', input: '.Ravi', expected: MESSAGES.nameChars, partition: 'invalid: starts with non-letter' },
  ])('$id: $partition', ({ input, expected }) => {
    expect(validateName(input)).toBe(expected);
  });
});

describe('Passenger age (EP)', () => {
  it.each([
    { id: 'TC_EP_AGE_01', input: '35', expected: null, partition: 'valid: whole number in range' },
    { id: 'TC_EP_AGE_02', input: 35, expected: null, partition: 'valid: numeric type' },
    { id: 'TC_EP_AGE_03', input: '', expected: MESSAGES.ageRequired, partition: 'invalid: empty' },
    { id: 'TC_EP_AGE_04', input: 'abc', expected: MESSAGES.ageWhole, partition: 'invalid: non-numeric' },
    { id: 'TC_EP_AGE_05', input: '12.5', expected: MESSAGES.ageWhole, partition: 'invalid: decimal' },
    { id: 'TC_EP_AGE_06', input: '-5', expected: MESSAGES.ageWhole, partition: 'invalid: negative' },
    { id: 'TC_EP_AGE_07', input: '150', expected: MESSAGES.ageRange, partition: 'invalid: above range' },
  ])('$id: $partition', ({ input, expected }) => {
    expect(validateAge(input)).toBe(expected);
  });
});

describe('Passenger gender (EP)', () => {
  it.each([
    { id: 'TC_EP_GEN_01', input: 'M', expected: null },
    { id: 'TC_EP_GEN_02', input: 'F', expected: null },
    { id: 'TC_EP_GEN_03', input: 'T', expected: null },
    { id: 'TC_EP_GEN_04', input: '', expected: MESSAGES.genderRequired },
    { id: 'TC_EP_GEN_05', input: 'X', expected: MESSAGES.genderRequired },
  ])('$id: gender "$input"', ({ input, expected }) => {
    expect(validateGender(input)).toBe(expected);
  });

  it('TC_EP_GEN_06: validatePassenger collects one error per invalid field', () => {
    expect(validatePassenger({ name: 'Asha Rao', age: '30', gender: 'F' })).toEqual({});
    expect(validatePassenger({ name: '', age: '0', gender: '' })).toEqual({
      name: MESSAGES.nameRequired,
      age: MESSAGES.ageRange,
      gender: MESSAGES.genderRequired,
    });
  });
});

describe('Stations (EP)', () => {
  it.each([
    { id: 'TC_EP_STN_01', from: 'MMCT', to: 'NDLS', expected: null, partition: 'valid: two different stations' },
    { id: 'TC_EP_STN_02', from: '', to: 'NDLS', expected: MESSAGES.fromRequired, partition: 'invalid: source missing' },
    { id: 'TC_EP_STN_03', from: 'MMCT', to: '', expected: MESSAGES.toRequired, partition: 'invalid: destination missing' },
    { id: 'TC_EP_STN_04', from: 'MMCT', to: 'MMCT', expected: MESSAGES.sameStations, partition: 'invalid: same station' },
  ])('$id: $partition', ({ from, to, expected }) => {
    expect(validateStations(from, to)).toBe(expected);
  });
});

describe('Journey date (EP, today = 2026-01-05)', () => {
  it.each([
    { id: 'TC_EP_DATE_01', input: '2026-02-01', expected: null, partition: 'valid: inside booking window' },
    { id: 'TC_EP_DATE_02', input: '', expected: MESSAGES.dateRequired, partition: 'invalid: empty' },
    { id: 'TC_EP_DATE_03', input: '2026-02-30', expected: MESSAGES.dateInvalid, partition: 'invalid: impossible calendar date' },
    { id: 'TC_EP_DATE_04', input: '05/02/2026', expected: MESSAGES.dateInvalid, partition: 'invalid: wrong format' },
    { id: 'TC_EP_DATE_05', input: '2025-12-01', expected: MESSAGES.datePast, partition: 'invalid: past date' },
    { id: 'TC_EP_DATE_06', input: '2026-12-01', expected: MESSAGES.dateTooFar, partition: 'invalid: beyond 120 days' },
  ])('$id: $partition', ({ input, expected }) => {
    expect(validateJourneyDate(input, TODAY)).toBe(expected);
  });
});

describe('Quota vs journey date (EP)', () => {
  it.each([
    { id: 'TC_EP_QUOTA_01', quota: 'GN', date: '2026-02-01', expected: null, partition: 'valid: General, any date' },
    { id: 'TC_EP_QUOTA_02', quota: 'TQ', date: '2026-01-06', expected: null, partition: 'valid: Tatkal for tomorrow' },
    { id: 'TC_EP_QUOTA_03', quota: 'TQ', date: '2026-01-05', expected: MESSAGES.tatkalWindow, partition: 'invalid: Tatkal for today' },
    { id: 'TC_EP_QUOTA_04', quota: 'TQ', date: '2026-01-10', expected: MESSAGES.tatkalWindow, partition: 'invalid: Tatkal for a later date' },
  ] as const)('$id: $partition', ({ quota, date, expected }) => {
    expect(validateQuota(quota, date, TODAY)).toBe(expected);
  });
});

describe('Passenger count (EP)', () => {
  it.each([
    { id: 'TC_EP_CNT_01', input: 3, expected: null, partition: 'valid: 1-6' },
    { id: 'TC_EP_CNT_02', input: -2, expected: MESSAGES.passengerCount, partition: 'invalid: below range' },
    { id: 'TC_EP_CNT_03', input: 10, expected: MESSAGES.passengerCount, partition: 'invalid: above range' },
    { id: 'TC_EP_CNT_04', input: 2.5, expected: MESSAGES.passengerCount, partition: 'invalid: fractional' },
  ])('$id: $partition', ({ input, expected }) => {
    expect(validatePassengerCount(input)).toBe(expected);
  });
});

describe('PNR (EP)', () => {
  it.each([
    { id: 'TC_EP_PNR_01', input: '4007919017', expected: null, partition: 'valid: 10 digits' },
    { id: 'TC_EP_PNR_02', input: ' 4007919017 ', expected: null, partition: 'valid: surrounding spaces trimmed' },
    { id: 'TC_EP_PNR_03', input: '', expected: MESSAGES.pnrRequired, partition: 'invalid: empty' },
    { id: 'TC_EP_PNR_04', input: '40079A9017', expected: MESSAGES.pnrDigits, partition: 'invalid: contains letter' },
    { id: 'TC_EP_PNR_05', input: '12345', expected: MESSAGES.pnrLength, partition: 'invalid: too short' },
    { id: 'TC_EP_PNR_06', input: '12345678901', expected: MESSAGES.pnrLength, partition: 'invalid: too long' },
  ])('$id: $partition', ({ input, expected }) => {
    expect(validatePNR(input)).toBe(expected);
  });
});

describe('Mobile number (EP)', () => {
  it.each([
    { id: 'TC_EP_MOB_01', input: '9876543210', expected: null, partition: 'valid: 10 digits starting 6-9' },
    { id: 'TC_EP_MOB_02', input: '5876543210', expected: MESSAGES.mobile, partition: 'invalid: starts with 0-5' },
    { id: 'TC_EP_MOB_03', input: '98765', expected: MESSAGES.mobile, partition: 'invalid: too short' },
    { id: 'TC_EP_MOB_04', input: '98765432101', expected: MESSAGES.mobile, partition: 'invalid: too long' },
    { id: 'TC_EP_MOB_05', input: '98765abc10', expected: MESSAGES.mobile, partition: 'invalid: letters' },
  ])('$id: $partition', ({ input, expected }) => {
    expect(validateMobile(input)).toBe(expected);
  });
});

describe('Email (EP)', () => {
  it.each([
    { id: 'TC_EP_MAIL_01', input: 'asha.rao@example.com', expected: null, partition: 'valid' },
    { id: 'TC_EP_MAIL_02', input: 'asharao.example.com', expected: MESSAGES.email, partition: 'invalid: no @' },
    { id: 'TC_EP_MAIL_03', input: 'asha@', expected: MESSAGES.email, partition: 'invalid: no domain' },
    { id: 'TC_EP_MAIL_04', input: '@example.com', expected: MESSAGES.email, partition: 'invalid: no local part' },
    { id: 'TC_EP_MAIL_05', input: 'asha@example', expected: MESSAGES.email, partition: 'invalid: no top-level domain' },
    { id: 'TC_EP_MAIL_06', input: 'asha rao@example.com', expected: MESSAGES.email, partition: 'invalid: space' },
  ])('$id: $partition', ({ input, expected }) => {
    expect(validateEmail(input)).toBe(expected);
  });
});

describe('Username (EP)', () => {
  it.each([
    { id: 'TC_EP_USER_01', input: 'naomi_01', expected: null, partition: 'valid' },
    { id: 'TC_EP_USER_02', input: 'abc', expected: MESSAGES.username, partition: 'invalid: too short' },
    { id: 'TC_EP_USER_03', input: '1abc', expected: MESSAGES.username, partition: 'invalid: starts with digit' },
    { id: 'TC_EP_USER_04', input: 'ab cd', expected: MESSAGES.username, partition: 'invalid: space' },
    { id: 'TC_EP_USER_05', input: 'a'.repeat(20), expected: MESSAGES.username, partition: 'invalid: too long' },
  ])('$id: $partition', ({ input, expected }) => {
    expect(validateUsername(input)).toBe(expected);
  });
});

describe('Password (EP)', () => {
  it.each([
    { id: 'TC_EP_PWD_01', input: 'Demo@123', expected: null, partition: 'valid: all character classes' },
    { id: 'TC_EP_PWD_02', input: 'demo@123', expected: MESSAGES.passwordStrength, partition: 'invalid: no upper case' },
    { id: 'TC_EP_PWD_03', input: 'DEMO@123', expected: MESSAGES.passwordStrength, partition: 'invalid: no lower case' },
    { id: 'TC_EP_PWD_04', input: 'Demo@abc', expected: MESSAGES.passwordStrength, partition: 'invalid: no digit' },
    { id: 'TC_EP_PWD_05', input: 'Demo1234', expected: MESSAGES.passwordStrength, partition: 'invalid: no special character' },
    { id: 'TC_EP_PWD_06', input: 'De@1', expected: MESSAGES.passwordLength, partition: 'invalid: too short' },
  ])('$id: $partition', ({ input, expected }) => {
    expect(validatePassword(input)).toBe(expected);
  });
});

describe('Payment inputs (EP)', () => {
  it.each([
    { id: 'TC_EP_UPI_01', input: 'asha@okbank', expected: null, partition: 'valid' },
    { id: 'TC_EP_UPI_02', input: 'asha', expected: MESSAGES.upi, partition: 'invalid: no handle' },
    { id: 'TC_EP_UPI_03', input: '@okbank', expected: MESSAGES.upi, partition: 'invalid: no name' },
    { id: 'TC_EP_UPI_04', input: 'asha@ok1bank', expected: MESSAGES.upi, partition: 'invalid: digit in handle' },
  ])('$id: UPI $partition', ({ input, expected }) => {
    expect(validateUpiId(input)).toBe(expected);
  });

  it.each([
    { id: 'TC_EP_CARD_01', input: '4111 1111 1111 1111', expected: null, partition: 'valid: Visa test number' },
    { id: 'TC_EP_CARD_02', input: '5555555555554444', expected: null, partition: 'valid: Mastercard test number' },
    { id: 'TC_EP_CARD_03', input: '4111111111111112', expected: MESSAGES.cardNumber, partition: 'invalid: Luhn checksum fails' },
    { id: 'TC_EP_CARD_04', input: '411111111111111', expected: MESSAGES.cardNumber, partition: 'invalid: 15 digits' },
    { id: 'TC_EP_CARD_05', input: '4111-1111-1111-111A', expected: MESSAGES.cardNumber, partition: 'invalid: letter' },
  ])('$id: card $partition', ({ input, expected }) => {
    expect(validateCardNumber(input)).toBe(expected);
  });

  it.each([
    { id: 'TC_EP_EXP_01', input: '12/30', expected: null, partition: 'valid: future month' },
    { id: 'TC_EP_EXP_02', input: '01/26', expected: null, partition: 'valid: current month' },
    { id: 'TC_EP_EXP_03', input: '12/25', expected: MESSAGES.cardExpiry, partition: 'invalid: past month' },
    { id: 'TC_EP_EXP_04', input: '13/27', expected: MESSAGES.cardExpiry, partition: 'invalid: month 13' },
    { id: 'TC_EP_EXP_05', input: '00/27', expected: MESSAGES.cardExpiry, partition: 'invalid: month 00' },
    { id: 'TC_EP_EXP_06', input: '1227', expected: MESSAGES.cardExpiry, partition: 'invalid: format' },
  ])('$id: expiry $partition', ({ input, expected }) => {
    expect(validateCardExpiry(input, TODAY)).toBe(expected);
  });

  it.each([
    { id: 'TC_EP_CVV_01', input: '123', expected: null },
    { id: 'TC_EP_CVV_02', input: '12', expected: MESSAGES.cvv },
    { id: 'TC_EP_CVV_03', input: '1234', expected: MESSAGES.cvv },
    { id: 'TC_EP_CVV_04', input: '12a', expected: MESSAGES.cvv },
  ])('$id: CVV "$input"', ({ input, expected }) => {
    expect(validateCvv(input)).toBe(expected);
  });
});
