import { AsciiSurface } from '@/lib/ascii/asciiSurface';

type Plant = {
  x: number;
  height: number;
  spread: number;
  phase: number;
  kind: number;
  color: string;
  plantedAt: number;
};

const white = '#ffffff';
const lightGray = '#a8a8a8';
const midGray = '#6e6e6e';
const colors = [white, lightGray, midGray];

const flowerScale = 1.35;
const petalBaseGray = '#444444';
const petalGradientStart = 0.2;
const petalGradientEnd = 1;
const centerRadius = 0.28;
const speckleRadius = 0.05;
const speckleCount = 7;
const goldenAngle = 2.39996;

type Speckle = { x: number; y: number; color: string };

const centerSpeckles: Speckle[] = Array.from({ length: speckleCount }, (_, index) => {
  const distance = centerRadius * 0.8 * Math.sqrt((index + 0.5) / speckleCount);
  const angle = index * goldenAngle;
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    color: index % 2 === 0 ? white : lightGray,
  };
});

// Petals are drawn in unit space, so one gradient per context serves every flower at any size.
const petalGradients = new WeakMap<CanvasRenderingContext2D, CanvasGradient>();

function petalGradientFor(ctx: CanvasRenderingContext2D): CanvasGradient {
  const cached = petalGradients.get(ctx);
  if (cached) return cached;
  const gradient = ctx.createRadialGradient(0, 0, petalGradientStart, 0, 0, petalGradientEnd);
  gradient.addColorStop(0, petalBaseGray);
  gradient.addColorStop(1, white);
  petalGradients.set(ctx, gradient);
  return gradient;
}

function seeded(index: number, salt: number): number {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function makePlant(index: number, count: number): Plant {
  const jitter = (seeded(index, 2) - 0.5) * 0.045;
  return {
    x: (index + 0.48) / count + jitter,
    height: 0.31 + seeded(index, 3) * 0.45,
    spread: 0.55 + seeded(index, 4) * 0.8,
    phase: seeded(index, 5) * Math.PI * 2,
    kind: index % 4,
    color: colors[index % colors.length],
    plantedAt: -1,
  };
}

function drawLeaf(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, direction: number, color: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(direction);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.ellipse(size * 0.53, 0, size * 0.55, size * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(size, 0);
  ctx.stroke();
  ctx.restore();
}

function drawPetal(ctx: CanvasRenderingContext2D, kind: number): void {
  if (kind === 1) {
    ctx.fillRect(0.53, -0.13, 0.42, 0.26);
    ctx.fillRect(0.92, -0.07, 0.15, 0.14);
  } else if (kind === 2) {
    ctx.beginPath();
    ctx.moveTo(0.23, 0);
    ctx.lineTo(0.92, -0.2);
    ctx.lineTo(0.7, 0.18);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(0.66, 0, 0.43, kind === 3 ? 0.13 : 0.21, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFlowerCenter(ctx: CanvasRenderingContext2D, phase: number): void {
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(0, 0, centerRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.rotate(phase);
  for (const speckle of centerSpeckles) {
    ctx.fillStyle = speckle.color;
    ctx.beginPath();
    ctx.arc(speckle.x, speckle.y, speckleRadius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFlower(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, plant: Plant, time: number, animate: boolean): void {
  const opening = plant.plantedAt < 0 ? 1 : Math.min(1, (time - plant.plantedAt) / 850);
  const bloom = radius * (0.3 + opening * 0.7);
  const petals = [5, 7, 4, 8][plant.kind];
  ctx.save();
  ctx.translate(x, y);
  const turn = animate ? Math.sin(time * 0.0009 + plant.phase) * 0.25 : 0;
  ctx.rotate(plant.phase * 0.25 + (plant.kind === 3 ? Math.PI / 8 : 0) + turn);
  ctx.scale(bloom, bloom);
  ctx.fillStyle = petalGradientFor(ctx);

  for (let i = 0; i < petals; i += 1) {
    ctx.save();
    ctx.rotate(i * Math.PI * 2 / petals);
    drawPetal(ctx, plant.kind);
    ctx.restore();
  }

  drawFlowerCenter(ctx, plant.phase);
  ctx.restore();
}

function drawPlant(ctx: CanvasRenderingContext2D, plant: Plant, width: number, height: number, time: number, animate: boolean): void {
  const ground = height * 0.85;
  const fullStemHeight = height * plant.height;
  const growth = plant.plantedAt < 0 ? 1 : Math.min(1, (time - plant.plantedAt) / 850);
  const stemHeight = fullStemHeight * growth;
  const tipY = ground - stemHeight;
  const rootX = plant.x * width;
  const gust = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(time * 0.0008 - plant.x * 6));
  const sway = animate ? Math.sin(time * 0.00065 + plant.phase) * (14 + plant.spread * 12) * gust : 0;
  const tipX = rootX + sway * growth;
  const radius = flowerScale * Math.min(width < 600 ? 16 : 23, Math.max(9, fullStemHeight * 0.09));

  ctx.strokeStyle = plant.color;
  ctx.lineWidth = width < 600 ? 1.2 : 1.65;
  ctx.globalAlpha = 0.86;
  ctx.beginPath();
  ctx.moveTo(rootX, ground);
  ctx.bezierCurveTo(rootX - plant.spread * 12, ground - stemHeight * 0.35, tipX + plant.spread * 13, tipY + stemHeight * 0.4, tipX, tipY);
  ctx.stroke();
  ctx.globalAlpha = 1;

  for (let level = 0; level < 3; level += 1) {
    const fraction = 0.27 + level * 0.2;
    if (growth < fraction) continue;
    const nodeY = ground - fullStemHeight * fraction;
    const nodeX = rootX + sway * fraction + Math.sin(plant.phase + level) * 5;
    const direction = level % 2 === 0 ? -1 : 1;
    const branchLength = (18 + fullStemHeight * 0.085) * plant.spread;
    const branchTipX = nodeX + branchLength * direction;
    const branchTipY = nodeY - branchLength * (0.55 + level * 0.07);
    ctx.strokeStyle = plant.color;
    ctx.globalAlpha = 0.74;
    ctx.beginPath();
    ctx.moveTo(nodeX, nodeY);
    ctx.quadraticCurveTo(nodeX + branchLength * direction * 0.3, nodeY - branchLength * 0.9, branchTipX, branchTipY);
    ctx.stroke();
    ctx.globalAlpha = 1;
    const flutter = animate ? Math.sin(time * 0.0016 + plant.phase + level) * 0.15 : 0;
    drawLeaf(ctx, branchTipX, branchTipY, 9 + plant.spread * 7, (direction < 0 ? -2.75 : -0.4) + flutter, plant.color);
    drawLeaf(ctx, nodeX + direction * branchLength * 0.43, nodeY - branchLength * 0.46, 8 + plant.spread * 4, (direction < 0 ? 2.7 : 0.45) + flutter, plant.color);
  }

  drawFlower(ctx, tipX, tipY, radius, plant, time, animate);
  ctx.fillStyle = plant.color;
  ctx.globalAlpha = 0.56;
  for (let i = 0; i < 3; i += 1) {
    const angle = plant.phase + i * 2.4;
    ctx.fillRect(tipX + Math.cos(angle) * radius * 1.8, tipY + Math.sin(angle) * radius * 1.8, 2, 2);
  }
  ctx.globalAlpha = 1;
}

export class GardenPainter {
  private canvas: HTMLCanvasElement;
  private surface: AsciiSurface;
  private plants: Plant[] = [];
  private width = 0;
  private height = 0;
  private active = false;
  private animated: boolean;
  private frame = 0;
  private nextSeed = 0;
  private clock = 0;
  private lastFrameTime = 0;

  constructor(canvas: HTMLCanvasElement, fontFamily: string, animated: boolean) {
    this.canvas = canvas;
    this.surface = new AsciiSurface(canvas, {
      polarity: 'light-on-dark',
      ink: '#ffffff',
      gamma: 0.55,
      dprCap: canvas.clientWidth < 600 ? 1.25 : 1.75,
    }, fontFamily);
    this.animated = animated;
    this.resize();
  }

  resize(): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (width <= 0 || height <= 0) return;
    this.surface.resize();
    this.width = width;
    this.height = height;
    const count = width < 600 ? 8 : width < 900 ? 11 : 16;
    if (this.plants.length === 0) {
      this.plants = Array.from({ length: count }, (_, index) => makePlant(index, count));
    }
    const limit = width < 600 ? 24 : 48;
    if (this.plants.length > limit) this.plants.splice(0, this.plants.length - limit);
    this.draw(this.clock);
  }

  plant(x: number, y: number): void {
    const index = this.nextSeed;
    this.nextSeed += 1;
    const normalizedX = Math.min(0.97, Math.max(0.03, x / this.width));
    const normalizedHeight = Math.min(0.73, Math.max(0.17, 0.85 - y / this.height));
    this.plants.push({
      x: normalizedX,
      height: normalizedHeight,
      spread: 0.8 + seeded(index, 9) * 0.5,
      phase: seeded(index, 10) * Math.PI * 2,
      kind: (index + 1) % 4,
      color: colors[(index + 1) % colors.length],
      plantedAt: this.animated ? this.clock : -1,
    });
    const limit = this.width < 600 ? 24 : 48;
    if (this.plants.length > limit) this.plants.shift();
    if (!this.active || !this.animated) this.draw(this.clock);
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
    if (!animated) {
      for (const plant of this.plants) plant.plantedAt = -1;
      this.lastFrameTime = 0;
      this.draw(this.clock);
    }
    this.setActive(this.active);
  }

  stop(): void {
    this.setActive(false);
  }

  dispose(): void {
    this.stop();
    this.surface.dispose();
    this.plants.length = 0;
  }

  private tick = (time: number): void => {
    this.frame = 0;
    if (!this.active) return;
    if (this.lastFrameTime) this.clock += Math.min(time - this.lastFrameTime, 100);
    this.lastFrameTime = time;
    this.draw(this.clock);
    this.frame = requestAnimationFrame(this.tick);
  };

  private draw(time: number): void {
    const context = this.surface.beginFrame();
    for (const plant of this.plants) {
      drawPlant(context, plant, this.width, this.height, time, this.animated);
    }
    this.surface.endFrame();
  }
}
