'use client';

import { AsciiTrail } from '@/components/effects/AsciiTrail';
import { Dither } from '@/components/effects/Dither';
import { useCoarsePointer } from '@/hooks/useCoarsePointer';
import { useQualityProfile } from '@/hooks/useQualityProfile';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useScrollFade } from '@/hooks/useScrollFade';
import { COARSE_MULTIPLIER, FIRST_TRANSITION } from '@/components/stage/stageTiming';
import { SCENE_PALETTE } from '@/data/scenePalette';

export function SiteBackground() {
  const quality = useQualityProfile();
  const reducedMotion = useReducedMotion();
  const coarsePointer = useCoarsePointer();
  const multiplier = coarsePointer ? COARSE_MULTIPLIER : 1;
  const fade = useScrollFade(FIRST_TRANSITION.start * multiplier, FIRST_TRANSITION.end * multiplier);
  // Touch drags are claimed by the browser and there is no hover, so the trail is for fine pointers only.
  const showTrail = !reducedMotion && !coarsePointer && fade < 1;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed top-0 left-0 -z-10 h-lvh w-full" style={{ opacity: 1 - fade }}>
      <Dither
        waveColor={SCENE_PALETTE.index.ink}
        backgroundColor="#ffffff"
        ditherMode="ascii"
        colorNum={4}
        waveSpeed={0.05}
        waveFrequency={3}
        waveAmplitude={0.3}
        pixelSize={quality.ditherPixel}
        dpr={quality.dprCap}
        fade={0}
        disableAnimation={reducedMotion || fade >= 1}
        enableMouseInteraction={false}
        clickRipple={false}
      />
      {showTrail && <AsciiTrail dprCap={quality.dprCap} />}
    </div>
  );
}
