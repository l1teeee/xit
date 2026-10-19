'use client';

import { useSyncExternalStore } from 'react';
import { getQualityProfile, qualityProfiles, type QualityProfile } from '@/lib/quality';

function subscribe(notify: () => void) {
  const queries = ['(pointer: coarse)', '(pointer: fine)', '(width < 768px)', '(min-width: 1280px)'];
  const media = queries.map(query => window.matchMedia(query));
  const connection = (navigator as Navigator & { connection?: EventTarget }).connection;
  media.forEach(item => item.addEventListener('change', notify));
  connection?.addEventListener('change', notify);
  return () => {
    media.forEach(item => item.removeEventListener('change', notify));
    connection?.removeEventListener('change', notify);
  };
}
const getServerSnapshot = () => qualityProfiles.medium;

export function useQualityProfile(): QualityProfile {
  return useSyncExternalStore(subscribe, getQualityProfile, getServerSnapshot);
}
