'use client';

import { useSyncExternalStore } from 'react';

const query = '(prefers-reduced-motion: reduce)';
function subscribe(notify: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
}
const getSnapshot = () => window.matchMedia(query).matches;
const getServerSnapshot = () => false;

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
