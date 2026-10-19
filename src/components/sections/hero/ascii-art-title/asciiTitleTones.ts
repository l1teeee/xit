export const TONE_BLANK = 0;
export const TONE_EDGE = 1;
export const TONE_BODY = 2;
export const TONE_COUNT = 3;

export function classifyTones(coverage: Uint8Array): Uint8Array {
  return coverage.map(value => {
    if (value < 102) return TONE_BLANK;
    return value < 204 ? TONE_EDGE : TONE_BODY;
  });
}
