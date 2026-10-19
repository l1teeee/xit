'use client';

import { Fragment, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from '@/lib/gsap';

export function HeroHeadline({ lines }: { lines: string[] }) {
  const ref = useRef<HTMLHeadingElement>(null);

  useGSAP(() => {
    const heading = ref.current;
    if (!heading) return;
    const motion = gsap.matchMedia();
    motion.add('(prefers-reduced-motion: no-preference)', () => {
      const lineElements = heading.querySelectorAll('[data-headline-line]');
      gsap.fromTo(lineElements, { yPercent: 110 }, { yPercent: 0, duration: 1.3, delay: 0.1, stagger: 0.14, ease: 'expo.out' });
    });
    heading.setAttribute('data-reveal-ready', '');
    return () => motion.revert();
  }, { scope: ref });

  return (
    <h1 ref={ref} id="index-title" data-reveal className="pointer-events-none text-display font-semibold uppercase text-ink mix-blend-difference">
      {lines.map((line, index) => (
        <Fragment key={line}>
          {index > 0 && ' '}
          <span className="block overflow-hidden">
            <span data-headline-line className="block">{line}</span>
          </span>
        </Fragment>
      ))}
    </h1>
  );
}
