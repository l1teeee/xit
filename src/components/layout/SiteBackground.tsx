'use client';

import { Dither } from '@/components/effects/Dither';
import { useCoarsePointer } from '@/hooks/useCoarsePointer';
import { useQualityProfile } from '@/hooks/useQualityProfile';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function SiteBackground() {
  const quality = useQualityProfile();
  const reducedMotion = useReducedMotion();
  const coarsePointer = useCoarsePointer();

  return (
    <div aria-hidden="true" data-canvas="dither-background" className="pointer-events-none absolute inset-0 -z-10 opacity-15">
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
        disableAnimation={reducedMotion}
        enableMouseInteraction={!coarsePointer && !reducedMotion}
        clickRipple={false}
      />
    </div>
  );
}
