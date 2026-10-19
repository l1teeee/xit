'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { registerLenis } from '@/lib/scroll';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function SmoothScroll() {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({
      autoRaf: false,
      duration: 1.1,
      easing: value => value === 1 ? 1 : 1 - Math.pow(2, -10 * value),
      smoothWheel: true,
      syncTouch: false,
    });
    const tick = (time: number) => lenis.raf(time * 1000);
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.lagSmoothing(0);
    gsap.ticker.add(tick);
    registerLenis(lenis);

    return () => {
      gsap.ticker.remove(tick);
      lenis.off('scroll', ScrollTrigger.update);
      registerLenis(null);
      lenis.destroy();
    };
  }, [reducedMotion]);

  return null;
}
