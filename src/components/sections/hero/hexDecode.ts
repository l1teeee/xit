import { hash01 } from '@/lib/hash01';

const HEX_DIGITS = '0123456789ABCDEF';

// The hexadecimal digit a cell shows at one flicker step. The same cell and step always give the same digit.
export function hexDigitAt(cellKey: number, step: number): string {
  const index = Math.floor(hash01(cellKey, step) * HEX_DIGITS.length);
  return HEX_DIGITS[index];
}
