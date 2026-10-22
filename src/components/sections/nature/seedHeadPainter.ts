import { AsciiSurface } from '@/lib/ascii/asciiSurface';

const SEED_COUNT = 610;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const SPIN_MILLISECONDS = 160_000;
const FULL_TURN = Math.PI * 2;
const RADIANS_PER_DEGREE = Math.PI / 180;

export class SeedHeadPainter {
  private readonly surface: AsciiSurface;
  private readonly darkSeeds = new Path2D();
  private readonly accentSeeds = new Path2D();
  private readonly ring = new Path2D();
  private readonly ticks = new Path2D('M400 20v22m0 716v22M20 400h22m716 0h22');
  private frameRequest = 0;
  private lastTickAt: number | null = null;
  private spin = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    fontFamily: string,
    private readonly animated: boolean,
  ) {
    this.surface = new AsciiSurface(canvas, {
      polarity: 'dark-on-light',
      ink: '#000000',
      gamma: 0.6,
      dprCap: 2,
    }, fontFamily);

    for (let index = 0; index < SEED_COUNT; index++) {
      const radius = 13.5 * Math.sqrt(index);
      const angle = index * GOLDEN_ANGLE;
      const x = 400 + Math.cos(angle) * radius;
      const y = 400 + Math.sin(angle) * radius;
      const size = 2.2 + 4.8 * Math.sqrt(index / SEED_COUNT);
      const path = index % 13 < 3 ? this.accentSeeds : this.darkSeeds;
      path.moveTo(x + Math.cos(angle) * size, y + Math.sin(angle) * size);
      path.ellipse(x, y, size, size * 0.6, angle, 0, FULL_TURN);
      path.closePath();
    }

    this.ring.arc(400, 400, 365, 0, FULL_TURN);
  }

  resize(): void {
    this.surface.resize();
    this.paint();
  }

  resume(): void {
    if (!this.animated || this.frameRequest) return;
    this.lastTickAt = null;
    this.frameRequest = requestAnimationFrame(this.tick);
  }

  pause(): void {
    cancelAnimationFrame(this.frameRequest);
    this.frameRequest = 0;
    this.lastTickAt = null;
  }

  dispose(): void {
    this.pause();
    this.surface.dispose();
  }

  private tick = (now: number): void => {
    if (this.lastTickAt !== null) {
      this.spin = (this.spin + (now - this.lastTickAt) * FULL_TURN / SPIN_MILLISECONDS) % FULL_TURN;
    }
    this.lastTickAt = now;
    this.paint();
    this.frameRequest = requestAnimationFrame(this.tick);
  };

  private paint(): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const fit = Math.min(width, height) / 800;
    const enterRotation = Number(this.canvas.dataset.enterRotation ?? 0);
    const holdRotation = Number(this.canvas.dataset.holdRotation ?? 0);
    const enterScale = Number(this.canvas.dataset.enterScale ?? 1);
    const holdScale = Number(this.canvas.dataset.holdScale ?? 1);
    const context = this.surface.beginFrame();

    context.save();
    context.translate((width - 800 * fit) / 2, (height - 800 * fit) / 2);
    context.scale(fit, fit);

    context.save();
    context.translate(400, 400);
    context.rotate(this.spin + (enterRotation + holdRotation) * RADIANS_PER_DEGREE);
    context.scale(enterScale * holdScale, enterScale * holdScale);
    context.translate(-400, -400);
    context.fillStyle = '#000000';
    context.fill(this.darkSeeds);
    context.fillStyle = '#8a8a8a';
    context.fill(this.accentSeeds);
    context.restore();

    context.strokeStyle = '#000000';
    context.lineWidth = 1;
    context.globalAlpha = 0.25;
    context.setLineDash([1, 12]);
    context.stroke(this.ring);
    context.globalAlpha = 1;
    context.setLineDash([]);
    context.stroke(this.ticks);
    context.restore();

    this.surface.endFrame();
  }
}
