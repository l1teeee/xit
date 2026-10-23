import type { CSSProperties } from 'react';

type LayoutMode = 'wide' | 'portrait' | 'phone';

const PHONE_MAX_WIDTH = 540;
const CENTER_RADIUS_HEIGHT = 0.31;
const CENTER_RADIUS_WIDTH = 0.60;
const CENTER_RADIUS_ASPECT_SLOPE = 0.20;
const CENTER_RADIUS_ASPECT_BASE = 0.17;
// Portrait screens lower the main bloom so a white band opens above it for the bird.
const CENTER_Y = {
  wide: 0,
  portrait: -0.07,
  phone: -0.05,
};
const SATELLITE_SCALE_ASPECT = 0.9;
// Both satellites sit low so the upper right (wide) and the top band (portrait) stay white for the bird.
const SATELLITES = [
  { x: -0.53, y: -0.48, radius: 0.31, petals: 5 },
  { x: 0.53, y: -0.45, radius: 0.27, petals: 7 },
] as const;
// Beak tip of the bird in units of the main bloom radius, measured from the main bloom center.
const BIRD_TIPS = {
  wide: { x: 1.10, y: 1.14 },
  portrait: { x: -0.4, y: 1.54 },
  phone: { x: -0.4, y: 1.58 },
};
const BIRD_BEAK = { x: 2.5 / 51, y: 13.5 / 34 };
const BIRD_ASPECT = 34 / 51;

// The CSS in bloom.css switches layouts with container queries on these same conditions.
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
    '--bloom-beak-x': `${BIRD_BEAK.x}`,
    '--bloom-beak-y': `${BIRD_BEAK.y}`,
    '--bloom-bird-aspect': `${BIRD_ASPECT}`,
    '--bloom-bird-wide-width': 'min(26vw, 380px)',
    '--bloom-bird-portrait-width': 'min(44vw, 300px)',
    '--bloom-bird-phone-width': 'min(54vw, 220px)',
  };
  for (const [name, tip] of Object.entries(BIRD_TIPS)) {
    style[`--bloom-bird-${name}-tip-x`] = `${tip.x}`;
    style[`--bloom-bird-${name}-tip-y`] = `${tip.y}`;
  }
  for (const [name, centerY] of Object.entries(CENTER_Y)) {
    style[`--bloom-${name}-center-y`] = `${centerY}`;
  }
  return style;
}
