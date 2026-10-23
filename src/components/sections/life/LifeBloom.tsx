'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Dither, type DitherField } from '@/components/effects/Dither';
import { useBackgroundStyle } from '@/components/layout/BackgroundStyle';
import { useQualityProfile } from '@/hooks/useQualityProfile';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { watchActivity } from '@/lib/typewriter/watchActivity';
import { getBloomFieldLayout } from './bloomLayout';

const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';
function subscribePointer(notify: () => void) {
  const media = window.matchMedia(FINE_POINTER_QUERY);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
}
const getFinePointer = () => window.matchMedia(FINE_POINTER_QUERY).matches;
const getServerPointer = () => false;

const LIFE_BLOOM_FIELD: DitherField = { kind: 'bloom', layout: getBloomFieldLayout };

export function LifeBloom() {
  const fieldRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const { backgroundStyle } = useBackgroundStyle();
  const quality = useQualityProfile();
  const reducedMotion = useReducedMotion();
  const finePointer = useSyncExternalStore(subscribePointer, getFinePointer, getServerPointer);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    return watchActivity(field, setActive);
  }, []);

  return (
    <div ref={fieldRef} className="bloom-field" aria-hidden="true">
      <Dither
        field={LIFE_BLOOM_FIELD}
        waveColor="#a8a8a8"
        backgroundColor="#ffffff"
        colorNum={4}
        waveSpeed={0.05}
        waveFrequency={3}
        waveAmplitude={0.3}
        ditherMode={backgroundStyle}
        pixelSize={quality.ditherPixel}
        dpr={quality.dprCap}
        disableAnimation={!active || reducedMotion}
        enableMouseInteraction={active && finePointer && !reducedMotion}
        mouseEffect="ripple"
        mouseStrength={0.12}
        clickRipple={false}
        intro={false}
      />
    </div>
  );
}
