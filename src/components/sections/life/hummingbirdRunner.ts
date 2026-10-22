import { paintAsciiMatrix } from './asciiMatrixPainter';
import { FRAME_COLS, FRAME_COUNT, FRAME_ROWS, FRAME_SECONDS, STILL_FRAME, frameTones } from './hummingbirdFrames';

// A long gap, such as a tab coming back, must not make the bird jump ahead.
const MAX_STEP_SECONDS = 0.1;

interface RunnerOptions {
  dprCap: number;
  animated: boolean;
  fontFamily: string;
}

export class HummingbirdRunner {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly dprCap: number;
  private readonly animated: boolean;
  private readonly fontFamily: string;
  private cellSize = 0;
  private clockSeconds = 0;
  private lastTickAt: number | null = null;
  private shownFrame: number;
  private frameRequest = 0;

  constructor(canvas: HTMLCanvasElement, options: RunnerOptions) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('A 2D canvas is needed to draw the hummingbird.');
    this.canvas = canvas;
    this.context = context;
    this.dprCap = options.dprCap;
    this.animated = options.animated;
    this.fontFamily = options.fontFamily;
    this.shownFrame = options.animated ? 0 : STILL_FRAME;
  }

  start(): void {
    this.resize();
  }

  // Sizes the canvas to its box in device pixels, then paints again because resizing clears it.
  resize(): void {
    const pixelRatio = Math.min(window.devicePixelRatio, this.dprCap);
    const width = Math.round(this.canvas.clientWidth * pixelRatio);
    if (width === 0) return;

    this.canvas.width = width;
    this.canvas.height = Math.round((width * FRAME_ROWS) / FRAME_COLS);
    this.cellSize = width / FRAME_COLS;
    this.repaint();
  }

  pause(): void {
    cancelAnimationFrame(this.frameRequest);
  }

  resume(): void {
    if (!this.animated) return;
    cancelAnimationFrame(this.frameRequest);
    // The time spent paused must not count, so the first tick after this only notes the time.
    this.lastTickAt = null;
    this.frameRequest = requestAnimationFrame(this.tick);
  }

  stop(): void {
    cancelAnimationFrame(this.frameRequest);
    this.canvas.width = 0;
    this.canvas.height = 0;
  }

  private tick = (now: number): void => {
    this.frameRequest = requestAnimationFrame(this.tick);
    this.clockSeconds += this.secondsSinceLastTick(now);
    this.lastTickAt = now;

    const frame = Math.floor(this.clockSeconds / FRAME_SECONDS) % FRAME_COUNT;
    if (frame === this.shownFrame) return;

    this.shownFrame = frame;
    this.repaint();
  };

  private secondsSinceLastTick(now: number): number {
    if (this.lastTickAt === null) return 0;
    return Math.min((now - this.lastTickAt) / 1000, MAX_STEP_SECONDS);
  }

  repaint(): void {
    const ground = this.canvas.dataset.ground === 'dark' ? 'dark' : 'light';
    paintAsciiMatrix(this.context, frameTones(this.shownFrame), this.cellSize, this.fontFamily, ground);
  }
}
