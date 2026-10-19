'use client';

import { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { Dither } from '@/components/effects/Dither';
import { useQualityProfile } from '@/hooks/useQualityProfile';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { gsap, ScrollTrigger } from '@/lib/gsap';

export function SiteBackground() {
  const veilRef = useRef<HTMLDivElement>(null);
  const coveredRef = useRef(false);
  const [covered, setCovered] = useState(false);
  const quality = useQualityProfile();
  const reducedMotion = useReducedMotion();

  useGSAP((_context, contextSafe) => {
    const layer = veilRef.current;
    if (!layer || !contextSafe) return;
    const updateCovered = () => {
      const nextCovered = Number(gsap.getProperty(layer, '--veil')) >= 0.98;
      if (nextCovered !== coveredRef.current) {
        coveredRef.current = nextCovered;
        setCovered(nextCovered);
      }
    };
    const applyVeil = contextSafe((value: number) => {
      gsap.to(layer, {
        '--veil': value,
        duration: reducedMotion ? 0 : 0.6,
        ease: 'power2.out',
        overwrite: true,
        onUpdate: updateCovered,
        onComplete: updateCovered,
      });
    });
    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-veil]'));
    elements.forEach(element => {
      const value = Math.max(0, Math.min(1, Number(element.dataset.veil)));
      ScrollTrigger.create({
        trigger: element,
        start: 'top 60%',
        end: 'bottom 40%',
        onEnter: () => applyVeil(value),
        onEnterBack: () => applyVeil(value),
        onRefresh: self => { if (self.isActive) applyVeil(value); },
      });
    });
  }, { dependencies: [reducedMotion], revertOnUpdate: true, scope: veilRef });

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-lvh" data-canvas="dither-background">
      <Dither
        waveColor="#bcbcbc"
        backgroundColor="#120f17"
        ditherMode="bayer"
        colorNum={4}
        waveSpeed={0.05}
        waveFrequency={3}
        waveAmplitude={0.3}
        mouseEffect="erase"
        mouseRadius={0.3}
        pixelSize={quality.ditherPixel}
        dpr={quality.dprCap}
        disableAnimation={reducedMotion || covered}
      />
      <div ref={veilRef} className="absolute inset-0 bg-bg" style={{ opacity: 'var(--veil, 0)' }} />
    </div>
  );
}
