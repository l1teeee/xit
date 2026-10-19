'use client';

import { useState } from 'react';
import { AsciiTrail } from '@/components/effects/AsciiTrail';
import { Dither } from '@/components/effects/Dither';
import { useCoarsePointer } from '@/hooks/useCoarsePointer';
import { useQualityProfile } from '@/hooks/useQualityProfile';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const BACKGROUND_STYLES = ['ascii', 'dots', 'halftone', 'dither', 'lines', 'hybrid'] as const;
type BackgroundStyle = typeof BACKGROUND_STYLES[number];

export function SiteBackground() {
  const [backgroundStyle, setBackgroundStyle] = useState<BackgroundStyle>('ascii');
  const quality = useQualityProfile();
  const reducedMotion = useReducedMotion();
  const coarsePointer = useCoarsePointer();
  // Touch drags are claimed by the browser and there is no hover, so the trail is for fine pointers only.
  const showTrail = !reducedMotion && !coarsePointer;

  return (
    <>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <Dither
          waveColor="#a8a8a8"
          backgroundColor="#ffffff"
          ditherMode={backgroundStyle}
          colorNum={4}
          waveSpeed={0.05}
          waveFrequency={3}
          waveAmplitude={0.3}
          pixelSize={quality.ditherPixel}
          dpr={quality.dprCap}
          disableAnimation={reducedMotion}
          enableMouseInteraction={false}
          clickRipple={false}
        />
        {showTrail && <AsciiTrail dprCap={quality.dprCap} />}
      </div>
      <div role="radiogroup" aria-label="Background style" className="background-picker">
        {BACKGROUND_STYLES.map(style => (
          <label key={style} className="background-picker-option">
            <input
              type="radio"
              name="background-style"
              value={style}
              checked={backgroundStyle === style}
              onChange={() => setBackgroundStyle(style)}
            />
            <span>{style}</span>
          </label>
        ))}
      </div>
    </>
  );
}
