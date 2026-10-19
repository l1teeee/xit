'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { RasterSphereStats } from '@/components/effects/RasterSphere';
import type { RasterVariant } from '@/data/types';

type StatsListener = (stats: RasterSphereStats) => void;

interface HeroStageValue {
  variant: RasterVariant;
  selectVariant: (variant: RasterVariant) => void;
  publishStats: StatsListener;
  subscribeStats: (listener: StatsListener) => () => void;
}

const HeroStageContext = createContext<HeroStageValue | null>(null);

export function HeroStage({ children }: { children: ReactNode }) {
  const [variant, setVariant] = useState<RasterVariant>('lines');
  const listeners = useRef(new Set<StatsListener>());

  const publishStats = useCallback((stats: RasterSphereStats) => {
    listeners.current.forEach(listener => listener(stats));
  }, []);

  const subscribeStats = useCallback((listener: StatsListener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  const value = useMemo(
    () => ({ variant, selectVariant: setVariant, publishStats, subscribeStats }),
    [variant, publishStats, subscribeStats],
  );

  return <HeroStageContext value={value}>{children}</HeroStageContext>;
}

export function useHeroStage(): HeroStageValue {
  const stage = useContext(HeroStageContext);
  if (!stage) throw new Error('useHeroStage must be used inside HeroStage');
  return stage;
}
