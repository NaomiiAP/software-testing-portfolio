/**
 * Boundary Value Analysis - input limits.
 * Design: 02_Test_Case_Design/02_Boundary_Value_Analysis.md
 * For every range [min, max]: min-1, min, min+1, max-1, max, max+1.
 */
import { describe, expect, it } from 'vitest';
import { addDays } from '@app/lib/dates';
import {
  MESSAGES,
  validateAge,
  validateJourneyDate,
  validateName,
  validatePassengerCount,
  validatePassword,
  validateUsername,
} from '@app/lib/validation';

const TODAY = '2026-01-05';

describe('Age 1-120 (BVA)', () => {
  it.each([
    { id: 'TC_BVA_AGE_01', age: 0, expected: MESSAGES.ageRange },
    { id: 'TC_BVA_AGE_02', age: 1, expected: null },
    { id: 'TC_BVA_AGE_03', age: 2, expected: null },
    { id: 'TC_BVA_AGE_04', age: 119, expected: null },
    { id: 'TC_BVA_AGE_05', age: 120, expected: null },
    { id: 'TC_BVA_AGE_06', age: 121, expected: MESSAGES.ageRange },
  ])('$id: age $age', ({ age, expected }) => {
    expect(validateAge(String(age))).toBe(expected);
  });
});

describe('Journey date: today .. today+120 (BVA)', () => {
  it.each([
    { id: 'TC_BVA_DATE_01', offset: -1, expected: MESSAGES.datePast },
    { id: 'TC_BVA_DATE_02', offset: 0, expected: null },
    { id: 'TC_BVA_DATE_03', offset: 1, expected: null },
    { id: 'TC_BVA_DATE_04', offset: 119, expected: null },
    { id: 'TC_BVA_DATE_05', offset: 120, expected: null },
    { id: 'TC_BVA_DATE_06', offset: 121, expected: MESSAGES.dateTooFar },
  ])('$id: today $offset days', ({ offset, expected }) => {
    expect(validateJourneyDate(addDays(TODAY, offset), TODAY)).toBe(expected);
  });
});

describe('Passengers per booking 1-6 (BVA)', () => {
  it.each([
    { id: 'TC_BVA_PAX_01', count: 0, expected: MESSAGES.passengerCount },
    { id: 'TC_BVA_PAX_02', count: 1, expected: null },
    { id: 'TC_BVA_PAX_03', count: 2, expected: null },
    { id: 'TC_BVA_PAX_04', count: 5, expected: null },
    { id: 'TC_BVA_PAX_05', count: 6, expected: null },
    { id: 'TC_BVA_PAX_06', count: 7, expected: MESSAGES.passengerCount },
  ])('$id: $count passengers', ({ count, expected }) => {
    expect(validatePassengerCount(count)).toBe(expected);
  });
});

describe('Name length 3-40 (BVA)', () => {
  it.each([
    { id: 'TC_BVA_NAME_01', length: 2, expected: MESSAGES.nameLength },
    { id: 'TC_BVA_NAME_02', length: 3, expected: null },
    { id: 'TC_BVA_NAME_03', length: 4, expected: null },
    { id: 'TC_BVA_NAME_04', length: 39, expected: null },
    { id: 'TC_BVA_NAME_05', length: 40, expected: null },
    { id: 'TC_BVA_NAME_06', length: 41, expected: MESSAGES.nameLength },
  ])('$id: $length characters', ({ length, expected }) => {
    expect(validateName('A'.repeat(length))).toBe(expected);
  });
});

describe('Password length 8-20 (BVA)', () => {
  const pw = (n: number) => 'Aa1@' + 'x'.repeat(n - 4);
  it.each([
    { id: 'TC_BVA_PWD_01', length: 7, expected: MESSAGES.passwordLength },
    { id: 'TC_BVA_PWD_02', length: 8, expected: null },
    { id: 'TC_BVA_PWD_03', length: 9, expected: null },
    { id: 'TC_BVA_PWD_04', length: 19, expected: null },
    { id: 'TC_BVA_PWD_05', length: 20, expected: null },
    { id: 'TC_BVA_PWD_06', length: 21, expected: MESSAGES.passwordLength },
  ])('$id: $length characters', ({ length, expected }) => {
    expect(validatePassword(pw(length))).toBe(expected);
  });
});

describe('Username length 4-15 (BVA)', () => {
  const user = (n: number) => 'u' + 'x'.repeat(n - 1);
  it.each([
    { id: 'TC_BVA_USER_01', length: 3, expected: MESSAGES.username },
    { id: 'TC_BVA_USER_02', length: 4, expected: null },
    { id: 'TC_BVA_USER_03', length: 15, expected: null },
    { id: 'TC_BVA_USER_04', length: 16, expected: MESSAGES.username },
  ])('$id: $length characters', ({ length, expected }) => {
    expect(validateUsername(user(length))).toBe(expected);
  });
});
