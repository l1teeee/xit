import type { CSSProperties } from 'react';

type LayoutMode = 'wide' | 'portrait' | 'phone';

const PHONE_MAX_WIDTH = 540;
const CENTER_RADIUS_HEIGHT = 0.31;
const CENTER_RADIUS_WIDTH = 0.60;
const CENTER_RADIUS_ASPECT_SLOPE = 0.20;
const CENTER_RADIUS_ASPECT_BASE = 0.17;
const CENTER_Y = {
  wide: 0,
  portrait: -0.07,
  phone: -0.05,
};
const SATELLITE_SCALE_ASPECT = 0.9;
const SATELLITES = [
  { x: -0.53, y: -0.48, radius: 0.31, petals: 5 },
  { x: 0.53, y: -0.45, radius: 0.27, petals: 7 },
] as const;

function getLayoutMode(width: number, height: number): LayoutMode {
  if (width <= PHONE_MAX_WIDTH) return 'phone';
  return width <= height ? 'portrait' : 'wide';
}

export function getBloomFieldLayout(width: number, height: number): Float32Array {
  const aspect = width / height;
  const radius = Math.min(
    CENTER_RADIUS_HEIGHT,
    aspect * CENTER_RADIUS_WIDTH,
    aspect * CENTER_RADIUS_ASPECT_SLOPE + CENTER_RADIUS_ASPECT_BASE,
  );
  const satelliteScale = Math.min(1, aspect / SATELLITE_SCALE_ASPECT);
  return new Float32Array([
    0, CENTER_Y[getLayoutMode(width, height)], radius, 6,
    ...SATELLITES.flatMap(bloom => [bloom.x * aspect, bloom.y, bloom.radius * satelliteScale, bloom.petals]),
  ]);
}

export function getBloomLayoutStyle(): CSSProperties {
  const style: CSSProperties & Record<`--${string}`, string> = {
    '--bloom-radius': `min(${CENTER_RADIUS_HEIGHT * 100}cqh, ${CENTER_RADIUS_WIDTH * 100}cqw, calc(${CENTER_RADIUS_ASPECT_SLOPE * 100}cqw + ${CENTER_RADIUS_ASPECT_BASE * 100}cqh))`,
  };
  for (const [name, centerY] of Object.entries(CENTER_Y)) {
    style[`--bloom-${name}-center-y`] = `${centerY}`;
  }
  return style;
}
