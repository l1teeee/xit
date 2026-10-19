'use client';

import { useEffect, useState, type RefObject } from 'react';

export function useInView(ref: RefObject<Element | null>, options?: IntersectionObserverInit): boolean {
  const [inView, setInView] = useState(false);
  const root = options?.root;
  const rootMargin = options?.rootMargin;
  const thresholdKey = JSON.stringify(options?.threshold ?? 0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const threshold: number | number[] = JSON.parse(thresholdKey);
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      root, rootMargin, threshold,
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, root, rootMargin, thresholdKey]);

  return inView;
}
