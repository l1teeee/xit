'use client';

import dynamic from 'next/dynamic';
import { useHeroStage } from './HeroStage';
import { SpherePoster } from './SpherePoster';

const RasterSphere = dynamic(
  () => import('@/components/effects/RasterSphere').then(module => module.RasterSphere),
  { ssr: false, loading: () => <SpherePoster /> },
);

export function HeroSphere() {
  const { variant, publishStats } = useHeroStage();
  return <RasterSphere variant={variant} onStats={publishStats} fallback={<SpherePoster />} />;
}
