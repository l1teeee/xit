export type QualityTier = 'low' | 'medium' | 'high';

export interface QualityProfile {
  tier: QualityTier;
  dprCap: number;
  rasterCell: number;
  ditherPixel: number;
}

export const qualityProfiles: Record<QualityTier, QualityProfile> = {
  high: { tier: 'high', dprCap: 2, rasterCell: 8, ditherPixel: 2 },
  medium: { tier: 'medium', dprCap: 1.5, rasterCell: 9, ditherPixel: 2 },
  low: { tier: 'low', dprCap: 1, rasterCell: 11, ditherPixel: 2 },
};

export function getQualityProfile(): QualityProfile {
  if (typeof window === 'undefined') return qualityProfiles.medium;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  const cores = navigator.hardwareConcurrency;
  if (window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(width < 768px)').matches ||
      cores <= 4 || connection?.saveData) {
    return qualityProfiles.low;
  }
  if (window.matchMedia('(pointer: fine)').matches &&
      window.matchMedia('(min-width: 1280px)').matches && cores >= 8) {
    return qualityProfiles.high;
  }
  return qualityProfiles.medium;
}
