'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Dither, type DitherField } from '@/components/effects/Dither';
import { SCENE_PALETTE } from '@/data/scenePalette';
import { useQualityProfile } from '@/hooks/useQualityProfile';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { watchActivity } from '@/lib/typewriter/watchActivity';

const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';
function subscribePointer(notify: () => void) {
  const media = window.matchMedia(FINE_POINTER_QUERY);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
}
const getFinePointer = () => window.matchMedia(FINE_POINTER_QUERY).matches;
const getServerPointer = () => false;

const GARDEN_WATER_FIELD: DitherField = { kind: 'water' };

export function GardenWater() {
  const fieldRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const quality = useQualityProfile();
  const reducedMotion = useReducedMotion();
  const finePointer = useSyncExternalStore(subscribePointer, getFinePointer, getServerPointer);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    return watchActivity(field, setActive);
  }, []);

  return (
    <div ref={fieldRef} className="garden-field" aria-hidden="true">
      <Dither
        field={GARDEN_WATER_FIELD}
        waveColor={SCENE_PALETTE.garden.ink}
        backgroundColor="#000000"
        colorNum={4}
        waveSpeed={0.05}
        waveFrequency={3}
        waveAmplitude={0.3}
        ditherMode="ascii"
        pixelSize={quality.ditherPixel}
        dpr={quality.dprCap}
        disableAnimation={!active || reducedMotion}
        enableMouseInteraction={active && finePointer && !reducedMotion}
        mouseEffect="ripple"
        mouseStrength={0.12}
        clickRipple={active && !reducedMotion}
        intro={false}
      />
    </div>
  );
}
