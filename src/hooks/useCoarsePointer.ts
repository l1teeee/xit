'use client';

import { useSyncExternalStore } from 'react';

const query = '(pointer: coarse)';
function subscribe(notify: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
}
const getSnapshot = () => window.matchMedia(query).matches;
const getServerSnapshot = () => false;

export function useCoarsePointer(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
