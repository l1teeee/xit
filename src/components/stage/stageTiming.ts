export const HOLD_VH = 0.6;
export const TRANSITION_VH = 1.1;
export const COARSE_MULTIPLIER = 0.7;
export const SCENE_IDS = ['index', 'life', 'garden', 'cycle'] as const;
export const FIRST_TRANSITION = { start: HOLD_VH, end: HOLD_VH + TRANSITION_VH };

export function stageTiming(coarse: boolean) {
  const multiplier = coarse ? COARSE_MULTIPLIER : 1;
  const hold = HOLD_VH * multiplier;
  const transition = TRANSITION_VH * multiplier;
  return { hold, transition, total: hold * SCENE_IDS.length + transition * (SCENE_IDS.length - 1) };
}
