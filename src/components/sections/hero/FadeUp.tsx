'use client';

import { useRef, type ReactNode } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from '@/lib/gsap';

interface FadeUpProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function FadeUp({ children, delay = 0, className }: FadeUpProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const element = ref.current;
    if (!element) return;
    const motion = gsap.matchMedia();
    motion.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(element, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 1, delay, ease: 'expo.out' });
    });
    element.setAttribute('data-reveal-ready', '');
    return () => motion.revert();
  }, { scope: ref });

  return <div ref={ref} data-reveal className={className}>{children}</div>;
}
