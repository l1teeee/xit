import { AsciiSurface } from '@/lib/ascii/asciiSurface';
import { seeded } from './GardenPainter';

export type SkyLayout = {
  fieldTop: number;
  soilTop: number;
  titleRight: number;
  titleBottom: number;
};

type Star = { x: number; y: number; peak: number; period: number; phase: number };
type Firefly = {
  homeX: number;
  homeY: number;
  reachX: number;
  reachY: number;
  driftPeriod: number;
  blinkPeriod: number;
  phase: number;
};
type Moon = { x: number; y: number; radius: number };
type Hills = { ridge: number[]; soilTop: number };
type Sky = { stars: Star[]; moon: Moon; hills: Hills; fireflies: Firefly[] };

const cellWidth = 8;
const cellHeight = 14;
const fullTurn = Math.PI * 2;
const white = '#ffffff';

// A star is a single cell lit with an alpha. At the surface's gamma of 1 each peak prints its own glyph: "." then ":" then "+" then "*".
const starCount = 90;
const starSkyShare = 0.6;
const dotPeak = 0.22;
const plusPeak = 0.52;
const asteriskPeak = 0.7;
const plusStarShare = 0.1;
const asteriskStarShare = 0.05;
const starDimmestShare = 0.25;
const starMinPeriod = 3000;
const starPeriodSpread = 4000;

const moonRadiusRatio = 0.06;
const moonPreferredX = 0.58;
const moonPreferredY = 0.16;
const moonBelowTitleX = 0.3;
const moonHaloReach = 1.3;
const keepClear = 24;

// The moon is drawn in units of its radius: halo, disc, lit side, then the craters.
const moonShapes = [
  { x: 0, y: 0, radius: moonHaloReach, color: '#242424' },
  { x: 0, y: 0, radius: 1, color: '#6e6e6e' },
  { x: -0.16, y: -0.14, radius: 0.55, color: '#8c8c8c' },
  { x: 0.36, y: -0.28, radius: 0.2, color: '#454545' },
  { x: 0.2, y: 0.38, radius: 0.15, color: '#454545' },
  { x: -0.4, y: 0.3, radius: 0.1, color: '#454545' },
];

const hillsColor = '#1c1c1c';
const hillsRidgeColor = '#2b2b2b';
const hillsRidgeThickness = cellHeight;
const hillsBaseRise = 0.035;
const hillsBroadRise = 0.045;
const hillsRoughRise = 0.02;

const fireflyRadius = 3.8;
const fireflyMinGlow = 0.04;
const fireflyBandLow = 0.2;
const fireflyBandHigh = 0.9;

// About 20 fps. The margin below 50 ms keeps a 60 Hz display from landing on every fourth frame.
const minFrameInterval = 46;
const maxFrameStep = 100;

function placeMoon(width: number, height: number, layout: SkyLayout): Moon {
  const radius = height * moonRadiusRatio;
  const reach = radius * moonHaloReach;
  const x = width * moonPreferredX;
  const y = height * moonPreferredY;
  const touchesTitle = x - reach < layout.titleRight + keepClear && y - reach < layout.titleBottom + keepClear;
  if (!touchesTitle) return { x, y, radius };
  return { x: width * moonBelowTitleX, y: layout.titleBottom + keepClear + reach, radius };
}

function peakForStar(index: number): number {
  const roll = seeded(index, 3);
  if (roll > 1 - asteriskStarShare) return asteriskPeak;
  if (roll > 1 - asteriskStarShare - plusStarShare) return plusPeak;
  return dotPeak;
}

function buildStars(width: number, height: number, layout: SkyLayout, moon: Moon): Star[] {
  const stars: Star[] = [];
  for (let index = 0; index < starCount; index += 1) {
    const x = Math.floor(seeded(index, 1) * width / cellWidth) * cellWidth;
    const y = Math.floor(seeded(index, 2) * height * starSkyShare / cellHeight) * cellHeight;
    const insideTitle = x < layout.titleRight + keepClear && y < layout.titleBottom + keepClear;
    const nearMoon = Math.hypot(x - moon.x, y - moon.y) < moon.radius * moonHaloReach + keepClear;
    if (insideTitle || nearMoon) continue;
    stars.push({
      x,
      y,
      peak: peakForStar(index),
      period: starMinPeriod + seeded(index, 4) * starPeriodSpread,
      phase: seeded(index, 5) * fullTurn,
    });
  }
  return stars;
}

function buildHills(width: number, height: number, layout: SkyLayout): Hills {
  const ridge: number[] = [];
  for (let x = 0; x <= width + cellWidth; x += cellWidth) {
    const broad = 0.5 + 0.5 * Math.sin(x / 230 + 0.9);
    const rough = 0.5 + 0.5 * Math.sin(x / 83 + 2.2);
    const rise = height * (hillsBaseRise + hillsBroadRise * broad + hillsRoughRise * rough);
    ridge.push(layout.soilTop - rise);
  }
  return { ridge, soilTop: layout.soilTop };
}

function buildFireflies(width: number, layout: SkyLayout): Firefly[] {
  const count = width < 600 ? 10 : 14;
  const plantableHeight = layout.soilTop - layout.fieldTop;
  const fireflies: Firefly[] = [];
  for (let index = 0; index < count; index += 1) {
    const band = fireflyBandLow + (fireflyBandHigh - fireflyBandLow) * seeded(index, 6);
    fireflies.push({
      homeX: seeded(index, 7) * width,
      homeY: layout.soilTop - plantableHeight * band,
      reachX: 24 + seeded(index, 8) * 46,
      reachY: 10 + seeded(index, 9) * 20,
      driftPeriod: 14000 + seeded(index, 10) * 12000,
      blinkPeriod: 3500 + seeded(index, 11) * 3000,
      phase: seeded(index, 12) * fullTurn,
    });
  }
  return fireflies;
}

function buildSky(width: number, height: number, layout: SkyLayout): Sky {
  const moon = placeMoon(width, height, layout);
  return {
    stars: buildStars(width, height, layout, moon),
    moon,
    hills: buildHills(width, height, layout),
    fireflies: buildFireflies(width, layout),
  };
}

function drawStars(ctx: CanvasRenderingContext2D, stars: Star[], time: number): void {
  ctx.fillStyle = white;
  for (const star of stars) {
    const swing = 0.5 + 0.5 * Math.sin(fullTurn * time / star.period + star.phase);
    ctx.globalAlpha = star.peak * (starDimmestShare + (1 - starDimmestShare) * swing);
    ctx.fillRect(star.x, star.y, cellWidth, cellHeight);
  }
  ctx.globalAlpha = 1;
}

function drawMoon(ctx: CanvasRenderingContext2D, moon: Moon): void {
  ctx.save();
  ctx.translate(moon.x, moon.y);
  ctx.scale(moon.radius, moon.radius);
  for (const shape of moonShapes) {
    ctx.fillStyle = shape.color;
    ctx.beginPath();
    ctx.arc(shape.x, shape.y, shape.radius, 0, fullTurn);
    ctx.fill();
  }
  ctx.restore();
}

function drawHills(ctx: CanvasRenderingContext2D, hills: Hills): void {
  const { ridge, soilTop } = hills;
  const lastColumn = ridge.length - 1;

  ctx.fillStyle = hillsColor;
  ctx.beginPath();
  ctx.moveTo(0, soilTop);
  for (let column = 0; column <= lastColumn; column += 1) {
    ctx.lineTo(column * cellWidth, ridge[column]);
  }
  ctx.lineTo(lastColumn * cellWidth, soilTop);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = hillsRidgeColor;
  ctx.beginPath();
  ctx.moveTo(0, ridge[0]);
  for (let column = 1; column <= lastColumn; column += 1) {
    ctx.lineTo(column * cellWidth, ridge[column]);
  }
  for (let column = lastColumn; column >= 0; column -= 1) {
    ctx.lineTo(column * cellWidth, ridge[column] + hillsRidgeThickness);
  }
  ctx.closePath();
  ctx.fill();
}

function drawFireflies(ctx: CanvasRenderingContext2D, fireflies: Firefly[], time: number): void {
  ctx.fillStyle = white;
  for (const firefly of fireflies) {
    const blink = Math.max(0, Math.sin(fullTurn * time / firefly.blinkPeriod + firefly.phase * 2.3));
    const glow = blink * blink * blink;
    if (glow < fireflyMinGlow) continue;
    const driftX = Math.sin(fullTurn * time / firefly.driftPeriod + firefly.phase);
    const driftY = Math.sin(fullTurn * time / (firefly.driftPeriod * 1.37) + firefly.phase * 1.9);
    ctx.globalAlpha = glow;
    ctx.beginPath();
    ctx.arc(firefly.homeX + driftX * firefly.reachX, firefly.homeY + driftY * firefly.reachY, fireflyRadius, 0, fullTurn);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export class GardenSkyPainter {
  private readonly canvas: HTMLCanvasElement;
  private readonly surface: AsciiSurface;
  private readonly measureLayout: () => SkyLayout;
  private sky: Sky | null = null;
  private active = false;
  private animated: boolean;
  private frame = 0;
  private clock = 0;
  private lastFrameTime = 0;

  constructor(canvas: HTMLCanvasElement, fontFamily: string, animated: boolean, measureLayout: () => SkyLayout) {
    this.canvas = canvas;
    this.surface = new AsciiSurface(canvas, {
      polarity: 'light-on-dark',
      ink: white,
      dprCap: canvas.clientWidth < 600 ? 1.25 : 1.5,
      cellWidth,
      cellHeight,
    }, fontFamily);
    this.measureLayout = measureLayout;
    this.animated = animated;
    this.resize();
  }

  resize(): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (width <= 0 || height <= 0) return;
    this.surface.resize();
    this.sky = buildSky(width, height, this.measureLayout());
    this.draw(this.clock);
  }

  setActive(active: boolean): void {
    this.active = active;
    if (active && this.animated && !this.frame) this.frame = requestAnimationFrame(this.tick);
    if ((!active || !this.animated) && this.frame) {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
    }
    if (!active) this.lastFrameTime = 0;
    if (active && !this.animated) this.draw(this.clock);
  }

  setAnimated(animated: boolean): void {
    this.animated = animated;
    this.lastFrameTime = 0;
    if (!animated) this.draw(this.clock);
    this.setActive(this.active);
  }

  dispose(): void {
    this.setActive(false);
    this.surface.dispose();
    this.sky = null;
  }

  private tick = (time: number): void => {
    this.frame = 0;
    if (!this.active) return;
    const elapsed = time - this.lastFrameTime;
    if (this.lastFrameTime && elapsed < minFrameInterval) {
      this.frame = requestAnimationFrame(this.tick);
      return;
    }
    if (this.lastFrameTime) this.clock += Math.min(elapsed, maxFrameStep);
    this.lastFrameTime = time;
    this.draw(this.clock);
    this.frame = requestAnimationFrame(this.tick);
  };

  private draw(time: number): void {
    const sky = this.sky;
    if (!sky) return;
    const context = this.surface.beginFrame();
    drawStars(context, sky.stars, time);
    drawMoon(context, sky.moon);
    drawHills(context, sky.hills);
    drawFireflies(context, sky.fireflies, time);
    this.surface.endFrame();
  }
}
