import type { RasterVariant } from '@/data/types';

export interface RasterSphereProps { variant?: RasterVariant; className?: string }

export function RasterSphere({ className }: RasterSphereProps) {
  return <div aria-hidden="true" className={className} data-canvas="hero-sphere" />;
}
