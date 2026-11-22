/**
 * PNR generation. A booking sequence number is scrambled with a multiplier
 * that is co-prime with 10^9, so PNRs look random but are unique for every
 * sequence number below 10^9 and always exactly 10 digits (starting with 4).
 */
const MULTIPLIER = 7_919_017;
const MODULUS = 1_000_000_000;
const PREFIX = 4_000_000_000;

export function generatePNR(sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1 || sequence >= MODULUS) {
    throw new RangeError('PNR sequence must be an integer from 1 to 999,999,999');
  }
  return String(PREFIX + ((sequence * MULTIPLIER) % MODULUS));
}
